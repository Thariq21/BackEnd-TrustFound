import Claim from '../models/mysql/claimModel.js';
import Item from '../models/mysql/itemModel.js';
import User from '../models/mysql/userModel.js';
import Slot from '../models/mysql/slotModel.js';
import { logActivity } from '../utils/logger.js';
import { sendClaimPendingEmailAsync, sendClaimScheduledEmailAsync } from '../services/emailService.js';

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

        // 3. --- ASYNC EMAIL ---
        try {
            const user = await User.findByNim(req.user.id);
            if (user && user.email) {
                sendClaimPendingEmailAsync(user.email, result.insertId, item.name, item.image_path);
            }
        } catch (e) {
            console.error('Failed to trigger email', e);
        }

        res.status(201).json({
            status: 'success',
            message: 'Claim submitted successfully. Please visit the security post for verification.',
            data: { claim_id: result.insertId }
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

// @desc    Schedule pickup slot for an approved/verified claim (FR-04)
// @route   POST /api/claims/:id/schedule
// @access  Private (User - Claimer)
export const scheduleClaimPickup = async (req, res) => {
    const claimId = req.params.id;
    const { slot_id, scheduled_date } = req.body;

    if (!slot_id || !scheduled_date) {
        return res.status(400).json({
            status: 'error',
            message: 'slot_id and scheduled_date are required'
        });
    }

    try {
        const claim = await Claim.findById(claimId);
        if (!claim) {
            return res.status(404).json({ status: 'error', message: 'Claim not found' });
        }

        // Verify that the user owns this claim
        if (String(claim.claimer_nim) !== String(req.user.id)) {
            return res.status(403).json({ status: 'error', message: 'Not authorized to schedule this claim' });
        }

        // Only allow scheduling if claim is verified or already scheduled (rescheduling)
        if (claim.status !== 'verified' && claim.status !== 'scheduled') {
            return res.status(400).json({
                status: 'error',
                message: `Claim cannot be scheduled in status '${claim.status}'. Claim must be approved ('verified') first.`
            });
        }

        // Check slot validity
        const slot = await Slot.findById(slot_id);
        if (!slot || !slot.is_active) {
            return res.status(404).json({ status: 'error', message: 'Selected pickup slot is not available or inactive' });
        }

        // Check if scheduled_date matches slot day of week
        const dateObj = new Date(scheduled_date);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ status: 'error', message: 'Invalid scheduled_date format. Expected YYYY-MM-DD.' });
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[dateObj.getDay()];

        if (dayOfWeek !== slot.day_of_week) {
            return res.status(400).json({
                status: 'error',
                message: `Date ${scheduled_date} falls on a ${dayOfWeek}, but selected slot is for ${slot.day_of_week}.`
            });
        }

        // Check quota availability on that date
        const availability = await Slot.getAvailableSlotsForDate(scheduled_date);
        const slotAvailability = availability.slots.find(s => s.slot_id === parseInt(slot_id));
        if (slotAvailability && slotAvailability.available_quota <= 0 && claim.scheduled_slot_id !== parseInt(slot_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Selected slot is fully booked for this date. Please choose another time slot.'
            });
        }

        // Schedule the claim
        await Claim.scheduleSlot(claimId, slot_id, scheduled_date);

        // Fetch updated claim with slot information
        const updatedClaim = await Claim.findById(claimId);

        // Log to MongoDB
        logActivity(
            { id: req.user.id, role: 'user', name: 'Mahasiswa' },
            'SCHEDULE_PICKUP_SLOT',
            {
                entity: 'Claim',
                entityId: claimId,
                details: `Scheduled pickup for item "${claim.item_name}" on ${scheduled_date} at ${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)}`
            },
            req
        );

        // Async Email Notification
        try {
            sendClaimScheduledEmailAsync(
                claim.claimer_email,
                claimId,
                claim.item_name,
                scheduled_date,
                `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`,
                slot.location,
                claim.item_image_path
            );
        } catch (mailErr) {
            console.error('Failed to trigger schedule email', mailErr);
        }

        res.status(200).json({
            status: 'success',
            message: 'Pickup slot scheduled successfully. You can now generate your QR E-Ticket for pickup.',
            data: updatedClaim
        });
    } catch (error) {
        console.error('Error scheduling pickup slot:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};