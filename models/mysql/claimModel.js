import db from '../../config/db_mysql.js';

const withEvidenceUrl = (claim) => {
    if (!claim) return claim;
    const { evidence_path, ...safeClaim } = claim;
    return {
        ...safeClaim,
        has_evidence: Boolean(evidence_path),
        evidence_url: evidence_path ? `/api/claims/${claim.claim_id}/evidence` : null
    };
};

const Claim = {
    // Membuat klaim baru
    create: async (claimData) => {
        const { 
            claimer_nim, 
            item_id, 
            challange_answer, 
            status = 'pending' 
        } = claimData;

        const createAt = new Date();
        // validator_nip dan processed_at dibiarkan NULL

        const query = `
            INSERT INTO claim (
                claimer_nim, item_id, 
                create_at, challange_answer, status, validator_nip, processed_at
            )
            VALUES (?, ?, ?, ?, ?, NULL, NULL)
        `;

        const [result] = await db.execute(query, [
            claimer_nim, item_id, 
            createAt, challange_answer, status
        ]);
        
        return result;
    },

    createActive: async (claimData) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [items] = await connection.execute(
                "SELECT item_id FROM item WHERE item_id = ? AND report_type = 'found' AND report_review_status = 'accepted' AND status = 'secured' FOR UPDATE",
                [claimData.item_id]
            );
            if (items.length === 0) {
                await connection.rollback();
                return { error: 'item_unavailable' };
            }

            const [existing] = await connection.execute(
                "SELECT claim_id FROM claim WHERE item_id = ? AND claimer_nim = ? AND status IN ('pending','verified','scheduled') LIMIT 1",
                [claimData.item_id, claimData.claimer_nim]
            );
            if (existing.length > 0) {
                await connection.rollback();
                return { error: 'duplicate' };
            }

            const [result] = await connection.execute(
                `INSERT INTO claim (
                    claimer_nim, item_id, challange_answer, evidence_path, status, validator_nip, processed_at
                ) VALUES (?, ?, ?, ?, 'pending', NULL, NULL)`,
                [
                    claimData.claimer_nim,
                    claimData.item_id,
                    claimData.challange_answer,
                    claimData.evidence_path || null
                ]
            );
            await connection.commit();
            return { claim_id: result.insertId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Mendapatkan detail klaim berdasarkan ID
    findById: async (id) => {
        const query = `
            SELECT 
                c.*, 
                i.name as item_name, 
                i.image_path as item_image_path, 
                i.status as item_status,
                u.full_name as claimer_name, 
                u.email as claimer_email,
                ps.day_of_week as slot_day_of_week,
                ps.start_time as slot_start_time,
                ps.end_time as slot_end_time,
                ps.location as slot_location
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            JOIN general_user u ON c.claimer_nim = u.nim
            LEFT JOIN pickup_slot ps ON c.scheduled_slot_id = ps.slot_id
            WHERE c.claim_id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return withEvidenceUrl(rows[0]);
    },

    // Mendapatkan klaim berdasarkan Item ID
    findByItemId: async (itemId) => {
        const query = 'SELECT * FROM claim WHERE item_id = ?';
        const [rows] = await db.execute(query, [itemId]);
        return rows.map(withEvidenceUrl);
    },

    findAllAdmin: async (status = 'all') => {
        let query = `
            SELECT 
                c.*, 
                i.name as item_name, 
                i.image_path,
                i.status as item_status,
                u.full_name as claimer_name,
                u.nim as claimer_nim,
                ps.day_of_week as slot_day_of_week,
                ps.start_time as slot_start_time,
                ps.end_time as slot_end_time,
                ps.location as slot_location
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            JOIN general_user u ON c.claimer_nim = u.nim
            LEFT JOIN pickup_slot ps ON c.scheduled_slot_id = ps.slot_id
            WHERE 1=1
        `;
        
        const params = [];

        // Filter Status (jika bukan 'all')
        if (status && status !== 'all') {
            query += ' AND c.status = ?';
            params.push(status);
        }

        // Urutkan dari yang terbaru (pending di atas)
        query += ' ORDER BY FIELD(c.status, "pending", "verified", "scheduled", "claimed", "rejected"), c.create_at ASC';

        const [rows] = await db.execute(query, params);
        return rows.map(withEvidenceUrl);
    },

    findEvidenceById: async (claimId) => {
        const [rows] = await db.execute(
            'SELECT claim_id, claimer_nim, evidence_path FROM claim WHERE claim_id = ?',
            [claimId]
        );
        return rows[0];
    },

    findByClaimerNim: async (claimerNim) => {
        const query = `
            SELECT 
                c.*, 
                i.name as item_name, 
                i.image_path, 
                i.status as item_status,
                i.found_location,
                cat.name as category_name,
                ps.day_of_week as slot_day_of_week,
                ps.start_time as slot_start_time,
                ps.end_time as slot_end_time,
                ps.location as slot_location
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            LEFT JOIN category cat ON i.category_id = cat.category_id
            LEFT JOIN pickup_slot ps ON c.scheduled_slot_id = ps.slot_id
            WHERE c.claimer_nim = ?
            ORDER BY c.create_at DESC
        `;
        const [rows] = await db.execute(query, [claimerNim]);
        return rows.map(withEvidenceUrl);
    },

    findScheduledBySlotId: async (slotId) => {
        const [rows] = await db.execute(
            `SELECT c.claim_id, u.email AS claimer_email, i.name AS item_name, i.image_path AS item_image_path,
                    c.scheduled_date, ps.start_time, ps.end_time, ps.location
             FROM claim c
             JOIN general_user u ON c.claimer_nim = u.nim
             JOIN item i ON c.item_id = i.item_id
             JOIN pickup_slot ps ON c.scheduled_slot_id = ps.slot_id
             WHERE c.scheduled_slot_id = ? AND c.status = 'scheduled'`,
            [slotId]
        );
        return rows;
    },

    // Menjadwalkan pengambilan barang (FR-04)
    scheduleSlot: async (claimId, slotId, scheduledDate) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [slots] = await connection.execute(
                'SELECT max_quota, slot_date, day_of_week FROM pickup_slot WHERE slot_id = ? AND is_active = 1 FOR UPDATE',
                [slotId]
            );
            if (slots.length === 0) {
                await connection.rollback();
                return { error: 'slot_unavailable' };
            }
            const dayOfWeek = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday'
            ][new Date(`${scheduledDate}T00:00:00Z`).getUTCDay()];
            if (
                (slots[0].slot_date && String(slots[0].slot_date).slice(0, 10) !== scheduledDate) ||
                slots[0].day_of_week !== dayOfWeek
            ) {
                await connection.rollback();
                return { error: 'slot_date_mismatch' };
            }

            const [claims] = await connection.execute(
                "SELECT status, scheduled_slot_id, scheduled_date FROM claim WHERE claim_id = ? FOR UPDATE",
                [claimId]
            );
            const claim = claims[0];
            if (!claim || !['verified', 'scheduled'].includes(claim.status)) {
                await connection.rollback();
                return { error: 'claim_unavailable' };
            }

            const [bookings] = await connection.execute(
                `SELECT COUNT(*) AS booked_count FROM claim
                 WHERE scheduled_slot_id = ? AND scheduled_date = ?
                   AND status IN ('scheduled','claimed') AND claim_id <> ?`,
                [slotId, scheduledDate, claimId]
            );
            if (Number(bookings[0].booked_count) >= Number(slots[0].max_quota)) {
                await connection.rollback();
                return { error: 'slot_full' };
            }

            const [result] = await connection.execute(
                `UPDATE claim
                 SET scheduled_slot_id = ?, scheduled_date = ?, status = 'scheduled'
                 WHERE claim_id = ? AND status IN ('verified','scheduled')`,
                [slotId, scheduledDate, claimId]
            );
            if (result.affectedRows !== 1) {
                await connection.rollback();
                return { error: 'claim_unavailable' };
            }
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    updateStatus: async (claimId, newStatus, validatorNip, reviewNote = null) => {
        const processedAt = new Date();
        const query = `
            UPDATE claim 
            SET status = ?, processed_at = ?, validator_nip = ?, review_note = ?
            WHERE claim_id = ? AND status = 'pending'
        `;
        const [result] = await db.execute(query, [
            newStatus,
            processedAt,
            validatorNip,
            reviewNote,
            claimId
        ]);
        return result;
    },

    review: async (claimId, newStatus, validatorNip, reviewNote = null) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [claims] = await connection.execute(
                `SELECT c.item_id, c.status, i.status AS item_status, i.report_type, i.report_review_status
                 FROM claim c JOIN item i ON i.item_id = c.item_id
                 WHERE c.claim_id = ? FOR UPDATE`,
                [claimId]
            );
            const claim = claims[0];
            if (!claim || claim.status !== 'pending') {
                await connection.rollback();
                return { error: 'claim_unavailable' };
            }
            if (newStatus === 'verified') {
                if (claim.item_status !== 'secured' || claim.report_type !== 'found' || claim.report_review_status !== 'accepted') {
                    await connection.rollback();
                    return { error: 'item_unavailable' };
                }
                const [approved] = await connection.execute(
                    `SELECT claim_id FROM claim
                     WHERE item_id = ? AND claim_id <> ?
                       AND status IN ('verified','scheduled','claimed')
                     LIMIT 1`,
                    [claim.item_id, claimId]
                );
                if (approved.length > 0) {
                    await connection.rollback();
                    return { error: 'item_already_approved' };
                }
            }

            const [result] = await connection.execute(
                `UPDATE claim
                 SET status = ?, processed_at = NOW(), validator_nip = ?, review_note = ?
                 WHERE claim_id = ? AND status = 'pending'`,
                [newStatus, validatorNip, reviewNote, claimId]
            );
            if (result.affectedRows !== 1) {
                await connection.rollback();
                return { error: 'claim_unavailable' };
            }
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Generate QR Token
    generateQR: async (claimId, token, expiresAt) => {
        const query = `
            UPDATE claim 
            SET qr_token = ?, qr_expires_at = ?
            WHERE claim_id = ?
        `;
        const [result] = await db.execute(query, [token, expiresAt, claimId]);
        return result;
    },

    issueQR: async (claimId, newToken, newExpiresAt) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [claims] = await connection.execute(
                `SELECT status, qr_token, qr_expires_at
                 FROM claim WHERE claim_id = ? FOR UPDATE`,
                [claimId]
            );
            const claim = claims[0];
            if (!claim || claim.status !== 'scheduled') {
                await connection.rollback();
                return { error: 'claim_unavailable' };
            }

            const now = Date.now();
            const expiry = claim.qr_expires_at ? new Date(claim.qr_expires_at).getTime() : 0;
            const ttl = Math.floor((expiry - now) / 1000);
            if (claim.qr_token && ttl > 0 && ttl <= 30 * 60) {
                await connection.commit();
                return {
                    qr_token: claim.qr_token,
                    expires_at: claim.qr_expires_at,
                    time_to_live_seconds: ttl,
                    reused: true
                };
            }

            await connection.execute(
                'UPDATE claim SET qr_token = ?, qr_expires_at = ? WHERE claim_id = ?',
                [newToken, newExpiresAt, claimId]
            );
            await connection.commit();
            return {
                qr_token: newToken,
                expires_at: newExpiresAt,
                time_to_live_seconds: 30 * 60,
                reused: false
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Find Claim by QR Token
    findByQRToken: async (token) => {
        const query = `
            SELECT c.*, i.name as item_name, i.status as item_status, u.email as claimer_email
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            JOIN general_user u ON c.claimer_nim = u.nim
            WHERE c.qr_token = ? AND c.status = 'scheduled'
        `;
        const [rows] = await db.execute(query, [token]);
        return rows[0];
    },

    // Validate QR and Claim Item (Atomic Transaction)
    validateQRAndClaimItem: async (claimId, itemId, token) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const processedAt = new Date();

            const [claimResult] = await connection.execute(
                `UPDATE claim
                 SET status = 'claimed', processed_at = ?, qr_token = NULL, qr_expires_at = NULL
                 WHERE claim_id = ? AND item_id = ? AND status = 'scheduled'
                   AND qr_token = ? AND qr_expires_at > NOW()`,
                [processedAt, claimId, itemId, token]
            );
            if (claimResult.affectedRows !== 1) {
                await connection.rollback();
                return false;
            }

            const updateClaimQuery = `
                UPDATE item SET status = 'claimed'
                WHERE item_id = ? AND report_type = 'found'
                  AND report_review_status = 'accepted' AND status = 'secured'
            `;
            const [itemResult] = await connection.execute(updateClaimQuery, [itemId]);
            if (itemResult.affectedRows !== 1) {
                await connection.rollback();
                return false;
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Statistik klaim untuk Dashboard Admin (FR-08)
    getDashboardClaimStats: async () => {
        const query = `
            SELECT 
                COUNT(*) as total_claims,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_claims,
                SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_claims,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_claims,
                SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_claims,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_claims,
                AVG(CASE 
                    WHEN status = 'claimed' AND processed_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, create_at, processed_at) 
                    ELSE NULL 
                END) as avg_handover_hours
            FROM claim
        `;
        const [rows] = await db.execute(query);
        const stats = rows[0] || {};
        const total = Number(stats.total_claims || 0);
        const successful = Number(stats.verified_claims || 0) + Number(stats.scheduled_claims || 0) + Number(stats.claimed_claims || 0);
        const successRate = total > 0 ? Number(((successful / total) * 100).toFixed(1)) : 0;
        const avgHours = stats.avg_handover_hours !== null ? Number(Number(stats.avg_handover_hours).toFixed(1)) : null;

        return {
            total_claims: total,
            pending: Number(stats.pending_claims || 0),
            verified: Number(stats.verified_claims || 0),
            scheduled: Number(stats.scheduled_claims || 0),
            claimed: Number(stats.claimed_claims || 0),
            rejected: Number(stats.rejected_claims || 0),
            success_rate_percentage: successRate,
            avg_handover_turnaround_hours: avgHours,
            avg_handover_turnaround_days: avgHours !== null ? Number((avgHours / 24).toFixed(1)) : null
        };
    }
};

export default Claim;