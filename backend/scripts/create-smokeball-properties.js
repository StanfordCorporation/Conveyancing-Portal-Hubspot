/**
 * Create Smokeball Integration Properties in HubSpot
 *
 * This script creates the custom properties needed for Smokeball integration.
 *
 * Usage:
 *   Set HUBSPOT_ACCESS_TOKEN environment variable
 *   node backend/scripts/create-smokeball-properties.js
 *
 * Properties Created:
 *   - 4 Deal properties (sync tracking + trust transaction ID)
 *   - 2 Contact properties (Smokeball contact ID + sync status)
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_API = 'https://api.hubapi.com';

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error('❌ Error: HUBSPOT_ACCESS_TOKEN environment variable not set');
  process.exit(1);
}

// Deal Properties
const DEAL_PROPERTIES = [
  {
    name: 'smokeball_sync_status',
    label: 'Smokeball Sync Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    description: 'Current sync status with Smokeball CRM',
    options: [
      { label: 'Not Synced', value: 'not_synced' },
      { label: 'Pending', value: 'pending' },
      { label: 'Synced', value: 'synced' },
      { label: 'Error', value: 'error' }
    ]
  },
  {
    name: 'smokeball_sync_error',
    label: 'Smokeball Sync Error',
    type: 'string',
    fieldType: 'textarea',
    groupName: 'dealinformation',
    description: 'Last error message from Smokeball sync (if any)'
  },
  {
    name: 'smokeball_last_sync',
    label: 'Smokeball Last Sync',
    type: 'datetime',
    fieldType: 'date',
    groupName: 'dealinformation',
    description: 'Timestamp of last successful sync with Smokeball'
  },
  {
    name: 'smokeball_trust_transaction_id',
    label: 'Smokeball Trust Transaction ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'dealinformation',
    description: 'Smokeball bank transaction ID for trust receipt'
  }
];

// Contact Properties
const CONTACT_PROPERTIES = [
  {
    name: 'smokeball_contact_id',
    label: 'Smokeball Contact ID',
    type: 'string',
    fieldType: 'text',
    groupName: 'contactinformation',
    description: 'Unique contact UUID in Smokeball CRM'
  },
  {
    name: 'smokeball_sync_status',
    label: 'Smokeball Sync Status',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    description: 'Current sync status with Smokeball CRM',
    options: [
      { label: 'Not Synced', value: 'not_synced' },
      { label: 'Synced', value: 'synced' },
      { label: 'Error', value: 'error' }
    ]
  }
];

/**
 * Create a single property in HubSpot
 */
async function createProperty(objectType, propertyData) {
  try {
    const response = await axios.post(
      `${HUBSPOT_API}/crm/v3/properties/${objectType}`,
      propertyData,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Created: ${propertyData.name} (${objectType})`);
    return response.data;

  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`⚠️  Already exists: ${propertyData.name} (${objectType})`);
      return null;
    }

    console.error(`❌ Error creating ${propertyData.name}:`, error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Verify existing properties
 */
async function verifyExistingProperties() {
  console.log('\n📋 Verifying existing properties...\n');

  const existingProperties = ['lead_uid', 'matter_uid'];

  for (const propName of existingProperties) {
    try {
      const response = await axios.get(
        `${HUBSPOT_API}/crm/v3/properties/deals/${propName}`,
        {
          headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
        }
      );

      console.log(`✅ Found existing property: ${propName}`);
      console.log(`   Type: ${response.data.type}, Label: ${response.data.label}`);

    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`⚠️  WARNING: Expected property '${propName}' not found!`);
        console.log(`   You may need to create this property manually.`);
      } else {
        console.error(`❌ Error checking ${propName}:`, error.message);
      }
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Creating Smokeball Integration Properties in HubSpot\n');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Verify existing properties
    await verifyExistingProperties();

    // Step 2: Create Deal properties
    console.log('\n📝 Creating Deal properties...\n');
    let dealSuccess = 0;
    let dealExists = 0;

    for (const property of DEAL_PROPERTIES) {
      const result = await createProperty('deals', property);
      if (result) dealSuccess++;
      else dealExists++;
    }

    // Step 3: Create Contact properties
    console.log('\n👤 Creating Contact properties...\n');
    let contactSuccess = 0;
    let contactExists = 0;

    for (const property of CONTACT_PROPERTIES) {
      const result = await createProperty('contacts', property);
      if (result) contactSuccess++;
      else contactExists++;
    }

    // Summary
    console.log('\n════════════════════════════════════════════════════════');
    console.log('✅ Property Creation Complete!\n');
    console.log(`Deal Properties:`);
    console.log(`  - Created: ${dealSuccess}`);
    console.log(`  - Already Existed: ${dealExists}`);
    console.log(`  - Total: ${DEAL_PROPERTIES.length}\n`);

    console.log(`Contact Properties:`);
    console.log(`  - Created: ${contactSuccess}`);
    console.log(`  - Already Existed: ${contactExists}`);
    console.log(`  - Total: ${CONTACT_PROPERTIES.length}\n`);

    console.log('🎯 Next Steps:');
    console.log('  1. Verify properties in HubSpot UI (Settings → Properties)');
    console.log('  2. Configure Smokeball environment variables (.env)');
    console.log('  3. Begin Phase 1: OAuth2 Implementation\n');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
