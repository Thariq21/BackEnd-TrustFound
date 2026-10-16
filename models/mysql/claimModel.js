import db from '../../config/db_mysql.js';

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
        return rows[0];
    },

    // Mendapatkan klaim berdasarkan Item ID
    findByItemId: async (itemId) => {
        const query = 'SELECT * FROM claim WHERE item_id = ?';
        const [rows] = await db.execute(query, [itemId]);
        return rows;
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
        return rows;
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
        return rows;
    },

    // Menjadwalkan pengambilan barang (FR-04)
    scheduleSlot: async (claimId, slotId, scheduledDate) => {
        const query = `
            UPDATE claim 
            SET scheduled_slot_id = ?, scheduled_date = ?, status = 'scheduled'
            WHERE claim_id = ?
        `;
        const [result] = await db.execute(query, [slotId, scheduledDate, claimId]);
        return result;
    },

    updateStatus: async (claimId, newStatus, validatorNip) => {
        const processedAt = new Date();
        const query = `
            UPDATE claim 
            SET status = ?, processed_at = ?, validator_nip = ?
            WHERE claim_id = ?
        `;
        const [result] = await db.execute(query, [newStatus, processedAt, validatorNip, claimId]);
        return result;
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

    // Find Claim by QR Token
    findByQRToken: async (token) => {
        const query = `
            SELECT c.*, i.name as item_name, i.status as item_status, u.email as claimer_email
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            JOIN general_user u ON c.claimer_nim = u.nim
            WHERE c.qr_token = ?
        `;
        const [rows] = await db.execute(query, [token]);
        return rows[0];
    },

    // Validate QR and Claim Item (Atomic Transaction)
    validateQRAndClaimItem: async (claimId, itemId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const processedAt = new Date();

            // 1. Update item status to 'claimed'
            const updateItemQuery = `UPDATE item SET status = 'claimed' WHERE item_id = ?`;
            await connection.execute(updateItemQuery, [itemId]);

            // 2. Update claim status to 'claimed', nullify qr_token
            const updateClaimQuery = `
                UPDATE claim 
                SET status = 'claimed', processed_at = ?, qr_token = NULL, qr_expires_at = NULL
                WHERE claim_id = ?
            `;
            await connection.execute(updateClaimQuery, [processedAt, claimId]);

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