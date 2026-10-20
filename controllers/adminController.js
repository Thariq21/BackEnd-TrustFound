import Item from '../models/mysql/itemModel.js';
import Claim from '../models/mysql/claimModel.js';
import Category from '../models/mysql/categoryModel.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logActivity } from '../utils/logger.js'; 
import { sendClaimDecisionEmailAsync, broadcastNewItemAsync } from '../services/emailService.js'; 
import User from '../models/mysql/userModel.js';
import ActivityLog from '../models/mongo/activityLog.js';
// Setup __dirname untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get all items for Admin Dashboard (Filterable)
// @route   GET /api/admin/items
// @access  Private (Admin/Satpam)
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
    // FIX: Tambahkan fallback "|| {}" untuk mencegah error jika req.body undefined
    const { is_sensitive } = req.body || {}; 
    const itemId = req.params.id;

    try {
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ status: 'error', message: 'Item not found' });
        }
        if (item.report_type !== 'found') {
            return res.status(409).json({ status: 'error', message: 'Lost-item reports cannot be secured as found property' });
        }
        if (item.report_review_status !== 'accepted') {
            return res.status(409).json({ status: 'error', message: 'Only accepted reports can be secured' });
        }
        if (item.status !== 'pending') {
            return res.status(409).json({ status: 'error', message: 'Only pending found reports can be secured' });
        }

        const secureResult = await Item.securePendingFoundReport(itemId, req.user.id);
        if (secureResult.affectedRows !== 1) {
            return res.status(409).json({ status: 'error', message: 'Report status changed before it could be secured' });
        }
        
        // Handle Perubahan Sensitivitas
        let sensitivityChanged = false;
        if (is_sensitive !== undefined) {
            const newSensitiveVal = (is_sensitive === 'true' || is_sensitive === true) ? 1 : 0;
            
            if (newSensitiveVal !== item.is_sensitive) {
                sensitivityChanged = true;
                if (!item.image_path) {
                    await Item.updateDetails(itemId, { is_sensitive: newSensitiveVal });
                } else {
                    const currentImagePath = item.image_path;
                    const currentFilename = path.basename(currentImagePath);
                    const uploadDirRelative = 'public/uploads/';
                    const uploadDirAbsolute = path.join(__dirname, '../public/uploads/');

                    let originalFilename = currentFilename.startsWith('blur-')
                        ? currentFilename.replace('blur-', '')
                        : currentFilename;

                    const originalFilePathAbsolute = path.join(uploadDirAbsolute, originalFilename);

                    if (newSensitiveVal === 1) {
                        if (fs.existsSync(originalFilePathAbsolute)) {
                            const blurredFilename = `blur-${originalFilename}`;
                            const blurredPathAbsolute = path.join(uploadDirAbsolute, blurredFilename);
                            const blurredPathRelative = path.join(uploadDirRelative, blurredFilename);

                            await sharp(originalFilePathAbsolute)
                                .resize(500)
                                .blur(20)
                                .toFile(blurredPathAbsolute);

                            await Item.updateDetails(itemId, {
                                is_sensitive: 1,
                                image_path: blurredPathRelative
                            });
                        } else {
                            console.warn(`File asli tidak ditemukan: ${originalFilePathAbsolute}`);
                            await Item.updateDetails(itemId, { is_sensitive: 1 });
                        }
                    } else {
                        if (fs.existsSync(originalFilePathAbsolute)) {
                            const originalPathRelative = path.join(uploadDirRelative, originalFilename);

                            await Item.updateDetails(itemId, {
                                is_sensitive: 0,
                                image_path: originalPathRelative
                            });
                        } else {
                            console.warn(`Gagal Unblur. File asli hilang: ${originalFilePathAbsolute}`);
                            await Item.updateDetails(itemId, { is_sensitive: 0 });
                        }
                    }
                }
            }
        }

        // --- LOG ACTIVITY ---
        logActivity(
            { id: req.user.id, role: 'admin', name: 'Satpam/Admin' },
            'SECURE_ITEM',
            { entity: 'Item', entityId: itemId, details: 'Item marked as secured' },
            req,
            { is_sensitive_change: sensitivityChanged ? req.body?.is_sensitive : 'no change' }
        );
        // --------------------
        
        // --- ASYNC EMAIL BROADCAST ---
        try {
            const allEmails = await User.findAllEmails();
            // Fetch updated item to get the correct image path (blurred or clear)
            const updatedItem = await Item.findById(itemId);
            broadcastNewItemAsync(itemId, item.name, allEmails, updatedItem ? updatedItem.image_path : null);
        } catch (err) {
            console.error('Failed to trigger broadcast email', err);
        }
        // -----------------------------
        
        res.json({ status: 'success', message: 'Item marked as secured. Sensitivity updated.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

export const approveItemReport = async (req, res) => {
    try {
        const result = await Item.reviewReport(req.params.id, 'accepted', req.user.id);
        if (result.affectedRows !== 1) {
            const item = await Item.findById(req.params.id);
            if (!item) {
                return res.status(404).json({ status: 'error', message: 'Report not found' });
            }
            return res.status(409).json({ status: 'error', message: 'Only reports pending review can be accepted' });
        }

        logActivity(
            { id: req.user.id, role: req.user.role, name: 'Admin' },
            'APPROVE_ITEM_REPORT',
            {
                entity: 'Item',
                entityId: req.params.id,
                details: 'Item report accepted'
            },
            req
        );

        return res.json({
            status: 'success',
            message: 'Report accepted successfully',
            data: await Item.findById(req.params.id)
        });
    } catch (error) {
        console.error('Could not accept item report:', error);
        return res.status(500).json({ status: 'error', message: 'Could not accept item report' });
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
            { id: req.user.id, role: req.user.role, name: 'Admin' },
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
            { id: req.user.id, role: req.user.role, name: 'Admin' },
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
        const { category_id, name, description, found_location, found_date } = req.body;
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
            found_location,
            is_sensitive: isSensitiveBool ? 1 : 0,
            found_date,
            image_path: finalImagePath
        };

        // Panggil Model Khusus Admin
        const result = await Item.createByAdmin(newItem);

        // --- LOG ACTIVITY ---
        logActivity(
            { id: req.user.id, role: req.user.role, name: 'Admin' },
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
            message: 'Item uploaded and secured successfully by Admin',
            data: { item_id: result.insertId, ...newItem, status: 'secured' }
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
                message: 'Only secured found items can be approved'
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
            { id: req.user.id, role: 'admin', name: 'Satpam/Admin' },
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

// @desc    Batch move items from Pos Satpam to Glass Cabinet (Tersedia di Lemari) (FR-07)
// @route   PUT /api/admin/items/batch-secure
// @access  Private (Admin)
export const batchSecureItems = async (req, res) => {
    try {
        const { item_ids } = req.body || {};
        const pendingItems = await Item.findAllAdmin({
            status: 'pending',
            report_type: 'found',
            report_review_status: 'accepted'
        });
        const selectedItems = Array.isArray(item_ids) && item_ids.length > 0
            ? pendingItems.filter((item) => item_ids.map(String).includes(String(item.item_id)))
            : pendingItems;

        const affectedRows = await Item.batchUpdateStatus(item_ids, 'secured', req.user.id);

        if (affectedRows > 0) {
            const allEmails = await User.findAllEmails();
            selectedItems.forEach((item) => {
                broadcastNewItemAsync(item.item_id, item.name, allEmails, item.image_path);
            });
        }

        // Log Activity
        logActivity(
            { id: req.user.id, role: 'admin', name: 'Admin BEM' },
            'BATCH_SECURE_ITEMS',
            {
                entity: 'Item',
                details: `Moved ${affectedRows} items from Pos Satpam to Glass Cabinet (Tersedia di Lemari)`
            },
            req,
            { item_ids: item_ids || 'all_pending', affected_rows: affectedRows }
        );

        res.status(200).json({
            status: 'success',
            message: `Successfully moved ${affectedRows} item(s) to Tersedia di Lemari.`,
            data: {
                affected_rows: affectedRows
            }
        });
    } catch (error) {
        console.error('Error in batch securing items:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
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