import dbMongo from '../../config/db_mongo.js';

const collectionName = 'activity_logs';

const ActivityLog = {
    // Menambah log baru
    create: async (logData) => {
        const collection = dbMongo.collection(collectionName);
        
        // Tambahkan timestamp otomatis jika belum ada
        const newLog = {
            ...logData,
            timestamp: logData.timestamp || new Date()
        };

        const result = await collection.insertOne(newLog);
        return result;
    },

    // Mencari log dengan filter, sort, dan limit
    find: async (filter = {}, options = {}) => {
        const collection = dbMongo.collection(collectionName);
        const { sort = { timestamp: -1 }, limit = 100 } = options;

        const logs = await collection.find(filter)
            .sort(sort)
            .limit(limit)
            .toArray();
            
        return logs;
    }
};

export default ActivityLog;