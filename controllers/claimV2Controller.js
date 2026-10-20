import crypto from 'crypto';
import Claim from '../models/mysql/claimModel.js';
import { sendHandoverReceiptEmailAsync } from '../services/emailService.js';
import { logActivity } from '../utils/logger.js';

// @desc    Get QR Token for a claim
// @route   GET /api/v2/claims/:claim_id/qr-token
// @access  Private (General User)
export const getQRToken = async (req, res) => {
    try {
        const { claim_id } = req.params;

        // Find claim
        const claim = await Claim.findById(claim_id);
        if (!claim) {
            return res.status(404).json({ status: 'error', message: 'Claim not found' });
        }

        // Verify ownership
        if (String(claim.claimer_nim) !== String(req.user.id)) {
            return res.status(403).json({ status: 'error', message: 'Not authorized to view this claim' });
        }

        if (claim.status !== 'scheduled') {
            return res.status(409).json({ status: 'error', message: 'A QR ticket is available only after pickup is scheduled' });
        }

        const issued_at = new Date();
        const expires_at = new Date(issued_at.getTime() + 30 * 60 * 1000);
        const expires_at_formatted = expires_at.toISOString().slice(0, 19).replace('T', ' ');
        const issuedTicket = await Claim.issueQR(
            claim_id,
            crypto.randomBytes(32).toString('hex'),
            expires_at_formatted
        );
        if (issuedTicket.error === 'claim_unavailable') {
            return res.status(409).json({
                status: 'error',
                message: 'A QR ticket is available only after pickup is scheduled'
            });
        }

        logActivity(
            { id: req.user.id, role: req.user.role, name: 'Mahasiswa' },
            issuedTicket.reused ? 'QR_VIEWED' : 'QR_GENERATED',
            {
                entity: 'Claim',
                entityId: claim_id,
                details: `${issuedTicket.reused ? 'Viewed' : 'Generated'} ticket for item ${claim.item_id}`
            },
            req
        );

        res.status(200).json({
            status: 'success',
            data: {
                qr_token: issuedTicket.qr_token,
                qrValue: issuedTicket.qr_token,
                issued_at: new Date(
                    new Date(issuedTicket.expires_at).getTime() -
                    issuedTicket.time_to_live_seconds * 1000
                ),
                expires_at: issuedTicket.expires_at,
                expiresAt: issuedTicket.expires_at,
                time_to_live_seconds: issuedTicket.time_to_live_seconds
            }
        });
    } catch (error) {
        console.error('Error generating QR Token:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

// @desc    Validate QR Token and Handover Item
// @route   POST /api/v2/claims/validate-qr
// @access  Private (Admin BEM)
export const validateQR = async (req, res) => {
    try {
        const qr_token = req.body.qr_token || req.body.qrValue;

        if (!qr_token) {
            return res.status(400).json({ status: 'error', message: 'QR token is required' });
        }

        // Find claim by QR token
        const claim = await Claim.findByQRToken(qr_token);
        if (!claim) {
            return res.status(404).json({ status: 'error', message: 'Invalid QR token' });
        }

        // Check expiration
        const now = new Date();
        if (new Date(claim.qr_expires_at) < now) {
            return res.status(400).json({ status: 'error', message: 'QR token has expired' });
        }

        // Check item status
        if (claim.item_status === 'claimed' || claim.status === 'claimed') {
            return res.status(400).json({ status: 'error', message: 'Item has already been claimed' });
        }

        const handedOver = await Claim.validateQRAndClaimItem(claim.claim_id, claim.item_id, qr_token);
        if (!handedOver) {
            return res.status(409).json({
                status: 'error',
                message: 'Ticket expired, already used, or the item is no longer available'
            });
        }

        logActivity(
            { id: req.user.id, role: req.user.role || 'Admin_BEM', name: 'Admin BEM' },
            'ITEM_HANDOVER_SUCCESS',
            { entity: 'Claim', entityId: claim.claim_id, details: `Item ${claim.item_id} handed over` },
            req
        );

        // Trigger Async Email (Fire and forget)
        sendHandoverReceiptEmailAsync(claim.claimer_email, claim.claim_id, claim.item_name);

        res.status(200).json({
            status: 'success',
            message: 'QR Code validated and item handover successful'
        });
    } catch (error) {
        console.error('Error validating QR:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};
