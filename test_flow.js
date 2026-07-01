import { getQRToken, validateQR } from './controllers/claimV2Controller.js';
import db from './config/db_mysql.js';
import mongoose from 'mongoose'; // it uses dbMongo

async function runTest() {
    console.log("=== STARTING TEST FOR ITEM 24 ===");
    
    // 1. Update claim 23 to 'verified' so we can generate QR token
    await db.execute("UPDATE claim SET status = 'verified' WHERE claim_id = 23");
    console.log("1. Claim status updated to 'verified'");

    // 2. Simulate GET /api/v2/claims/23/qr-token (Mahasiswa)
    let generatedToken = '';
    const reqMhs = {
        params: { claim_id: 23 },
        user: { id: '1232001011' } // NIM of the claimer
    };
    const resMhs = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { 
            console.log(`2. Mahasiswa Response (${this.statusCode}):`, data); 
            if (data.data && data.data.qr_token) {
                generatedToken = data.data.qr_token;
            }
        }
    };
    
    await getQRToken(reqMhs, resMhs);

    // 3. Simulate POST /api/v2/claims/validate-qr (Satpam)
    const reqSatpam = {
        body: { qr_token: generatedToken },
        user: { id: '2314' } // NIP of a satpam/admin
    };
    const resSatpam = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { 
            console.log(`3. Satpam Response (${this.statusCode}):`, data); 
        }
    };
    
    if (generatedToken) {
        await validateQR(reqSatpam, resSatpam);
    } else {
        console.log("QR Token generation failed, skipping validation.");
    }

    // 4. Check final DB state
    const [claimRows] = await db.execute("SELECT status, qr_token FROM claim WHERE claim_id = 23");
    const [itemRows] = await db.execute("SELECT status FROM item WHERE item_id = 24");
    console.log("4. Final Database State:");
    console.log("Claim 23:", claimRows[0]);
    console.log("Item 24:", itemRows[0]);

    process.exit(0);
}

runTest();
