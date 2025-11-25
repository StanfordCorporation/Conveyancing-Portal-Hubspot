/**
 * Simple Smokeball Receipting Test
 * Creates a test receipt with exact values as specified
 * 
 * Usage:
 *   node test-simple-receipt.js
 */

import dotenv from 'dotenv';
import * as smokeballBankAccounts from '../src/integrations/smokeball/bankAccounts.js';

dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

/**
 * Create test receipt in Smokeball
 */
async function createTestReceipt() {
  logSection('🧪 Smokeball Receipting Test');

  // Exact values from requirements
  const matterId = 'ce2582fe-b415-4f95-b9b9-c79c903a4654';
  const amount = 81.70;
  const payorId = '996e77c6-0072-4e8b-a836-72ed96b01c51';
  const payorName = 'Logan Stanford';
  
  // Use exact date/time: 2025-11-21 at 11:27:57 am
  // Parse: "2025-11-21 at 11:27:57 am" -> ISO format
  const specificDate = new Date('2025-11-21T11:27:57');
  const effectiveDate = specificDate.toISOString();
  const processedBy = 'Janelle May on 2025-11-21 at 11:27:57 am';

  const dryRun = process.env.DRY_RUN !== 'false'; // Default to true

  log('Test Receipt Details:', 'bright');
  log(`  Matter ID: ${matterId}`, 'green');
  log(`  Amount: $${amount.toFixed(2)}`, 'green');
  log(`  Paid By: ${payorName}`, 'green');
  log(`  Payor ID: ${payorId}`, 'green');
  log(`  Date: ${effectiveDate}`, 'green');
  log(`  Processed By: ${processedBy}`, 'green');
  log(`  Description: Bank Transfer deposit`, 'green');
  log(`  Reason: On account of test search fees`, 'green');
  log(`  Source: Bank transfer`, 'green');
  log(`  Type: Deposit`, 'green');
  log(`  Mode: ${dryRun ? 'DRY RUN (no actual API call)' : 'LIVE (will create receipt)'}`, 
      dryRun ? 'yellow' : 'red');

  try {
    // Use Credit account ID (accountType = 2)
    // Try Credit account ID - may be base UUID without suffix, or with _Credit suffix
    log('\n📋 Step 1: Using Credit account ID...', 'cyan');
    const trustAccountId = process.env.SMOKEBALL_TRUST_ACCOUNT_ID || '34154dcb-8a76-4f8c-9281-a9b80e3cca16_Trust';
    
    // Try different formats for Credit account
    // Option 1: Base UUID (without _Trust suffix)
    const baseUuid = trustAccountId.replace('_Trust', '');
    // Option 2: With _Credit suffix
    const creditAccountIdWithSuffix = baseUuid + '_Credit';
    // Option 3: Use Credit account ID from env if provided
    const bankAccountId = process.env.SMOKEBALL_CREDIT_ACCOUNT_ID || baseUuid;
    
    log(`   Trust Account ID (for reference): ${trustAccountId}`, 'cyan');
    log(`   Trying Credit Account ID: ${bankAccountId}`, 'green');
    log(`   (Also try: ${creditAccountIdWithSuffix} if this fails)`, 'yellow');

    // Build payload with exact values
    const payload = {
      matterId: matterId,
      type: 'Deposit',
      amount: amount,
      payorId: payorId,
      reference: '', // Empty per requirements
      reason: 'On account of test search fees',
      description: 'Bank Transfer deposit',
      note: processedBy, // "Janelle May on 2025-11-21 at 11:27:57 am"
      effectiveDate: effectiveDate,
    };

    log('\n📝 Payload to be sent:', 'bright');
    console.log(JSON.stringify(payload, null, 2));

    log('\n✅ Field Mappings:', 'green');
    log(`  Amount: $${amount.toFixed(2)}`, 'green');
    log(`  Paid By: ${payorName} (ID: ${payorId})`, 'green');
    log(`  Date: ${effectiveDate}`, 'green');
    log(`  Processed By: ${processedBy}`, 'green');
    log(`  Description: "Bank Transfer deposit"`, 'green');
    log(`  Reason: "On account of test search fees"`, 'green');
    log(`  Source: Bank transfer (implicit from type)`, 'green');
    log(`  Type: Deposit`, 'green');

    if (dryRun) {
      log('\n⏭️  DRY RUN MODE - No actual API call made', 'yellow');
      log('   Set DRY_RUN=false to execute actual receipting', 'yellow');
      log('\n📤 Would send POST to:', 'cyan');
      log(`   https://api.smokeball.com.au/bankaccounts/${bankAccountId}/transactions`, 'cyan');
      log('\n📋 Headers:', 'cyan');
      log('   x-api-key: <api-key>', 'cyan');
      log('   Authorization: Bearer <access-token>', 'cyan');
      log('   Content-Type: application/json', 'cyan');
      return null;
    }

    // Execute actual receipting
    log('\n⚠️  EXECUTING ACTUAL RECEIPTING...', 'red');
    log('   This will create a real transaction in Smokeball!', 'red');

    const transaction = await smokeballBankAccounts.createTransaction(bankAccountId, payload);

    log('\n✅ Receipt created successfully!', 'green');
    log(`  Transaction ID: ${transaction.id}`, 'green');
    log(`  Matter ID: ${matterId}`, 'green');
    log(`  Amount: $${amount.toFixed(2)}`, 'green');
    log(`  Payor: ${payorName}`, 'green');

    return transaction;

  } catch (error) {
    log(`\n❌ Error creating receipt: ${error.message}`, 'red');
    if (error.responseData) {
      log('\nError details:', 'red');
      console.log(JSON.stringify(error.responseData, null, 2));
    }
    if (error.originalError?.response?.data) {
      log('\nAPI Error Response:', 'red');
      console.log(JSON.stringify(error.originalError.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await createTestReceipt();
    
    const dryRun = process.env.DRY_RUN !== 'false';
    if (dryRun) {
      log('\n💡 To execute actual receipting:', 'bright');
      log('   DRY_RUN=false node test-simple-receipt.js', 'cyan');
    } else {
      log('\n✅ Test completed successfully!', 'green');
    }
  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

