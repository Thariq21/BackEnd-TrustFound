import express from 'express';
import { broadcastNewItem } from '../controllers/notificationController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/v2/notifications/broadcast
// Requires Admin/Satpam
router.post('/broadcast', protect, adminOnly, broadcastNewItem);

export default router;
