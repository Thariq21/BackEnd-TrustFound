import Slot from '../models/mysql/slotModel.js';

const getSlotDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
        ? value
        : false;
};

const isCalendarDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validSlotInput = (body) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    const date = getSlotDate(body.date || body.slot_date);
    const day = date
        ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${date}T00:00:00Z`).getUTCDay()]
        : body.day_of_week;
    return date !== false &&
        days.includes(day) &&
        timePattern.test(body.start_time || '') &&
        timePattern.test(body.end_time || '') &&
        body.start_time < body.end_time &&
        Number.isInteger(Number(body.max_quota ?? 5)) &&
        Number(body.max_quota ?? 5) > 0 &&
        typeof (body.location || 'Lemari Kaca Lost & Found') === 'string' &&
        (body.is_active === undefined ||
            ['0', '1', 'true', 'false'].includes(String(body.is_active).toLowerCase()));
};

// @desc    Get all pickup slots or check availability for a specific date
// @route   GET /api/slots
// @access  Public / Private (Any authenticated user)
export const getSlots = async (req, res) => {
    try {
        const { date, day } = req.query;

        if (date) {
            if (!isCalendarDate(date)) {
                return res.status(400).json({ status: 'error', message: 'date must use YYYY-MM-DD format' });
            }
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

export const getAdminSlots = async (req, res) => {
    try {
        const slots = await Slot.findAll(req.query.day || null, true);
        return res.json({ status: 'success', count: slots.length, data: slots });
    } catch (error) {
        console.error('Could not fetch admin pickup slots:', error);
        return res.status(500).json({ status: 'error', message: 'Could not fetch pickup slots' });
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

export const createSlot = async (req, res) => {
    if (!validSlotInput(req.body)) {
        return res.status(400).json({ status: 'error', message: 'Invalid pickup slot details' });
    }
    try {
        const slotDate = getSlotDate(req.body.date || req.body.slot_date);
        const dayOfWeek = slotDate
            ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${slotDate}T00:00:00Z`).getUTCDay()]
            : req.body.day_of_week;
        const result = await Slot.create({
            ...req.body,
            day_of_week: dayOfWeek,
            slot_date: slotDate,
            location: req.body.location || 'Lemari Kaca Lost & Found',
            max_quota: Number(req.body.max_quota ?? 5)
        });
        const slot = await Slot.findById(result.insertId);
        return res.status(201).json({ status: 'success', data: slot });
    } catch (error) {
        console.error('Could not create pickup slot:', error);
        return res.status(500).json({ status: 'error', message: 'Could not create pickup slot' });
    }
};

export const updateSlot = async (req, res) => {
    try {
        const current = await Slot.findById(req.params.id);
        if (!current) {
            return res.status(404).json({ status: 'error', message: 'Pickup slot not found' });
        }
        const slotDate = req.body.date === undefined && req.body.slot_date === undefined
            ? getSlotDate(current.slot_date)
            : getSlotDate(req.body.date || req.body.slot_date);
        const dayOfWeek = slotDate
            ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${slotDate}T00:00:00Z`).getUTCDay()]
            : req.body.day_of_week || current.day_of_week;
        const next = { ...current, ...req.body, day_of_week: dayOfWeek, slot_date: slotDate };
        if (!validSlotInput(next)) {
            return res.status(400).json({ status: 'error', message: 'Invalid pickup slot details' });
        }
        const active = req.body.is_active === undefined
            ? Number(current.is_active)
            : ['1', 'true'].includes(String(req.body.is_active).toLowerCase()) ? 1 : 0;
        const result = await Slot.update(req.params.id, {
            start_time: next.start_time,
            day_of_week: dayOfWeek,
            slot_date: slotDate,
            end_time: next.end_time,
            location: next.location,
            max_quota: Number(next.max_quota),
            is_active: active
        });
        return res.json({ status: 'success', data: await Slot.findById(req.params.id) });
    } catch (error) {
        console.error('Could not update pickup slot:', error);
        return res.status(500).json({ status: 'error', message: 'Could not update pickup slot' });
    }
};

export const deactivateSlot = async (req, res) => {
    try {
        const current = await Slot.findById(req.params.id);
        if (!current) {
            return res.status(404).json({ status: 'error', message: 'Pickup slot not found' });
        }
        const result = await Slot.deactivate(req.params.id);
        if (result.affectedRows !== 1 && Number(current.is_active) === 1) {
            return res.status(409).json({ status: 'error', message: 'Pickup slot could not be deactivated' });
        }
        return res.json({ status: 'success', message: 'Pickup slot deactivated' });
    } catch (error) {
        console.error('Could not deactivate pickup slot:', error);
        return res.status(500).json({ status: 'error', message: 'Could not deactivate pickup slot' });
    }
};
