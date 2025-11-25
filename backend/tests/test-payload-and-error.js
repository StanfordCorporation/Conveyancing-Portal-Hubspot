/**
 * Test to generate payload and error for Smokeball team
 * Shows exactly what we're sending and what error we receive
 */

import dotenv from 'dotenv';
import * as smokeballBankAccounts from '../src/integrations/smokeball/bankAccounts.js';

dotenv.config();

async function testPayloadAndError() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST: Trust Account Transaction Creation');
  console.log('='.repeat(80) + '\n');

  // Test data
  const matterId = 'ce2582fe-b415-4f95-b9b9-c79c903a4654';
  const amount = 81.70;
  const payorId = '996e77c6-0072-4e8b-a836-72ed96b01c51';
  const trustAccountId = '34154dcb-8a76-4f8c-9281-a9b80e3cca16'; // Without _Trust suffix
  const effectiveDate = new Date('2025-11-21T11:27:57').toISOString();
  const processedBy = 'Janelle May on 2025-11-21 at 11:27:57 am';

  // Build payload
  const payload = {
    matterId: matterId,
    type: 'Deposit',
    amount: amount,
    payorId: payorId,
    reference: '',
    reason: 'On account of test search fees',
    description: 'Bank Transfer deposit',
    note: processedBy,
    effectiveDate: effectiveDate,
  };

  console.log('📋 REQUEST DETAILS:');
  console.log('─'.repeat(80));
  console.log(`Method: POST`);
  console.log(`URL: https://api.smokeball.com.au/bankaccounts/${trustAccountId}/transactions`);
  console.log(`\nHeaders:`);
  console.log(`  x-api-key: <api-key>`);
  console.log(`  Authorization: Bearer <access-token>`);
  console.log(`  Content-Type: application/json`);
  
  console.log(`\n📦 PAYLOAD (JSON):`);
  console.log('─'.repeat(80));
  console.log(JSON.stringify(payload, null, 2));
  
  console.log(`\n📊 PAYLOAD DETAILS:`);
  console.log('─'.repeat(80));
  console.log(`  matterId: ${payload.matterId}`);
  console.log(`  type: ${payload.type}`);
  console.log(`  amount: ${payload.amount}`);
  console.log(`  payorId: ${payload.payorId}`);
  console.log(`  reference: "${payload.reference}"`);
  console.log(`  reason: "${payload.reason}"`);
  console.log(`  description: "${payload.description}"`);
  console.log(`  note: "${payload.note}"`);
  console.log(`  effectiveDate: ${payload.effectiveDate}`);

  console.log(`\n🏦 ACCOUNT INFORMATION:`);
  console.log('─'.repeat(80));
  console.log(`  Account ID: ${trustAccountId}`);
  console.log(`  Account Type: Trust (accountType = 1)`);
  console.log(`  Note: API currently only supports Credit accounts (accountType = 2)`);

  console.log(`\n⚠️  EXECUTING REQUEST...`);
  console.log('─'.repeat(80));

  try {
    const transaction = await smokeballBankAccounts.createTransaction(trustAccountId, payload);
    console.log('\n✅ SUCCESS!');
    console.log(JSON.stringify(transaction, null, 2));
  } catch (error) {
    console.log('\n❌ ERROR RECEIVED:');
    console.log('─'.repeat(80));
    console.log(`Status Code: ${error.status || 'N/A'}`);
    console.log(`Error Message: ${error.message}`);
    
    if (error.responseData) {
      console.log(`\n📋 ERROR RESPONSE BODY:`);
      console.log('─'.repeat(80));
      console.log(JSON.stringify(error.responseData, null, 2));
    }
    
    if (error.originalError?.response?.data) {
      console.log(`\n📋 FULL ERROR RESPONSE:`);
      console.log('─'.repeat(80));
      console.log(JSON.stringify(error.originalError.response.data, null, 2));
    }

    console.log(`\n📝 SUMMARY FOR SMOKEBALL TEAM:`);
    console.log('─'.repeat(80));
    console.log(`Issue: Cannot create transactions for Trust accounts via API`);
    console.log(`Account ID: ${trustAccountId}`);
    console.log(`Account Type: Trust (accountType = 1)`);
    console.log(`Error: ${error.message}`);
    console.log(`\nRequest:`);
    console.log(`  POST /bankaccounts/${trustAccountId}/transactions`);
    console.log(`  Payload: ${JSON.stringify(payload)}`);
    console.log(`\nExpected: Should be able to create transactions for Trust accounts`);
    console.log(`Current Behavior: API returns error stating only Credit accounts supported`);
  }
}

testPayloadAndError().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});

