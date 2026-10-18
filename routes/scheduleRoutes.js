import express from 'express';
import { scheduleClaimPickup } from '../controllers/claimController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, scheduleClaimPickup);

export default router;
