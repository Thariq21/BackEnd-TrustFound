import db from '../../config/db_mysql.js';



const Item = {
    

    // UPDATE: Fungsi findAll sekarang menerima parameter filters
    findAll: async (status = 'pending', filters = {}) => {
        // Query dasar dengan JOIN kategori
        let query = `
            SELECT i.*, c.name as category_name 
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            WHERE 1=1
        `;
        
        const params = [];

        // 1. Filter Status
        // Jika status diisi dan bukan 'all', tambahkan filter status
        // Jika 'all', maka klausa WHERE status... dilewati (tampilkan semua)
        if (status && status !== 'all') {
            query += ' AND i.status = ?';
            params.push(status);
        }

        // 2. Filter Kategori
        if (filters.category_id) {
            query += ' AND i.category_id = ?';
            params.push(filters.category_id);
        }

        // 3. Filter Rentang Tanggal
        if (filters.startDate && filters.endDate) {
            query += ' AND i.found_date BETWEEN ? AND ?';
            params.push(filters.startDate, filters.endDate);
        } else if (filters.startDate) {
            // Jika hanya ada start date (cari dari tanggal ini ke depan)
            query += ' AND i.found_date >= ?';
            params.push(filters.startDate);
        }

        // Urutkan dari yang terbaru
        query += ' ORDER BY i.found_date DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    },

    findAllAdmin: async (filters = {}) => {
        let query = `
            SELECT 
                i.*, 
                c.name as category_name, 
                u.full_name as finder_name,
                a.full_name as manage_admin_name
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN general_user u ON i.finder_nim = u.nim
            LEFT JOIN admin a ON i.manage_nip = a.nip
            WHERE 1=1
        `;
        
        const params = [];

        if (filters.status) {
            query += ' AND i.status = ?';
            params.push(filters.status);
        }

        if (filters.startDate && filters.endDate) {
            query += ' AND i.found_date BETWEEN ? AND ?';
            params.push(filters.startDate, filters.endDate);
        }

        query += ' ORDER BY i.found_date DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    },

    findById: async (id) => {
        const query = `
            SELECT i.*, c.name as category_name, u.full_name as finder_name
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN general_user u ON i.finder_nim = u.nim
            WHERE i.item_id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    create: async (itemData) => {
        const { 
            finder_nim, category_id, name, description, 
            found_location, is_sensitive, found_date, image_path 
        } = itemData;

        const query = `
            INSERT INTO item (
                finder_nim, category_id, name, description, 
                found_location, is_sensitive, found_date, image_path, status, manage_nip
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL)
        `;
        
        const [result] = await db.execute(query, [
            finder_nim, category_id, name, description, 
            found_location, is_sensitive, found_date, image_path
        ]);
        return result;
    },

    createByAdmin: async (itemData) => {
        const { 
            category_id, name, description, 
            found_location, is_sensitive, found_date, image_path, manage_nip 
        } = itemData;

        // Note: finder_nim di-set NULL karena admin yang menemukan/input
        // Status langsung 'secured'
        // manage_nip langsung terisi oleh admin yang login
        const query = `
            INSERT INTO item (
                finder_nim, category_id, name, description, 
                found_location, is_sensitive, found_date, image_path, status, manage_nip
            )
            VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'secured', ?)
        `;
        
        const [result] = await db.execute(query, [
            category_id, name, description, 
            found_location, is_sensitive, found_date, image_path, manage_nip
        ]);
        return result;
    },

    updateStatus: async (itemId, newStatus, adminNip = null) => {
        let query;
        let params;

        if (adminNip) {
            query = 'UPDATE item SET status = ?, manage_nip = ? WHERE item_id = ?';
            params = [newStatus, adminNip, itemId];
        } else {
            query = 'UPDATE item SET status = ? WHERE item_id = ?';
            params = [newStatus, itemId];
        }

        const [result] = await db.execute(query, params);
        return result;
    },

    updateDetails: async (itemId, updateData) => {
        const { is_sensitive } = updateData;
        const query = 'UPDATE item SET is_sensitive = ? WHERE item_id = ?';
        const [result] = await db.execute(query, [is_sensitive, itemId]);
        return result;
    }
};

export default Item;