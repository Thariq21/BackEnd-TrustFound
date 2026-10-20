import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars dengan path absolut
dotenv.config({ path: path.join(__dirname, "config.env") });
dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;

if (!uri) throw new Error("MONGO_URI is not defined");

let dbInstance = null;

async function connectMongoDB() {
  if (dbInstance) return dbInstance;

  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const client = new MongoClient(uri);
      await client.connect();
      console.log(`✅ MongoDB Connected to database: ${dbName}`);
      dbInstance = client.db(dbName);
      return dbInstance;
    } catch (error) {
      lastError = error;
      console.error(`MongoDB connection attempt ${attempt}/30 failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`MongoDB connection failed after retries: ${lastError?.message || 'unknown error'}`);
}

// Top-level await (Node.js 14+)
const dbMongo = await connectMongoDB();

export default dbMongo;
