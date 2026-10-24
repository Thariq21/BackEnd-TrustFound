import db from '../../config/db_mysql.js';

const Report = {
    // 1. Laporan Barang Masuk (Semua yang dilaporkan pada periode ini)
    getFoundItemsReport: async (startDate, endDate) => {
        const query = `
            SELECT 
                DATE_FORMAT(fi.found_date, '%Y-%m-%d') as date,
                i.name as item_name,
                c.name as category,
                fi.found_location,
                i.status,
                COALESCE(u.full_name, 'Admin BEM') as reporter_name,
                COALESCE(u.nim, '-') as reporter_nim
            FROM item i
            JOIN found_item fi ON fi.item_id = i.item_id
            LEFT JOIN category c ON i.category_id = c.category_id
            LEFT JOIN general_user u ON i.finder_nim = u.nim
            WHERE i.report_type = 'found'
            AND fi.found_date BETWEEN ? AND ?
            ORDER BY fi.found_date ASC
        `;
        const [rows] = await db.execute(query, [startDate, endDate]);
        return rows;
    },

    // 2. Laporan Barang Keluar (Claim Verified pada periode ini)
    getClaimedItemsReport: async (startDate, endDate) => {
        // Kita filter berdasarkan tanggal klaim disetujui (processed_at)
        const query = `
            SELECT 
                DATE_FORMAT(cl.processed_at, '%Y-%m-%d') as date,
                i.name as item_name,
                u.full_name as claimer_name,
                u.nim as claimer_nim,
                a.full_name as validator_name
            FROM claim cl
            JOIN item i ON cl.item_id = i.item_id
            JOIN general_user u ON cl.claimer_nim = u.nim
            LEFT JOIN admin a ON cl.validator_nip = a.nip
            WHERE cl.status = 'verified' 
            AND cl.processed_at BETWEEN ? AND ?
            ORDER BY cl.processed_at ASC
        `;
        const [rows] = await db.execute(query, [startDate, endDate]);
        return rows;
    },

    // 3. Laporan Barang Donasi
    // Catatan: Karena kita belum punya kolom 'donated_at', kita ambil item status 'donated'
    // yang DITEMUKAN pada rentang waktu ini (asumsi: barang bulan ini yang tidak diambil)
    getDonatedItemsReport: async (startDate, endDate) => {
        const query = `
            SELECT 
                DATE_FORMAT(fi.found_date, '%Y-%m-%d') as found_date,
                i.name as item_name,
                c.name as category,
                i.description
            FROM item i
            JOIN found_item fi ON fi.item_id = i.item_id
            LEFT JOIN category c ON i.category_id = c.category_id
            WHERE i.report_type = 'found'
            AND i.status = 'donated'
            AND fi.found_date BETWEEN ? AND ?
            ORDER BY fi.found_date ASC
        `;
        const [rows] = await db.execute(query, [startDate, endDate]);
        return rows;
    }
};

export default Report;