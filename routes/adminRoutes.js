import express from 'express';
import { 
    getAllItemsAdmin, 
    secureItem, 
    createItemAdmin,
    batchSecureItems,
    getDashboardStats,
    getClaimsAdmin,
    processClaim,
    approveItemReport,
    configureItemVerificationQuestions,
    rejectItemReport,
    restoreRejectedItemReport
} from '../controllers/adminController.js';
import { getLogs } from '../controllers/logController.js';
import { createSlot, deactivateSlot, getAdminSlots, updateSlot } from '../controllers/slotController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; // Import upload handler
import { validate, itemValidation } from '../middleware/validation.js'; // Import validator
import { generateMonthlyReport } from '../controllers/reportController.js'; //

const router = express.Router();

router.use(protect);
router.use(adminOnly);

// --- Dashboard Statistics (FR-08) ---
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard', getDashboardStats);
router.get('/audit', getLogs);

router.get('/slots', getAdminSlots);
router.post('/slots', createSlot);
router.patch('/slots/:id', updateSlot);
router.delete('/slots/:id', deactivateSlot);

// --- Items Management ---

// 1. Get All Items (Dashboard)
router.get('/items', getAllItemsAdmin);

// 2. Batch Secure Items (Move from Pos Satpam to Glass Cabinet) (FR-07)
router.put('/items/batch-secure', batchSecureItems);

// 2. Admin Upload Item (Langsung Secured)
// Menggunakan itemValidation yang sama dengan user karena field-nya mirip (name, desc, location, dll)
router.post('/items', 
    upload.single('image'), 
    itemValidation, // Sama dengan validasi user
    validate, 
    createItemAdmin
);

// 3. Secure Item (Verifikasi barang dari user)
router.put('/items/:id/secure', secureItem); 
router.patch('/items/:id/approve', approveItemReport);
router.put('/items/:id/verification-questions', configureItemVerificationQuestions);
router.patch('/items/:id/reject', rejectItemReport);
router.patch('/items/:id/restore', restoreRejectedItemReport);


// --- Claims Management ---
router.get('/claims', getClaimsAdmin); 
router.put('/claims/:id/process', processClaim);

// --- Logs ---
router.get('/logs', getLogs);

// --- Reports ---
// Endpoint untuk download laporan bulanan (PDF)
// Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/reports/monthly', generateMonthlyReport);

export default router;