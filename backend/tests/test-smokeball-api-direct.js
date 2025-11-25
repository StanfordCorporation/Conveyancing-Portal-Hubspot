/**
 * Test Smokeball API with authenticated server
 * Tests staff and contacts endpoints
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(80)}`, colors.bright);
  log(title, colors.bright + colors.cyan);
  log('='.repeat(80), colors.bright);
}

async function testStaffAPI() {
  logSection('TEST: Smokeball Staff API');

  try {
    log('Making request to Smokeball via backend proxy...', colors.cyan);

    const response = await axios.get(`${BASE_URL}/api/smokeball/test/staff`);

    log(`✅ Status: ${response.status}`, colors.green);
    log('\nStaff Response:', colors.yellow);
    console.log(JSON.stringify(response.data, null, 2));

    return { success: true, data: response.data };

  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    if (error.response) {
      log(`Status: ${error.response.status}`, colors.red);
      log('Response:', colors.red);
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

async function testContactsAPI() {
  logSection('TEST: Smokeball Contacts API');

  try {
    log('Making request to Smokeball via backend proxy...', colors.cyan);

    const response = await axios.get(`${BASE_URL}/api/smokeball/test/contacts`);

    log(`✅ Status: ${response.status}`, colors.green);
    log('\nContacts Response:', colors.yellow);
    console.log(JSON.stringify(response.data, null, 2));

    return { success: true, data: response.data };

  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    if (error.response) {
      log(`Status: ${error.response.status}`, colors.red);
      log('Response:', colors.red);
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

async function testContactCreation() {
  logSection('TEST: Smokeball Contact Creation (Testing Payload Structures)');

  const testPayloads = [
    {
      name: 'Person Wrapper',
      payload: {
        person: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '0400000000',
        }
      }
    },
    {
      name: 'Flat Structure',
      payload: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test2@example.com',
        phone: '0400000001',
      }
    },
  ];

  for (const test of testPayloads) {
    log(`\n📝 Testing: ${test.name}`, colors.cyan);
    log('Payload:', colors.yellow);
    console.log(JSON.stringify(test.payload, null, 2));

    try {
      const response = await axios.post(`${BASE_URL}/api/smokeball/test/contact`, test.payload);

      log(`✅ ${test.name} WORKED!`, colors.green);
      log('Response:', colors.green);
      console.log(JSON.stringify(response.data, null, 2));

      // Clean up - delete test contact
      if (response.data?.id) {
        try {
          await axios.delete(`${BASE_URL}/api/smokeball/test/contact/${response.data.id}`);
          log('✅ Test contact deleted', colors.green);
        } catch (err) {
          log('⚠️ Could not delete test contact', colors.yellow);
        }
      }

    } catch (error) {
      log(`❌ ${test.name} failed: ${error.message}`, colors.red);
      if (error.response?.data) {
        log('Error details:', colors.red);
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║           SMOKEBALL API TESTS (VIA AUTHENTICATED SERVER)                 ║', colors.bright + colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════════════════╝', colors.bright + colors.cyan);

  // Check auth status first
  logSection('Checking Authentication Status');
  try {
    const authResponse = await axios.get(`${BASE_URL}/api/smokeball/status`);
    log('Auth Status:', colors.green);
    console.log(JSON.stringify(authResponse.data, null, 2));
  } catch (err) {
    log('❌ Not authenticated - please complete OAuth flow first', colors.red);
    return;
  }

  await testStaffAPI();
  await testContactsAPI();
  await testContactCreation();

  logSection('TESTS COMPLETE');
}

runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});