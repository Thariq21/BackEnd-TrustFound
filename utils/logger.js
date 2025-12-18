import ActivityLog from '../models/mongo/activityLog.js';

/**
 * Mencatat aktivitas ke MongoDB
 * @param {Object} actor - { id, role, name }
 * @param {String} action - Jenis aksi (e.g., 'REPORT_ITEM')
 * @param {Object} target - { entity, entityId, details }
 * @param {Object} req - Express request object (untuk ambil IP & User-Agent)
 * @param {Object} extraMeta - Metadata tambahan (opsional)
 */
export const logActivity = async (actor, action, target, req, extraMeta = {}) => {
    try {
        await ActivityLog.create({
            actor,
            action,
            target,
            metadata: {
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                ...extraMeta
            }
        });
        // Tidak perlu console.log agar terminal bersih, kecuali debug
    } catch (error) {
        console.error("❌ Failed to create activity log:", error.message);
        // Kita suppress error ini agar tidak mengganggu flow utama aplikasi
    }
};