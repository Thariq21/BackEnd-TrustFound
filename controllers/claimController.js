import Claim from '../models/mysql/claimModel.js';
import Item from '../models/mysql/itemModel.js';
import User from '../models/mysql/userModel.js';
import Slot from '../models/mysql/slotModel.js';
import { logActivity } from '../utils/logger.js';
import {
    sendClaimPendingEmailAsync,
    sendClaimScheduledEmailAsync,
    sendClaimSubmittedToAdminsAsync
} from '../services/emailService.js';
import Admin from '../models/mysql/adminModel.js';
import fs from 'fs';

const removeEvidence = (file) => {
    if (!file?.path || !fs.existsSync(file.path)) return;
    try {
        fs.unlinkSync(file.path);
    } catch (error) {
        console.error(`Could not remove uploaded claim evidence ${file.path}:`, error);
    }
};

// @desc    Create a claim for an item
// @route   POST /api/claims
// @access  Private (User)
export const createClaim = async (req, res) => {
    const body = req.body || {};
    const itemId = req.params.itemId || body.item_id || body.itemId;
    const evidence = req.file || req.files?.evidence?.[0] || null;

    try {
        let answers = body.answers;
        if (typeof answers === 'string') {
            try {
                answers = JSON.parse(answers);
            } catch {
                removeEvidence(evidence);
                return res.status(400).json({ status: 'error', message: 'answers must be a JSON array' });
            }
        }
        if (!Array.isArray(answers) &&
            (body['answers[0]'] !== undefined ||
             body['answers[1]'] !== undefined ||
             body['answers.0'] !== undefined ||
             body['answers.1'] !== undefined)) {
            answers = [
                body['answers[0]'] || body['answers.0'],
                body['answers[1]'] || body['answers.1']
            ];
        }
        if (Array.isArray(answers) &&
            (answers.length !== 2 || answers.some((answer) => typeof answer !== 'string' || !answer.trim()))) {
            removeEvidence(evidence);
            return res.status(400).json({ status: 'error', message: 'Both ownership verification answers are required' });
        }
        if (req.params.itemId && !Array.isArray(answers)) {
            removeEvidence(evidence);
            return res.status(400).json({ status: 'error', message: 'Both ownership verification answers are required' });
        }
        const legacyAnswer = String(
            body.challange_answer || body.challengeAnswer || body.answer || ''
        ).trim();
        const answerText = Array.isArray(answers)
            ? JSON.stringify({ answers: answers.map((answer) => answer.trim()) })
            : legacyAnswer;

        if (!itemId) {
            removeEvidence(evidence);
            return res.status(400).json({ status: 'error', message: 'Item ID is required' });
        }

        const item = await Item.findById(itemId);
        if (!item) {
            removeEvidence(evidence);
            return res.status(404).json({ status: 'error', message: 'Item not found' });
        }

        if (item.report_type !== 'found' || item.status !== 'secured') {
            removeEvidence(evidence);
            return res.status(409).json({
                status: 'error',
                message: 'Only found items available in the cabinet can be claimed'
            });
        }

        if (Boolean(Number(item.is_sensitive)) && !answerText) {
            removeEvidence(evidence);
            return res.status(400).json({
                    status: 'error', 
                    message: 'This is a sensitive item. You must provide a challenge answer (e.g., detail ciri-ciri).' 
            });
        }

        const result = await Claim.createActive({
            claimer_nim: req.user.id,
            item_id: itemId,
            challange_answer: answerText || '-',
            evidence_path: evidence?.path || null
        });
        if (result.error === 'item_unavailable') {
            removeEvidence(evidence);
            return res.status(409).json({
                status: 'error',
                message: 'This item is no longer available to claim'
            });
        }
        if (result.error === 'duplicate') {
            removeEvidence(evidence);
            return res.status(409).json({
                status: 'error',
                message: 'You already have an active claim for this item'
            });
        }

         // 2. --- LOG ACTIVITY (USER CLAIM) ---
        logActivity(
            { id: req.user.id, role: 'user', name: 'Mahasiswa' }, // Actor
            'CLAIM_ITEM',                                         // Action
            {                                                     // Target
                entity: 'Claim', 
                entityId: result.claim_id,
                details: `Claiming Item ID: ${itemId} (${item.name})`
            },
            req
        );
        // ------------------------------------

        // 3. --- ASYNC EMAIL ---
        try {
            const user = await User.findByNim(req.user.id);
            if (user && user.email) {
            sendClaimPendingEmailAsync(user.email, result.claim_id, item.name, item.image_path);
            }
            const admins = await Admin.findAllEmails();
            sendClaimSubmittedToAdminsAsync(admins, result.claim_id, item.name, user?.full_name);
        } catch (e) {
            console.error('Failed to trigger email', e);
        }

        res.status(201).json({
            status: 'success',
            message: 'Claim submitted successfully. Please visit the security post for verification.',
            data: { claim_id: result.claim_id, status: 'pending' }
        });

    } catch (error) {
        removeEvidence(evidence);
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

export const getClaimEvidence = async (req, res, next) => {
    try {
        const evidence = await Claim.findEvidenceById(req.params.id);
        if (!evidence || !evidence.evidence_path || !fs.existsSync(evidence.evidence_path)) {
            return res.status(404).json({ status: 'error', message: 'Claim evidence not found' });
        }
        return res.sendFile(evidence.evidence_path, (error) => {
            if (error && !res.headersSent) next(error);
        });
    } catch (error) {
        console.error('Could not retrieve claim evidence:', error);
        return res.status(500).json({ status: 'error', message: 'Could not retrieve claim evidence' });
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
    const claimId = req.params.id || req.body.claim_id || req.body.claimId;
    const slot_id = req.body.slot_id || req.body.slotId;
    const scheduled_date = req.body.scheduled_date || req.body.scheduledDate || req.body.date;

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
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date) ||
            isNaN(dateObj.getTime()) ||
            dateObj.toISOString().slice(0, 10) !== scheduled_date
        ) {
            return res.status(400).json({ status: 'error', message: 'Invalid scheduled_date format. Expected YYYY-MM-DD.' });
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[dateObj.getUTCDay()];

        if (slot.slot_date && String(slot.slot_date).slice(0, 10) !== scheduled_date) {
            return res.status(400).json({
                status: 'error',
                message: `Selected slot is only available on ${String(slot.slot_date).slice(0, 10)}.`
            });
        }
        if (dayOfWeek !== slot.day_of_week) {
            return res.status(400).json({
                status: 'error',
                message: `Date ${scheduled_date} falls on a ${dayOfWeek}, but selected slot is for ${slot.day_of_week}.`
            });
        }

        // Check quota availability on that date
        const availability = await Slot.getAvailableSlotsForDate(scheduled_date);
        const slotAvailability = availability.slots.find(s => String(s.slot_id) === String(slot_id));
        if (slotAvailability && slotAvailability.available_quota <= 0 && claim.scheduled_slot_id !== parseInt(slot_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Selected slot is fully booked for this date. Please choose another time slot.'
            });
        }

        // Schedule the claim
        const scheduled = await Claim.scheduleSlot(claimId, slot_id, scheduled_date);
        if (scheduled.error === 'slot_unavailable') {
            return res.status(404).json({ status: 'error', message: 'Selected pickup slot is not available' });
        }
        if (scheduled.error === 'slot_date_mismatch') {
            return res.status(400).json({ status: 'error', message: 'Selected pickup slot is not available on that date' });
        }
        if (scheduled.error === 'slot_full') {
            return res.status(409).json({ status: 'error', message: 'Selected pickup slot is fully booked' });
        }
        if (scheduled.error === 'claim_unavailable') {
            return res.status(409).json({ status: 'error', message: 'Claim is no longer eligible for scheduling' });
        }

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