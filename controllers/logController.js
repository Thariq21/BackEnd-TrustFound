import ActivityLog from '../models/mongo/activityLog.js';

// @desc    Get activity logs (Admin only)
// @route   GET /api/admin/logs
// @access  Private (Admin)
export const getLogs = async (req, res) => {
    try {
        const role = req.query.role;
        const action = req.query.action || req.query.eventType;
        const startDate = req.query.startDate || req.query.dateFrom;
        const endDate = req.query.endDate || req.query.dateTo;
        const actorId = req.query.actorId || req.query.actor;
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), 500)
            : 100;
        let filter = {};
        
        // Filter by Role Actor
        if (role) {
            filter['actor.role'] = role;
        }
        if (actorId) {
            const numericActorId = Number(actorId);
            filter['actor.id'] = Number.isSafeInteger(numericActorId)
                ? { $in: [String(actorId), numericActorId] }
                : String(actorId);
        }

        // Filter by Action Type
        if (action) {
            filter.action = action;
        }
        
        // Filter by Date Range
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) {
                const start = new Date(startDate);
                if (Number.isNaN(start.getTime())) {
                    return res.status(400).json({ status: 'error', message: 'dateFrom must be a valid date' });
                }
                filter.timestamp.$gte = start;
            }
            if (endDate) {
                // Set end date to end of day
                const end = new Date(endDate);
                if (Number.isNaN(end.getTime())) {
                    return res.status(400).json({ status: 'error', message: 'dateTo must be a valid date' });
                }
                end.setHours(23, 59, 59, 999);
                filter.timestamp.$lte = end;
            }
        }

        const options = {
            limit,
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