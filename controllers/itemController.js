import Item from '../models/mysql/itemModel.js';
import Category from '../models/mysql/categoryModel.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { logActivity } from '../utils/logger.js';

const getReportFile = (req) =>
    req.file || req.files?.image?.[0] || req.files?.photo?.[0] || null;

const removeUpload = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return;
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error(`Could not remove uploaded file ${filePath}:`, error);
    }
};

const isValidDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const getCategory = async (body) => {
    const categoryId = body.category_id;
    if (categoryId) return Category.findById(categoryId);

    const requestedCategory = String(body.category || '').toLowerCase();
    if (!['general', 'sensitive', 'umum'].includes(requestedCategory) &&
        requestedCategory !== 'sensitif') return null;

    const categories = await Category.findAll();
    return categories.find(
        (category) => Boolean(Number(category.default_sensitive)) ===
            ['sensitive', 'sensitif'].includes(requestedCategory)
    ) || null;
};

const storeItemReport = async (
    req,
    res,
    { reportType = 'found', intake = false, requireTime = false } = {}
) => {
    const file = getReportFile(req);
    const body = req.body || {};
    const {
        name,
        description = '',
        found_location,
        lost_location,
        location,
        found_date,
        lost_date,
        date,
        report_time,
        found_time,
        lost_time,
        time
    } = body;

    if (!file && !intake) {
        return res.status(400).json({ status: 'error', message: 'A JPG or PNG photo is required' });
    }
    const reportLocation = reportType === 'lost'
        ? lost_location || location
        : found_location || location;
    const reportDate = reportType === 'lost'
        ? lost_date || date || new Date().toISOString().slice(0, 10)
        : found_date || date || new Date().toISOString().slice(0, 10);
    const reportTime = reportType === 'lost'
        ? lost_time || report_time || time || null
        : found_time || report_time || time || null;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof reportLocation !== 'string' ||
        !reportLocation.trim() ||
        !isValidDate(reportDate) ||
        (requireTime && !timePattern.test(reportTime || '')) ||
        (reportTime && !timePattern.test(reportTime))
    ) {
        removeUpload(file?.path);
        return res.status(400).json({
            status: 'error',
            message: 'Name, location, and a valid YYYY-MM-DD report date are required'
        });
    }

    try {
        const category = await getCategory(body);
        if (!category) {
            removeUpload(file?.path);
            return res.status(400).json({ status: 'error', message: 'A valid category is required' });
        }

        const sensitive = Boolean(Number(category.default_sensitive));
        const blurredFilename = file ? `blur-${file.filename}` : null;
        const blurredPath = file ? path.join(path.dirname(file.path), blurredFilename) : null;
        const imagePath = !file
            ? null
            : sensitive
                ? `public/uploads/${blurredFilename}`
                : `public/uploads/${file.filename}`;

        if (sensitive && file) {
            await sharp(file.path).resize(500).blur(20).toFile(blurredPath);
        }

        const normalizedType = String(reportType).toLowerCase();
        const report = {
            finder_nim: intake ? null : req.user.id,
            manage_nip: intake ? req.user.id : null,
            report_type: normalizedType,
            category_id: category.category_id,
            name: name.trim(),
            description: String(description).trim(),
            location: reportLocation.trim(),
            is_sensitive: sensitive ? 1 : 0,
            report_date: reportDate,
            report_time: reportTime,
            image_path: imagePath
        };
        report.report_review_status = intake ? 'accepted' : 'pending';

        const initialStatus = normalizedType === 'lost' ? 'active' : 'available';
        const result = intake
            ? await Item.createByAdmin({ ...report, status: initialStatus })
            : await Item.create(report);
        const itemId = result.insertId;

        logActivity(
            {
                id: req.user.id,
                role: req.user.role,
                name: intake ? 'Admin' : 'Mahasiswa'
            },
            intake ? 'RECORD_INTAKE' : 'REPORT_ITEM',
            {
                entity: 'Item',
                entityId: itemId,
                details: `${normalizedType} report: ${name}`
            },
            req
        );

        return res.status(201).json({
            status: 'success',
            message: intake ? 'Intake recorded successfully' : 'Item report submitted successfully',
            data: {
                item_id: itemId,
                ...report,
                [normalizedType === 'lost' ? 'lost_location' : 'found_location']: report.location,
                [normalizedType === 'lost' ? 'lost_date' : 'found_date']: report.report_date,
                [normalizedType === 'lost' ? 'lost_time' : 'found_time']: report.report_time,
                status: initialStatus
            }
        });
    } catch (error) {
        if (file) {
            removeUpload(file.path);
            removeUpload(path.join(path.dirname(file.path), `blur-${file.filename}`));
        }
        console.error('Could not save item report:', error);
        return res.status(500).json({ status: 'error', message: 'Could not save item report' });
    }
};

export const getItems = async (req, res) => {
    const status = String(req.query.status || 'catalog').toLowerCase();
    const { category_id, startDate, endDate } = req.query;
    const statusAliases = {
        waiting_at_security: 'active',
        pending: 'active',
        secured: 'available'
    };
    const requestedStatus = statusAliases[status] || status;
    const category = String(req.query.category || '').toLowerCase();
    const requestedType = String(req.query.report_type || req.query.type || 'all').toLowerCase();
    const reportTypeAliases = { hilang: 'lost', temuan: 'found' };
    const reportType = reportTypeAliases[requestedType] || requestedType;

    if (
        (startDate && !isValidDate(startDate)) ||
        (endDate && !isValidDate(endDate)) ||
        (reportType !== 'all' && !['found', 'lost'].includes(reportType)) ||
        (category && !['general', 'sensitive', 'umum', 'sensitif'].includes(category))
    ) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid catalog filters'
        });
    }

    try {
        const filters = {
            category_id,
            category,
            startDate,
            endDate,
            search: req.query.search || req.query.q,
            report_type: reportType
        };

        const items = await Item.findAll(requestedStatus, filters);
        res.json({ 
            status: 'success',
            count: items.length,
            data: items 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

export const getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (item && item.report_review_status === 'accepted') {
            res.json({ status: 'success', data: item });
        } else {
            res.status(404).json({ status: 'error', message: 'Item not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

export const createItem = async (req, res) => {
    return storeItemReport(req, res, { reportType: 'found' });
};

export const createItemReport = async (req, res) => {
    const body = req.body || {};
    const reportType = String(body.type || body.reportType || body.report_type || '').toLowerCase();
    if (!['found', 'lost'].includes(reportType)) {
        const file = getReportFile(req);
        if (file) removeUpload(file.path);
        return res.status(400).json({ status: 'error', message: 'Report type must be "found" or "lost"' });
    }

    return storeItemReport(req, res, { reportType, requireTime: true });
};

export const createIntake = async (req, res) =>
    storeItemReport(req, res, { reportType: 'found', intake: true, requireTime: true });