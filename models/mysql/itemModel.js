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
        display_status: mapDisplayStatus(item.status),
        image_url: item.image_path
            ? `/uploads/${item.image_path.split(/[\\/]/).pop()}`
            : null
    };
};

const Item = {
    findAll: async (status = 'catalog', filters = {}) => {
        // Query dasar dengan JOIN kategori
        let query = `
            SELECT i.*, c.name as category_name 
            FROM item i
            LEFT JOIN category c ON i.category_id = c.category_id
            WHERE 1=1
              AND i.report_review_status = 'accepted'
        `;
        
        const params = [];

        // 1. Filter Status
        if (status === 'catalog') {
            query += " AND ((i.report_type = 'found' AND i.status IN ('pending','secured')) OR (i.report_type = 'lost' AND i.status = 'pending'))";
        } else if (status === 'scheduled') {
            query += " AND EXISTS (SELECT 1 FROM claim c WHERE c.item_id = i.item_id AND c.status = 'scheduled')";
        } else if (status && status !== 'all') {
            query += ' AND i.status = ?';
            params.push(status);
        }

        // 2. Filter Kategori
        if (filters.category_id) {
            query += ' AND i.category_id = ?';
            params.push(filters.category_id);
        }

        if (filters.category === 'general' || filters.category === 'umum') {
            query += ' AND c.default_sensitive = 0';
        } else if (filters.category === 'sensitive' || filters.category === 'sensitif') {
            query += ' AND c.default_sensitive = 1';
        }

        if (filters.report_type && filters.report_type !== 'all') {
            query += ' AND i.report_type = ?';
            params.push(filters.report_type);
        }

        if (filters.search) {
            query += ' AND (i.name LIKE ? OR i.description LIKE ? OR i.found_location LIKE ?)';
            const search = `%${filters.search}%`;
            params.push(search, search, search);
        }

        // 3. Filter Rentang Tanggal
        if (filters.startDate) {
            query += ' AND i.found_date >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND i.found_date <= ?';
            params.push(filters.endDate);
        }

        // Urutkan dari yang terbaru
        query += ' ORDER BY i.found_date DESC, i.item_id DESC';

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

        if (filters.report_review_status) {
            query += ' AND i.report_review_status = ?';
            params.push(filters.report_review_status);
        }

        if (filters.report_type && filters.report_type !== 'all') {
            query += ' AND i.report_type = ?';
            params.push(filters.report_type);
        }

        if (filters.category === 'general' || filters.category === 'umum') {
            query += ' AND c.default_sensitive = 0';
        } else if (filters.category === 'sensitive' || filters.category === 'sensitif') {
            query += ' AND c.default_sensitive = 1';
        }

        if (filters.search) {
            query += ' AND (i.name LIKE ? OR i.description LIKE ? OR i.found_location LIKE ?)';
            const search = `%${filters.search}%`;
            params.push(search, search, search);
        }

        if (filters.startDate) {
            query += ' AND i.found_date >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND i.found_date <= ?';
            params.push(filters.endDate);
        }

        query += ' ORDER BY i.found_date DESC, i.item_id DESC';

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

    findByReporter: async (nim) => {
        const [rows] = await db.execute(
            `SELECT i.*, c.name AS category_name
             FROM item i
             LEFT JOIN category c ON i.category_id = c.category_id
             WHERE i.finder_nim = ?
             ORDER BY i.found_date DESC, i.item_id DESC`,
            [nim]
        );
        return rows.map(withDisplayStatus);
    },

    getHomeSummary: async () => {
        const [rows] = await db.execute(
            `SELECT
                COUNT(*) AS catalog_count,
                SUM(CASE WHEN report_type = 'lost' THEN 1 ELSE 0 END) AS lost_report_count,
                SUM(CASE WHEN report_type = 'found' AND status = 'secured' THEN 1 ELSE 0 END) AS available_found_count
             FROM item
                WHERE report_review_status = 'accepted'
                  AND ((report_type = 'found' AND status IN ('pending','secured'))
                   OR (report_type = 'lost' AND status = 'pending'))`
        );
        const items = await Item.findAll('catalog');
        return {
            ...rows[0],
            recent_items: items.slice(0, 6)
        };
    },

    create: async (itemData) => {
        const {
            finder_nim, category_id, name, description, 
            found_location, is_sensitive, found_date, report_time, image_path,
            report_type = 'found'
        } = itemData;

        const query = `
            INSERT INTO item (
                finder_nim, report_type, report_review_status, category_id, name, description,
                found_location, is_sensitive, found_date, report_time, image_path, status, manage_nip
            )
            VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'pending', NULL)
        `;
        
        const [result] = await db.execute(query, [
            finder_nim ?? null, report_type, category_id, name, description,
            found_location, is_sensitive, found_date, report_time || null, image_path
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
            AND i.report_type = 'found'
            AND i.found_date < DATE_SUB(NOW(), INTERVAL 90 DAY)
            AND c.claim_id IS NULL
        `;
        
        const [result] = await db.execute(query);
        return result.affectedRows;
    },

    createByAdmin: async (itemData) => {
        const {
            category_id, name, description, 
            found_location, is_sensitive, found_date, report_time, image_path, manage_nip,
            report_type = 'found', status = 'secured'
        } = itemData;

        const query = `
            INSERT INTO item (
                finder_nim, report_type, report_review_status, category_id, name, description,
                found_location, is_sensitive, found_date, report_time, image_path, status, manage_nip
            )
            VALUES (NULL, ?, 'accepted', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [
            report_type, category_id, name, description,
            found_location, is_sensitive, found_date, report_time || null, image_path,
            status, manage_nip
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

    securePendingFoundReport: async (itemId, adminNip) => {
        const [result] = await db.execute(
            `UPDATE item
             SET status = 'secured', manage_nip = ?
             WHERE item_id = ? AND report_type = 'found'
               AND report_review_status = 'accepted' AND status = 'pending'`,
            [adminNip, itemId]
        );
        return result;
    },

    reviewReport: async (itemId, decision, adminNip, reason = null, note = null) => {
        const [result] = await db.execute(
            `UPDATE item
             SET report_review_status = ?,
                 reviewed_by = ?,
                 reviewed_at = CURRENT_TIMESTAMP,
                 rejection_reason = ?,
                 rejection_note = ?,
                 manage_nip = ?
             WHERE item_id = ? AND report_review_status = 'pending'`,
            [decision, adminNip, reason, note, adminNip, itemId]
        );
        return result;
    },

    rejectReport: async (itemId, adminNip, reason, note) => {
        return Item.reviewReport(itemId, 'rejected', adminNip, reason, note || null);
    },

    restoreRejectedReport: async (itemId) => {
        const [result] = await db.execute(
            `UPDATE item
             SET report_review_status = 'pending',
                 reviewed_by = NULL,
                 reviewed_at = NULL,
                 rejection_reason = NULL,
                 rejection_note = NULL,
                 manage_nip = NULL
             WHERE item_id = ? AND report_review_status = 'rejected'`,
            [itemId]
        );
        return result;
    },

    // Batch update status (misal memindahkan batch barang dari Pos Satpam ke Lemari Kaca) - FR-07
    batchUpdateStatus: async (itemIds, newStatus, adminNip) => {
        let query;
        let params;
        if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            query = `UPDATE item SET status = ?, manage_nip = ? WHERE report_type = 'found' AND report_review_status = 'accepted' AND status = 'pending' AND item_id IN (${placeholders})`;
            params = [newStatus, adminNip, ...itemIds];
        } else {
            query = `UPDATE item SET status = ?, manage_nip = ? WHERE status = 'pending' AND report_type = 'found' AND report_review_status = 'accepted'`;
            params = [newStatus, adminNip];
        }
        const [result] = await db.execute(query, params);
        return result.affectedRows;
    },

    updateDetails: async (itemId, updateData) => {
        const fields = [];
        const params = [];
        if (updateData.is_sensitive !== undefined) {
            fields.push('is_sensitive = ?');
            params.push(updateData.is_sensitive);
        }
        if (updateData.image_path !== undefined) {
            fields.push('image_path = ?');
            params.push(updateData.image_path);
        }
        if (fields.length === 0) return { affectedRows: 0 };
        params.push(itemId);
        const [result] = await db.execute(
            `UPDATE item SET ${fields.join(', ')} WHERE item_id = ?`,
            params
        );
        return result;
    },

    // Statistik dashboard untuk Item (FR-08)
    getDashboardItemStats: async () => {
        const statusQuery = `
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN report_review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_reports_count,
                SUM(CASE WHEN report_review_status = 'pending' THEN 1 ELSE 0 END) as pending_review_reports_count,
                SUM(CASE WHEN report_review_status = 'accepted' AND report_type = 'found' AND status = 'pending' THEN 1 ELSE 0 END) as waiting_security_post_count,
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
                pending_review_reports: Number(statusRows[0]?.pending_review_reports_count || 0),
                rejected_reports: Number(statusRows[0]?.rejected_reports_count || 0),
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