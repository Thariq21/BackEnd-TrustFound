import Item from '../models/mysql/itemModel.js';
import Claim from '../models/mysql/claimModel.js';
import Category from '../models/mysql/categoryModel.js';
import sharp from 'sharp';
import { logActivity } from '../utils/logger.js'; 
import { sendClaimDecisionEmailAsync, broadcastNewItemAsync } from '../services/emailService.js'; 
import User from '../models/mysql/userModel.js';
import ActivityLog from '../models/mongo/activityLog.js';

const parseVerificationQuestions = (value) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
        return { error: 'Provide between 1 and 10 verification questions' };
    }
    const questions = value.map((question) =>
        typeof question === 'string' ? question.trim() : ''
    );
    if (questions.some((question) => !question || question.length > 500)) {
        return { error: 'Each verification question must contain 1 to 500 characters' };
    }
    return { questions };
};

// @desc    Get all items for Admin Dashboard (Filterable)
// @route   GET /api/admin/items
// @access  Private (Admin BEM)
export const getAllItemsAdmin = async (req, res) => {
    // Ambil query params untuk filter
    const { status, startDate, endDate } = req.query;
    
    try {
        const filters = {};
        if (status && status !== 'all') filters.status = String(status).toLowerCase();
        if (req.query.review_status && req.query.review_status !== 'all') {
            filters.report_review_status = String(req.query.review_status).toLowerCase();
        }
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (req.query.report_type && req.query.report_type !== 'all') {
            filters.report_type = String(req.query.report_type).toLowerCase();
        }
        if (req.query.search || req.query.q) filters.search = req.query.search || req.query.q;

        // Panggil fungsi model khusus admin
        const items = await Item.findAllAdmin(filters);
        
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


export const secureItem = async (req, res) => {
    res.status(410).json({
        status: 'error',
        message: 'Item availability is set automatically when a report is accepted'
    });
};

export const approveItemReport = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ status: 'error', message: 'Report not found' });
        }
        let questions = [];
        if (item.report_type === 'found') {
            const parsed = parseVerificationQuestions(req.body?.questions);
            if (parsed.error) {
                return res.status(400).json({ status: 'error', message: parsed.error });
            }
            questions = parsed.questions;
        }

        const result = await Item.reviewReport(
            req.params.id,
            'accepted',
            req.user.id,
            null,
            null,
            questions
        );
        if (result.error === 'invalid_questions') {
            return res.status(400).json({
                status: 'error',
                message: 'Provide between 1 and 10 verification questions'
            });
        }
        if (result.affectedRows !== 1) {
            return res.status(409).json({ status: 'error', message: 'Only reports pending review can be accepted' });
        }

        logActivity(
            { id: req.user.id, role: req.user.role || 'Admin_BEM', name: 'Admin BEM' },
            'APPROVE_ITEM_REPORT',
            {
                entity: 'Item',
                entityId: req.params.id,
                details: 'Item report accepted'
            },
            req
        );

        const updatedItem = await Item.findById(req.params.id);
        if (updatedItem.report_type === 'found') {
            try {
                const allEmails = await User.findAllEmails();
                broadcastNewItemAsync(
                    updatedItem.item_id,
                    updatedItem.name,
                    allEmails,
                    updatedItem.image_path
                );
            } catch (emailError) {
                console.error('Could not notify students about the newly available item:', emailError);
            }
        }

        return res.json({
            status: 'success',
            message: 'Report accepted successfully',
            data: updatedItem
        });
    } catch (error) {
        console.error('Could not accept item report:', error);
        return res.status(500).json({ status: 'error', message: 'Could not accept item report' });
    }
};

export const configureItemVerificationQuestions = async (req, res) => {
    const parsed = parseVerificationQuestions(req.body?.questions);
    if (parsed.error) {
        return res.status(400).json({ status: 'error', message: parsed.error });
    }

    try {
        const result = await Item.configureVerificationQuestions(req.params.id, parsed.questions);
        if (result.error === 'questions_already_configured') {
            return res.status(409).json({
                status: 'error',
                message: 'Verification questions have already been configured for this item'
            });
        }
        if (result.error === 'item_unavailable') {
            return res.status(409).json({
                status: 'error',
                message: 'Questions can only be configured for accepted, available found items'
            });
        }

        logActivity(
            { id: req.user.id, role: req.user.role || 'Admin_BEM', name: 'Admin BEM' },
            'CONFIGURE_ITEM_VERIFICATION_QUESTIONS',
            {
                entity: 'Item',
                entityId: req.params.id,
                details: `Configured ${parsed.questions.length} ownership-verification questions`
            },
            req
        );

        const item = await Item.findById(req.params.id);
        return res.json({
            status: 'success',
            message: 'Verification questions saved',
            data: item
        });
    } catch (error) {
        console.error('Could not configure item verification questions:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Could not configure item verification questions'
        });
    }
};

export const rejectItemReport = async (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (!reason || reason.length > 255 || note.length > 2000) {
        return res.status(400).json({
            status: 'error',
            message: 'A rejection reason (max 255 characters) is required; the note must be 2000 characters or fewer'
        });
    }

    try {
        const result = await Item.rejectReport(req.params.id, req.user.id, reason, note);
        if (result.affectedRows !== 1) {
            const item = await Item.findById(req.params.id);
            if (!item) {
                return res.status(404).json({ status: 'error', message: 'Report not found' });
            }
            return res.status(409).json({ status: 'error', message: 'Only pending reports can be rejected' });
        }

        logActivity(
            { id: req.user.id, role: req.user.role || 'Admin_BEM', name: 'Admin BEM' },
            'REJECT_ITEM_REPORT',
            {
                entity: 'Item',
                entityId: req.params.id,
                details: `Report rejected: ${reason}`
            },
            req,
            { rejection_note: note || null }
        );

        return res.json({
            status: 'success',
            message: 'Report rejected successfully',
            data: await Item.findById(req.params.id)
        });
    } catch (error) {
        console.error('Could not reject item report:', error);
        return res.status(500).json({ status: 'error', message: 'Could not reject item report' });
    }
};

export const restoreRejectedItemReport = async (req, res) => {
    try {
        const result = await Item.restoreRejectedReport(req.params.id);
        if (result.affectedRows !== 1) {
            const item = await Item.findById(req.params.id);
            if (!item) {
                return res.status(404).json({ status: 'error', message: 'Report not found' });
            }
            return res.status(409).json({ status: 'error', message: 'Only rejected reports can be restored' });
        }

        logActivity(
            { id: req.user.id, role: req.user.role || 'Admin_BEM', name: 'Admin BEM' },
            'RESTORE_ITEM_REPORT',
            {
                entity: 'Item',
                entityId: req.params.id,
                details: 'Rejected report restored to pending review'
            },
            req
        );

        return res.json({
            status: 'success',
            message: 'Report restored to pending review',
            data: await Item.findById(req.params.id)
        });
    } catch (error) {
        console.error('Could not restore rejected item report:', error);
        return res.status(500).json({ status: 'error', message: 'Could not restore item report' });
    }
};

// --- BARU: Admin Upload Item Langsung ---
export const createItemAdmin = async (req, res) => {
    try {
        const {
            category_id,
            name,
            description,
            found_location,
            location,
            found_date,
            date,
            found_time,
            time
        } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ status: 'error', message: 'Please upload an image' });
        }

        const category = await Category.findById(category_id);
        if (!category) {
            return res.status(400).json({ status: 'error', message: 'Invalid category ID' });
        }

        const isSensitiveBool = category.default_sensitive === 1;
        let finalImagePath = `public/uploads/${file.filename}`;

        // Logic Auto-Blur tetap dijalankan jika kategori sensitif
        if (isSensitiveBool) {
            const blurredFilename = `blur-${file.filename}`;
            const blurredPath = `public/uploads/${blurredFilename}`;
            
            await sharp(file.path)
                .resize(500)
                .blur(20)
                .toFile(blurredPath);
            
            finalImagePath = blurredPath;
        }

        const newItem = {
            manage_nip: req.user.id, // Admin yang login
            category_id,
            name,
            description,
            location: found_location || location,
            is_sensitive: isSensitiveBool ? 1 : 0,
            report_date: found_date || date,
            report_time: found_time || time || null,
            image_path: finalImagePath
        };

        // Panggil Model Khusus Admin
        const result = await Item.createByAdmin(newItem);

        // --- LOG ACTIVITY ---
        logActivity(
            { id: req.user.id, role: req.user.role || 'Admin_BEM', name: 'Admin BEM' },
            'CREATE_ITEM_SECURED',
            { entity: 'Item', entityId: result.insertId, details: `Admin uploaded: ${name}` },
            req
        );
        // --------------------

        // --- ASYNC EMAIL BROADCAST ---
        try {
            const allEmails = await User.findAllEmails();
            broadcastNewItemAsync(result.insertId, name, allEmails, newItem.image_path);
        } catch (err) {
            console.error('Failed to trigger broadcast email', err);
        }
        // -----------------------------

        res.status(201).json({
            status: 'success',
            message: 'Item uploaded and made available successfully',
            data: { item_id: result.insertId, ...newItem, status: 'available' }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

export const getClaimsAdmin = async (req, res) => {
    // Ambil status dari query param, default 'pending' jika kosong
    // Opsi: 'all', 'pending', 'verified', 'rejected'
    const status = String(req.query.status || 'pending').toLowerCase();

    try {
        const claims = await Claim.findAllAdmin(status);
        
        res.json({ 
            status: 'success', 
            count: claims.length,
            filter: status,
            data: claims 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};


export const processClaim = async (req, res) => {
    const requestedStatus = String(req.body.status || req.body.decision || '').toLowerCase();
    const status = ['approved', 'approve'].includes(requestedStatus)
        ? 'verified'
        : requestedStatus;
    const reviewNote = req.body.review_note || req.body.reviewNote || req.body.reason || null;
    const claimId = req.params.id;

    if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    try {
        const result = await Claim.review(claimId, status, req.user.id, reviewNote);
        if (result.error === 'item_unavailable') {
            return res.status(409).json({
                status: 'error',
                message: 'Only available found items can be approved'
            });
        }
        if (result.error === 'item_already_approved') {
            return res.status(409).json({
                status: 'error',
                message: 'Another claim for this item has already been approved'
            });
        }
        if (result.error === 'claim_unavailable') {
            return res.status(409).json({
                status: 'error',
                message: 'Claim was not found or is no longer awaiting review'
            });
        }
        if (result.affectedRows !== 1) {
            return res.status(409).json({
                status: 'error',
                message: 'Claim was not found or is no longer awaiting review'
            });
        }

        // removed premature Item.updateStatus(..., 'claimed') because item should only be 'claimed' when QR is validated

         // --- LOG ACTIVITY ---
        logActivity(
            { id: req.user.id, role: req.user.role || 'Admin_BEM', name: 'Admin BEM' },
            status === 'verified' ? 'APPROVE_CLAIM' : 'REJECT_CLAIM',
            { entity: 'Claim', entityId: claimId, details: `Claim ${status}` },
            req
        );
        // --------------------

        // --- ASYNC EMAIL ---
        try {
            const claim = await Claim.findById(claimId);
            if (claim && claim.claimer_email) {
                sendClaimDecisionEmailAsync(claim.claimer_email, claimId, claim.item_name, status, claim.item_image_path);
            }
        } catch (e) {
            console.error('Failed to trigger email', e);
        }

        res.json({ status: 'success', message: `Claim ${status} successfully` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

// @desc    Deprecated batch status transition
// @route   PUT /api/admin/items/batch-secure
// @access  Private (Admin)
export const batchSecureItems = async (req, res) => {
    res.status(410).json({
        status: 'error',
        message: 'Batch securing is no longer required; accepted found reports are available automatically'
    });
};

// @desc    Get dashboard metrics and statistics for Admin BEM (FR-08)
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
export const getDashboardStats = async (req, res) => {
    try {
        const itemStats = await Item.getDashboardItemStats();
        const claimStats = await Claim.getDashboardClaimStats();
        
        let recentLogs = [];
        try {
            recentLogs = await ActivityLog.find({}, { limit: 10, sort: { timestamp: -1 } });
        } catch (logErr) {
            console.warn('Could not fetch activity logs for dashboard stats:', logErr.message);
        }

        res.status(200).json({
            status: 'success',
            data: {
                items: itemStats.summary,
                categories: itemStats.categories,
                claims: claimStats,
                recent_activities: recentLogs
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};