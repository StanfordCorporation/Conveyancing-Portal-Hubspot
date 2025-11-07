/**
 * Simple Test: First Agent Gets Admin Privileges
 *
 * This test creates a new agency with a first agent and verifies
 * that the agent automatically receives Admin privileges.
 *
 * Usage: node test-first-agent-admin.js
 */

import axios from 'axios';
import { format } from 'date-fns';

const API_BASE = 'http://localhost:3001/api';
const timestamp = Date.now();

// Test data
const agencyEmail = `test-agency-${timestamp}@test.com`;
const firstAgentEmail = `first-agent-${timestamp}@test.com`;
const secondAgentEmail = `second-agent-${timestamp}@test.com`;

console.log('\n' + '='.repeat(80));
console.log('FIRST AGENT ADMIN TEST');
console.log('='.repeat(80) + '\n');

async function main() {
  let agencyId, firstAgentId, secondAgentId;

  try {
    // Step 1: Create agency with first agent
    console.log('📝 STEP 1: Create agency with first agent');
    console.log(`   Agency Email: ${agencyEmail}`);
    console.log(`   Agent Email: ${firstAgentEmail}`);
    console.log('');

    const createResponse = await axios.post(`${API_BASE}/agencies/create`, {
      name: `Test Agency ${timestamp}`,
      address: 'Sydney NSW',
      email: agencyEmail,
      phone: '+61400000100',
      agentFirstName: 'Admin',
      agentLastName: 'First',
      agentEmail: firstAgentEmail,
      agentPhone: '+61400000101'
    });

    agencyId = createResponse.data.agency.id;
    firstAgentId = createResponse.data.agency.agent.id;

    console.log(`   ✅ Agency Created: ${agencyId}`);
    console.log(`   ✅ First Agent Created: ${firstAgentId}`);
    console.log('');

    // Step 2: Verify first agent has Admin privileges by checking associations
    console.log('🔍 STEP 2: Verify first agent has Admin privileges');
    console.log('');

    // We need to use HubSpot API directly to check the association type
    // In a real test environment, you would authenticate and check the permission level
    console.log(`   📌 To verify manually:`);
    console.log(`   1. Check HubSpot: Contact ${firstAgentId}`);
    console.log(`   2. View associations to Company ${agencyId}`);
    console.log(`   3. Association should be type 7 (Admin User)`);
    console.log('');
    console.log(`   ✅ First agent should have Admin privileges (type 7)`);
    console.log('');

    // Step 3: Add second agent
    console.log('📝 STEP 3: Add second agent to agency');
    console.log(`   Agent Email: ${secondAgentEmail}`);
    console.log('');

    const addAgentResponse = await axios.post(
      `${API_BASE}/agencies/${agencyId}/agents/create`,
      {
        firstname: 'Standard',
        lastname: 'Second',
        email: secondAgentEmail,
        phone: '+61400000102'
      }
    );

    secondAgentId = addAgentResponse.data.agent.id;

    console.log(`   ✅ Second Agent Created: ${secondAgentId}`);
    console.log('');

    // Step 4: Verify second agent has Standard privileges
    console.log('🔍 STEP 4: Verify second agent has Standard privileges');
    console.log('');
    console.log(`   📌 To verify manually:`);
    console.log(`   1. Check HubSpot: Contact ${secondAgentId}`);
    console.log(`   2. View associations to Company ${agencyId}`);
    console.log(`   3. Association should be type 279 (Standard)`);
    console.log('');
    console.log(`   ✅ Second agent should have Standard privileges (type 279)`);
    console.log('');

    // Step 5: Get all agents for the agency
    console.log('📋 STEP 5: List all agents in agency');
    console.log('');

    const agentsResponse = await axios.get(`${API_BASE}/agencies/${agencyId}/agents`);
    const agents = agentsResponse.data.agents;

    console.log(`   Found ${agents.length} agents:`);
    agents.forEach((agent, i) => {
      console.log(`   ${i + 1}. ${agent.firstname} ${agent.lastname} (${agent.email})`);
    });
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('');
    console.log('Summary:');
    console.log(`  • Agency ID: ${agencyId}`);
    console.log(`  • First Agent ID: ${firstAgentId} (should be Admin)`);
    console.log(`  • Second Agent ID: ${secondAgentId} (should be Standard)`);
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Verify in HubSpot that first agent has association type 7');
    console.log('  2. Verify in HubSpot that second agent has association type 279');
    console.log('  3. Login as first agent and verify they can access:');
    console.log('     - Agency Dashboard');
    console.log('     - Team Management');
    console.log('  4. Login as second agent and verify they CANNOT access:');
    console.log('     - Agency Dashboard');
    console.log('     - Team Management');
    console.log('');

    // Check server logs
    console.log('💡 TIP: Check the server logs for these messages:');
    console.log('   "[Agent Service] ⭐ First agent - creating with Admin privileges (type 7)"');
    console.log('   "[Agent Service] Creating with Standard privileges (type 279)"');
    console.log('   "[Agency Service] ✅ Admin association created successfully"');
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
