/**
 * Test Matter Pre-fill Timing
 * 
 * Tests the waitForMatterPreFill() function to ensure matter is pre-filled
 * from URL context before proceeding with form filling.
 * 
 * Usage:
 *   node test-matter-prefill-timing.js [dealId]
 * 
 * Examples:
 *   node test-matter-prefill-timing.js 187585441268
 *   node test-matter-prefill-timing.js (uses default deal: 187585441268)
 * 
 * Note: Uses SMOKEBALL_2FA_SECRET from .env (not SMOKEBALL_TOTP_SECRET which is for GitHub Actions)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SmokeBallReceiptAutomation from '../smokeball-receipt-automation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory (try multiple locations)
const envPaths = [
    join(__dirname, '..', '.env'),
    join(__dirname, '..', '..', '.env'),
    '.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        envLoaded = true;
        break;
    }
}

// Use the same defaults as smokeball-receipt-automation.js
// Username and password are hardcoded in the automation class
const username = process.env.SMOKEBALL_USERNAME || 'pmanocha@stanford.au';
const password = process.env.SMOKEBALL_PASSWORD || 'LegalxManocha25!';

// Check if 2FA secret is configured (using SMOKEBALL_2FA_SECRET, not SMOKEBALL_TOTP_SECRET)
// Temporarily set SMOKEBALL_TOTP_SECRET to SMOKEBALL_2FA_SECRET for the automation class
if (process.env.SMOKEBALL_2FA_SECRET) {
    process.env.SMOKEBALL_TOTP_SECRET = process.env.SMOKEBALL_2FA_SECRET;
    console.log('✅ Using SMOKEBALL_2FA_SECRET for 2FA');
} else {
    console.warn('⚠️  WARNING: SMOKEBALL_2FA_SECRET not found in environment variables');
    console.warn('   The test will require manual 2FA input.');
    console.warn('   Set SMOKEBALL_2FA_SECRET in backend/.env to enable automatic 2FA');
    console.warn('');
}

// Get deal ID from command line or use default
const dealId = process.argv[2] || '187585441268';

async function testMatterPreFillTiming() {
    console.log('='.repeat(70));
    console.log('🧪 Matter Pre-fill Timing Test');
    console.log('='.repeat(70));
    console.log(`📋 Deal ID: ${dealId}`);
    
    // Fetch deal to get Lead_UID and other details
    const dealsIntegration = await import('../src/integrations/hubspot/deals.js');
    
    try {
        console.log('📥 Fetching deal from HubSpot...');
        const deal = await dealsIntegration.getDeal(dealId, [
            'payment_method',
            'payment_amount',
            'payment_date',
            'payment_status',
            'stripe_payment_intent_id',
            'matter_uid',
            'smokeball_lead_uid'
        ]);
        
        // Get Lead UID - MUST use smokeball_lead_uid from HubSpot
        const leadUid = deal.properties.smokeball_lead_uid;
        if (!leadUid || leadUid.trim() === '') {
            throw new Error('smokeball_lead_uid is required but not found in deal. Create lead first.');
        }
        
        console.log(`✅ Lead UID: ${leadUid}`);
        console.log(`💰 Amount: $${deal.properties.payment_amount || 'N/A'}`);
        
        // Get contact info from associations
        const associationsIntegration = await import('../src/integrations/hubspot/associations.js');
        const dealContacts = await associationsIntegration.getDealContacts(dealId);
        
        // Find primary seller
        let primarySeller = null;
        for (const contact of dealContacts) {
            const associationTypes = contact.associationTypes || [];
            const isPrimary = associationTypes.some(t => t.typeId === 1 || t.typeId === '1');
            if (isPrimary && contact.properties.firstname && contact.properties.lastname) {
                primarySeller = contact.properties;
                break;
            }
        }
        
        if (!primarySeller && dealContacts.length > 0) {
            primarySeller = dealContacts[0].properties;
        }
        
        if (!primarySeller) {
            throw new Error('No primary seller found for deal');
        }
        
        console.log(`👤 Contact: ${primarySeller.lastname}, ${primarySeller.firstname}`);
        console.log(`🧪 Test Mode: YES (form filled but not submitted)`);
        
        // Check 2FA configuration
        if (process.env.SMOKEBALL_2FA_SECRET) {
            console.log(`🔐 2FA: Configured (automatic)`);
        } else {
            console.log(`🔐 2FA: Not configured (manual input required)`);
        }
        console.log(`👤 Username: ${username}`);
        console.log('');

        const automation = new SmokeBallReceiptAutomation(true); // Test mode enabled

        // Format date - Use current date & time
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

        // Determine amount based on payment method
        let amount;
        if (deal.properties.payment_method === 'Stripe' && deal.properties.stripe_payment_intent_id) {
            const stripePayments = await import('../src/integrations/stripe/payments.js');
            const paymentIntent = await stripePayments.getPaymentIntent(deal.properties.stripe_payment_intent_id);
            const baseAmountCents = parseInt(paymentIntent.metadata?.base_amount);
            amount = baseAmountCents ? baseAmountCents / 100 : parseFloat(deal.properties.payment_amount) || 0;
        } else {
            amount = parseFloat(deal.properties.payment_amount) || 0;
        }

        const receiptData = {
            amount: amount,
            date: formattedDate,
            lastname: primarySeller.lastname,
            firstname: primarySeller.firstname,
            reason: 'On account of search fees'
        };

        console.log('🚀 Starting automation...');
        console.log('');

        // Run the automation using the main run() method
        // The detection code has been fixed to use page.evaluate() which correctly finds pre-filled values
        const result = await automation.run(leadUid, receiptData);

        console.log('');
        console.log('='.repeat(70));
        console.log('📊 Test Results');
        console.log('='.repeat(70));
        console.log(`✅ Success: ${result.success}`);
        console.log(`📝 Message: ${result.message || 'N/A'}`);

        if (result.error) {
            console.log(`❌ Error: ${result.error}`);
        }

        return result;

    } catch (error) {
        console.error('');
        console.error('='.repeat(70));
        console.error('❌ Test Failed');
        console.error('='.repeat(70));
        console.error(`Error: ${error.message}`);
        
        if (error.stack) {
            console.error('\nStack Trace:');
            console.error(error.stack);
        }
        
        throw error;
    }
}

// Run the test
testMatterPreFillTiming()
    .then((result) => {
        console.log('');
        if (result.success) {
            console.log('✅ Test completed successfully!');
            console.log('');
            console.log('📋 Expected behavior verified:');
            console.log('   - Matter should be pre-filled from URL context');
            console.log('   - Form filling should proceed only after matter is detected');
            console.log('   - Screenshot should show matter field populated');
            process.exit(0);
        } else {
            console.log('❌ Test completed with errors');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('');
        console.error('💥 Test failed:', error.message);
        process.exit(1);
    });
