import Item from '../models/mysql/itemModel.js';
import Category from '../models/mysql/categoryModel.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { logActivity } from '../utils/logger.js';

// @desc    Get all items (with optional filters: status, category, date)
// @route   GET /api/items
// @access  Public
export const getItems = async (req, res) => {
    // Ambil parameter dari query URL
    // Default status 'pending', tapi bisa di-override user (misal: ?status=all atau ?status=secured)
    const status = req.query.status || 'pending'; 
    
    // Ambil filter tambahan
    const { category_id, startDate, endDate } = req.query;

    try {
        // Bungkus filter dalam object
        const filters = {
            category_id,
            startDate,
            endDate
        };

        // Panggil model dengan status dan filters
        const items = await Item.findAll(status, filters);
        
        res.json({ 
            status: 'success', 
            count: items.length, // Tambahkan info jumlah data
            data: items 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

// ... (Sisa fungsi getItemById dan createItem tetap sama) ...

export const getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (item) {
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
            finder_nim: req.user.id,
            category_id,
            name,
            description,
            found_location,
            is_sensitive: isSensitiveBool ? 1 : 0,
            found_date,
            image_path: finalImagePath
        };

        const result = await Item.create(newItem);

        // --- LOG ACTIVITY ---
        // req.user.id adalah NIM (dari middleware protect)
        // Kita butuh nama user, tapi di req.user mungkin cuma ada ID & Role.
        // Opsi: Fetch user lagi atau simpan nama di token. 
        // Untuk efisiensi, kita bisa pakai 'User' string saja atau fetch jika perlu.
        // Di sini saya asumsikan cukup ID dulu atau Anda bisa update middleware auth untuk include nama.
        
        logActivity(
            { id: req.user.id, role: 'user', name: 'Mahasiswa' }, // Idealnya ambil nama asli
            'REPORT_ITEM',
            { entity: 'Item', entityId: result.insertId, details: name },
            req
        );
        // --------------------

        res.status(201).json({
            status: 'success',
            message: 'Item reported successfully',
            data: { item_id: result.insertId, ...newItem }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};