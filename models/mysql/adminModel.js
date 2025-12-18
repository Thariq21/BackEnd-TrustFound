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
        const [result] = await db.execute(query, [nip, univ_id, full_name, password, email, role]);
        return result;
    },

    // Mengambil semua admin (opsional, untuk superadmin)
    findAll: async () => {
        const [rows] = await db.execute('SELECT nip, full_name, email, role FROM admin');
        return rows;
    }
};

export default Admin;