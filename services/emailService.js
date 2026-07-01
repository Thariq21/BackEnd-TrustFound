import nodemailer from 'nodemailer';
import dbMongo from '../config/db_mongo.js';
import dotenv from 'dotenv';

dotenv.config({ path: './config/config.env' });

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
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
export const sendClaimPendingEmailAsync = (userEmail, claimId, itemName) => {
    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Claim Submitted: ${itemName}`,
        text: `Your claim for item ID ${claimId} (${itemName}) has been submitted and is pending review. Please wait for further updates from the admin.`
    };
    
    // Fire and forget, no await
    sendEmailAsync(mailOptions, 'CLAIM_PENDING');
};

/**
 * Sends an email to a user when an admin makes a decision (Approved/Rejected) on their claim.
 * Implemented using Fire-and-Forget pattern.
 */
export const sendClaimDecisionEmailAsync = (userEmail, claimId, itemName, decision) => {
    let textMessage = `Your claim for item ID ${claimId} (${itemName}) has been ${decision.toUpperCase()}.`;
    if (decision.toLowerCase() === 'verified') {
        textMessage += `\n\nPlease immediately generate a QR token in the TrustFound application to pick up your item at the security post.`;
    }

    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Claim ${decision}: ${itemName}`,
        text: textMessage
    };
    
    // Fire and forget, no await
    sendEmailAsync(mailOptions, `CLAIM_${decision.toUpperCase()}`);
};

/**
 * Broadcasts an email to all users when a new item is found.
 * Implemented using Fire-and-Forget pattern.
 */
export const broadcastNewItemAsync = (itemId, itemName, allUserEmailsArray) => {
    if (!allUserEmailsArray || allUserEmailsArray.length === 0) return;

    const mailOptions = {
        from: `"TrustFound System" <${process.env.SMTP_USER}>`,
        to: allUserEmailsArray, // Sending to all users explicitly in the 'to' field
        subject: `New Found Item: ${itemName}`,
        text: `A new item has been found and secured at the security post.\n\nDetails:\nItem ID: ${itemId}\nName: ${itemName}\n\nIf this is yours, please claim it via the TrustFound system.`
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
        text: `You have successfully received the item ID ${claimId} (${itemName}). Thank you for using TrustFound.`
    };
    
    // Fire and forget, no await
    sendEmailAsync(mailOptions, 'ITEM_HANDOVER_RECEIPT');
};

export default {
    sendClaimPendingEmailAsync,
    sendClaimDecisionEmailAsync,
    broadcastNewItemAsync,
    sendHandoverReceiptEmailAsync
};
