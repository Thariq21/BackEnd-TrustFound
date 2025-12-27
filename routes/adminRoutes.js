import express from 'express';
import { 
    getAllItemsAdmin, 
    secureItem, 
    createItemAdmin, // Import controller baru
    getClaimsAdmin,
    processClaim 
} from '../controllers/adminController.js';
import { getLogs } from '../controllers/logController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; // Import upload handler
import { validate, itemValidation } from '../middleware/validation.js'; // Import validator

const router = express.Router();

router.use(protect);
router.use(adminOnly);

// --- Items Management ---

// 1. Get All Items (Dashboard)
router.get('/items', getAllItemsAdmin);

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


// --- Claims Management ---
router.get('/claims', getClaimsAdmin); 
router.put('/claims/:id/process', processClaim);

// --- Logs ---
router.get('/logs', getLogs);

export default router;