/**
 * Test script for Agency Owner - Get Deal Details endpoint
 * Tests: GET /api/agency-owner/deals/:dealId
 *
 * This endpoint fetches complete deal details including:
 * - All deal properties (including questionnaire fields)
 * - Primary seller information
 * - Stage name (human-readable)
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  // You'll need to provide these values from your actual data
  agentEmail: 'pratham369@yahoo.com', // Admin or View All user
  dealId: null, // Will be fetched from dashboard
};

async function testGetDealDetails() {
  console.log('='.repeat(60));
  console.log('Testing Agency Owner - Get Deal Details Endpoint');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as agent
    console.log('\n[Step 1] Logging in as agent...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/send-otp`, {
      identifier: TEST_CONFIG.agentEmail,
      method: 'email',
      type: 'agent'
    });

    console.log('✅ OTP sent to:', TEST_CONFIG.agentEmail);
    console.log('📧 Check your email for OTP');

    // In a real test, you'd need to get the OTP from email
    // For now, we'll just show the structure
    console.log('\n⚠️  Manual step required:');
    console.log('1. Check email for OTP');
    console.log('2. Verify OTP with: POST /api/auth/verify-otp');
    console.log('3. Use the token to call: GET /api/agency-owner/dashboard');
    console.log('4. Get a dealId from the dashboard response');
    console.log('5. Then call: GET /api/agency-owner/deals/:dealId');

    console.log('\n📋 Example curl commands (replace TOKEN and DEAL_ID):');
    console.log('');
    console.log('# Get dashboard to find a deal ID:');
    console.log('curl -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log(`  ${BASE_URL}/api/agency-owner/dashboard`);
    console.log('');
    console.log('# Get deal details:');
    console.log('curl -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log(`  ${BASE_URL}/api/agency-owner/deals/DEAL_ID`);
    console.log('');

    console.log('\n📊 Expected response structure:');
    console.log(JSON.stringify({
      success: true,
      deal: {
        id: '123456',
        dealname: '123 Main St',
        dealstage: '1923713520',
        dealstage_name: 'Awaiting Search Questionnaire',
        property_address: '123 Main St',
        number_of_owners: '2',
        createdate: '2024-01-15T10:30:00Z',
        // ... all questionnaire fields ...
        body_corporate: 'No',
        registered_encumbrances: 'No',
        // ... more fields ...
        primarySeller: {
          id: '789',
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          phone: '+61400000000'
        }
      }
    }, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    console.error('\nFull error:', error);
  }
}

// Run test
testGetDealDetails().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('Test script completed');
  console.log('='.repeat(60));
});
