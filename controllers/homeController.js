import Item from '../models/mysql/itemModel.js';

export const getHomeSummary = async (req, res) => {
    try {
        const data = await Item.getHomeSummary();
        return res.json({ status: 'success', data });
    } catch (error) {
        console.error('Could not load home summary:', error);
        return res.status(500).json({ status: 'error', message: 'Could not load home summary' });
    }
};
