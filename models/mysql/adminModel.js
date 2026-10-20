import db from '../../config/db_mysql.js';

const Admin = {
    // Mencari admin berdasarkan NIP (untuk login)
    findByNip: async (nip) => {
        const query = 'SELECT * FROM admin WHERE nip = ?';
        const [rows] = await db.execute(query, [nip]);
        return rows[0];
    },

    // Mencari admin berdasarkan Email
    findByEmail: async (email) => {
        const query = 'SELECT * FROM admin WHERE email = ?';
        const [rows] = await db.execute(query, [email]);
        return rows[0];
    },

    // Menambah admin baru
    create: async (adminData) => {
        const { nip, univ_id, full_name, password, email, role } = adminData;
        const query = `
            INSERT INTO admin (nip, univ_id, full_name, password, email, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [nip, univ_id, full_name, password, email, role || 'Admin_BEM']);
        return result;
    },

    // Mengambil semua admin
    findAll: async () => {
        const [rows] = await db.execute('SELECT nip, full_name, email, role FROM admin');
        return rows;
    },

    findAllEmails: async () => {
        const [rows] = await db.execute('SELECT email FROM admin WHERE email IS NOT NULL');
        return rows.map((row) => row.email);
    }
};

export default Admin;