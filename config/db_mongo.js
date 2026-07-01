import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars dengan path absolut
dotenv.config({ path: path.join(__dirname, 'config.env') });

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;

if (!uri) {
    console.error('❌ Error: MONGO_URI is not defined in config.env');
    process.exit(1);
}

let dbInstance = null;

async function connectMongoDB() {
    if (dbInstance) return dbInstance;

    try {
        const client = new MongoClient(uri);
        await client.connect();
        
        console.log(`✅ MongoDB Connected to database: ${dbName}`);
        
        dbInstance = client.db(dbName);
        return dbInstance;
    } catch (error) {
        console.error(`❌ Error MongoDB: ${error.message}`);
        process.exit(1);
    }
}

// Top-level await (Node.js 14+)
const dbMongo = await connectMongoDB();

export default dbMongo;