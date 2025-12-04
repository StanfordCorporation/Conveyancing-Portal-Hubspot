/**
 * Test Agent Search Endpoint
 * Tests the new agent-based search functionality
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/agents/search`;

/**
 * Test agent search with various scenarios
 */
async function testAgentSearch() {
  console.log('🧪 Testing Agent Search Endpoint\n');
  console.log(`📍 Testing against: ${API_URL}\n`);

  const tests = [
    {
      name: 'Test 1: Search "Steve Athanates" + "NGU" + "Logan"',
      data: {
        agentName: 'Steve Athanates',
        agencyName: 'NGU',
        suburb: 'Logan'
      },
      expected: 'Should find agent in "NGU Brassal - Steve Athanates Team"'
    },
    {
      name: 'Test 2: Search with partial agent name',
      data: {
        agentName: 'Steve',
        agencyName: 'NGU',
        suburb: 'Logan'
      },
      expected: 'Should find agents with firstname "Steve"'
    },
    {
      name: 'Test 3: Search without suburb',
      data: {
        agentName: 'Steve Athanates',
        agencyName: 'NGU'
      },
      expected: 'Should still return results without suburb filter'
    },
    {
      name: 'Test 4: Missing required fields',
      data: {
        agentName: 'Steve'
        // Missing agencyName
      },
      expected: 'Should return 400 validation error'
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${test.name}`);
    console.log(`📝 Expected: ${test.expected}`);
    console.log(`📤 Request:`, JSON.stringify(test.data, null, 2));
    console.log(`${'='.repeat(60)}\n`);

    try {
      const startTime = Date.now();
      const response = await axios.post(API_URL, test.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on any status
      });
      const duration = Date.now() - startTime;

      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);

      if (response.status === 200) {
        console.log(`✅ Success!`);
        console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
        
        if (response.data.agents && response.data.agents.length > 0) {
          console.log(`\n📋 Found ${response.data.count} agents:`);
          response.data.agents.forEach((agent, index) => {
            console.log(`\n   ${index + 1}. ${agent.firstname} ${agent.lastname}`);
            console.log(`      Email: ${agent.email || 'N/A'}`);
            console.log(`      Phone: ${agent.phone || 'N/A'}`);
            console.log(`      Agency: ${agent.agency?.name || 'No Agency'}`);
            console.log(`      Agency Address: ${agent.agency?.address || 'N/A'}`);
            console.log(`      Score: ${(agent.score * 100).toFixed(1)}%`);
          });
        } else {
          console.log(`⚠️  No agents found`);
        }
      } else if (response.status === 400) {
        console.log(`⚠️  Validation Error (expected for Test 4)`);
        console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
      } else {
        console.log(`❌ Unexpected status code`);
        console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log(`❌ Error:`, error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log(`⚠️  Connection refused - is the backend server running on ${BASE_URL}?`);
        console.log(`💡 Start the server with: npm start (in backend directory)`);
      } else if (error.response) {
        console.log(`📦 Response Status: ${error.response.status}`);
        console.log(`📦 Response Data:`, JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log(`⚠️  No response received from server`);
        console.log(`💡 Make sure the backend server is running on ${BASE_URL}`);
      } else {
        console.log(`📦 Error details:`, error);
      }
    }

    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Test suite completed`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
testAgentSearch().catch(console.error);

