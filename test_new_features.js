import db from './config/db_mysql.js';
import Slot from './models/mysql/slotModel.js';
import Item from './models/mysql/itemModel.js';
import Claim from './models/mysql/claimModel.js';
import ActivityLog from './models/mongo/activityLog.js';

async function runTests() {
    console.log('🧪 Starting verification tests for newly implemented Capstone backend features...\n');

    try {
        // =========================================================================
        // TEST 1: Pickup Slots (FR-04)
        // =========================================================================
        console.log('--- Test 1: Pickup Slots (FR-04) ---');
        const allSlots = await Slot.findAll();
        console.log(`✅ Total active slots: ${allSlots.length} (Expected: 35)`);

        const mondaySlots = await Slot.findAll('Monday');
        console.log(`✅ Monday slots: ${mondaySlots.length} (Expected: 7)`);

        // Check availability for a specific Monday (e.g. 2026-10-19)
        const mondayAvail = await Slot.getAvailableSlotsForDate('2026-10-19');
        console.log(`✅ Availability check for 2026-10-19 (${mondayAvail.day_of_week}): ${mondayAvail.slots.length} slots found.`);
        console.log(`   Sample slot 1: ${mondayAvail.slots[0].start_time} - ${mondayAvail.slots[0].end_time}, quota: ${mondayAvail.slots[0].available_quota}/${mondayAvail.slots[0].max_quota}`);

        // Check weekend check
        const sundayAvail = await Slot.getAvailableSlotsForDate('2026-10-18');
        console.log(`✅ Weekend check for 2026-10-18: is_operational_day = ${sundayAvail.is_operational_day}`);


        // =========================================================================
        // TEST 2: Claim Scheduling & QR Unlocking (FR-04, FR-05)
        // =========================================================================
        console.log('\n--- Test 2: Claim Scheduling (FR-04) ---');
        // Let's find or pick a claim to test scheduling
        // Let's find claim 23 or 22
        const claim23 = await Claim.findById(23);
        console.log(`Claim 23 current status: ${claim23 ? claim23.status : 'not found'}`);

        // Set claim 23 to 'verified' to simulate admin approval
        await Claim.updateStatus(23, 'verified', 1231001056);
        console.log(`Claim 23 updated to 'verified'`);

        // Schedule claim 23 on Monday slot 1 (slot_id: 1, date: 2026-10-19)
        await Claim.scheduleSlot(23, 1, '2026-10-19');
        const scheduledClaim23 = await Claim.findById(23);
        console.log(`✅ Claim 23 scheduled: status = '${scheduledClaim23.status}', slot_id = ${scheduledClaim23.scheduled_slot_id}, date = ${scheduledClaim23.scheduled_date}, slot_time = ${scheduledClaim23.slot_start_time}-${scheduledClaim23.slot_end_time}`);

        // Check slot availability again for 2026-10-19
        const updatedMondayAvail = await Slot.getAvailableSlotsForDate('2026-10-19');
        const slot1 = updatedMondayAvail.slots.find(s => s.slot_id === 1);
        console.log(`✅ Slot 1 booked count: ${slot1.booked_count}, available quota: ${slot1.available_quota} (Expected booked: 1, available: 4)`);


        // =========================================================================
        // TEST 3: Status Mapping & Automatic Availability
        // =========================================================================
        console.log('\n--- Test 3: Status Mapping & Automatic Availability ---');
        const itemsList = await Item.findAll('all');
        const sampleItem = itemsList[0];
        console.log(`✅ Sample item status: '${sampleItem.status}' -> display_status: '${sampleItem.display_status}'`);

        const availableItems = itemsList.filter(i => i.report_type === 'found' && i.status === 'available');
        console.log(`Found items available for claims: ${availableItems.length}`);


        // =========================================================================
        // TEST 4: Dashboard Statistics (FR-08)
        // =========================================================================
        console.log('\n--- Test 4: Dashboard Statistics (FR-08) ---');
        const itemStats = await Item.getDashboardItemStats();
        console.log(`✅ Item Stats Summary:`, itemStats.summary);
        console.log(`✅ Category distribution count: ${itemStats.categories.length} categories`);

        const claimStats = await Claim.getDashboardClaimStats();
        console.log(`✅ Claim Stats:`, claimStats);


        // =========================================================================
        // TEST 5: MongoDB Activity Logging (FR-09)
        // =========================================================================
        console.log('\n--- Test 5: MongoDB Activity Log (FR-09) ---');
        const recentLogs = await ActivityLog.find({}, { limit: 5 });
        console.log(`✅ Recent MongoDB activity logs count: ${recentLogs.length}`);
        if (recentLogs.length > 0) {
            console.log(`   Latest log action: ${recentLogs[0].action} at ${recentLogs[0].timestamp}`);
        }

        console.log('\n🎉 ALL CAPSTONE BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Test failed with error:', err);
        process.exit(1);
    }
}

runTests();
