import db from '../../config/db_mysql.js';

const Category = {
    // Mengambil semua kategori untuk dropdown di frontend
    findAll: async () => {
        const query = 'SELECT * FROM category';
        const [rows] = await db.execute(query);
        return rows;
    },

    // Mencari kategori berdasarkan ID untuk cek default_sensitive
    findById: async (id) => {
        const query = 'SELECT * FROM category WHERE category_id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }
};

export default Category;