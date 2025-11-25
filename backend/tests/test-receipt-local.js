/**
 * Local Receipt Automation Test
 * Tests receipt automation without webhooks
 * 
 * Usage: node test-receipt-local.js <dealId> [--test-mode]
 */

import * as receiptAutomation from '../src/services/workflows/smokeball-receipt-automation.js';

const dealId = process.argv[2];
const testMode = process.argv.includes('--test-mode');

if (!dealId) {
  console.error('❌ Error: Deal ID is required');
  console.log('\nUsage:');
  console.log('  node test-receipt-local.js <dealId> [--test-mode]');
  process.exit(1);
}

async function testLocal() {
  console.log('🧪 Local Receipt Automation Test');
  console.log(`📋 Deal ID: ${dealId}`);
  console.log(`🧪 Test Mode: ${testMode ? 'YES (form filled but not submitted)' : 'NO (will create actual receipt)'}`);
  console.log('');
  
  try {
    if (testMode) {
      // Test mode - fills form but doesn't submit
      const result = await receiptAutomation.executeReceiptAutomationForDeal(dealId, {
        testMode: true
      });
      console.log('\n✅ Test completed:', result);
    } else {
      // Production mode - actually creates receipt
      console.log('⚠️  WARNING: This will create an actual receipt!');
      const result = await receiptAutomation.triggerReceiptAutomationForDeal(dealId);
      console.log('\n✅ Automation completed:', result);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testLocal();

