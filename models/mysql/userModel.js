import db from '../../config/db_mysql.js';

const User = {
    // Mencari user berdasarkan NIM (untuk login/validasi)
    findByNim: async (nim) => {
        const [rows] = await db.execute('SELECT * FROM general_user WHERE nim = ?', [nim]);
        return rows[0];
    },

    // Mencari user berdasarkan email (opsional, jika login by email)
    findByEmail: async (email) => {
        const [rows] = await db.execute('SELECT * FROM general_user WHERE email = ?', [email]);
        return rows[0];
    },

    // Menambah user baru (Register)
    create: async (userData) => {
        const { nim, univ_id, full_name, email, phone_number, password, status } = userData;
        const query = `
            INSERT INTO general_user (nim, univ_id, full_name, email, phone_number, password, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [nim, univ_id, full_name, email, phone_number, password, status]);
        return result;
    }
};

export default User;