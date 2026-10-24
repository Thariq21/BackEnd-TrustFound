import nodemailer from 'nodemailer';
import dbMongo from '../config/db_mongo.js';
import dotenv from 'dotenv';
import { baseEmailTemplate } from './emailTemplates.js';
dotenv.config({ path: './config/config.env' });

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Helper function to log email event to MongoDB
const logEmailEvent = async (status, eventType, details) => {
    try {
        const collection = dbMongo.collection('email_logs');
        await collection.insertOne({
            status, // Success or Failed
            event_type: eventType,
            timestamp: new Date(),
            ...details
        });
    } catch (err) {
        console.error(`[EmailService] Failed to log email event to MongoDB:`, err);
    }
};

// Generic Fire-and-Forget wrapper
// This function executes asynchronously and catches its own errors so the Express server doesn't crash
const sendEmailAsync = async (mailOptions, eventType) => {
    if (process.env.DISABLE_EMAILS === 'true') return;
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error(`[EmailService] Email skipped: SMTP_USER and SMTP_PASS are required for ${eventType}`);
        await logEmailEvent('Failed', eventType, {
            to: mailOptions.to || mailOptions.bcc,
            subject: mailOptions.subject,
            error_message: 'SMTP_USER and SMTP_PASS are not configured'
        });
        return;
    }

    try {
        await transporter.sendMail(mailOptions);
        
        // Log Success
        await logEmailEvent('Success', eventType, {
            to: mailOptions.to || mailOptions.bcc,
            subject: mailOptions.subject
        });
        
        console.log(`✅ Async Email Sent: [${eventType}] to ${mailOptions.to || 'BCC list'}`);
    } catch (error) {
        // Log Failed
        console.error(`❌ Async Email Failed: [${eventType}]`, error.message);
        await logEmailEvent('Failed', eventType, {
            to: mailOptions.to || mailOptions.bcc,
            subject: mailOptions.subject,
            error_message: error.message
        });
    }
};

/**
 * Sends an email to a user when their claim is submitted.
 * Implemented using Fire-and-Forget pattern.
 */
export const sendClaimPendingEmailAsync = (userEmail, claimId, itemName, imagePath = null) => {
    const textMessage = `Your claim for ${itemName} has been submitted and is pending review. Please wait for further updates from the admin.`;
    const filename = imagePath ? imagePath.split(/[\/\\]/).pop() : null;
    const fullImageUrl = filename ? `${process.env.SERVER_BASE_URL || 'http://localhost:5000'}/uploads/${filename}` : null;
    
    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Claim Submitted: ${itemName}`,
        text: textMessage,
        html: baseEmailTemplate(`Claim Submitted: ${itemName}`, textMessage, fullImageUrl)
    };

    // Fire and forget, no await
    sendEmailAsync(mailOptions, 'CLAIM_PENDING');
};

/**
 * Notifies all configured admins when a user submits a claim.
 */
export const sendClaimSubmittedToAdminsAsync = (adminEmails, claimId, itemName, claimerName) => {
    if (!adminEmails || adminEmails.length === 0) return;

    const textMessage = `A new claim requires review.\n\nItem: ${itemName}\nClaim ID: ${claimId}\nSubmitted by: ${claimerName || 'User'}\n\nPlease review it in the TrustFound admin dashboard.`;
    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: adminEmails,
        subject: `New Claim Requires Review: ${itemName}`,
        text: textMessage,
        html: baseEmailTemplate(`New Claim Requires Review: ${itemName}`, textMessage)
    };

    sendEmailAsync(mailOptions, 'CLAIM_SUBMITTED_TO_ADMINS');
};

/**
 * Sends an email to a user when an admin makes a decision (Approved/Rejected) on their claim.
 * Implemented using Fire-and-Forget pattern.
 */
export const sendClaimDecisionEmailAsync = (userEmail, claimId, itemName, decision, imagePath = null) => {
    let textMessage = `Your claim for ${itemName} has been ${decision.toUpperCase()}.`;
    if (decision.toLowerCase() === 'verified') {
        textMessage += `\n\nPlease immediately generate a QR token in the TrustFound application to pick up your item at the security post.`;
    }

    const filename = imagePath ? imagePath.split(/[\/\\]/).pop() : null;
    const fullImageUrl = filename ? `${process.env.SERVER_BASE_URL || 'http://localhost:5000'}/uploads/${filename}` : null;

    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Claim ${decision}: ${itemName}`,
        text: textMessage,
        html: baseEmailTemplate(`Claim ${decision}: ${itemName}`, textMessage, fullImageUrl)
    };
    
    // Fire and forget, no await
    sendEmailAsync(mailOptions, `CLAIM_${decision.toUpperCase()}`);
};

/**
 * Broadcasts an email to all users when a new item is found.
 * Implemented using Fire-and-Forget pattern.
 */
export const broadcastNewItemAsync = (itemId, itemName, allUserEmailsArray, imagePath = null) => {
    if (!allUserEmailsArray || allUserEmailsArray.length === 0) return;

    const textMessage = `A found item is now available for claims.\n\nDetails:\nName: ${itemName}\n\nIf this is yours, please claim it via the TrustFound system.`;
    const filename = imagePath ? imagePath.split(/[\/\\]/).pop() : null;
    const fullImageUrl = filename ? `${process.env.SERVER_BASE_URL || 'http://localhost:5000'}/uploads/${filename}` : null;

    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: allUserEmailsArray, // Sending to all users explicitly in the 'to' field
        subject: `New Found Item: ${itemName}`,
        text: textMessage,
        html: baseEmailTemplate(`New Found Item: ${itemName}`, textMessage, fullImageUrl)
    };
    
    // Fire and forget, no await
    sendEmailAsync(mailOptions, 'BROADCAST_NEW_ITEM');
};

/**
 * Sends an email when an item is successfully handed over.
 * Implemented using Fire-and-Forget pattern.
 */
export const sendHandoverReceiptEmailAsync = (userEmail, claimId, itemName) => {
    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Item Handover Receipt: ${itemName}`,
        text: `You have successfully received the item ${itemName}. Thank you for using TrustFound.`
    };
    
    // Fire and forget, no await
    sendEmailAsync(mailOptions, 'ITEM_HANDOVER_RECEIPT');
};

/**
 * Sends an email when a user successfully schedules a pickup slot for an approved claim.
 * Implemented using Fire-and-Forget pattern (FR-04, FR-06).
 */
export const sendClaimScheduledEmailAsync = (userEmail, claimId, itemName, scheduledDate, slotTime, location, imagePath = null) => {
    const textMessage = `Your pickup appointment for "${itemName}" has been scheduled.\n\nDate: ${scheduledDate}\nTime: ${slotTime}\nLocation: ${location}\n\nPlease generate your QR E-Ticket in the TrustFound application before arriving at the location. An Admin BEM will scan your QR code to verify the handover.`;
    const filename = imagePath ? imagePath.split(/[\/\\]/).pop() : null;
    const fullImageUrl = filename ? `${process.env.SERVER_BASE_URL || 'http://localhost:5000'}/uploads/${filename}` : null;

    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Pickup Scheduled: ${itemName}`,
        text: textMessage,
        html: baseEmailTemplate(`Pickup Scheduled: ${itemName}`, textMessage, fullImageUrl)
    };

    // Fire and forget, no await
    sendEmailAsync(mailOptions, 'CLAIM_SCHEDULED');
};

export const sendClaimScheduleUpdatedEmailAsync = (userEmail, claimId, itemName, scheduledDate, slotTime, location, imagePath = null) => {
    const textMessage = `Your pickup appointment for "${itemName}" has been updated by an administrator.\n\nDate: ${scheduledDate}\nTime: ${slotTime}\nLocation: ${location}\n\nPlease check your TrustFound QR E-Ticket before arriving.`;
    const filename = imagePath ? imagePath.split(/[\/\\]/).pop() : null;
    const fullImageUrl = filename ? `${process.env.SERVER_BASE_URL || 'http://localhost:5000'}/uploads/${filename}` : null;

    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Pickup Schedule Updated: ${itemName}`,
        text: textMessage,
        html: baseEmailTemplate(`Pickup Schedule Updated: ${itemName}`, textMessage, fullImageUrl)
    };

    sendEmailAsync(mailOptions, 'CLAIM_SCHEDULE_UPDATED');
};

export default {
    sendClaimPendingEmailAsync,
    sendClaimSubmittedToAdminsAsync,
    sendClaimDecisionEmailAsync,
    broadcastNewItemAsync,
    sendHandoverReceiptEmailAsync,
    sendClaimScheduledEmailAsync,
    sendClaimScheduleUpdatedEmailAsync
};
