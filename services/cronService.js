import cron from 'node-cron';
import Item from '../models/mysql/itemModel.js';
import dbMongo from '../config/db_mongo.js';

const initCronJobs = () => {
    console.log('⏰ Cron Job System Initialized...');

    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running Auto-Donate Check (90 days)...');
        
        try {
            const affectedRows = await Item.archiveOldItems();
            
            if (affectedRows > 0) {
                console.log(`✅ Success: ${affectedRows} items moved to 'donated' status.`);
                
                await dbMongo.collection('audit_trails').insertOne({
                    action: 'AUTO_ARCHIVE_ITEMS',
                    affected_count: affectedRows,
                    actor: 'System',
                    timestamp: new Date()
                });
            } else {
                console.log('ℹ️ No items to donate today.');
            }
        } catch (error) {
            console.error('❌ Error in Auto-Donate Cron Job:', error);
        }
    });
};

export default initCronJobs;