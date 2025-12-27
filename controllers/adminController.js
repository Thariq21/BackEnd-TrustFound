import Item from '../models/mysql/itemModel.js';
import Claim from '../models/mysql/claimModel.js';
import Category from '../models/mysql/categoryModel.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logActivity } from '../utils/logger.js'; 

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
        if (status) filters.status = status;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

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

        await Item.updateStatus(itemId, 'secured', req.user.id);
        
        // Handle Perubahan Sensitivitas
        let sensitivityChanged = false;
        if (is_sensitive !== undefined) {
            const newSensitiveVal = (is_sensitive === 'true' || is_sensitive === true) ? 1 : 0;
            
            if (newSensitiveVal !== item.is_sensitive) {
                sensitivityChanged = true;
                const currentImagePath = item.image_path; 
                const currentFilename = path.basename(currentImagePath); 
                const uploadDirRelative = 'public/uploads/';
                const uploadDirAbsolute = path.join(__dirname, '../public/uploads/');

                // Identifikasi nama file asli (tanpa 'blur-')
                let originalFilename = currentFilename.startsWith('blur-') 
                    ? currentFilename.replace('blur-', '') 
                    : currentFilename;
                
                const originalFilePathAbsolute = path.join(uploadDirAbsolute, originalFilename);

                if (newSensitiveVal === 1) {
                    // --- KASUS: Jernih -> Blur ---
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
                    // --- KASUS: Blur -> Jernih (Unblur) ---
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

        // --- LOG ACTIVITY ---
        logActivity(
            { id: req.user.id, role: 'admin', name: 'Satpam/Admin' },
            'SECURE_ITEM',
            { entity: 'Item', entityId: itemId, details: 'Item marked as secured' },
            req,
            { is_sensitive_change: sensitivityChanged ? req.body?.is_sensitive : 'no change' }
        );
        // --------------------
        
        res.json({ status: 'success', message: 'Item marked as secured. Sensitivity updated.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
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
    const status = req.query.status || 'pending';

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
    const { status } = req.body; 
    const claimId = req.params.id;

    if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    try {
        await Claim.updateStatus(claimId, status, req.user.id);

        if (status === 'verified') {
            const claim = await Claim.findById(claimId);
            if (claim) {
                await Item.updateStatus(claim.item_id, 'claimed', req.user.id);
            }
        }

         // --- LOG ACTIVITY ---
        logActivity(
            { id: req.user.id, role: 'admin', name: 'Satpam/Admin' },
            status === 'verified' ? 'APPROVE_CLAIM' : 'REJECT_CLAIM',
            { entity: 'Claim', entityId: claimId, details: `Claim ${status}` },
            req
        );
        // --------------------

        res.json({ status: 'success', message: `Claim ${status} successfully` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};