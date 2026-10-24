import express from 'express';
import { createClaim, getClaimEvidence, getMyClaims, scheduleClaimPickup } from '../controllers/claimController.js';
import { getClaimsAdmin, processClaim } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { evidenceUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Semua rute claim butuh login user
router.use(protect);

router.get('/', (req, res, next) => {
    if (['Admin_BEM', 'Admin_BEM'].includes(req.user.role)) {
        return getClaimsAdmin(req, res, next);
    }
    return getMyClaims(req, res, next);
});
router.post('/', evidenceUpload.single('evidence'), createClaim);
router.get('/my', getMyClaims);
router.post('/:id/schedule', scheduleClaimPickup);
router.get('/:id/evidence', adminOnly, getClaimEvidence);
router.patch('/:id', adminOnly, processClaim);

export default router;