import express from 'express';
import { getQRToken, validateQR } from '../controllers/claimV2Controller.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/v2/claims/:claim_id/qr-token
// Requires JWT (General User)
router.get('/:claim_id/qr-token', protect, getQRToken);

// POST /api/v2/claims/validate-qr
// Requires JWT (Admin_BEM role)
router.post('/validate-qr', protect, adminOnly, validateQR);

export default router;
