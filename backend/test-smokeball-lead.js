/**
 * Test Smokeball Lead Creation
 * Tests creating a lead with different matter type ID formats
 */

import * as smokeballMatters from './src/integrations/smokeball/matters.js';
import * as smokeballContacts from './src/integrations/smokeball/contacts.js';
import * as smokeballStaff from './src/integrations/smokeball/staff.js';
import * as smokeballMatterTypes from './src/integrations/smokeball/matter-types.js';

async function testLeadCreation() {
  try {
    console.log('🧪 Testing Smokeball Lead Creation\n');
    console.log('='.repeat(80));

    // Step 1: Fetch matter types to see what's available for Queensland
    console.log('\n📋 STEP 1: Fetching available matter types for Queensland...\n');
    const matterTypes = await smokeballMatterTypes.getMatterTypesByState('Queensland');

    // Find Conveyancing > Sale types
    const conveyancingTypes = matterTypes.filter(mt =>
      mt.category?.toLowerCase().includes('conveyancing') &&
      mt.name?.toLowerCase().includes('sale')
    );

    console.log(`Found ${conveyancingTypes.length} Conveyancing > Sale matter types:\n`);
    conveyancingTypes.forEach((mt, index) => {
      console.log(`${index + 1}. ${mt.category} > ${mt.name}`);
      console.log(`   ID: ${mt.id}`);
      console.log(`   Location: ${mt.location || 'N/A'}`);
      console.log(`   Deleted: ${mt.deleted || false}`);
      console.log('');
    });

    // Step 2: Get staff assignments
    console.log('👨‍💼 STEP 2: Getting staff assignments...\n');
    const staffAssignments = await smokeballStaff.getDefaultStaffAssignments();
    console.log(`✅ Responsible: ${staffAssignments.personResponsibleStaffId}`);
    console.log(`✅ Assistant: ${staffAssignments.personAssistingStaffId}\n`);

    // Step 3: Create test contact
    console.log('👤 STEP 3: Creating test contact...\n');
    const testContactData = {
      person: {
        firstName: 'Test',
        lastName: 'Seller',
        email: 'test.seller@example.com',
        phone: '0400000000',
      }
    };

    let contactId;
    try {
      const contact = await smokeballContacts.createContact(testContactData);
      contactId = contact.id;
      console.log(`✅ Test contact created: ${contactId}\n`);
    } catch (error) {
      console.error(`❌ Contact creation failed: ${error.message}\n`);
      return;
    }

    // Step 4: Test different matter type ID formats
    console.log('🧪 STEP 4: Testing lead creation with different matter type ID formats...\n');

    const testMatterTypeIds = [
      { label: 'Base ID only', id: '0623643a-48a4-41d7-8c91-d35915b291cd' },
      { label: 'With _QLD suffix', id: '0623643a-48a4-41d7-8c91-d35915b291cd_QLD' },
      { label: 'With _NSW suffix', id: '0623643a-48a4-41d7-8c91-d35915b291cd_NSW' },
      { label: 'With _VIC suffix', id: '0623643a-48a4-41d7-8c91-d35915b291cd_VIC' },
    ];

    // If we found conveyancing types, add the first one to test
    if (conveyancingTypes.length > 0) {
      testMatterTypeIds.push({
        label: `Actual account ID (${conveyancingTypes[0].name} - ${conveyancingTypes[0].location})`,
        id: conveyancingTypes[0].id,
      });
    }

    for (const test of testMatterTypeIds) {
      console.log(`\nTesting: ${test.label}`);
      console.log(`Matter Type ID: ${test.id}`);
      console.log('-'.repeat(80));

      const leadData = {
        matterTypeId: test.id,
        clientRole: 'Vendor',
        clientIds: [contactId],
        description: 'Test lead creation',
        personResponsibleStaffId: staffAssignments.personResponsibleStaffId,
        personAssistingStaffId: staffAssignments.personAssistingStaffId,
        referralType: 'Real Estate Agent',
      };

      try {
        const lead = await smokeballMatters.createLead(leadData);
        console.log(`✅ SUCCESS! Lead created with ID: ${lead.id}`);
        console.log(`   Matter Number: ${lead.number || 'null (lead)'}`);

        // Clean up - delete the test lead
        console.log(`\n🗑️ Cleaning up test lead...`);
        // Note: Smokeball might not have a delete endpoint, so we'll just note it
        console.log(`   (Manual cleanup may be required in Smokeball UI)`);

        break; // Stop testing once we find a working ID
      } catch (error) {
        console.error(`❌ FAILED: ${error.message}`);
        if (error.responseData) {
          console.error(`   API Error: ${JSON.stringify(error.responseData)}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testLeadCreation();
