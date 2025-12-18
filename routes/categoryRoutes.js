import express from 'express';
import { getCategories } from '../controllers/categoryController.js';

const router = express.Router();

// Public access (untuk dropdown di frontend)
router.get('/', getCategories);

export default router;