/**
 * Smokeball Bank Accounts API Test Script
 * Tests various endpoints to debug the 403 error
 */

import dotenv from 'dotenv';
import * as tokenStorage from '../src/services/storage/token-storage.js';
import axios from 'axios';

dotenv.config();

const SMOKEBALL_API_BASE = process.env.SMOKEBALL_API_BASE_URL || 'https://api.smokeball.com.au';

// Test matter ID from the logs (manually converted to matter)
const TEST_MATTER_ID = 'd69284c2-5b30-4177-bbea-e3a694428cee';

// Skip lead conversion test since matter is already converted
const SKIP_CONVERSION = true;

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

async function makeRequest(method, endpoint, description, tokens) {
  return makeRequestWithBody(method, endpoint, description, tokens, null);
}

async function makeAuthTest(method, endpoint, description, bearerToken, apiKey) {
  try {
    log(`\n🔄 Testing: ${description}`, 'cyan');
    log(`   ${method} ${endpoint}`, 'blue');
    
    const headers = {
      'Content-Type': 'application/json',
    };

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
      log('   🔑 Using: Bearer token', 'cyan');
    }
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
      log('   🔑 Using: x-api-key', 'cyan');
    }

    const response = await axios({
      method,
      url: `${SMOKEBALL_API_BASE}${endpoint}`,
      headers,
    });

    log(`   ✅ SUCCESS - Status: ${response.status}`, 'green');
    log(`   📦 Response:`, 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };

  } catch (error) {
    log(`   ❌ FAILED - Status: ${error.response?.status || 'No response'}`, 'red');
    
    if (error.response) {
      log(`   📦 Error Response:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 403) {
        log(`   🚫 FORBIDDEN - Insufficient permissions`, 'red');
      } else if (error.response.status === 404) {
        log(`   🔍 NOT FOUND - Resource doesn't exist`, 'yellow');
      } else if (error.response.status === 401) {
        log(`   🔐 UNAUTHORIZED - Authentication issue`, 'red');
      }
    } else {
      log(`   ⚠️  Error: ${error.message}`, 'red');
    }

    return { success: false, error: error.message, status: error.response?.status };
  }
}

async function makeRequestWithBody(method, endpoint, description, tokens, body = null) {
  try {
    log(`\n🔄 Testing: ${description}`, 'cyan');
    log(`   ${method} ${endpoint}`, 'blue');
    
    if (!tokens || !tokens.access_token) {
      log('   ❌ No access token available', 'red');
      return { success: false, error: 'No token' };
    }

    const config = {
      method,
      url: `${SMOKEBALL_API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'x-api-key': process.env.SMOKEBALL_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      config.data = body;
    }

    const response = await axios(config);

    log(`   ✅ SUCCESS - Status: ${response.status}`, 'green');
    log(`   📦 Response:`, 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };

  } catch (error) {
    log(`   ❌ FAILED - Status: ${error.response?.status || 'No response'}`, 'red');
    
    if (error.response) {
      log(`   📦 Error Response:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 403) {
        log(`   🚫 FORBIDDEN - Insufficient permissions`, 'red');
      } else if (error.response.status === 404) {
        log(`   🔍 NOT FOUND - Resource doesn't exist`, 'yellow');
      } else if (error.response.status === 401) {
        log(`   🔐 UNAUTHORIZED - Authentication issue`, 'red');
      } else if (error.response.status === 202) {
        log(`   ✅ ACCEPTED - Request is being processed asynchronously`, 'green');
      }
    } else {
      log(`   ⚠️  Error: ${error.message}`, 'red');
    }

    return { success: false, error: error.message, status: error.response?.status };
  }
}

async function runTests() {
  logSection('🧪 SMOKEBALL BANK ACCOUNTS API TEST SUITE');

  log('Configuration:', 'bright');
  log(`  API Base URL: ${SMOKEBALL_API_BASE}`);
  log(`  Test Matter ID: ${TEST_MATTER_ID}`);
  log(`  API Key: ${process.env.SMOKEBALL_API_KEY ? '✓ Set' : '✗ Not set'}`, process.env.SMOKEBALL_API_KEY ? 'green' : 'red');

  // Test 1: Get tokens and refresh if scopes changed
  logSection('TEST 1: Authentication & Token Status');
  let tokens;
  try {
    tokens = await tokenStorage.loadTokens();
    if (tokens && tokens.access_token) {
      log('✅ Access token retrieved successfully', 'green');
      log(`   Token expires: ${new Date(tokens.expires_at).toISOString()}`, 'cyan');
      log(`   Token preview: ${tokens.access_token.substring(0, 30)}...`, 'cyan');
      
      // Check if token is expired or about to expire
      const expiresAt = new Date(tokens.expires_at);
      const now = new Date();
      const minutesUntilExpiry = (expiresAt - now) / 1000 / 60;
      
      log(`   ⏰ Token expires in ${minutesUntilExpiry.toFixed(1)} minutes`, 'cyan');
      
      if (minutesUntilExpiry < 5) {
        log('   🔄 Token expiring soon or expired, will auto-refresh on first API call', 'yellow');
      }
      
      log('\n   💡 NOTE: If you just changed scopes in Smokeball console:', 'yellow');
      log('      The new permissions will be included when token auto-refreshes', 'yellow');
    } else {
      log('❌ No access token available', 'red');
      log('   Tokens structure:', 'red');
      console.log(tokens);
      return;
    }
  } catch (error) {
    log(`❌ Error getting tokens: ${error.message}`, 'red');
    return;
  }

  // Test 2: Get matter details (should work - baseline test)
  logSection('TEST 2: Get Matter Details (Baseline)');
  const matterResult = await makeRequest('GET', `/matters/${TEST_MATTER_ID}`, 'Get matter details', tokens);
  if (matterResult.success && matterResult.data) {
    log('\n📋 Matter Information:', 'bright');
    log(`   Status: ${matterResult.data.status || 'Unknown'}`);
    log(`   Is Lead: ${matterResult.data.isLead || 'Unknown'}`);
    log(`   Matter Number: ${matterResult.data.number || 'Not assigned'}`);
    
    // Check if bank account info is included
    if (matterResult.data.bankAccount || matterResult.data.trustAccount) {
      log('   💡 FOUND: Matter contains bank account information!', 'green');
      console.log('   Bank Account Data:', JSON.stringify(matterResult.data.bankAccount || matterResult.data.trustAccount, null, 2));
    } else {
      log('   ℹ️  Matter does not include bank account info', 'yellow');
    }
  }

  // Test 3: Convert lead to matter (or verify already converted)
  logSection('TEST 3: Matter Conversion Status');
  let convertedMatterId = TEST_MATTER_ID;
  
  if (SKIP_CONVERSION) {
    log('⏭️  Skipping conversion - matter already converted manually', 'cyan');
    
    // Fetch fresh matter details
    const updatedMatterResult = await makeRequest('GET', `/matters/${TEST_MATTER_ID}`, 'Get fresh matter details', tokens);
    
    if (updatedMatterResult.success && updatedMatterResult.data) {
      log('\n📋 Matter Status:', 'bright');
      log(`   Is Lead: ${updatedMatterResult.data.isLead}`, updatedMatterResult.data.isLead ? 'yellow' : 'green');
      log(`   Matter Number: ${updatedMatterResult.data.number || 'Not assigned yet'}`, updatedMatterResult.data.number ? 'green' : 'yellow');
      
      if (updatedMatterResult.data.number) {
        convertedMatterId = updatedMatterResult.data.number;
        log(`   ✅ Using Matter Number: ${convertedMatterId}`, 'green');
      } else {
        log(`   ℹ️  Using Lead UUID: ${convertedMatterId}`, 'cyan');
      }
    }
  } else if (matterResult.success && matterResult.data && matterResult.data.isLead) {
    log('Lead detected - attempting to convert to matter...', 'cyan');
    log(`   Matter Type ID: ${matterResult.data.matterTypeId}`, 'cyan');
    
    // Prepare conversion payload
    const conversionPayload = {
      matterTypeId: matterResult.data.matterTypeId,
      clientRole: 'Vendor', // For Sale matters
      isLead: false
    };
    
    log('   Conversion Payload:', 'cyan');
    console.log(JSON.stringify(conversionPayload, null, 2));
    
    const convertResult = await makeRequestWithBody(
      'PATCH', 
      `/matters/${TEST_MATTER_ID}`, 
      'Convert lead to matter',
      tokens,
      conversionPayload
    );
    
    if (convertResult.success) {
      log('✅ Lead converted to matter successfully!', 'green');
      
      // Wait a moment for conversion to complete
      log('⏳ Waiting 3 seconds for conversion to complete...', 'cyan');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch updated matter details
      const updatedMatterResult = await makeRequest('GET', `/matters/${TEST_MATTER_ID}`, 'Get updated matter details', tokens);
      
      if (updatedMatterResult.success && updatedMatterResult.data) {
        log('\n📋 Updated Matter Information:', 'bright');
        log(`   Status: ${updatedMatterResult.data.status || 'Unknown'}`);
        log(`   Is Lead: ${updatedMatterResult.data.isLead}`);
        log(`   Matter Number: ${updatedMatterResult.data.number || 'Not assigned yet'}`);
        
        if (updatedMatterResult.data.number) {
          convertedMatterId = updatedMatterResult.data.number;
          log(`   💡 Matter Number available: ${convertedMatterId}`, 'green');
        }
      }
    } else {
      log('⚠️ Lead conversion failed, continuing with lead ID...', 'yellow');
    }
  } else {
    log('ℹ️ Matter is already converted or not a lead', 'cyan');
  }

  // Test 4: Try the matter-specific bank account endpoint
  logSection('TEST 4: Get Bank Account for Matter');
  log(`Using Matter ID: ${convertedMatterId}`, 'cyan');
  const bankAccountResult = await makeRequest('GET', `/bankaccounts/${convertedMatterId}`, 'Get bank account for matter', tokens);
  
  // If bank account found, try to get transactions
  if (bankAccountResult.success && bankAccountResult.data && bankAccountResult.data.id) {
    const bankAccountId = bankAccountResult.data.id;
    
    logSection('TEST 4.1: Get Transactions for Bank Account');
    log(`✅ Bank Account ID found: ${bankAccountId}`, 'green');
    log('Attempting to get transactions...', 'cyan');
    
    await makeRequest('GET', `/bankaccounts/${bankAccountId}/transactions`, 'Get transactions for bank account', tokens);
    
    // Try to get transactions filtered by matter
    await makeRequest('GET', `/bankaccounts/${bankAccountId}/transactions?matterId=${TEST_MATTER_ID}`, 'Get transactions filtered by matter', tokens);
  }

  // Test 5: Try to list all bank accounts with different auth methods
  logSection('TEST 5: List All Bank Accounts - Different Auth Methods');
  
  // Test 5a: With both Bearer token and API key (current method)
  log('\n5a. Using BOTH Bearer token AND x-api-key:', 'bright');
  await makeRequest('GET', `/bankaccounts`, 'With Bearer + API Key', tokens);
  
  // Test 5b: With ONLY Bearer token (no API key)
  log('\n5b. Using ONLY Bearer token (no API key):', 'bright');
  await makeAuthTest('GET', `/bankaccounts`, 'Bearer only', tokens.access_token, null);
  
  // Test 5c: With ONLY API key (no Bearer token)
  log('\n5c. Using ONLY x-api-key (no Bearer token):', 'bright');
  await makeAuthTest('GET', `/bankaccounts`, 'API Key only', null, process.env.SMOKEBALL_API_KEY);

  // Test 6: Try with different variations
  logSection('TEST 6: Try Alternative Endpoints');
  
  await makeRequest('GET', `/matters/${TEST_MATTER_ID}/bankaccount`, 'Get bank account as matter sub-resource', tokens);
  await makeRequest('GET', `/matters/${TEST_MATTER_ID}/trustaccount`, 'Get trust account as matter sub-resource', tokens);
  await makeRequest('GET', `/bankaccounts?matterId=${TEST_MATTER_ID}`, 'List bank accounts filtered by matter ID', tokens);

  // Test 7: Try to access account info endpoint (if it exists)
  logSection('TEST 7: Try Account Info Endpoints');
  
  await makeRequest('GET', `/account`, 'Get account information', tokens);
  await makeRequest('GET', `/account/bankaccounts`, 'Get bank accounts from account endpoint', tokens);

  // Test 8: Try to READ transactions from Trust account
  logSection('TEST 8: Read Transactions from Trust Account');
  
  const trustAccountId = '34154dcb-8a76-4f8c-9281-a9b80e3cca16_Trust';
  
  log(`Using Trust Account ID: ${trustAccountId}`, 'cyan');
  
  // Test 8a: List all transactions
  log('\n8a. Get all transactions for trust account:', 'bright');
  const transactionsResult = await makeRequest(
    'GET',
    `/bankaccounts/${trustAccountId}/transactions`,
    'Get all transactions',
    tokens
  );
  
  // Test 8b: List transactions filtered by matter
  log('\n8b. Get transactions filtered by matter:', 'bright');
  const matterTransactionsResult = await makeRequest(
    'GET',
    `/bankaccounts/${trustAccountId}/transactions?matterId=${TEST_MATTER_ID}`,
    'Get transactions for specific matter',
    tokens
  );
  
  // Test 8c: If we found any transactions, try to get a specific one
  if (transactionsResult.success && transactionsResult.data?.value?.length > 0) {
    const firstTransactionId = transactionsResult.data.value[0].id;
    
    log('\n8c. Get specific transaction by ID:', 'bright');
    log(`   Transaction ID: ${firstTransactionId}`, 'cyan');
    
    await makeRequest(
      'GET',
      `/bankaccounts/${trustAccountId}/transactions/${firstTransactionId}`,
      'Get transaction by ID',
      tokens
    );
  }
  
  // Test 8d: Try to CREATE a transaction
  logSection('TEST 8d: Create Transaction (WRITE Test)');
  
  log(`Matter ID: ${TEST_MATTER_ID}`, 'cyan');
  
  const transactionPayload = {
    matterId: TEST_MATTER_ID,
    payorId: 'c18d3c43-5cd0-4697-a686-627b0b21ad6c', // First client from matter
    type: 'Bank Transfer',
    amount: 0.01, // Test with 1 cent
    reference: '',
    reason: 'API Test Transaction',
    description: '',
    note: 'Testing bank account transaction creation',
    effectiveDate: new Date().toISOString()
  };
  
  log('\nTransaction Payload:', 'cyan');
  console.log(JSON.stringify(transactionPayload, null, 2));
  
  const createTransactionResult = await makeRequestWithBody(
    'POST',
    `/bankaccounts/${trustAccountId}/transactions`,
    'Create test transaction',
    tokens,
    transactionPayload
  );
  
  if (createTransactionResult.success) {
    log('\n🎉 TRANSACTION CREATED SUCCESSFULLY!', 'green');
    log('   Transaction ID: ' + createTransactionResult.data.id, 'green');
    log('\n   ✅ Smokeball receipting will work!', 'green');
  } else {
    log('\n⚠️ Transaction creation failed - you may need to add WRITE permissions', 'yellow');
    log('   Check Smokeball Developer Console for transaction create/write scopes', 'yellow');
  }

  // Test 9: Check if we can access staff (permission test)
  logSection('TEST 9: Permission Test - Staff Endpoint');
  await makeRequest('GET', `/staff`, 'Get staff (permission check)', tokens);

  // Summary
  logSection('📊 TEST SUMMARY');
  log('Tests completed. Review the results above to determine:', 'bright');
  log('  1. Which endpoints return 403 (permission issues)', 'yellow');
  log('  2. Which endpoints work (alternative approaches)', 'yellow');
  log('  3. Whether bank account info is embedded in other responses', 'yellow');
  log('\nNext Steps:', 'bright');
  log('  - If GET /matters includes bank account: Use that instead', 'cyan');
  log('  - If no endpoints work: Contact Smokeball to enable permissions', 'cyan');
  log('  - If alternative endpoint works: Update the code to use it', 'cyan');
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

