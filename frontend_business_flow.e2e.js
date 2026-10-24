import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

const backendDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDir, 'config', 'config.env') });

const baseUrl = process.env.E2E_BASE_URL;
const databaseName = process.env.DB_NAME;
const mongoDatabaseName = process.env.MONGO_DB_NAME;

if (process.env.E2E_ALLOW_MUTATIONS !== 'true') {
    throw new Error('Set E2E_ALLOW_MUTATIONS=true only when intentionally running against a disposable test database.');
}
if (process.env.DISABLE_EMAILS !== 'true') {
    throw new Error('Set DISABLE_EMAILS=true in the backend config before starting the E2E server; this suite must not send real email.');
}
if (!/(^|_)e2e$/i.test(databaseName || '')) {
    throw new Error('DB_NAME must end in _e2e; this test refuses to mutate a non-disposable database.');
}
if (!/(^|_)e2e$/i.test(mongoDatabaseName || '')) {
    throw new Error('MONGO_DB_NAME must end in _e2e so audit records can be safely rolled back.');
}
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl || '')) {
    throw new Error('E2E_BASE_URL must point to a local backend server.');
}
if (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST)) {
    throw new Error('DB_HOST must point to a local disposable MySQL/MariaDB instance.');
}
let mongoHost;
try {
    mongoHost = new URL(process.env.MONGO_URI).hostname;
} catch {
    throw new Error('MONGO_URI must point to a local disposable MongoDB instance.');
}
if (!['localhost', '127.0.0.1', '::1'].includes(mongoHost)) {
    throw new Error('MONGO_URI must point to a local disposable MongoDB instance.');
}

const runId = randomUUID();
const marker = `frontend-e2e-${runId}`;
const reportNames = {
    found: `${marker}-found`,
    lost: `${marker}-lost`,
    intake: `${marker}-intake`
};
const location = `${marker}-pickup`;
const testPassword = `e2e-${randomUUID()}`;
const studentNim = randomInt(800000000, 899999999);
const adminNip = randomInt(900000000, 999999999);
const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p7sAAAAASUVORK5CYII=',
    'base64'
);

let connection;
let mongoClient;
let schemaVerified = false;
let studentCreated = false;
let adminCreated = false;
let slotId;
const createdFiles = new Set();
const createdItemIds = new Set();
const createdClaimIds = new Set();
const originalAutoIncrement = new Map();

async function request(endpoint, { token, method = 'GET', body, expected = 200 } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let requestBody = body;
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
    }

    const response = await fetch(new URL(endpoint, baseUrl), {
        method,
        headers,
        body: requestBody
    });
    const text = await response.text();
    let result;
    try {
        result = text ? JSON.parse(text) : {};
    } catch {
        result = text;
    }
    assert.equal(
        response.status,
        expected,
        `${method} ${endpoint}: expected ${expected}, received ${response.status}: ${typeof result === 'string' ? result : JSON.stringify(result)}`
    );
    return result;
}

async function createReport(token, type, name) {
    const body = new FormData();
    const reportDate = new Date().toISOString().slice(0, 10);
    body.set('type', type);
    body.set('name', name);
    body.set('category', 'general');
    body.set('location', location);
    body.set('date', reportDate);
    body.set('time', '12:00');
    body.set('description', marker);
    body.set('photo', new Blob([image], { type: 'image/png' }), `${name}.png`);
    const response = await request('/api/items/reports', {
        method: 'POST',
        token,
        body,
        expected: 201
    });
    const itemId = response.data?.item_id;
    assert.ok(itemId, 'Report response must include data.item_id');
    createdItemIds.add(itemId);
    assert.equal(response.data.report_type, type, 'Report response must preserve its report type');
    assert.equal(
        response.data[type === 'lost' ? 'lost_location' : 'found_location'],
        location,
        'Report response must include location in the matching subtype field'
    );
    const detailTable = type === 'lost' ? 'lost_item' : 'found_item';
    const [details] = await connection.execute(
        `SELECT ${type === 'lost' ? 'lost_location' : 'found_location'} AS location,
                DATE_FORMAT(${type === 'lost' ? 'lost_date' : 'found_date'}, '%Y-%m-%d') AS report_date,
                TIME_FORMAT(${type === 'lost' ? 'lost_time' : 'found_time'}, '%H:%i') AS report_time
         FROM ${detailTable}
         WHERE item_id = ?`,
        [itemId]
    );
    assert.equal(details.length, 1, `${type} report must create one subtype row`);
    assert.equal(details[0].location, location);
    assert.equal(details[0].report_date, reportDate);
    assert.equal(details[0].report_time, '12:00');
    return itemId;
}

function nextOperationalDate() {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + 1);
    while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
        date.setUTCDate(date.getUTCDate() + 1);
    }
    return date.toISOString().slice(0, 10);
}

async function verifySchema() {
    const requiredColumns = [
        ['item', 'report_type'],
        ['item', 'report_review_status'],
        ['found_item', 'found_location'],
        ['found_item', 'found_date'],
        ['found_item', 'found_time'],
        ['lost_item', 'lost_location'],
        ['lost_item', 'lost_date'],
        ['lost_item', 'lost_time'],
        ['item', 'rejection_reason'],
        ['item', 'rejection_note'],
        ['item', 'reviewed_by'],
        ['item', 'reviewed_at'],
        ['claim', 'evidence_path'],
        ['claim', 'review_note'],
        ['claim', 'scheduled_date'],
        ['pickup_slot', 'slot_date']
    ];
    for (const [table, column] of requiredColumns) {
        const [rows] = await connection.execute(
            `SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [databaseName, table, column]
        );
        assert.equal(rows.length, 1, `Missing ${table}.${column}; apply migrations 001-005 to the disposable database.`);
    }
    for (const column of ['found_location', 'found_date', 'report_time']) {
        const [rows] = await connection.execute(
            `SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'item' AND COLUMN_NAME = ?`,
            [databaseName, column]
        );
        assert.equal(rows.length, 0, `Legacy item.${column} must be moved to a report subtype table.`);
    }
    const [statusRows] = await connection.execute(
        `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'item' AND COLUMN_NAME = 'report_review_status'`,
        [databaseName]
    );
    assert.match(statusRows[0]?.COLUMN_TYPE || '', /accepted.*rejected/, 'report_review_status must include accepted and rejected');
    const [tableStatuses] = await connection.execute(
        `SELECT TABLE_NAME, AUTO_INCREMENT FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('item', 'claim', 'pickup_slot')`,
        [databaseName]
    );
    for (const table of tableStatuses) {
        if (table.AUTO_INCREMENT !== null) {
            originalAutoIncrement.set(table.TABLE_NAME, Number(table.AUTO_INCREMENT));
        }
    }
}

async function createTestAccounts() {
    const [users] = await connection.execute('SELECT univ_id FROM general_user LIMIT 1');
    assert.ok(users.length, 'The test database needs at least one university row/user for its foreign keys.');
    const passwordHash = await bcrypt.hash(testPassword, 4);
    await connection.beginTransaction();
    try {
        await connection.execute(
            `INSERT INTO general_user (nim, univ_id, full_name, email, phone_number, password, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [studentNim, users[0].univ_id, marker, `${studentNim}@example.invalid`, marker, passwordHash]
        );
        studentCreated = true;
        await connection.execute(
            `INSERT INTO admin (nip, univ_id, full_name, password, email, role)
             VALUES (?, ?, ?, ?, ?, 'admin')`,
            [adminNip, users[0].univ_id, marker, passwordHash, `${adminNip}@example.invalid`]
        );
        adminCreated = true;
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}

async function cleanup() {
    if (!connection) return;
    if (!schemaVerified && !studentCreated && !adminCreated) return;

    const names = Object.values(reportNames);
    const [items] = await connection.execute(
        'SELECT item_id, image_path FROM item WHERE name IN (?, ?, ?)',
        names
    );
    for (const item of items) {
        createdItemIds.add(item.item_id);
        if (item.image_path) createdFiles.add(path.basename(item.image_path));
    }

    const itemIds = [...createdItemIds];
    if (itemIds.length) {
        const placeholders = itemIds.map(() => '?').join(',');
        const [claims] = await connection.execute(
            `SELECT claim_id FROM claim WHERE item_id IN (${placeholders})`,
            itemIds
        );
        for (const claim of claims) createdClaimIds.add(claim.claim_id);
        await connection.execute(
            `DELETE FROM claim WHERE item_id IN (${placeholders})`,
            itemIds
        );
        await connection.execute(
            `DELETE FROM item WHERE item_id IN (${placeholders})`,
            itemIds
        );
    }

    if (slotId) {
        await connection.execute('DELETE FROM pickup_slot WHERE slot_id = ?', [slotId]);
    }
    await connection.execute('DELETE FROM pickup_slot WHERE location = ?', [location]);
    if (studentCreated) {
        await connection.execute('DELETE FROM general_user WHERE nim = ?', [studentNim]);
    }
    if (adminCreated) {
        await connection.execute('DELETE FROM admin WHERE nip = ?', [adminNip]);
    }
    for (const [table, nextId] of originalAutoIncrement) {
        if (Number.isSafeInteger(nextId) && ['item', 'claim', 'pickup_slot'].includes(table)) {
            await connection.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${nextId}`);
        }
    }

    const uploadDir = path.resolve(backendDir, 'public', 'uploads');
    for (const filename of createdFiles) {
        const filePath = path.resolve(uploadDir, filename);
        if (path.dirname(filePath) !== uploadDir) {
            throw new Error(`Refusing to remove upload outside public/uploads: ${filename}`);
        }
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }

    if (mongoClient) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const actorIds = [studentNim, adminNip, String(studentNim), String(adminNip)];
        const entityIds = [
            ...itemIds,
            ...createdClaimIds,
            ...itemIds.map(String),
            ...[...createdClaimIds].map(String)
        ];
        await mongoClient.db(mongoDatabaseName).collection('activity_logs').deleteMany({
            $or: [
                { 'actor.id': { $in: actorIds } },
                { 'target.entityId': { $in: entityIds } }
            ]
        });
    }
}

async function run() {
    connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: databaseName
    });
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
    await verifySchema();
    schemaVerified = true;
    await createTestAccounts();

    const studentLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { nim: String(studentNim), password: testPassword }
    });
    const adminLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { nim: String(adminNip), password: testPassword }
    });
    const studentToken = studentLogin.token;
    const adminToken = adminLogin.token;
    assert.ok(studentToken && adminToken, 'Both logins must return top-level tokens');
    assert.equal(studentLogin.user?.role, 'MAHASISWA');
    assert.equal(adminLogin.user?.role, 'Admin_BEM');

    await request('/api/home');
    const foundId = await createReport(studentToken, 'found', reportNames.found);
    const lostId = await createReport(studentToken, 'lost', reportNames.lost);
    assert.ok(createdItemIds.has(lostId));
    const pendingReports = await request(
        `/api/admin/items?review_status=pending&search=${encodeURIComponent(marker)}`,
        { token: adminToken }
    );
    assert.ok(pendingReports.data?.some((item) =>
        String(item.item_id) === String(foundId) && item.report_review_status === 'pending'
    ));
    assert.ok(pendingReports.data?.some((item) =>
        String(item.item_id) === String(lostId) && item.report_review_status === 'pending'
    ));
    const catalog = await request(`/api/items?search=${encodeURIComponent(marker)}&category=general`);
    assert.ok(!catalog.data?.some((item) => String(item.item_id) === String(foundId)));
    assert.ok(!catalog.data?.some((item) => String(item.item_id) === String(lostId)));
    await request(`/api/items/${foundId}/claims`, {
        method: 'POST',
        token: studentToken,
        body: { answers: ['Pending moderation', 'Must not claim'] },
        expected: 409
    });
    await request(`/api/admin/items/${foundId}/approve`, {
        method: 'PATCH',
        token: adminToken,
        expected: 400
    });
    const approvedFound = await request(`/api/admin/items/${foundId}/approve`, {
        method: 'PATCH',
        token: adminToken,
        body: {
            questions: [
                'Sebutkan satu ciri khusus barang ini.',
                'Apa isi atau tanda yang hanya diketahui pemilik?'
            ]
        }
    });
    const approvedLost = await request(`/api/admin/items/${lostId}/approve`, {
        method: 'PATCH',
        token: adminToken
    });
    assert.equal(approvedFound.data?.report_review_status, 'accepted');
    assert.equal(approvedFound.data?.status, 'available', 'Accepted found reports must become available immediately');
    assert.equal(approvedFound.data?.claim_questions?.length, 2);
    assert.equal(approvedLost.data?.report_review_status, 'accepted');
    assert.equal(approvedLost.data?.status, 'active', 'Accepted lost reports remain active reports, not available items');
    const acceptedCatalog = await request(`/api/items?search=${encodeURIComponent(marker)}&category=general`);
    assert.ok(acceptedCatalog.data?.some((item) => String(item.item_id) === String(foundId)));
    assert.ok(acceptedCatalog.data?.some((item) => String(item.item_id) === String(lostId)));
    await request(`/api/items/${lostId}/claims`, {
        method: 'POST',
        token: studentToken,
        body: { answers: ['Must not claim', 'Lost reports are not claimable'] },
        expected: 409
    });
    await request(`/api/items/${foundId}/claims`, {
        method: 'POST',
        token: studentToken,
        body: { answers: ['Only one answer'] },
        expected: 400
    });

    await request(`/api/admin/items/${foundId}/reject`, {
        method: 'PATCH',
        token: adminToken,
        body: { reason: 'E2E rejection test', note: marker }
    });
    const rejectedCatalog = await request(`/api/items?status=all&search=${encodeURIComponent(reportNames.found)}`);
    assert.ok(!rejectedCatalog.data?.some((item) => String(item.item_id) === String(foundId)));
    await request(`/api/items/${foundId}`, { expected: 404 });
    await request(`/api/admin/items/${foundId}/restore`, {
        method: 'PATCH',
        token: adminToken
    });
    await request(`/api/admin/items/${foundId}/approve`, {
        method: 'PATCH',
        token: adminToken,
        body: {
            questions: [
                'Sebutkan satu ciri khusus barang ini.',
                'Apa isi atau tanda yang hanya diketahui pemilik?'
            ]
        }
    });
    await request(`/api/admin/items/${foundId}/secure`, {
        method: 'PUT',
        token: adminToken,
        body: {},
        expected: 410
    });

    const intakeForm = new FormData();
    intakeForm.set('name', reportNames.intake);
    intakeForm.set('location', location);
    intakeForm.set('time', '12:00');
    intakeForm.set('category', 'Umum');
    const intake = await request('/api/intake', {
        method: 'POST',
        token: adminToken,
        body: intakeForm,
        expected: 201
    });
    const intakeId = intake.data?.item_id;
    assert.ok(intakeId, 'Intake response must include data.item_id');
    createdItemIds.add(intakeId);
    const intakeItem = await request(`/api/items/${intakeId}`);
    assert.equal(intakeItem.data?.status, 'available', 'Admin intake items must be immediately available');

    const claim = await request(`/api/items/${foundId}/claims`, {
        method: 'POST',
        token: studentToken,
        body: { answers: ['E2E answer one', 'E2E answer two'] },
        expected: 201
    });
    const claimId = claim.data?.claim_id;
    assert.ok(claimId, 'Claim response must include data.claim_id');
    createdClaimIds.add(claimId);
    const adminClaims = await request('/api/admin/claims?status=all', {
        token: adminToken
    });
    const createdClaim = adminClaims.data?.find((entry) => String(entry.claim_id) === String(claimId));
    assert.deepEqual(
        createdClaim?.verification_answers?.map(({ question, answer }) => [question, answer]),
        [
            ['Sebutkan satu ciri khusus barang ini.', 'E2E answer one'],
            ['Apa isi atau tanda yang hanya diketahui pemilik?', 'E2E answer two']
        ]
    );
    await request(`/api/items/${foundId}/claims`, {
        method: 'POST',
        token: studentToken,
        body: { answers: ['Duplicate claim', 'Must be rejected'] },
        expected: 409
    });
    await request(`/api/claims/${claimId}`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'APPROVED', review_note: marker }
    });

    const pickupDate = nextOperationalDate();
    const slot = await request('/api/admin/slots', {
        method: 'POST',
        token: adminToken,
        body: {
            date: pickupDate,
            start_time: '14:00',
            end_time: '15:00',
            location,
            max_quota: 1
        },
        expected: 201
    });
    slotId = slot.data?.slot_id;
    assert.ok(slotId, 'Slot response must include data.slot_id');
    const availability = await request(`/api/slots?date=${pickupDate}`);
    assert.ok(availability.data?.slots?.some((entry) => String(entry.slot_id) === String(slotId)));

    await request('/api/schedules', {
        method: 'POST',
        token: studentToken,
        body: { claimId, slotId, date: pickupDate }
    });
    const ticket = await request(`/api/tickets/${claimId}`, { token: studentToken });
    const qrValue = ticket.data?.qrValue || ticket.data?.qr_token;
    assert.ok(qrValue, 'Ticket response must include a QR token');
    await request('/api/tickets/validate', {
        method: 'POST',
        token: adminToken,
        body: { qrValue }
    });
    await request('/api/profile', { token: studentToken });
    await request('/api/admin/dashboard', { token: adminToken });
    const auditPath = `/api/admin/audit?actorId=${adminNip}&eventType=REJECT_ITEM_REPORT&dateFrom=${new Date().toISOString().slice(0, 10)}`;
    let audit;
    for (let attempt = 0; attempt < 10; attempt += 1) {
        audit = await request(auditPath, { token: adminToken });
        if (audit.data?.some((event) => String(event.actor?.id) === String(adminNip))) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(audit.data?.some((event) => String(event.actor?.id) === String(adminNip)));

    console.log('Frontend business-flow E2E passed.');
}

let testError;
try {
    await run();
} catch (error) {
    testError = error;
} finally {
    try {
        await cleanup();
    } catch (error) {
        console.error('E2E cleanup failed; inspect the disposable test database before reuse:', error);
        testError ||= error;
    }
    await connection?.end();
    await mongoClient?.close();
}

if (testError) {
    console.error(testError);
    process.exitCode = 1;
}
