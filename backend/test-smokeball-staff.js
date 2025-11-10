/**
 * Test Smokeball Staff API
 * Diagnose why staff members are not being returned
 */

import * as smokeballClient from './src/integrations/smokeball/client.js';
import * as smokeballStaff from './src/integrations/smokeball/staff.js';
import { SMOKEBALL_API } from './src/config/smokeball.js';
import dotenv from 'dotenv';

dotenv.config();

// Color output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logSection(title) {
  log(`\n${'='.repeat(80)}`, colors.bright);
  log(title, colors.bright + colors.cyan);
  log('='.repeat(80), colors.bright);
}

/**
 * Test 1: Check Smokeball configuration
 */
async function testConfiguration() {
  logSection('TEST 1: Smokeball Configuration');

  try {
    const requiredVars = [
      'SMOKEBALL_CLIENT_ID',
      'SMOKEBALL_CLIENT_SECRET',
      'SMOKEBALL_API_KEY',
      'SMOKEBALL_AUTH_BASE_URL',
      'SMOKEBALL_API_BASE_URL',
    ];

    let allPresent = true;

    for (const varName of requiredVars) {
      if (process.env[varName]) {
        logSuccess(`${varName}: ${process.env[varName].substring(0, 20)}...`);
      } else {
        logError(`${varName}: Missing`);
        allPresent = false;
      }
    }

    logInfo(`API Base URL: ${SMOKEBALL_API.basePath}`);
    logInfo(`Staff Endpoint: ${SMOKEBALL_API.endpoints.staff}`);

    if (allPresent) {
      logSuccess('All required environment variables present');
      return true;
    } else {
      logError('Missing required environment variables');
      return false;
    }
  } catch (error) {
    logError(`Configuration test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Check authentication status
 */
async function testAuthentication() {
  logSection('TEST 2: Smokeball Authentication Status');

  try {
    const fs = await import('fs');
    const tokenPath = './smokeball-tokens.json';

    if (fs.existsSync(tokenPath)) {
      const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

      logSuccess('Token file exists');
      logInfo(`Access Token: ${tokenData.access_token ? tokenData.access_token.substring(0, 30) + '...' : 'Missing'}`);
      logInfo(`Refresh Token: ${tokenData.refresh_token ? 'Present' : 'Missing'}`);
      logInfo(`Expires At: ${tokenData.expires_at ? new Date(tokenData.expires_at).toISOString() : 'Unknown'}`);

      const isExpired = tokenData.expires_at && Date.now() > tokenData.expires_at;
      if (isExpired) {
        logWarning('Access token is expired - may need refresh');
      } else {
        logSuccess('Access token is still valid');
      }

      return true;
    } else {
      logError('Token file not found - need to authenticate via /api/smokeball/setup');
      return false;
    }
  } catch (error) {
    logError(`Authentication check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Direct API call to staff endpoint
 */
async function testStaffEndpointDirect() {
  logSection('TEST 3: Direct Staff Endpoint Call');

  try {
    logInfo('Making direct GET request to /staff endpoint...');

    const response = await smokeballClient.get(SMOKEBALL_API.endpoints.staff);

    logSuccess('Request successful');
    logInfo(`Response type: ${typeof response}`);
    logInfo(`Response is array: ${Array.isArray(response)}`);

    if (response) {
      log('\nRaw Response:', colors.yellow);
      console.log(JSON.stringify(response, null, 2));
    }

    // Parse results
    const results = Array.isArray(response) ? response : response.items || response.results || [];

    logInfo(`\nStaff count: ${results.length}`);

    if (results.length > 0) {
      logSuccess(`Found ${results.length} staff members`);
      results.forEach((staff, index) => {
        logInfo(`  ${index + 1}. ${staff.firstName || 'N/A'} ${staff.lastName || 'N/A'} (ID: ${staff.id || 'N/A'})`);
      });
      return true;
    } else {
      logWarning('API returned 0 staff members');
      logInfo('This could mean:');
      logInfo('  1. No staff members configured in Smokeball account');
      logInfo('  2. API response structure is different than expected');
      logInfo('  3. Permissions issue with API credentials');
      return false;
    }
  } catch (error) {
    logError(`Staff endpoint test failed: ${error.message}`);
    if (error.response) {
      log('\nError Response:', colors.red);
      console.log(JSON.stringify(error.response.data || error.response, null, 2));
    }
    return false;
  }
}

/**
 * Test 4: Test using staff service
 */
async function testStaffService() {
  logSection('TEST 4: Staff Service (getAllStaff)');

  try {
    logInfo('Calling smokeballStaff.getAllStaff()...');

    const staff = await smokeballStaff.getAllStaff(true); // Force refresh

    logSuccess('Service call successful');
    logInfo(`Staff count: ${staff.length}`);

    if (staff.length > 0) {
      logSuccess(`Found ${staff.length} staff members via service`);
      staff.forEach((member, index) => {
        logInfo(`  ${index + 1}. ${member.firstName} ${member.lastName}`);
        logInfo(`     - ID: ${member.id}`);
        logInfo(`     - Email: ${member.email || 'N/A'}`);
      });
      return true;
    } else {
      logWarning('Service returned 0 staff members');
      return false;
    }
  } catch (error) {
    logError(`Staff service test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Test raw HTTP request to Smokeball
 */
async function testRawHTTPRequest() {
  logSection('TEST 5: Raw HTTP Request to Smokeball API');

  try {
    const axios = (await import('axios')).default;
    const fs = await import('fs');

    // Load token
    const tokenData = JSON.parse(fs.readFileSync('./smokeball-tokens.json', 'utf8'));

    const url = `${SMOKEBALL_API.basePath}${SMOKEBALL_API.endpoints.staff}`;

    logInfo(`Making raw request to: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': SMOKEBALL_API.headers['x-api-key'],
        'Content-Type': 'application/json',
      }
    });

    logSuccess(`Status: ${response.status} ${response.statusText}`);

    log('\nResponse Headers:', colors.yellow);
    console.log(JSON.stringify(response.headers, null, 2));

    log('\nResponse Data:', colors.yellow);
    console.log(JSON.stringify(response.data, null, 2));

    return true;
  } catch (error) {
    logError(`Raw HTTP request failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      log('\nError Response:', colors.red);
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * Test 6: Check Smokeball account permissions
 */
async function testAccountInfo() {
  logSection('TEST 6: Smokeball Account Information');

  try {
    logInfo('Attempting to fetch account/user info...');

    // Try to get user/account info if endpoint exists
    const possibleEndpoints = ['/me', '/user', '/account', '/firm'];

    for (const endpoint of possibleEndpoints) {
      try {
        logInfo(`Trying endpoint: ${endpoint}`);
        const response = await smokeballClient.get(endpoint);

        logSuccess(`✓ ${endpoint} worked!`);
        log('\nResponse:', colors.green);
        console.log(JSON.stringify(response, null, 2));

        return true;
      } catch (err) {
        logWarning(`✗ ${endpoint} failed: ${err.message}`);
      }
    }

    logWarning('Could not find account info endpoint');
    return false;
  } catch (error) {
    logError(`Account info test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════════════════════╗', colors.bright + colors.blue);
  log('║              SMOKEBALL STAFF API DIAGNOSTIC TESTS                         ║', colors.bright + colors.blue);
  log('╚═══════════════════════════════════════════════════════════════════════════╝', colors.bright + colors.blue);

  const results = {
    configuration: false,
    authentication: false,
    staffEndpointDirect: false,
    staffService: false,
    rawHTTPRequest: false,
    accountInfo: false,
  };

  // Run tests sequentially
  results.configuration = await testConfiguration();

  if (results.configuration) {
    results.authentication = await testAuthentication();

    if (results.authentication) {
      results.staffEndpointDirect = await testStaffEndpointDirect();
      results.staffService = await testStaffService();
      results.rawHTTPRequest = await testRawHTTPRequest();
      results.accountInfo = await testAccountInfo();
    }
  }

  // Summary
  logSection('TEST SUMMARY');

  const tests = [
    { name: 'Configuration', result: results.configuration },
    { name: 'Authentication', result: results.authentication },
    { name: 'Staff Endpoint (Direct)', result: results.staffEndpointDirect },
    { name: 'Staff Service', result: results.staffService },
    { name: 'Raw HTTP Request', result: results.rawHTTPRequest },
    { name: 'Account Info', result: results.accountInfo },
  ];

  tests.forEach(test => {
    if (test.result) {
      logSuccess(`${test.name.padEnd(30)} PASSED`);
    } else {
      logError(`${test.name.padEnd(30)} FAILED`);
    }
  });

  const passed = tests.filter(t => t.result).length;
  const total = tests.length;

  log('', colors.reset);
  log(`Results: ${passed}/${total} tests passed`, passed === total ? colors.green : colors.yellow);

  // Recommendations
  logSection('RECOMMENDATIONS');

  if (!results.authentication) {
    logWarning('1. Complete Smokeball OAuth authentication via http://localhost:3001/api/smokeball/setup');
  } else if (!results.staffEndpointDirect) {
    logWarning('1. Add staff members to your Smokeball account');
    logInfo('   - Log into Smokeball web interface');
    logInfo('   - Navigate to Settings → Staff/Users');
    logInfo('   - Add at least one staff member');
  } else {
    logSuccess('All critical tests passed! System is working correctly.');
  }

  log('');
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
