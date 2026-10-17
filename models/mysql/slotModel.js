import db from '../../config/db_mysql.js';

const Slot = {
    // Mendapatkan semua slot aktif
    findAll: async (dayOfWeek = null) => {
        let query = 'SELECT * FROM pickup_slot WHERE is_active = 1';
        const params = [];

        if (dayOfWeek) {
            query += ' AND day_of_week = ?';
            params.push(dayOfWeek);
        }

        query += ' ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"), start_time ASC';

        const [rows] = await db.execute(query, params);
        return rows;
    },

    // Mencari slot berdasarkan ID
    findById: async (slotId) => {
        const query = 'SELECT * FROM pickup_slot WHERE slot_id = ?';
        const [rows] = await db.execute(query, [slotId]);
        return rows[0];
    },

    // Mendapatkan slot tersedia untuk tanggal tertentu
    // Menghitung kuota terpakai dari tabel claim
    getAvailableSlotsForDate: async (dateStr) => {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date format. Expected YYYY-MM-DD');
        }

        // Dapatkan nama hari dalam bahasa Inggris (Monday, Tuesday, etc.)
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[dateObj.getDay()];

        if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') {
            return {
                date: dateStr,
                day_of_week: dayOfWeek,
                is_operational_day: false,
                message: 'Jadwal operasional serah-terima lemari kaca hanya berlaku hari Senin - Jumat.',
                slots: []
            };
        }

        // Query slot aktif untuk hari tersebut beserta jumlah pemesanan pada tanggal tersebut
        const query = `
            SELECT 
                ps.slot_id,
                ps.day_of_week,
                ps.start_time,
                ps.end_time,
                ps.location,
                ps.max_quota,
                COUNT(c.claim_id) AS booked_count,
                (ps.max_quota - COUNT(c.claim_id)) AS available_quota,
                CASE 
                    WHEN (ps.max_quota - COUNT(c.claim_id)) > 0 THEN 1 
                    ELSE 0 
                END AS is_available
            FROM pickup_slot ps
            LEFT JOIN claim c ON ps.slot_id = c.scheduled_slot_id 
                AND c.scheduled_date = ? 
                AND c.status IN ('scheduled', 'claimed')
            WHERE ps.day_of_week = ? AND ps.is_active = 1
            GROUP BY ps.slot_id
            ORDER BY ps.start_time ASC
        `;

        const [rows] = await db.execute(query, [dateStr, dayOfWeek]);

        return {
            date: dateStr,
            day_of_week: dayOfWeek,
            is_operational_day: true,
            slots: rows
        };
    }
};

export default Slot;
