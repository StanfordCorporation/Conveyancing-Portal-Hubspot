/**
 * Raw Matter Types Diagnostic
 * Shows exactly what Smokeball API returns for matter types
 */

import dotenv from 'dotenv';
import * as smokeballClient from '../src/integrations/smokeball/client.js';

dotenv.config();

async function testMatterTypesRaw() {
  console.log('\n🔍 SMOKEBALL MATTER TYPES - RAW API DIAGNOSTIC\n');
  console.log('=' .repeat(80));

  try {
    // Test 1: Get ALL matter types without any filters
    console.log('\n📋 TEST 1: Get ALL matter types (no filters)\n');
    const allResponse = await smokeballClient.get('/mattertypes');
    
    console.log('Raw Response Type:', typeof allResponse);
    console.log('Is Array:', Array.isArray(allResponse));
    console.log('Response Keys:', Object.keys(allResponse || {}));
    console.log('\nFull Response:');
    console.log(JSON.stringify(allResponse, null, 2));

    // Extract matter types
    const allMatterTypes = allResponse?.value || allResponse || [];
    console.log(`\n✅ Found ${allMatterTypes.length} total matter types`);

    if (allMatterTypes.length > 0) {
      console.log('\n📝 Sample Matter Types:');
      allMatterTypes.slice(0, 5).forEach((mt, i) => {
        console.log(`\n${i + 1}. ${mt.name || 'N/A'}`);
        console.log(`   ID: ${mt.id || 'N/A'}`);
        console.log(`   Category: ${mt.category || 'N/A'}`);
        console.log(`   Location: ${mt.location || 'N/A'}`);
        console.log(`   State: ${mt.state || 'N/A'}`);
        console.log(`   Type: ${mt.type || 'N/A'}`);
        console.log(`   Deleted: ${mt.deleted || false}`);
      });
    }

    // Test 2: Try with NSW query params
    console.log('\n\n' + '='.repeat(80));
    console.log('\n📋 TEST 2: Get matter types with NSW filters\n');
    
    const nswParams = {
      Location: 'New South Wales',
      Category: 'Conveyancing',
      Type: 1,
    };

    console.log('Query Params:', JSON.stringify(nswParams, null, 2));
    
    const nswResponse = await smokeballClient.get('/mattertypes', nswParams);
    const nswMatterTypes = nswResponse?.value || nswResponse || [];
    
    console.log(`\n✅ Found ${nswMatterTypes.length} NSW Conveyancing matter types`);

    if (nswMatterTypes.length > 0) {
      console.log('\n📝 NSW Matter Types:');
      nswMatterTypes.forEach((mt, i) => {
        console.log(`\n${i + 1}. ${mt.name || 'N/A'}`);
        console.log(`   ID: ${mt.id || 'N/A'}`);
        console.log(`   Category: ${mt.category || 'N/A'}`);
        console.log(`   Representative Options: ${mt.representativeOptions?.join(', ') || 'N/A'}`);
      });
    }

    // Test 3: Search for "Sale" specifically
    console.log('\n\n' + '='.repeat(80));
    console.log('\n📋 TEST 3: Search for "Sale" matter types across all states\n');

    const salesMatterTypes = allMatterTypes.filter(mt => 
      mt.name?.toLowerCase().includes('sale') &&
      mt.category?.toLowerCase().includes('convey')
    );

    console.log(`\n✅ Found ${salesMatterTypes.length} "Sale" conveyancing matter types`);

    if (salesMatterTypes.length > 0) {
      console.log('\n📝 Sale Matter Types by State:');
      salesMatterTypes.forEach((mt, i) => {
        console.log(`\n${i + 1}. ${mt.name} - ${mt.location || mt.state || 'Unknown State'}`);
        console.log(`   ID: ${mt.id}`);
        console.log(`   Category: ${mt.category}`);
        console.log(`   Roles: ${mt.representativeOptions?.join(', ') || 'N/A'}`);
      });
    }

    // Test 4: Group by category
    console.log('\n\n' + '='.repeat(80));
    console.log('\n📋 TEST 4: Matter types grouped by category\n');

    const byCategory = allMatterTypes.reduce((acc, mt) => {
      const cat = mt.category || 'Unknown';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(mt);
      return acc;
    }, {});

    Object.keys(byCategory).sort().forEach(category => {
      console.log(`\n${category}: ${byCategory[category].length} types`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  }
}

testMatterTypesRaw();

