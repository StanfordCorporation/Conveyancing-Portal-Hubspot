/**
 * Comprehensive Smokeball Integration Test
 * Tests the complete lead creation workflow with proper API structures
 */

import dotenv from 'dotenv';
import * as smokeballClient from './src/integrations/smokeball/client.js';
import * as smokeballContacts from './src/integrations/smokeball/contacts.js';
import * as smokeballStaff from './src/integrations/smokeball/staff.js';
import * as smokeballMatterTypes from './src/integrations/smokeball/matter-types.js';
import * as smokeballMatters from './src/integrations/smokeball/matters.js';
import { parsePropertyAddress, parseSellerName } from './src/utils/addressParser.js';
import { extractStateFromAddress } from './src/utils/stateExtractor.js';

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
 * Test 1: Address parsing
 */
async function testAddressParsing() {
  logSection('TEST 1: Address Parsing Utilities');

  const testAddresses = [
    '123 Main Street, Sydney NSW 2000',
    '45A George Road, Brisbane QLD 4000',
    '78 Smith Avenue, Melbourne VIC 3000',
  ];

  let allPassed = true;

  for (const address of testAddresses) {
    logInfo(`Parsing: ${address}`);
    
    const state = extractStateFromAddress(address);
    const parsed = parsePropertyAddress(address);

    console.log('  State:', state);
    console.log('  Parsed:', JSON.stringify(parsed, null, 2));

    if (!state) {
      logError('Failed to extract state');
      allPassed = false;
    } else {
      logSuccess('State extracted successfully');
    }
  }

  return allPassed;
}

/**
 * Test 2: Name parsing
 */
async function testNameParsing() {
  logSection('TEST 2: Name Parsing Utilities');

  const testNames = [
    'John Smith',
    'Mr. John Smith',
    'Mary Jane Watson',
    'Dr. Robert Brown',
  ];

  let allPassed = true;

  for (const name of testNames) {
    logInfo(`Parsing: ${name}`);
    
    const parsed = parseSellerName(name);
    console.log('  Result:', JSON.stringify(parsed, null, 2));

    if (!parsed.lastName) {
      logError('Failed to parse name');
      allPassed = false;
    } else {
      logSuccess('Name parsed successfully');
    }
  }

  return allPassed;
}

/**
 * Test 3: Staff lookup
 */
async function testStaffLookup() {
  logSection('TEST 3: Staff Lookup');

  try {
    logInfo('Looking up Sean Kerswill...');
    const sean = await smokeballStaff.findSean();
    
    if (sean) {
      logSuccess(`Found Sean: ${sean.firstName} ${sean.lastName} (ID: ${sean.id})`);
    } else {
      logWarning('Sean Kerswill not found in staff list');
    }

    logInfo('Looking up Laura Stuart...');
    const laura = await smokeballStaff.findLaura();
    
    if (laura) {
      logSuccess(`Found Laura: ${laura.firstName} ${laura.lastName} (ID: ${laura.id})`);
    } else {
      logWarning('Laura Stuart not found in staff list');
    }

    logInfo('Getting default staff assignments...');
    const staffAssignments = await smokeballStaff.getDefaultStaffAssignments();
    
    logSuccess('Staff assignments retrieved:');
    console.log('  Responsible:', staffAssignments.personResponsibleStaffId);
    console.log('  Assistant:', staffAssignments.personAssistingStaffId || 'N/A');

    return true;

  } catch (error) {
    logError(`Staff lookup failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Matter types lookup
 */
async function testMatterTypesLookup() {
  logSection('TEST 4: Matter Types Lookup');

  const testCases = [
    { state: 'New South Wales', category: 'Conveyancing', name: 'Sale' },
    { state: 'Queensland', category: 'Conveyancing', name: 'Purchase' },
    { state: 'Victoria', category: 'Conveyancing', name: 'Sale' },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    logInfo(`Looking up: ${testCase.category} > ${testCase.name} in ${testCase.state}`);
    
    try {
      const matterType = await smokeballMatterTypes.findMatterType(
        testCase.state,
        testCase.category,
        testCase.name
      );

      if (matterType) {
        logSuccess('Matter type found:');
        console.log('  ID:', matterType.id);
        console.log('  Client Role:', matterType.clientRole);
      } else {
        logError('Matter type not found');
        allPassed = false;
      }
    } catch (error) {
      logError(`Lookup failed: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Test 5: Contact creation with correct payload
 */
async function testContactCreation() {
  logSection('TEST 5: Contact Creation (with person wrapper)');

  const testContact = {
    firstName: 'Test',
    lastName: 'Integration' + Date.now(), // Unique name
    email: `test.integration.${Date.now()}@example.com`,
    phone: '0400000000',
  };

  try {
    logInfo('Creating test contact...');
    console.log('Contact data:', JSON.stringify(testContact, null, 2));

    const createdContact = await smokeballContacts.createContact(testContact);

    logSuccess('Contact created successfully:');
    console.log('  ID:', createdContact.id);
    console.log('  Name:', `${createdContact.firstName || ''} ${createdContact.lastName || ''}`);

    // Clean up - try to delete the test contact
    logInfo('Cleaning up test contact...');
    try {
      await smokeballClient.delete(`/contacts/${createdContact.id}`);
      logSuccess('Test contact deleted');
    } catch (deleteErr) {
      logWarning('Could not delete test contact - delete manually');
    }

    return true;

  } catch (error) {
    logError(`Contact creation failed: ${error.message}`);
    if (error.response?.data) {
      console.log('API Error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * Test 6: Full lead creation workflow (DRY RUN)
 */
async function testLeadCreationWorkflow() {
  logSection('TEST 6: Full Lead Creation Workflow (DRY RUN)');

  const testData = {
    propertyAddress: '123 Test Street, Brisbane QLD 4000',
    transactionType: 'sale',
    clientName: 'Test Client',
    sellerName: 'John Smith',
    sellerEmail: 'john.smith@test.com',
    sellerPhone: '0400111222',
  };

  try {
    // Step 1: Extract state
    logInfo('Step 1: Extracting state from address...');
    const state = extractStateFromAddress(testData.propertyAddress);
    
    if (!state) {
      throw new Error('Failed to extract state');
    }
    
    logSuccess(`State: ${state}`);

    // Step 2: Lookup matter type
    logInfo('Step 2: Looking up matter type...');
    const matterTypeName = testData.transactionType === 'sale' ? 'Sale' : 'Purchase';
    const matterTypeInfo = await smokeballMatterTypes.findMatterType(state, 'Conveyancing', matterTypeName);
    
    if (!matterTypeInfo) {
      throw new Error('Failed to find matter type');
    }
    
    logSuccess(`Matter Type: ${matterTypeInfo.name} (ID: ${matterTypeInfo.id})`);
    logSuccess(`Client Role: ${matterTypeInfo.clientRole}`);

    // Step 3: Get staff assignments
    logInfo('Step 3: Getting staff assignments...');
    const staffAssignments = await smokeballStaff.getDefaultStaffAssignments();
    logSuccess('Staff assignments retrieved');

    // Step 4: Show what the contact payload would look like
    logInfo('Step 4: Contact payload structure:');
    const contactPayload = {
      person: {
        firstName: 'John',
        lastName: 'Smith',
        email: testData.sellerEmail,
        phone: {
          number: testData.sellerPhone,
        },
      },
    };
    console.log(JSON.stringify(contactPayload, null, 2));

    // Step 5: Show what the lead payload would look like
    logInfo('Step 5: Lead payload structure:');
    const leadPayload = {
      matterTypeId: matterTypeInfo.id,
      clientRole: matterTypeInfo.clientRole,
      clientIds: ['<contact-uuid-here>'],
      description: '',
      status: 'Open',
      leadOpenedDate: new Date().toISOString(),
      personResponsibleStaffId: staffAssignments.personResponsibleStaffId,
      personAssistingStaffId: staffAssignments.personAssistingStaffId,
      isLead: true,
      referralType: 'Real Estate Agent',
    };
    console.log(JSON.stringify(leadPayload, null, 2));

    logSuccess('Workflow structure validated successfully!');
    logInfo('This was a DRY RUN - no actual lead was created');

    return true;

  } catch (error) {
    logError(`Workflow test failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════════════════════╗', colors.bright + colors.blue);
  log('║          SMOKEBALL INTEGRATION - COMPREHENSIVE TESTS                      ║', colors.bright + colors.blue);
  log('╚═══════════════════════════════════════════════════════════════════════════╝', colors.bright + colors.blue);

  const results = {
    addressParsing: false,
    nameParsing: false,
    staffLookup: false,
    matterTypesLookup: false,
    contactCreation: false,
    leadWorkflow: false,
  };

  // Run tests sequentially
  results.addressParsing = await testAddressParsing();
  results.nameParsing = await testNameParsing();
  results.staffLookup = await testStaffLookup();
  results.matterTypesLookup = await testMatterTypesLookup();
  results.contactCreation = await testContactCreation();
  results.leadWorkflow = await testLeadCreationWorkflow();

  // Summary
  logSection('TEST SUMMARY');

  const tests = [
    { name: 'Address Parsing', result: results.addressParsing },
    { name: 'Name Parsing', result: results.nameParsing },
    { name: 'Staff Lookup', result: results.staffLookup },
    { name: 'Matter Types Lookup', result: results.matterTypesLookup },
    { name: 'Contact Creation', result: results.contactCreation },
    { name: 'Lead Workflow (Dry Run)', result: results.leadWorkflow },
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

  if (passed === total) {
    logSuccess('All tests passed! Integration is ready to use.');
    logInfo('Next steps:');
    logInfo('  1. Test with actual HubSpot deal creation');
    logInfo('  2. Monitor logs for any issues');
    logInfo('  3. Verify leads appear correctly in Smokeball');
  } else {
    logWarning('Some tests failed. Please review the errors above.');
    
    if (!results.staffLookup) {
      logInfo('Staff lookup failed:');
      logInfo('  - Ensure Sean Kerswill and Laura Stuart exist in Smokeball');
      logInfo('  - Or update staff.js to use your actual staff names');
    }
    
    if (!results.matterTypesLookup) {
      logInfo('Matter types lookup failed:');
      logInfo('  - Ensure Conveyancing > Sale and Purchase matter types exist');
      logInfo('  - Check that they are enabled for your states');
    }
    
    if (!results.contactCreation) {
      logInfo('Contact creation failed:');
      logInfo('  - Verify API authentication is working');
      logInfo('  - Check API error messages above');
    }
  }

  log('');
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

