/**
 * Full Receipt Automation Test
 * 
 * Tests the complete receipt automation flow for both Stripe and Bank Transfer payments.
 * This simulates what happens when webhooks trigger the automation.
 * 
 * Usage:
 *   node test-receipt-automation-full.js <dealId> [--test-mode]
 * 
 * Examples:
 *   # Test with a Stripe payment deal (test mode - doesn't actually create receipt)
 *   node test-receipt-automation-full.js 123456789 --test-mode
 * 
 *   # Test with a Bank Transfer deal (production mode - actually creates receipt)
 *   node test-receipt-automation-full.js 987654321
 */

import * as receiptAutomation from '../src/services/workflows/smokeball-receipt-automation.js';

const dealId = process.argv[2];
const testMode = process.argv.includes('--test-mode');

if (!dealId) {
  console.error('❌ Error: Deal ID is required');
  console.log('\nUsage:');
  console.log('  node test-receipt-automation-full.js <dealId> [--test-mode]');
  console.log('\nExamples:');
  console.log('  node test-receipt-automation-full.js 123456789 --test-mode');
  console.log('  node test-receipt-automation-full.js 987654321');
  process.exit(1);
}

async function testReceiptAutomation() {
  console.log('='.repeat(70));
  console.log('🧪 Full Receipt Automation Test');
  console.log('='.repeat(70));
  console.log(`📋 Deal ID: ${dealId}`);
  console.log(`🧪 Test Mode: ${testMode ? 'YES (form filled but not submitted)' : 'NO (will create actual receipt)'}`);
  console.log('');

  try {
    if (testMode) {
      // Use executeReceiptAutomationForDeal with test mode
      console.log('🚀 Starting automation in TEST MODE...');
      console.log('');
      
      const result = await receiptAutomation.executeReceiptAutomationForDeal(dealId, {
        testMode: true
      });
      
      console.log('');
      console.log('='.repeat(70));
      console.log('📊 Test Results');
      console.log('='.repeat(70));
      console.log(`✅ Success: ${result.success}`);
      console.log(`📝 Message: ${result.message || 'N/A'}`);
      
      if (result.stdout) {
        console.log('\n📤 Python Script Output:');
        console.log(result.stdout);
      }
      
      if (result.stderr) {
        console.log('\n⚠️ Python Script Errors:');
        console.log(result.stderr);
      }
      
      return result;
    } else {
      // Use triggerReceiptAutomationForDeal (production mode)
      console.log('🚀 Starting automation in PRODUCTION MODE...');
      console.log('⚠️  WARNING: This will create an actual receipt in Smokeball!');
      console.log('');
      
      const result = await receiptAutomation.triggerReceiptAutomationForDeal(dealId);
      
      console.log('');
      console.log('='.repeat(70));
      console.log('📊 Automation Results');
      console.log('='.repeat(70));
      console.log(`✅ Success: ${result.success}`);
      console.log(`📋 Deal ID: ${result.dealId || dealId}`);
      console.log(`🆔 Matter ID: ${result.matterId || 'N/A'}`);
      console.log(`💰 Amount: $${result.amount ? result.amount.toFixed(2) : 'N/A'}`);
      
      if (result.stdout) {
        console.log('\n📤 Python Script Output:');
        console.log(result.stdout);
      }
      
      if (result.stderr) {
        console.log('\n⚠️ Python Script Errors:');
        console.log(result.stderr);
      }
      
      return result;
    }
  } catch (error) {
    console.error('');
    console.error('='.repeat(70));
    console.error('❌ Automation Failed');
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
testReceiptAutomation()
  .then((result) => {
    console.log('');
    if (result.success) {
      console.log('✅ Test completed successfully!');
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

