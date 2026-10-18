import User from '../models/mysql/userModel.js';
import Claim from '../models/mysql/claimModel.js';
import Item from '../models/mysql/itemModel.js';

export const getProfile = async (req, res) => {
    try {
        const user = await User.findProfileByNim(req.user.id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'Student profile not found' });
        }

        const [claims, reports] = await Promise.all([
            Claim.findByClaimerNim(req.user.id),
            Item.findByReporter(req.user.id)
        ]);

        return res.json({
            status: 'success',
            data: { user, claims, reports }
        });
    } catch (error) {
        console.error('Could not load user profile:', error);
        return res.status(500).json({ status: 'error', message: 'Could not load profile' });
    }
};
