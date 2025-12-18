import express from 'express';
import { getItems, getItemById, createItem } from '../controllers/itemController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { validate, itemValidation } from '../middleware/validation.js';

const router = express.Router();

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