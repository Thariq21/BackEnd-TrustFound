import express from 'express';
import { 
    getAllItemsAdmin, 
    secureItem, 
    getClaimsAdmin,
    processClaim 
} from '../controllers/adminController.js';
import { getLogs } from '../controllers/logController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

// Items
router.get('/items', getAllItemsAdmin);
router.put('/items/:id/secure', secureItem); 

// Claims
// GET /api/admin/claims?status=pending (Default)
// GET /api/admin/claims?status=all
// GET /api/admin/claims?status=verified
// GET /api/admin/claims?status=rejected
router.get('/claims', getClaimsAdmin); 

router.put('/claims/:id/process', processClaim);

// --- System Logs (MongoDB) ---
// GET /api/admin/logs
// GET /api/admin/logs?role=user
// GET /api/admin/logs?action=LOGIN
router.get('/logs', getLogs);

export default router;