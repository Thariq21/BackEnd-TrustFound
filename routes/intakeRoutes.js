import express from 'express';
import { createIntake } from '../controllers/itemController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();
const intakeUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]);

router.post('/', protect, adminOnly, intakeUpload, createIntake);

export default router;
