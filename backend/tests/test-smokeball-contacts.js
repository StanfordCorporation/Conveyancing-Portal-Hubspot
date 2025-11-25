/**
 * Test Smokeball Contacts API
 * Diagnose contact creation payload structure issues
 */

import * as smokeballClient from '../src/integrations/smokeball/client.js';
import * as smokeballContacts from '../src/integrations/smokeball/contacts.js';
import { SMOKEBALL_API } from '../src/config/smokeball.js';
import dotenv from 'dotenv';

dotenv.config();

// Color output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
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
 * Test 1: List existing contacts
 */
async function testListContacts() {
  logSection('TEST 1: List Existing Contacts');

  try {
    logInfo('Fetching existing contacts...');

    const response = await smokeballClient.get(SMOKEBALL_API.endpoints.contacts);

    logSuccess('Request successful');

    const results = Array.isArray(response) ? response : response.items || response.results || [];

    logInfo(`Found ${results.length} contacts`);

    if (results.length > 0) {
      log('\nExisting contacts:', colors.yellow);
      results.slice(0, 5).forEach((contact, index) => {
        console.log(JSON.stringify(contact, null, 2));
      });

      if (results.length > 5) {
        logInfo(`... and ${results.length - 5} more`);
      }
    } else {
      logInfo('No existing contacts found');
    }

    return { success: true, contacts: results };
  } catch (error) {
    logError(`Failed to list contacts: ${error.message}`);
    return { success: false, contacts: [] };
  }
}

/**
 * Test 2: Try different contact payload structures
 */
async function testContactPayloads() {
  logSection('TEST 2: Test Contact Payload Structures');

  const testPayloads = [
    {
      name: 'Current Structure (Flat)',
      payload: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '0400000000',
      }
    },
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
      name: 'Person with Full Name',
      payload: {
        person: {
          name: {
            first: 'Test',
            last: 'User',
          },
          email: 'test@example.com',
          phone: '0400000000',
        }
      }
    },
    {
      name: 'Contact Type Field',
      payload: {
        contactType: 'Person',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '0400000000',
      }
    },
    {
      name: 'Type + Person Wrapper',
      payload: {
        type: 'Person',
        person: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '0400000000',
        }
      }
    },
  ];

  const results = [];

  for (const test of testPayloads) {
    logInfo(`\nTrying: ${test.name}`);
    log('Payload:', colors.yellow);
    console.log(JSON.stringify(test.payload, null, 2));

    try {
      const axios = (await import('axios')).default;
      const fs = await import('fs');

      // Load token
      const tokenData = JSON.parse(fs.readFileSync('./smokeball-tokens.json', 'utf8'));

      const url = `${SMOKEBALL_API.basePath}${SMOKEBALL_API.endpoints.contacts}`;

      const response = await axios.post(url, test.payload, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'x-api-key': SMOKEBALL_API.headers['x-api-key'],
          'Content-Type': 'application/json',
        }
      });

      logSuccess(`✓ ${test.name} WORKED! Status: ${response.status}`);
      log('Response:', colors.green);
      console.log(JSON.stringify(response.data, null, 2));

      results.push({ test: test.name, success: true, response: response.data });

      // If it worked, we found the right format - delete the test contact
      if (response.data?.id) {
        try {
          await axios.delete(`${url}/${response.data.id}`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'x-api-key': SMOKEBALL_API.headers['x-api-key'],
            }
          });
          logInfo('Test contact deleted');
        } catch (deleteErr) {
          logWarning('Could not delete test contact - delete manually');
        }
      }

    } catch (error) {
      logError(`✗ ${test.name} failed: ${error.message}`);

      if (error.response) {
        log('Error response:', colors.red);
        console.log(JSON.stringify(error.response.data, null, 2));
      }

      results.push({ test: test.name, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Test 3: Examine Smokeball API documentation endpoint
 */
async function testAPISchema() {
  logSection('TEST 3: Check for API Schema/Documentation');

  const docEndpoints = [
    '/swagger.json',
    '/openapi.json',
    '/api-docs',
    '/docs',
    '/.well-known/openapi',
  ];

  for (const endpoint of docEndpoints) {
    try {
      logInfo(`Trying: ${endpoint}`);

      const response = await smokeballClient.get(endpoint);

      logSuccess(`✓ Found schema at ${endpoint}`);
      log('Schema:', colors.green);
      console.log(JSON.stringify(response, null, 2).substring(0, 500) + '...');

      return true;
    } catch (err) {
      logWarning(`✗ ${endpoint} - ${err.message}`);
    }
  }

  logInfo('No schema endpoint found');
  return false;
}

/**
 * Test 4: Check contact type options
 */
async function testContactTypes() {
  logSection('TEST 4: Contact Type Options');

  logInfo('According to error message, valid contact types are:');
  logInfo('  - Company');
  logInfo('  - Trust (USA only)');
  logInfo('  - Person');
  logInfo('  - GroupOfPeople');

  logInfo('\nLet\'s test creating each type...');

  const typeTests = [
    {
      type: 'Person',
      payload: {
        person: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
        }
      }
    },
    {
      type: 'Company',
      payload: {
        company: {
          name: 'Test Company Pty Ltd',
          email: 'company@test.com',
        }
      }
    },
    {
      type: 'GroupOfPeople',
      payload: {
        groupOfPeople: {
          name: 'Test Group',
          members: [
            { firstName: 'Person', lastName: 'One' },
            { firstName: 'Person', lastName: 'Two' },
          ]
        }
      }
    },
  ];

  const results = [];

  for (const test of typeTests) {
    logInfo(`\nTesting: ${test.type}`);
    log('Payload:', colors.yellow);
    console.log(JSON.stringify(test.payload, null, 2));

    try {
      const axios = (await import('axios')).default;
      const fs = await import('fs');

      const tokenData = JSON.parse(fs.readFileSync('./smokeball-tokens.json', 'utf8'));
      const url = `${SMOKEBALL_API.basePath}${SMOKEBALL_API.endpoints.contacts}`;

      const response = await axios.post(url, test.payload, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'x-api-key': SMOKEBALL_API.headers['x-api-key'],
          'Content-Type': 'application/json',
        }
      });

      logSuccess(`✓ ${test.type} creation WORKED!`);
      log('Response:', colors.green);
      console.log(JSON.stringify(response.data, null, 2));

      results.push({ type: test.type, success: true });

      // Clean up
      if (response.data?.id) {
        try {
          await axios.delete(`${url}/${response.data.id}`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'x-api-key': SMOKEBALL_API.headers['x-api-key'],
            }
          });
          logInfo('Test contact deleted');
        } catch (err) {
          logWarning('Could not delete test contact');
        }
      }

    } catch (error) {
      logError(`✗ ${test.type} failed: ${error.message}`);

      if (error.response?.data) {
        log('Error:', colors.red);
        console.log(JSON.stringify(error.response.data, null, 2));
      }

      results.push({ type: test.type, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║            SMOKEBALL CONTACTS API DIAGNOSTIC TESTS                        ║', colors.bright + colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════════════════╝', colors.bright + colors.cyan);

  // Test 1: List existing contacts
  const listResult = await testListContacts();

  if (listResult.success && listResult.contacts.length > 0) {
    logSection('CONTACT STRUCTURE ANALYSIS');

    log('Sample contact structure from your Smokeball account:', colors.yellow);
    console.log(JSON.stringify(listResult.contacts[0], null, 2));
  }

  // Test 2: Try different payload structures
  await testContactPayloads();

  // Test 3: Check for API documentation
  await testAPISchema();

  // Test 4: Test contact types
  await testContactTypes();

  // Final recommendations
  logSection('RECOMMENDATIONS');

  logInfo('Based on the Smokeball API error message, the correct format is likely:');
  log('', colors.green);
  log('{', colors.green);
  log('  person: {', colors.green);
  log('    firstName: "John",', colors.green);
  log('    lastName: "Doe",', colors.green);
  log('    email: "john@example.com",', colors.green);
  log('    phone: "0400000000"', colors.green);
  log('  }', colors.green);
  log('}', colors.green);
  log('', colors.reset);

  logInfo('Fix: Update backend/src/integrations/smokeball/contacts.js createContact()');
  logInfo('Wrap the payload in a "person" object');
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
