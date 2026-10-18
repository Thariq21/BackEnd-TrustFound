import express from 'express';
import { getHomeSummary } from '../controllers/homeController.js';

const router = express.Router();

router.get('/', getHomeSummary);

export default router;
