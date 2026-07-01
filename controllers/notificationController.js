import User from '../models/mysql/userModel.js';
import { broadcastNewItemAsync } from '../services/emailService.js';

// @desc    Broadcast a new found item to all users
// @route   POST /api/v2/notifications/broadcast
// @access  Private (Admin/Satpam)
export const broadcastNewItem = async (req, res) => {
    try {
        const { itemDetails } = req.body;

        if (!itemDetails || !itemDetails.name) {
            return res.status(400).json({ status: 'error', message: 'Item details with a name are required' });
        }

        // Fetch all user emails
        const emails = await User.findAllEmails();

        if (!emails || emails.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No registered user emails found' });
        }

        // Trigger Async Email (Fire and forget)
        broadcastNewItemAsync(emails, itemDetails);

        res.status(202).json({
            status: 'success',
            message: 'Broadcast notification process has been started'
        });
    } catch (error) {
        console.error('Error broadcasting new item:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};
