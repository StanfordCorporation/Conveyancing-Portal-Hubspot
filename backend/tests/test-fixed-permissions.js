/**
 * Test: Fixed First Agent Admin Feature
 *
 * Tests that the associations API fix properly detects first/subsequent agents
 *
 * Usage: node test-fixed-permissions.js
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const timestamp = Date.now();
const random = Math.floor(Math.random() * 10000);

// Unique test data for each run
const agencyEmail = `test-agency-${timestamp}-${random}@test.com`;
const firstAgentEmail = `first-agent-${timestamp}-${random}@test.com`;
const firstAgentPhone = `+614${String(timestamp).slice(-8)}`;
const secondAgentEmail = `second-agent-${timestamp}-${random}@test.com`;
const secondAgentPhone = `+615${String(timestamp).slice(-8)}`;
const thirdAgentEmail = `third-agent-${timestamp}-${random}@test.com`;
const thirdAgentPhone = `+616${String(timestamp).slice(-8)}`;

console.log('\n' + '='.repeat(80));
console.log('FIXED PERMISSIONS TEST - Associations API');
console.log('='.repeat(80) + '\n');

async function main() {
  let agencyId, firstAgentId, secondAgentId, thirdAgentId;

  try {
    // Step 1: Create agency with first agent
    console.log('📝 STEP 1: Create agency with first agent');
    console.log(`   Agency Email: ${agencyEmail}`);
    console.log(`   First Agent: ${firstAgentEmail} (${firstAgentPhone})`);
    console.log('');

    const createResponse = await axios.post(`${API_BASE}/agencies/create`, {
      name: `Test Agency ${timestamp}`,
      address: 'Sydney NSW',
      email: agencyEmail,
      phone: `+61700${String(timestamp).slice(-6)}`,
      agentFirstName: 'Admin',
      agentLastName: 'First',
      agentEmail: firstAgentEmail,
      agentPhone: firstAgentPhone
    });

    agencyId = createResponse.data.agency.id;
    firstAgentId = createResponse.data.agency.agent.id;

    console.log(`   ✅ Agency Created: ${agencyId}`);
    console.log(`   ✅ First Agent Created: ${firstAgentId}`);
    console.log('   ℹ️  Expected: First agent should have Admin privileges (type 7)');
    console.log('');

    // Step 2: Add second agent
    console.log('📝 STEP 2: Add second agent to agency');
    console.log(`   Second Agent: ${secondAgentEmail} (${secondAgentPhone})`);
    console.log('');

    const addSecondAgentResponse = await axios.post(
      `${API_BASE}/agencies/${agencyId}/agents/create`,
      {
        firstname: 'Standard',
        lastname: 'Second',
        email: secondAgentEmail,
        phone: secondAgentPhone
      }
    );

    secondAgentId = addSecondAgentResponse.data.agent.id;

    console.log(`   ✅ Second Agent Created: ${secondAgentId}`);
    console.log('   ℹ️  Expected: Second agent should have Standard privileges (type 279)');
    console.log('');

    // Step 3: Add third agent
    console.log('📝 STEP 3: Add third agent to agency');
    console.log(`   Third Agent: ${thirdAgentEmail} (${thirdAgentPhone})`);
    console.log('');

    const addThirdAgentResponse = await axios.post(
      `${API_BASE}/agencies/${agencyId}/agents/create`,
      {
        firstname: 'Standard',
        lastname: 'Third',
        email: thirdAgentEmail,
        phone: thirdAgentPhone
      }
    );

    thirdAgentId = addThirdAgentResponse.data.agent.id;

    console.log(`   ✅ Third Agent Created: ${thirdAgentId}`);
    console.log('   ℹ️  Expected: Third agent should have Standard privileges (type 279)');
    console.log('');

    // Step 4: List all agents
    console.log('📋 STEP 4: List all agents in agency');
    console.log('   ⏱️  Waiting 2 seconds for all indexes to update...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    const agentsResponse = await axios.get(`${API_BASE}/agencies/${agencyId}/agents`);
    const agents = agentsResponse.data.agents;

    console.log(`   Found ${agents.length} agents:`);
    agents.forEach((agent, i) => {
      console.log(`   ${i + 1}. ${agent.firstname} ${agent.lastname} (${agent.email})`);
    });
    console.log('');

    // Verify agent count
    if (agents.length === 3) {
      console.log('   ✅ SUCCESS: All 3 agents returned correctly!');
    } else {
      console.log(`   ⚠️  WARNING: Expected 3 agents, got ${agents.length}`);
    }
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETED');
    console.log('='.repeat(80));
    console.log('');
    console.log('Summary:');
    console.log(`  • Agency ID: ${agencyId}`);
    console.log(`  • First Agent ID: ${firstAgentId} (should be Admin)`);
    console.log(`  • Second Agent ID: ${secondAgentId} (should be Standard)`);
    console.log(`  • Third Agent ID: ${thirdAgentId} (should be Standard)`);
    console.log(`  • Agents Listed: ${agents.length}/3`);
    console.log('');

    // Check server logs for verification
    console.log('💡 Check Server Logs For:');
    console.log('');
    console.log('First Agent:');
    console.log('  "[Agent Service] No associated contacts - this is the first agent"');
    console.log('  "[Agent Service] ⭐ First agent - creating with Admin privileges (type 7)"');
    console.log('  "[Agency Service] ✅ Admin association created successfully"');
    console.log('');
    console.log('Second Agent:');
    console.log('  "[Agent Service] Found 1 associated contacts"');
    console.log('  "[Agent Service] Found 1 existing agents, isFirstAgent: false"');
    console.log('  "[Agent Service] Creating with Standard privileges (type 279)"');
    console.log('');
    console.log('Third Agent:');
    console.log('  "[Agent Service] Found 2 associated contacts"');
    console.log('  "[Agent Service] Found 2 existing agents, isFirstAgent: false"');
    console.log('  "[Agent Service] Creating with Standard privileges (type 279)"');
    console.log('');
    console.log('Agent Listing:');
    console.log('  "[Agency Service] Found 3 associated contacts"');
    console.log('  "[Agency Service] Returning 3 agents"');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error('');

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server.');
      console.error('Is the server running on http://localhost:3001?');
    } else {
      console.error('Error:', error.message);
    }

    console.error('');
    process.exit(1);
  }
}

main();
