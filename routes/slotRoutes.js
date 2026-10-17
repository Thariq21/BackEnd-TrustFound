import express from 'express';
import { getSlots, getSlotById } from '../controllers/slotController.js';

const router = express.Router();

router.get('/', getSlots);
router.get('/:id', getSlotById);

export default router;
