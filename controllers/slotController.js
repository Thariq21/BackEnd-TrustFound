import Slot from '../models/mysql/slotModel.js';

// @desc    Get all pickup slots or check availability for a specific date
// @route   GET /api/slots
// @access  Public / Private (Any authenticated user)
export const getSlots = async (req, res) => {
    try {
        const { date, day } = req.query;

        if (date) {
            const availability = await Slot.getAvailableSlotsForDate(date);
            return res.status(200).json({
                status: 'success',
                data: availability
            });
        }

        const slots = await Slot.findAll(day || null);
        return res.status(200).json({
            status: 'success',
            count: slots.length,
            data: slots
        });
    } catch (error) {
        console.error('Error fetching pickup slots:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Server Error'
        });
    }
};

// @desc    Get pickup slot by ID
// @route   GET /api/slots/:id
// @access  Public / Private
export const getSlotById = async (req, res) => {
    try {
        const { id } = req.params;
        const slot = await Slot.findById(id);

        if (!slot) {
            return res.status(404).json({
                status: 'error',
                message: 'Pickup slot not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: slot
        });
    } catch (error) {
        console.error('Error fetching slot by ID:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server Error'
        });
    }
};
