/**
 * Test Smokeball API Access
 * Verifies if authentication is working by testing read operations
 */

import dotenv from 'dotenv';
import * as smokeballMatters from '../src/integrations/smokeball/matters.js';
import * as smokeballContacts from '../src/integrations/smokeball/contacts.js';
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

async function testApiAccess() {
  logSection('🔍 Testing Smokeball API Access');

  const matterId = 'ce2582fe-b415-4f95-b9b9-c79c903a4654';
  const contactId = '996e77c6-0072-4e8b-a836-72ed96b01c51';

  // Test 1: Read Matter
  logSection('TEST 1: Read Matter');
  try {
    log(`📋 Attempting to fetch matter: ${matterId}`, 'cyan');
    const matter = await smokeballMatters.getMatter(matterId);
    
    log('✅ Matter retrieved successfully!', 'green');
    log(`  Matter ID: ${matter.id}`, 'cyan');
    log(`  Matter Number: ${matter.number || 'N/A (lead)'}`, 'cyan');
    log(`  Is Lead: ${matter.isLead}`, 'cyan');
    log(`  Status: ${matter.status || 'N/A'}`, 'cyan');
    
    if (matter.shortName) {
      log(`  Short Name: ${matter.shortName}`, 'cyan');
    }
    
  } catch (error) {
    log(`❌ Failed to read matter: ${error.message}`, 'red');
    if (error.status === 401 || error.status === 403) {
      log('  ⚠️  Authentication/Authorization issue', 'yellow');
    }
    if (error.responseData) {
      log('  Error details:', 'red');
      console.log(JSON.stringify(error.responseData, null, 2));
    }
  }

  // Test 2: Read Contact
  logSection('TEST 2: Read Contact');
  try {
    log(`👤 Attempting to fetch contact: ${contactId}`, 'cyan');
    const contact = await smokeballContacts.getContact(contactId);
    
    log('✅ Contact retrieved successfully!', 'green');
    log(`  Contact ID: ${contact.id}`, 'cyan');
    log(`  Name: ${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'N/A', 'cyan');
    log(`  Email: ${contact.email || 'N/A'}`, 'cyan');
    
  } catch (error) {
    log(`❌ Failed to read contact: ${error.message}`, 'red');
    if (error.status === 401 || error.status === 403) {
      log('  ⚠️  Authentication/Authorization issue', 'yellow');
    }
    if (error.responseData) {
      log('  Error details:', 'red');
      console.log(JSON.stringify(error.responseData, null, 2));
    }
  }

  // Test 3: List Bank Accounts (read operation)
  logSection('TEST 3: List Bank Accounts');
  try {
    log('🏦 Attempting to list bank accounts...', 'cyan');
    const bankAccounts = await smokeballBankAccounts.getAllBankAccounts();
    
    log(`✅ Retrieved ${bankAccounts.length} bank account(s)`, 'green');
    bankAccounts.forEach((account, index) => {
      log(`  ${index + 1}. ${account.name || account.accountName || 'Unknown'} (${account.id})`, 'cyan');
    });
    
  } catch (error) {
    log(`❌ Failed to list bank accounts: ${error.message}`, 'red');
    if (error.status === 401 || error.status === 403) {
      log('  ⚠️  Authentication/Authorization issue', 'yellow');
    }
    if (error.responseData) {
      log('  Error details:', 'red');
      console.log(JSON.stringify(error.responseData, null, 2));
    }
  }

  // Test 4: Try to get bank account for matter
  logSection('TEST 4: Get Bank Account for Matter');
  try {
    log(`🏦 Attempting to get bank account for matter: ${matterId}`, 'cyan');
    const bankAccountId = await smokeballBankAccounts.getBankAccountForMatter(matterId);
    
    log(`✅ Bank account retrieved: ${bankAccountId}`, 'green');
    
  } catch (error) {
    log(`❌ Failed to get bank account: ${error.message}`, 'red');
    if (error.status === 401 || error.status === 403) {
      log('  ⚠️  Authentication/Authorization issue', 'yellow');
    } else if (error.status === 404) {
      log('  ℹ️  Matter-specific bank account endpoint not available (404)', 'yellow');
      log('  This is expected - matter may not have a dedicated bank account', 'yellow');
    }
    if (error.responseData) {
      log('  Error details:', 'red');
      console.log(JSON.stringify(error.responseData, null, 2));
    }
  }

  logSection('📊 Summary');
  log('API access tests completed.', 'bright');
  log('\nInterpretation:', 'bright');
  log('  ✅ If matter/contact reads work: Authentication is OK', 'green');
  log('  ❌ If all reads fail with 401/403: Authentication issue', 'red');
  log('  ⚠️  If reads work but writes fail: Permissions issue (expected)', 'yellow');
}

testApiAccess().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


