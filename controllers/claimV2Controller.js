import crypto from 'crypto';
import Claim from '../models/mysql/claimModel.js';
import { sendHandoverReceiptEmailAsync } from '../services/emailService.js';
import dbMongo from '../config/db_mongo.js';

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

        // Check if claim is verified
        if (claim.status !== 'verified') {
            return res.status(400).json({ status: 'error', message: 'QR token can only be generated for verified claims' });
        }

        // Check if existing token is still valid
        if (claim.qr_token && claim.qr_expires_at) {
            const now = new Date();
            if (new Date(claim.qr_expires_at) > now) {
                return res.status(200).json({
                    status: 'success',
                    data: {
                        qr_token: claim.qr_token,
                        expires_at: claim.qr_expires_at,
                        time_to_live_seconds: Math.floor((new Date(claim.qr_expires_at) - now) / 1000)
                    }
                });
            }
        }

        // Generate token and expiration
        const qr_token = crypto.randomBytes(32).toString('hex');
        const issued_at = new Date();
        const expires_at = new Date(issued_at.getTime() + 24 * 60 * 60 * 1000); // +24 hours
        const expires_at_formatted = expires_at.toISOString().slice(0, 19).replace('T', ' ');

        // Update database
        await Claim.generateQR(claim_id, qr_token, expires_at_formatted);

        // Log to MongoDB
        try {
            await dbMongo.collection('audit_trails').insertOne({
                action: 'QR_GENERATED',
                actor_nim: req.user.id,
                claim_id: claim_id,
                item_id: claim.item_id,
                timestamp: new Date()
            });
        } catch (mongoErr) {
            console.error('Failed to log QR_GENERATED to audit_trails', mongoErr);
        }

        res.status(200).json({
            status: 'success',
            data: {
                qr_token,
                issued_at,
                expires_at,
                time_to_live_seconds: 24 * 60 * 60
            }
        });
    } catch (error) {
        console.error('Error generating QR Token:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
};

// @desc    Validate QR Token and Handover Item
// @route   POST /api/v2/claims/validate-qr
// @access  Private (Satpam)
export const validateQR = async (req, res) => {
    try {
        const { qr_token } = req.body;

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

        // Perform atomic transaction
        await Claim.validateQRAndClaimItem(claim.claim_id, claim.item_id);

        // Log to MongoDB
        try {
            await dbMongo.collection('audit_trails').insertOne({
                action: 'ITEM_HANDOVER_SUCCESS',
                actor_nip: req.user.id, // Satpam ID
                claim_id: claim.claim_id,
                item_id: claim.item_id,
                timestamp: new Date()
            });
        } catch (mongoErr) {
            console.error('Failed to log ITEM_HANDOVER_SUCCESS to audit_trails', mongoErr);
        }

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
