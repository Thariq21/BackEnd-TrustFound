import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });
dotenv.config();

async function connectMySQL() {
    let lastError;
    for (let attempt = 1; attempt <= 30; attempt += 1) {
        const connection = await mysql.createPool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        try {
            const testConnection = await connection.getConnection();
            testConnection.release();
            console.log('✅ MySQL Connected: ' + process.env.DB_NAME);
            return connection;
        } catch (error) {
            lastError = error;
            await connection.end();
            console.error(`MySQL connection attempt ${attempt}/30 failed: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
    throw new Error(`MySQL connection failed after retries: ${lastError?.message || 'unknown error'}`);
}

// Top-level await untuk inisialisasi
const dbMySQL = await connectMySQL();

export default dbMySQL;
