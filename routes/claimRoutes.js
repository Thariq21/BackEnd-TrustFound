import express from 'express';
import { createClaim, getMyClaims } from '../controllers/claimController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate, claimValidation } from '../middleware/validation.js';

const router = express.Router();

// Semua rute claim butuh login user
router.use(protect);

router.post('/', claimValidation, validate, createClaim);
router.get('/my', getMyClaims);

export default router;