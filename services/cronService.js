import cron from 'node-cron';
import Item from '../models/mysql/itemModel.js';

const initCronJobs = () => {
    console.log('⏰ Cron Job System Initialized...');

    // Jadwal: Dijalankan setiap hari jam 00:00 (Tengah Malam)
    // Format: "menit jam tanggal bulan hari"
    // "0 0 * * *" artinya menit ke-0, jam ke-0, setiap hari
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running Auto-Donate Check...');
        
        try {
            const affectedRows = await Item.archiveOldItems();
            
            if (affectedRows > 0) {
                console.log(`✅ Success: ${affectedRows} items moved to 'donated' status.`);
                
                // Opsional: Anda bisa menambahkan log ke MongoDB di sini 
                // tapi perlu membuat objek dummy actor 'System'
            } else {
                console.log('ℹ️ No items to donate today.');
            }
        } catch (error) {
            console.error('❌ Error in Auto-Donate Cron Job:', error);
        }
    });
};

export default initCronJobs;