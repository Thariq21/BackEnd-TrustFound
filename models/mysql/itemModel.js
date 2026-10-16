import db from '../../config/db_mysql.js';



export const mapDisplayStatus = (status) => {
    switch (status) {
        case 'pending': return 'Menunggu di Pos Satpam';
        case 'secured': return 'Tersedia di Lemari';
        case 'claimed': return 'Diklaim';
        case 'donated': return 'Didonasikan';
        default: return status;
    }
};

const withDisplayStatus = (item) => {
    if (!item) return item;
    return {
        ...item,
        display_status: mapDisplayStatus(item.status)
    };
};

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
            query += ' AND i.found_date >= ?';
            params.push(filters.startDate);
        }

        // Urutkan dari yang terbaru
        query += ' ORDER BY i.found_date DESC';

        const [rows] = await db.execute(query, params);
        return rows.map(withDisplayStatus);
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
        return rows.map(withDisplayStatus);
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
        return withDisplayStatus(rows[0]);
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

    // --- FITUR BARU: Auto Donate ---
    archiveOldItems: async () => {
        // Find items older than 90 days, status pending/secured, with no active claims (pending/verified)
        const query = `
            UPDATE item i
            LEFT JOIN claim c ON i.item_id = c.item_id AND c.status IN ('pending', 'verified', 'scheduled')
            SET i.status = 'donated'
            WHERE i.status IN ('pending', 'secured')
            AND i.found_date < DATE_SUB(NOW(), INTERVAL 90 DAY)
            AND c.claim_id IS NULL
        `;
        
        const [result] = await db.execute(query);
        return result.affectedRows;
    },

    createByAdmin: async (itemData) => {
        const { 
            category_id, name, description, 
            found_location, is_sensitive, found_date, image_path, manage_nip 
        } = itemData;

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

    // Batch update status (misal memindahkan batch barang dari Pos Satpam ke Lemari Kaca) - FR-07
    batchUpdateStatus: async (itemIds, newStatus, adminNip) => {
        let query;
        let params;
        if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            query = `UPDATE item SET status = ?, manage_nip = ? WHERE item_id IN (${placeholders})`;
            params = [newStatus, adminNip, ...itemIds];
        } else {
            // Update semua barang yang masih 'pending' di Pos Satpam menjadi 'secured' (Tersedia di Lemari)
            query = `UPDATE item SET status = ?, manage_nip = ? WHERE status = 'pending'`;
            params = [newStatus, adminNip];
        }
        const [result] = await db.execute(query, params);
        return result.affectedRows;
    },

    updateDetails: async (itemId, updateData) => {
        const { is_sensitive } = updateData;
        const query = 'UPDATE item SET is_sensitive = ? WHERE item_id = ?';
        const [result] = await db.execute(query, [is_sensitive, itemId]);
        return result;
    },

    // Statistik dashboard untuk Item (FR-08)
    getDashboardItemStats: async () => {
        const statusQuery = `
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as waiting_security_post_count,
                SUM(CASE WHEN status = 'secured' THEN 1 ELSE 0 END) as in_display_case_count,
                SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_count,
                SUM(CASE WHEN status = 'donated' THEN 1 ELSE 0 END) as donated_count,
                SUM(CASE WHEN is_sensitive = 1 THEN 1 ELSE 0 END) as sensitive_items_count
            FROM item
        `;
        const [statusRows] = await db.execute(statusQuery);

        const categoryQuery = `
            SELECT c.category_id, c.name as category_name, COUNT(i.item_id) as item_count
            FROM category c
            LEFT JOIN item i ON c.category_id = i.category_id
            GROUP BY c.category_id
            ORDER BY item_count DESC
        `;
        const [categoryRows] = await db.execute(categoryQuery);

        return {
            summary: {
                total_items: Number(statusRows[0]?.total_items || 0),
                waiting_security_post: Number(statusRows[0]?.waiting_security_post_count || 0),
                in_display_case: Number(statusRows[0]?.in_display_case_count || 0),
                claimed: Number(statusRows[0]?.claimed_count || 0),
                donated: Number(statusRows[0]?.donated_count || 0),
                sensitive_items: Number(statusRows[0]?.sensitive_items_count || 0)
            },
            categories: categoryRows
        };
    }
};

export default Item;