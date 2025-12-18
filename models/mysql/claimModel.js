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
            SELECT c.*, i.name as item_name, u.full_name as claimer_name 
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            JOIN general_user u ON c.claimer_nim = u.nim
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
                u.full_name as claimer_name,
                u.nim as claimer_nim
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            JOIN general_user u ON c.claimer_nim = u.nim
            WHERE 1=1
        `;
        
        const params = [];

        // Filter Status (jika bukan 'all')
        if (status && status !== 'all') {
            query += ' AND c.status = ?';
            params.push(status);
        }

        // Urutkan dari yang terbaru (pending di atas)
        query += ' ORDER BY FIELD(c.status, "pending", "verified", "rejected"), c.create_at ASC';

        const [rows] = await db.execute(query, params);
        return rows;
    },

    // ... (fungsi findByClaimerNim tetap sama untuk mahasiswa) ...
    findByClaimerNim: async (claimerNim) => {
        const query = `
            SELECT c.*, i.name as item_name, i.image_path, i.status as item_status
            FROM claim c
            JOIN item i ON c.item_id = i.item_id
            WHERE c.claimer_nim = ?
            ORDER BY c.create_at DESC
        `;
        const [rows] = await db.execute(query, [claimerNim]);
        return rows;
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
    }
};

export default Claim;