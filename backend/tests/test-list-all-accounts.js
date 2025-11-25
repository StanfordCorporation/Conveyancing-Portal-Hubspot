/**
 * List All Bank Accounts
 * Try different endpoints to find all available bank accounts
 */

import dotenv from 'dotenv';
import * as smokeballBankAccounts from '../src/integrations/smokeball/bankAccounts.js';
import * as client from '../src/integrations/smokeball/client.js';
import { SMOKEBALL_API } from '../src/config/smokeball.js';

dotenv.config();

async function listAllAccounts() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Finding All Bank Accounts');
  console.log('='.repeat(80) + '\n');

  const matterId = 'ce2582fe-b415-4f95-b9b9-c79c903a4654';

  // Test 1: List all bank accounts
  console.log('📋 Test 1: GET /bankaccounts');
  console.log('─'.repeat(80));
  try {
    const accounts = await smokeballBankAccounts.getAllBankAccounts();
    console.log(`✅ Found ${accounts.length} bank account(s):\n`);
    
    if (accounts.length > 0) {
      accounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.name || account.accountName || 'Unknown'}`);
        console.log(`   ID: ${account.id}`);
        console.log(`   Type: ${account.type || account.accountType || 'N/A'}`);
        console.log(`   Account Type (enum): ${account.accountType}`);
        if (account.accountType === 0) console.log(`   → Operating`);
        if (account.accountType === 1) console.log(`   → Trust`);
        if (account.accountType === 2) console.log(`   → Credit ✅`);
        if (account.accountType === 3) console.log(`   → ControlledMoney`);
        console.log(`   Bank: ${account.bankName || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No accounts returned (may need different permissions)\n');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Test 2: Try to get account by matter
  console.log('📋 Test 2: GET /bankaccounts/{matterId}');
  console.log('─'.repeat(80));
  console.log(`Matter ID: ${matterId}`);
  try {
    const accountId = await smokeballBankAccounts.getBankAccountForMatter(matterId);
    console.log(`✅ Bank Account ID: ${accountId}\n`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.status === 404) {
      console.log('   (404 - Matter-specific endpoint may not be available)\n');
    } else {
      console.log('');
    }
  }

  // Test 3: Try different account ID formats based on URL
  console.log('📋 Test 3: Testing Account ID Formats from URL');
  console.log('─'.repeat(80));
  console.log('URL shows: trust/34154dcb-8a76-4f8c-9281-a9b80e3cca16~2FTrust');
  console.log('~2F is URL encoding for "/", so it might be: ~/Trust or _Trust\n');
  
  const baseId = '34154dcb-8a76-4f8c-9281-a9b80e3cca16';
  const formats = [
    `${baseId}_Trust`,
    `${baseId}~Trust`,
    `${baseId}/Trust`,
    baseId,
  ];

  for (const accountId of formats) {
    console.log(`Testing: ${accountId}`);
    try {
      const response = await client.get(SMOKEBALL_API.endpoints.bankAccount(accountId));
      console.log(`✅ Found account: ${JSON.stringify(response, null, 2)}\n`);
      break;
    } catch (error) {
      if (error.status === 404) {
        console.log(`   ❌ 404 Not Found\n`);
      } else {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }
  }

  // Test 4: Try to get transactions to see what account format works
  console.log('📋 Test 4: Testing Transaction Endpoint with Different Formats');
  console.log('─'.repeat(80));
  const testAccountId = '34154dcb-8a76-4f8c-9281-a9b80e3cca16_Trust';
  console.log(`Testing GET /bankaccounts/${testAccountId}/transactions`);
  try {
    const transactions = await client.get(SMOKEBALL_API.endpoints.transactions(testAccountId));
    console.log(`✅ Success! Found transactions endpoint`);
    console.log(`   Response: ${JSON.stringify(transactions, null, 2)}\n`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.status === 404) {
      console.log('   Account ID format may be incorrect\n');
    } else {
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('📊 Summary');
  console.log('='.repeat(80));
  console.log('Based on the URL pattern, the account ID might need special encoding.');
  console.log('The URL shows: ~2FTrust which decodes to /Trust');
  console.log('Try using the account ID format that matches your Smokeball UI.');
}

listAllAccounts().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});


