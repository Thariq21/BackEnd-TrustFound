import express from 'express';
import { getItems, getItemById, createItem, createItemReport } from '../controllers/itemController.js';
import { createClaim } from '../controllers/claimController.js';
import { evidenceUpload } from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { validate, itemValidation } from '../middleware/validation.js';

const router = express.Router();
const reportUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]);

router.post('/reports', protect, reportUpload, createItemReport);
router.post('/:itemId/claims', protect, evidenceUpload.single('evidence'), createClaim);

// Public routes (Bisa diakses siapa saja atau mungkin perlu login user biasa)
// Kita buat public dulu untuk melihat daftar, tapi detail mungkin butuh login
router.get('/', getItems);
router.get('/:id', getItemById);

// Protected routes (Hanya User/Mahasiswa yang login)
router.post('/', 
    protect, 
    upload.single('image'), // Middleware upload foto (field name: 'image')
    itemValidation,         // Validasi input (name, description, dll)
    validate,               // Cek hasil validasi
    createItem              // Controller
);

export default router;