import db from '../../config/db_mysql.js';

const Slot = {
    // Mendapatkan semua slot aktif
    findAll: async (dayOfWeek = null, includeInactive = false) => {
        let query = 'SELECT * FROM pickup_slot';
        if (!includeInactive) query += ' WHERE is_active = 1';
        const params = [];

        if (dayOfWeek) {
            query += includeInactive ? ' WHERE day_of_week = ?' : ' AND day_of_week = ?';
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

    create: async ({ day_of_week, slot_date, start_time, end_time, location, max_quota }) => {
        const [result] = await db.execute(
            `INSERT INTO pickup_slot
                (day_of_week, slot_date, start_time, end_time, location, max_quota, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [day_of_week, slot_date || null, start_time, end_time, location, max_quota]
        );
        return result;
    },

    update: async (slotId, { day_of_week, slot_date, start_time, end_time, location, max_quota, is_active }) => {
        const [result] = await db.execute(
            `UPDATE pickup_slot
             SET day_of_week = ?, slot_date = ?, start_time = ?, end_time = ?, location = ?, max_quota = ?, is_active = ?
             WHERE slot_id = ?`,
            [day_of_week, slot_date || null, start_time, end_time, location, max_quota, is_active, slotId]
        );
        return result;
    },

    deactivate: async (slotId) => {
        const [result] = await db.execute(
            'UPDATE pickup_slot SET is_active = 0 WHERE slot_id = ?',
            [slotId]
        );
        return result;
    },

    // Mendapatkan slot tersedia untuk tanggal tertentu
    // Menghitung kuota terpakai dari tabel claim
    getAvailableSlotsForDate: async (dateStr) => {
        const dateObj = new Date(`${dateStr}T00:00:00Z`);
        if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== dateStr) {
            throw new Error('Invalid date format. Expected YYYY-MM-DD');
        }

        // Dapatkan nama hari dalam bahasa Inggris (Monday, Tuesday, etc.)
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[dateObj.getUTCDay()];

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
                ps.slot_date,
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
            WHERE (ps.slot_date = ? OR (ps.slot_date IS NULL AND ps.day_of_week = ?))
              AND ps.is_active = 1
            GROUP BY ps.slot_id
            ORDER BY ps.start_time ASC
        `;

        const [rows] = await db.execute(query, [dateStr, dateStr, dayOfWeek]);

        return {
            date: dateStr,
            day_of_week: dayOfWeek,
            is_operational_day: true,
            slots: rows
        };
    }
};

export default Slot;
