import express from 'express';
import { getQRToken, validateQR } from '../controllers/claimV2Controller.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id', protect, (req, res) => {
    req.params.claim_id = req.params.id;
    return getQRToken(req, res);
});
router.post('/validate', protect, adminOnly, (req, res) => {
    req.body.qr_token = req.body.qr_token || req.body.qrValue;
    return validateQR(req, res);
});

export default router;
