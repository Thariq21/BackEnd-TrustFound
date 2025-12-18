import Claim from '../models/mysql/claimModel.js';
import Item from '../models/mysql/itemModel.js';
import { logActivity } from '../utils/logger.js';

// @desc    Create a claim for an item
// @route   POST /api/claims
// @access  Private (User)
export const createClaim = async (req, res) => {
    const { item_id, challange_answer } = req.body;

    try {
        // 1. Cek apakah item ada
        const item = await Item.findById(item_id);
        if (!item) {
            return res.status(404).json({ status: 'error', message: 'Item not found' });
        }

        // 2. Validasi Challenge Answer berdasarkan Sensitivitas
        let finalAnswer = challange_answer;

        // Jika barang SENSITIF, jawaban wajib ada
        if (item.is_sensitive === 1) {
            if (!challange_answer || challange_answer.trim() === "") {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'This is a sensitive item. You must provide a challenge answer (e.g., detail ciri-ciri).' 
                });
            }
        } else {
            // Jika TIDAK SENSITIF, jawaban opsional. Jika kosong, kita isi default agar tidak error di database
            if (!challange_answer || challange_answer.trim() === "") {
                finalAnswer = "- (Non-sensitive item)";
            }
        }

        // 3. Cek apakah user sudah pernah klaim item ini
        const existingClaims = await Claim.findByItemId(item_id);
        // Pastikan req.user.id (NIM) tipenya sama dengan di DB (int/string)
        // Kita konversi ke string untuk perbandingan yang aman
        const userClaim = existingClaims.find(c => String(c.claimer_nim) === String(req.user.id));
        
        if (userClaim) {
             return res.status(400).json({ status: 'error', message: 'You have already claimed this item' });
        }

        const newClaim = {
            claimer_nim: req.user.id,
            item_id,
            challange_answer: finalAnswer,
            status: 'pending'
        };

        const result = await Claim.create(newClaim);

         // 2. --- LOG ACTIVITY (USER CLAIM) ---
        logActivity(
            { id: req.user.id, role: 'user', name: 'Mahasiswa' }, // Actor
            'CLAIM_ITEM',                                         // Action
            {                                                     // Target
                entity: 'Claim', 
                entityId: result.insertId, // ID Klaim yang baru
                details: `Claiming Item ID: ${item_id} (${item.name})` 
            },
            req
        );
        // ------------------------------------

        res.status(201).json({
            status: 'success',
            message: 'Claim submitted successfully. Please visit the security post for verification.'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

export const getMyClaims = async (req, res) => {
    try {
        // req.user.id berasal dari token JWT (isinya NIM mahasiswa)
        const claims = await Claim.findByClaimerNim(req.user.id);
        
        // Kita modifikasi sedikit image_path agar lengkap dengan URL server
        // Asumsi server jalan di localhost:5000, sesuaikan di frontend nanti atau di sini
        // Untuk sekarang kita kirim path relatifnya saja
        
        res.json({ 
            status: 'success', 
            data: claims 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};