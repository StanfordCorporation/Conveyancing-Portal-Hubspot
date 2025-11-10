/**
 * Test Smokeball API - Log Raw Response
 */

import * as smokeballClient from './src/integrations/smokeball/client.js';

async function testRawStaffResponse() {
  try {
    console.log('Making GET /staff request...\n');

    const response = await smokeballClient.get('/staff');

    console.log('=== RAW RESPONSE ===');
    console.log('Type:', typeof response);
    console.log('Is Array:', Array.isArray(response));
    console.log('Is Object:', response && typeof response === 'object');
    console.log('\n=== FULL RESPONSE ===');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n=== RESPONSE KEYS ===');
    if (response && typeof response === 'object') {
      console.log(Object.keys(response));
    }

    if (Array.isArray(response)) {
      console.log('\n=== ARRAY LENGTH ===');
      console.log(response.length);
    } else if (response && response.items) {
      console.log('\n=== ITEMS ARRAY ===');
      console.log('Items length:', response.items.length);
      console.log('Items:', JSON.stringify(response.items, null, 2));
    } else if (response && response.results) {
      console.log('\n=== RESULTS ARRAY ===');
      console.log('Results length:', response.results.length);
      console.log('Results:', JSON.stringify(response.results, null, 2));
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testRawStaffResponse();
