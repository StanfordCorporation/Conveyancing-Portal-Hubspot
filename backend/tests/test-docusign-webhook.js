/**
 * Test Script for DocuSign Webhook
 * Tests the /api/webhook/docusign endpoint with mock payloads
 * 
 * Usage:
 *   node test-docusign-webhook.js [local|vercel]
 * 
 * Examples:
 *   node test-docusign-webhook.js local
 *   node test-docusign-webhook.js vercel
 */

import fetch from 'node-fetch';

// Configuration
const ENDPOINTS = {
  local: 'http://localhost:3001/api/webhook/docusign',
  vercel: 'https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/webhook/docusign',
};

// Mock DocuSign webhook payloads
const MOCK_PAYLOADS = {
  // Payload 1: Envelope sent
  envelopeSent: {
    data: {
      envelopeSummary: {
        status: 'sent',
        envelopeId: 'mock-envelope-123',
        customFields: {
          textCustomFields: [
            {
              name: 'hs_deal_id',
              value: 'REPLACE_WITH_REAL_DEAL_ID' // Replace with a real HubSpot deal ID
            }
          ]
        },
        recipients: {
          signers: [
            {
              email: 'seller1@example.com',
              name: 'John Seller',
              status: 'sent',
              recipientId: '1'
            },
            {
              email: 'seller2@example.com',
              name: 'Jane Seller',
              status: 'sent',
              recipientId: '2'
            }
          ]
        }
      }
    }
  },

  // Payload 2: First signer completed
  firstSignerCompleted: {
    data: {
      envelopeSummary: {
        status: 'sent',
        envelopeId: 'mock-envelope-123',
        customFields: {
          textCustomFields: [
            {
              name: 'hs_deal_id',
              value: 'REPLACE_WITH_REAL_DEAL_ID'
            }
          ]
        },
        recipients: {
          signers: [
            {
              email: 'seller1@example.com',
              name: 'John Seller',
              status: 'completed',
              recipientId: '1'
            },
            {
              email: 'seller2@example.com',
              name: 'Jane Seller',
              status: 'sent',
              recipientId: '2'
            }
          ]
        }
      }
    }
  },

  // Payload 3: All signers completed (envelope completed)
  allSignersCompleted: {
    data: {
      envelopeSummary: {
        status: 'completed',
        envelopeId: 'mock-envelope-123',
        customFields: {
          textCustomFields: [
            {
              name: 'hs_deal_id',
              value: 'REPLACE_WITH_REAL_DEAL_ID'
            }
          ]
        },
        recipients: {
          signers: [
            {
              email: 'seller1@example.com',
              name: 'John Seller',
              status: 'completed',
              recipientId: '1'
            },
            {
              email: 'seller2@example.com',
              name: 'Jane Seller',
              status: 'completed',
              recipientId: '2'
            }
          ]
        }
      }
    }
  },

  // Payload 4: Envelope voided
  envelopeVoided: {
    data: {
      envelopeSummary: {
        status: 'voided',
        envelopeId: 'mock-envelope-123',
        customFields: {
          textCustomFields: [
            {
              name: 'hs_deal_id',
              value: 'REPLACE_WITH_REAL_DEAL_ID'
            }
          ]
        },
        recipients: {
          signers: [
            {
              email: 'seller1@example.com',
              name: 'John Seller',
              status: 'voided',
              recipientId: '1'
            },
            {
              email: 'seller2@example.com',
              name: 'Jane Seller',
              status: 'voided',
              recipientId: '2'
            }
          ]
        }
      }
    }
  }
};

/**
 * Send a test webhook request
 */
async function testWebhook(environment, payloadName, customDealId = null) {
  const endpoint = ENDPOINTS[environment];
  
  if (!endpoint) {
    console.error(`❌ Invalid environment: ${environment}`);
    console.log('Valid options: local, vercel');
    process.exit(1);
  }

  const payload = JSON.parse(JSON.stringify(MOCK_PAYLOADS[payloadName])); // Deep clone
  
  // Replace deal ID if provided
  if (customDealId) {
    payload.data.envelopeSummary.customFields.textCustomFields[0].value = customDealId;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`🧪 Testing DocuSign Webhook`);
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${environment}`);
  console.log(`🔗 Endpoint: ${endpoint}`);
  console.log(`📦 Payload: ${payloadName}`);
  console.log(`🆔 Deal ID: ${payload.data.envelopeSummary.customFields.textCustomFields[0].value}`);
  console.log('='.repeat(60));

  // Check if deal ID is still placeholder
  if (payload.data.envelopeSummary.customFields.textCustomFields[0].value === 'REPLACE_WITH_REAL_DEAL_ID') {
    console.warn('\n⚠️  WARNING: Using placeholder deal ID!');
    console.warn('⚠️  This will fail unless you have a deal with this exact ID in HubSpot.');
    console.warn('⚠️  Pass a real deal ID: node test-docusign-webhook.js local 1234567890\n');
  }

  try {
    console.log('\n📤 Sending request...\n');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('\n📋 Response Body:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Webhook test PASSED!');
      
      // Show what was updated
      if (responseData.envelope_status) {
        console.log(`\n📝 Updated Deal Properties:`);
        console.log(`   - envelope_status: ${responseData.envelope_status}`);
        console.log(`   - recipient_status: ${JSON.stringify(responseData.recipient_status, null, 2)}`);
      }
    } else {
      console.log('\n❌ Webhook test FAILED!');
      console.log('\nPossible reasons:');
      console.log('  1. Deal ID does not exist in HubSpot');
      console.log('  2. HubSpot API token is invalid or expired');
      console.log('  3. Server is not running (for local testing)');
      console.log('  4. Network/firewall issues');
    }

  } catch (error) {
    console.error('\n❌ Error sending request:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tip: Make sure your backend server is running!');
      console.log('   Start it with: cd backend && npm start');
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Run all test scenarios
 */
async function runAllTests(environment, dealId) {
  console.log('\n🚀 Running all DocuSign webhook test scenarios...\n');
  
  const scenarios = [
    'envelopeSent',
    'firstSignerCompleted',
    'allSignersCompleted',
    'envelopeVoided'
  ];

  for (const scenario of scenarios) {
    await testWebhook(environment, scenario, dealId);
    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('✅ All tests completed!');
}

// Main execution
const args = process.argv.slice(2);
const environment = args[0] || 'local';
const dealId = args[1] || null;
const testAll = args[2] === '--all';

if (testAll) {
  runAllTests(environment, dealId);
} else {
  // Single test with "allSignersCompleted" scenario by default
  testWebhook(environment, 'allSignersCompleted', dealId);
}

// Print usage help
console.log('\n📖 Usage Examples:');
console.log('   node test-docusign-webhook.js local 1234567890');
console.log('   node test-docusign-webhook.js vercel 1234567890');
console.log('   node test-docusign-webhook.js local 1234567890 --all');
console.log('');
console.log('💡 Tips:');
console.log('   - Replace ENDPOINTS.vercel with your actual Vercel URL');
console.log('   - Get a real deal ID from HubSpot to test with');
console.log('   - Use --all flag to run all test scenarios');
console.log('');

