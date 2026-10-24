import db from '../../config/db_mysql.js';



export const mapDisplayStatus = (status, reportType = 'found') => {
    switch (status) {
        case 'active': return reportType === 'lost' ? 'Laporan aktif' : 'Tersedia';
        case 'available': return 'Tersedia';
        case 'pending': return reportType === 'lost' ? 'Laporan aktif' : 'Tersedia';
        case 'secured': return 'Tersedia';
        case 'claimed': return 'Diklaim';
        case 'donated': return 'Didonasikan';
        default: return status;
    }
};

const withDisplayStatus = (item) => {
    if (!item) return item;
    return {
        ...item,
        display_status: mapDisplayStatus(item.status, item.report_type),
        image_url: item.image_path
            ? `/uploads/${item.image_path.split(/[\\/]/).pop()}`
            : null
    };
};

const itemDetailsSelect = `
    fi.found_location,
    fi.found_date,
    fi.found_time,
    li.lost_location,
    li.lost_date,
    li.lost_time,
    COALESCE(fi.found_location, li.lost_location) AS location,
    COALESCE(fi.found_date, li.lost_date) AS report_date,
    COALESCE(fi.found_time, li.lost_time) AS report_time
`;

const itemDetailsJoins = `
    LEFT JOIN found_item fi ON fi.item_id = i.item_id
    LEFT JOIN lost_item li ON li.item_id = i.item_id
`;

const createItemWithDetails = async (itemData) => {
    const {
        finder_nim = null,
        manage_nip = null,
        report_type = 'found',
        report_review_status = 'pending',
        category_id,
        name,
        description,
        location,
        report_date,
        report_time = null,
        is_sensitive,
        image_path,
        status = report_type === 'lost' ? 'active' : 'available'
    } = itemData;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
            `INSERT INTO item (
                finder_nim, report_type, report_review_status, category_id, name, description,
                is_sensitive, image_path, status, manage_nip
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finder_nim,
                report_type,
                report_review_status,
                category_id,
                name,
                description,
                is_sensitive,
                image_path,
                status,
                manage_nip
            ]
        );
        const detailTable = report_type === 'lost' ? 'lost_item' : 'found_item';
        const locationColumn = report_type === 'lost' ? 'lost_location' : 'found_location';
        const dateColumn = report_type === 'lost' ? 'lost_date' : 'found_date';
        const timeColumn = report_type === 'lost' ? 'lost_time' : 'found_time';
        await connection.execute(
            `INSERT INTO ${detailTable} (item_id, ${locationColumn}, ${dateColumn}, ${timeColumn})
             VALUES (?, ?, ?, ?)`,
            [result.insertId, location, report_date, report_time]
        );
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const Item = {
    findAll: async (status = 'catalog', filters = {}) => {
        // Query dasar dengan JOIN kategori
        let query = `
            SELECT i.*, ${itemDetailsSelect}, c.name as category_name
            FROM item i
            ${itemDetailsJoins}
            LEFT JOIN category c ON i.category_id = c.category_id
            WHERE 1=1
              AND i.report_review_status = 'accepted'
        `;
        
        const params = [];

        // 1. Filter Status
        if (status === 'catalog') {
            query += " AND ((i.report_type = 'found' AND i.status IN ('available','claimed')) OR (i.report_type = 'lost' AND i.status = 'active'))";
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
            query += ' AND (i.name LIKE ? OR i.description LIKE ? OR COALESCE(fi.found_location, li.lost_location) LIKE ?)';
            const search = `%${filters.search}%`;
            params.push(search, search, search);
        }

        // 3. Filter Rentang Tanggal
        if (filters.startDate) {
            query += ' AND COALESCE(fi.found_date, li.lost_date) >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND COALESCE(fi.found_date, li.lost_date) <= ?';
            params.push(filters.endDate);
        }

        // Urutkan dari yang terbaru
        query += ' ORDER BY COALESCE(fi.found_date, li.lost_date) DESC, i.item_id DESC';

        const [rows] = await db.execute(query, params);
        return rows.map(withDisplayStatus);
    },

    findAllAdmin: async (filters = {}) => {
        let query = `
            SELECT 
                i.*, 
                ${itemDetailsSelect},
                c.name as category_name, 
                u.full_name as finder_name,
                u.full_name as reporter_name,
                u.nim as reporter_nim,
                a.full_name as manage_admin_name,
                (SELECT COUNT(*) FROM item_verification_question ivq WHERE ivq.item_id = i.item_id) AS claim_question_count
            FROM item i
            ${itemDetailsJoins}
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
            query += ' AND (i.name LIKE ? OR i.description LIKE ? OR COALESCE(fi.found_location, li.lost_location) LIKE ?)';
            const search = `%${filters.search}%`;
            params.push(search, search, search);
        }

        if (filters.startDate) {
            query += ' AND COALESCE(fi.found_date, li.lost_date) >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND COALESCE(fi.found_date, li.lost_date) <= ?';
            params.push(filters.endDate);
        }

        query += ' ORDER BY COALESCE(fi.found_date, li.lost_date) DESC, i.item_id DESC';

        const [rows] = await db.execute(query, params);
        return rows.map(withDisplayStatus);
    },

    findById: async (id) => {
        const query = `
            SELECT i.*, ${itemDetailsSelect}, c.name as category_name, u.full_name as finder_name
            FROM item i
            ${itemDetailsJoins}
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN general_user u ON i.finder_nim = u.nim
            WHERE i.item_id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        if (!rows[0]) return undefined;
        const [questions] = await db.execute(
            `SELECT question_text FROM item_verification_question
             WHERE item_id = ? ORDER BY question_order`,
            [id]
        );
        return withDisplayStatus({
            ...rows[0],
            claim_questions: questions.map(({ question_text }) => question_text)
        });
    },

    findByReporter: async (nim) => {
        const [rows] = await db.execute(
            `SELECT i.*, ${itemDetailsSelect}, c.name AS category_name
             FROM item i
             ${itemDetailsJoins}
             LEFT JOIN category c ON i.category_id = c.category_id
             WHERE i.finder_nim = ?
             ORDER BY COALESCE(fi.found_date, li.lost_date) DESC, i.item_id DESC`,
            [nim]
        );
        return rows.map(withDisplayStatus);
    },

    getHomeSummary: async () => {
        const [rows] = await db.execute(
            `SELECT
                COUNT(*) AS catalog_count,
                SUM(CASE WHEN report_type = 'lost' THEN 1 ELSE 0 END) AS lost_report_count,
                SUM(CASE WHEN report_type = 'found' AND status = 'available' THEN 1 ELSE 0 END) AS available_found_count
             FROM item
                WHERE report_review_status = 'accepted'
                  AND ((report_type = 'found' AND status IN ('available','claimed'))
                   OR (report_type = 'lost' AND status = 'active'))`
        );
        const items = await Item.findAll('catalog');
        return {
            ...rows[0],
            recent_items: items.slice(0, 6)
        };
    },

    create: async (itemData) => {
        return createItemWithDetails(itemData);
    },

    // --- FITUR BARU: Auto Donate ---
    archiveOldItems: async () => {
        // Find available found items older than 90 days with no active claims.
        const query = `
            UPDATE item i
            JOIN found_item fi ON fi.item_id = i.item_id
            LEFT JOIN claim c ON i.item_id = c.item_id AND c.status IN ('pending', 'verified', 'scheduled')
            SET i.status = 'donated'
            WHERE i.status = 'available'
            AND i.report_type = 'found'
            AND i.report_review_status = 'accepted'
            AND fi.found_date < DATE_SUB(NOW(), INTERVAL 90 DAY)
            AND c.claim_id IS NULL
        `;
        
        const [result] = await db.execute(query);
        return result.affectedRows;
    },

    createByAdmin: async (itemData) => {
        return createItemWithDetails({
            ...itemData,
            finder_nim: null,
            report_review_status: 'accepted',
            status: itemData.status || 'available'
        });
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

    reviewReport: async (itemId, decision, adminNip, reason = null, note = null, questions = []) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [items] = await connection.execute(
                'SELECT report_type FROM item WHERE item_id = ? AND report_review_status = ? FOR UPDATE',
                [itemId, 'pending']
            );
            if (!items.length) {
                await connection.rollback();
                return { affectedRows: 0 };
            }

            if (decision === 'accepted' && items[0].report_type === 'found') {
                if (!Array.isArray(questions) || questions.length < 1 || questions.length > 10) {
                    await connection.rollback();
                    return { error: 'invalid_questions' };
                }
                await connection.execute(
                    'DELETE FROM item_verification_question WHERE item_id = ?',
                    [itemId]
                );
                for (const [index, question] of questions.entries()) {
                    await connection.execute(
                        `INSERT INTO item_verification_question (item_id, question_order, question_text)
                         VALUES (?, ?, ?)`,
                        [itemId, index + 1, question]
                    );
                }
            }

            const [result] = await connection.execute(
                `UPDATE item
                 SET report_review_status = ?,
                     status = CASE
                         WHEN ? = 'accepted' AND report_type = 'found' THEN 'available'
                         WHEN ? = 'accepted' AND report_type = 'lost' THEN 'active'
                         ELSE status
                     END,
                     reviewed_by = ?,
                     reviewed_at = CURRENT_TIMESTAMP,
                     rejection_reason = ?,
                     rejection_note = ?,
                     manage_nip = ?
                 WHERE item_id = ? AND report_review_status = 'pending'`,
                [decision, decision, decision, adminNip, reason, note, adminNip, itemId]
            );
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    configureVerificationQuestions: async (itemId, questions) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [items] = await connection.execute(
                `SELECT item_id FROM item
                 WHERE item_id = ? AND report_type = 'found'
                   AND report_review_status = 'accepted' AND status = 'available'
                 FOR UPDATE`,
                [itemId]
            );
            if (!items.length) {
                await connection.rollback();
                return { error: 'item_unavailable' };
            }

            const [existing] = await connection.execute(
                'SELECT question_id FROM item_verification_question WHERE item_id = ? LIMIT 1',
                [itemId]
            );
            if (existing.length) {
                await connection.rollback();
                return { error: 'questions_already_configured' };
            }

            for (const [index, question] of questions.entries()) {
                await connection.execute(
                    `INSERT INTO item_verification_question (item_id, question_order, question_text)
                     VALUES (?, ?, ?)`,
                    [itemId, index + 1, question]
                );
            }
            await connection.commit();
            return { affectedRows: questions.length };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
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
                SUM(CASE WHEN report_review_status = 'accepted' AND report_type = 'found' AND status = 'available' THEN 1 ELSE 0 END) as available_found_count,
                SUM(CASE WHEN report_review_status = 'accepted' AND report_type = 'lost' AND status = 'active' THEN 1 ELSE 0 END) as active_lost_count,
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
                available_found: Number(statusRows[0]?.available_found_count || 0),
                active_lost: Number(statusRows[0]?.active_lost_count || 0),
                claimed: Number(statusRows[0]?.claimed_count || 0),
                donated: Number(statusRows[0]?.donated_count || 0),
                sensitive_items: Number(statusRows[0]?.sensitive_items_count || 0)
            },
            categories: categoryRows
        };
    }
};

export default Item;