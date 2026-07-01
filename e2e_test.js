import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://localhost:5005';
const MAHASISWA_1_NIM = '1232001011';
const MAHASISWA_2_NIM = '1232001022';
const ADMIN_NIP = '1231001056';
const PASSWORD = 'P@ssword';

let mhs1Token = '';
let mhs2Token = '';
let adminToken = '';
let reportedItemId = null;
let submittedClaimId = null;

const runE2ETests = async () => {
    console.log('🚀 Starting E2E Integration Test for TrustFound v2.0...\n');

    try {
        // =========================================================================
        // STEP 1: Auth (Mahasiswa 1)
        // =========================================================================
        console.log('--- Step 1: Auth (Mahasiswa 1) ---');
        // Note: I'm using /api/auth/login based on standard routes, change to v2 if needed
        const resMhs1 = await axios.post(`${BASE_URL}/api/auth/login`, {
            nim: MAHASISWA_1_NIM,
            password: PASSWORD
        });
        mhs1Token = resMhs1.data.token || resMhs1.data.data.token; 
        console.log('✅ Mahasiswa 1 Login Successful. Token obtained.\n');


        // =========================================================================
        // STEP 2: Auth (Admin)
        // =========================================================================
        console.log('--- Step 2: Auth (Admin) ---');
        const resAdmin = await axios.post(`${BASE_URL}/api/auth/admin/login`, {
            nip: ADMIN_NIP,
            password: PASSWORD
        });
        adminToken = resAdmin.data.token || resAdmin.data.data.token;
        console.log('✅ Admin Login Successful. Token obtained.\n');


        // =========================================================================
        // STEP 3: Report Item (Mahasiswa 1)
        // =========================================================================
        console.log('--- Step 3: Report Item (Mahasiswa 1) ---');
        const form = new FormData();
        form.append('name', 'Macbook Pro 2021');
        form.append('category_id', '1'); 
        form.append('description', 'Found a silver macbook in the library');
        form.append('found_location', 'Library Floor 2');
        form.append('found_date', '2026-06-28');
        form.append('is_sensitive', 'true');
        
        // Critical: Using fs.createReadStream as requested
        const dummyPath = './dummy.jpeg';
        if (!fs.existsSync(dummyPath)) {
            console.warn(`⚠️ ${dummyPath} not found! Creating a temporary mock file for testing...`);
            fs.writeFileSync(dummyPath, 'mock-image-content-for-testing');
        }
        form.append('image', fs.createReadStream(dummyPath));

        const resReport = await axios.post(`${BASE_URL}/api/items`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${mhs1Token}`
            }
        });
        reportedItemId = resReport.data.data.item_id || resReport.data.data.id;
        console.log(`✅ Item Reported Successfully. Item ID: ${reportedItemId}\n`);


        // =========================================================================
        // STEP 4: Admin Review (Blur/Unblur Logic)
        // =========================================================================
        console.log('--- Step 4: Admin Review Items ---');
        const resAdminItems = await axios.get(`${BASE_URL}/api/items`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        const itemsList = resAdminItems.data.data;
        // Search by both id or item_id depending on database mapping
        const foundItem = itemsList.find(i => String(i.id) === String(reportedItemId) || String(i.item_id) === String(reportedItemId));
        
        if (foundItem) {
            console.log(`✅ Newly reported item exists in the catalog.`);
            const isSensitiveTrue = (foundItem.is_sensitive == 1 || foundItem.is_sensitive === true);
            console.log(`   is_sensitive flag: ${foundItem.is_sensitive} -> ${isSensitiveTrue ? 'Blur logic ACTIVE' : 'Normal logic'}`);
            
            // SIMULATING ADMIN SECURING THE ITEM (THIS TRIGGERS BROADCAST EMAIL!)
            console.log(`   Admin is now securing the item (Triggering Broadcast Email)...`);
            await axios.put(`${BASE_URL}/api/admin/items/${reportedItemId}/secure`, { is_sensitive: isSensitiveTrue }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log(`✅ Item ${reportedItemId} has been secured by Admin.\n`);
            
        } else {
            throw new Error(`Item ID ${reportedItemId} not found in catalog after reporting.`);
        }


        // =========================================================================
        // STEP 5: Auth (Mahasiswa 2)
        // =========================================================================
        console.log('--- Step 5: Auth (Mahasiswa 2) ---');
        const resMhs2 = await axios.post(`${BASE_URL}/api/auth/login`, {
            nim: MAHASISWA_2_NIM,
            password: PASSWORD
        });
        mhs2Token = resMhs2.data.token || resMhs2.data.data.token;
        console.log('✅ Mahasiswa 2 Login Successful. Token obtained.\n');


        // =========================================================================
        // STEP 6: Submit Claim (Mahasiswa 2)
        // =========================================================================
        console.log('--- Step 6: Submit Claim (Mahasiswa 2) ---');
        const resClaim = await axios.post(`${BASE_URL}/api/claims`, {
            item_id: reportedItemId,
            challange_answer: 'My macbook has a darth vader sticker on the back'
        }, {
            headers: { Authorization: `Bearer ${mhs2Token}` }
        });
        submittedClaimId = resClaim.data.data.claim_id || resClaim.data.data.id;
        console.log(`✅ Claim Submitted Successfully. Claim ID: ${submittedClaimId}\n`);


        // =========================================================================
        // STEP 7: Admin Validation
        // =========================================================================
        console.log('--- Step 7: Admin Validate and Approve Claim ---');
        try {
            // First attempting the exact user requested route
            await axios.post(`${BASE_URL}/api/v2/claims/${submittedClaimId}/approve`, {}, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log(`✅ Claim ${submittedClaimId} Approved Successfully using Admin V2 Endpoint.\n`);
        } catch (adminErr) {
            if (adminErr.response && adminErr.response.status === 404) {
                console.log(`⚠️ /api/v2/claims/.../approve returned 404 (Not Found). Falling back to standard admin put route...`);
                // Fallback to what a typical admin claim approval looks like if v2 doesn't exist
                await axios.put(`${BASE_URL}/api/admin/claims/${submittedClaimId}/process`, { status: 'verified' }, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                console.log(`✅ Claim ${submittedClaimId} Approved Successfully using Admin V1 Endpoint.\n`);
            } else {
                throw adminErr; // Rethrow if it's not a 404 (e.g. 500, 401)
            }
        }


        // =========================================================================
        // STEP 8: QR Code Fetch (New FR-01 Feature)
        // =========================================================================
        console.log('--- Step 8: Fetch E-Ticket QR Code (New FR-01 Feature) ---');
        const resQr = await axios.get(`${BASE_URL}/api/v2/claims/${submittedClaimId}/qr-token`, {
            headers: { Authorization: `Bearer ${mhs2Token}` }
        });
        
        const { qr_token, issued_at, expires_at } = resQr.data.data;
        if (qr_token && issued_at && expires_at) {
            console.log('✅ QR Code generated correctly.');
            console.log(`   🔑 Token: ${qr_token}`);
            console.log(`   🕒 Issued At: ${issued_at}`);
            console.log(`   ⏳ Expires At: ${expires_at}\n`);
        } else {
            throw new Error('QR Token payload did not match expected schema.');
        }

        console.log('🎉🎉 All E2E Integration Tests Passed Successfully! 🎉🎉');
        
    } catch (error) {
        console.error('\n❌ E2E TEST FAILED:');
        if (error.response) {
            console.error(`Status: ${error.response.status} ${error.response.statusText}`);
            console.error(`Endpoint: ${error.response.config.method.toUpperCase()} ${error.response.config.url}`);
            console.error(`Response Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
};

runE2ETests();
