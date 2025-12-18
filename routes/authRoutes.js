import express from 'express';
import { registerUser, loginUser, loginAdmin } from '../controllers/authController.js';
import { validate, registerValidation } from '../middleware/validation.js';

const router = express.Router();

// Rute untuk Mahasiswa (User)
router.post('/register', registerValidation, validate, registerUser);
router.post('/login', loginUser);

// Rute untuk Admin/Satpam
router.post('/admin/login', loginAdmin);

export default router;