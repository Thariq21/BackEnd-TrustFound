import ActivityLog from '../models/mongo/activityLog.js';

// @desc    Get activity logs (Admin only)
// @route   GET /api/admin/logs
// @access  Private (Admin)
export const getLogs = async (req, res) => {
    try {
        const { role, action, startDate, endDate, limit } = req.query;
        
        let filter = {};
        
        // Filter by Role Actor
        if (role) {
            filter['actor.role'] = role;
        }

        // Filter by Action Type
        if (action) {
            filter.action = action;
        }
        
        // Filter by Date Range
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) {
                // Set end date to end of day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.timestamp.$lte = end;
            }
        }

        // Opsi Query
        const options = {
            limit: parseInt(limit) || 100, // Default 100, bisa diubah via query ?limit=50
            sort: { timestamp: -1 } // Terbaru paling atas
        };

        const logs = await ActivityLog.find(filter, options);

        res.json({ 
            status: 'success', 
            count: logs.length, 
            data: logs 
        });

    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};