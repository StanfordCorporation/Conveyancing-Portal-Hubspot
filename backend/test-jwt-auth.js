/**
 * DocuSign JWT Authentication Test Script
 * 
 * This script tests the JWT authentication flow for DocuSign integration.
 * Run this to verify that JWT authentication is working correctly.
 * 
 * Usage:
 *   node test-jwt-auth.js
 * 
 * What it tests:
 *   1. JWT token generation using RSA private key
 *   2. Token caching mechanism
 *   3. User info retrieval
 *   4. API client creation with JWT
 */

import dotenv from 'dotenv';
import { testJWTAuth, getAccessToken, getUserInfo, clearTokenCache } from './src/integrations/docusign/jwtAuth.js';
import { getDocuSignClientJWT } from './src/integrations/docusign/client.js';
import docusignConfig from './src/config/docusign.js';

dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function runTests() {
  console.clear();
  
  logSection('DocuSign JWT Authentication Test Suite');
  
  logInfo('Configuration:');
  console.log(`   Integration Key: ${docusignConfig.integrationKey}`);
  console.log(`   User ID: ${docusignConfig.userId}`);
  console.log(`   Account ID: ${docusignConfig.accountId}`);
  console.log(`   OAuth Base Path: ${docusignConfig.oAuthBasePath}`);
  console.log(`   API Base Path: ${docusignConfig.basePath}`);
  console.log(`   Keypair ID: ${docusignConfig.keypairId}`);
  console.log(`   Private Key: ${docusignConfig.privateKey ? 'Loaded ✓' : 'Missing ✗'}`);
  
  let allTestsPassed = true;
  const testResults = [];

  // =========================================================================
  // Test 1: JWT Token Generation
  // =========================================================================
  logSection('Test 1: JWT Token Generation');
  
  try {
    logInfo('Requesting JWT token from DocuSign...');
    const token = await getAccessToken();
    
    if (token && token.length > 0) {
      logSuccess('JWT token generated successfully');
      console.log(`   Token (first 30 chars): ${token.substring(0, 30)}...`);
      console.log(`   Token length: ${token.length} characters`);
      testResults.push({ test: 'JWT Token Generation', passed: true });
    } else {
      throw new Error('Token is empty');
    }
  } catch (error) {
    logError(`JWT token generation failed: ${error.message}`);
    
    if (error.message.includes('consent_required')) {
      logWarning('\n⚠️  CONSENT REQUIRED');
      console.log('\nYou need to grant consent for the application to access DocuSign.');
      console.log('Please visit the following URL in your browser:\n');
      log(`https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${docusignConfig.integrationKey}&redirect_uri=http://localhost:3001/api/docusign/oauth-callback\n`, colors.yellow);
      console.log('After granting consent, run this test again.\n');
    }
    
    testResults.push({ test: 'JWT Token Generation', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // =========================================================================
  // Test 2: Token Caching
  // =========================================================================
  logSection('Test 2: Token Caching');
  
  try {
    logInfo('Testing token cache mechanism...');
    
    const startTime1 = Date.now();
    const token1 = await getAccessToken();
    const time1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    const token2 = await getAccessToken();
    const time2 = Date.now() - startTime2;
    
    if (token1 === token2) {
      logSuccess('Token caching is working correctly');
      console.log(`   First call: ${time1}ms (API request)`);
      console.log(`   Second call: ${time2}ms (from cache)`);
      console.log(`   Performance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
      testResults.push({ test: 'Token Caching', passed: true });
    } else {
      throw new Error('Cached token differs from original token');
    }
  } catch (error) {
    logError(`Token caching test failed: ${error.message}`);
    testResults.push({ test: 'Token Caching', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // =========================================================================
  // Test 3: User Info Retrieval
  // =========================================================================
  logSection('Test 3: User Info Retrieval');
  
  try {
    logInfo('Fetching user information from DocuSign...');
    const userInfo = await getUserInfo();
    
    if (userInfo && userInfo.name && userInfo.email) {
      logSuccess('User info retrieved successfully');
      console.log(`   Name: ${userInfo.name}`);
      console.log(`   Email: ${userInfo.email}`);
      console.log(`   Accounts: ${userInfo.accounts.length}`);
      
      if (userInfo.accounts.length > 0) {
        const defaultAccount = userInfo.accounts.find(a => a.isDefault);
        if (defaultAccount) {
          console.log(`\n   Default Account:`);
          console.log(`     Account ID: ${defaultAccount.accountId}`);
          console.log(`     Account Name: ${defaultAccount.accountName}`);
          console.log(`     Base URI: ${defaultAccount.baseUri}`);
          
          // Verify account ID matches config
          if (defaultAccount.accountId === docusignConfig.accountId) {
            logSuccess('Account ID matches configuration ✓');
          } else {
            logWarning(`Account ID in config (${docusignConfig.accountId}) differs from default account (${defaultAccount.accountId})`);
          }
        }
      }
      
      testResults.push({ test: 'User Info Retrieval', passed: true });
    } else {
      throw new Error('User info is incomplete');
    }
  } catch (error) {
    logError(`User info retrieval failed: ${error.message}`);
    testResults.push({ test: 'User Info Retrieval', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // =========================================================================
  // Test 4: API Client Creation
  // =========================================================================
  logSection('Test 4: API Client Creation with JWT');
  
  try {
    logInfo('Creating DocuSign API client with JWT...');
    const apiClient = await getDocuSignClientJWT();
    
    if (apiClient) {
      logSuccess('API client created successfully');
      console.log(`   Base Path: ${apiClient.basePath}`);
      console.log(`   Default Headers: ${Object.keys(apiClient.defaultHeaders).length} headers set`);
      
      // Verify authorization header
      if (apiClient.defaultHeaders.Authorization) {
        logSuccess('Authorization header is set ✓');
        console.log(`   Auth Header (first 40 chars): ${apiClient.defaultHeaders.Authorization.substring(0, 40)}...`);
      } else {
        throw new Error('Authorization header is missing');
      }
      
      testResults.push({ test: 'API Client Creation', passed: true });
    } else {
      throw new Error('API client is null');
    }
  } catch (error) {
    logError(`API client creation failed: ${error.message}`);
    testResults.push({ test: 'API Client Creation', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // =========================================================================
  // Test 5: Token Refresh
  // =========================================================================
  logSection('Test 5: Token Refresh');
  
  try {
    logInfo('Testing token refresh...');
    
    // Clear the cache
    clearTokenCache();
    logInfo('Token cache cleared');
    
    // Request a new token
    const newToken = await getAccessToken();
    
    if (newToken && newToken.length > 0) {
      logSuccess('Token refresh successful');
      console.log(`   New Token (first 30 chars): ${newToken.substring(0, 30)}...`);
      testResults.push({ test: 'Token Refresh', passed: true });
    } else {
      throw new Error('Refreshed token is empty');
    }
  } catch (error) {
    logError(`Token refresh failed: ${error.message}`);
    testResults.push({ test: 'Token Refresh', passed: false, error: error.message });
    allTestsPassed = false;
  }

  // =========================================================================
  // Test Summary
  // =========================================================================
  logSection('Test Summary');
  
  console.log('');
  testResults.forEach((result, index) => {
    const status = result.passed ? logSuccess : logError;
    status(`${index + 1}. ${result.test}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  
  if (allTestsPassed) {
    log(`\n🎉 ALL TESTS PASSED! (${passedTests}/${totalTests})`, colors.bright + colors.green);
    log('\n✅ DocuSign JWT authentication is configured correctly!', colors.green);
    log('✅ You can now use JWT authentication in your application.', colors.green);
  } else {
    log(`\n⚠️  SOME TESTS FAILED (${passedTests}/${totalTests} passed)`, colors.bright + colors.yellow);
    log('\nPlease fix the issues above and run the test again.', colors.yellow);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Return exit code
  return allTestsPassed ? 0 : 1;
}

// Run the tests
runTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    logError(`\n❌ Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

