import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: './config/config.env' });

async function connectMySQL() {
    try {
        const connection = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test koneksi
        await connection.getConnection();
        console.log('✅ MySQL Connected: ' + process.env.DB_NAME);
        
        return connection;
    } catch (error) {
        if (error.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('DATABASE CONNECTION WAS CLOSED');
        } else if (error.code === 'ER_CON_COUNT_ERROR') {
            console.error('DATABASE HAS TO MANY CONNECTIONS');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('DATABASE CONNECTION WAS REFUSED');
        } else {
            console.error('MySQL Connection Error:', error.message);
        }
        // Opsional: throw error jika ingin aplikasi berhenti saat DB gagal connect
        // process.exit(1); 
    }
}

// Top-level await untuk inisialisasi
const dbMySQL = await connectMySQL();

export default dbMySQL;