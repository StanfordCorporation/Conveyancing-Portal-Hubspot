#!/usr/bin/env node

/**
 * Test Client for Property Information API
 * Tests: GET /api/client/property/:dealId
 */

const http = require('http');

// Test configuration
const API_URL = 'http://localhost:3001';
const DEAL_ID = '164512579034';

// JWT Token from the logs (user: whoispratham@gmail.com)
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMTE4NDkyNzg5MTAiLCJjb250YWN0SWQiOiIyMTE4NDkyNzg5MTAiLCJlbWFpbCI6Indob2lzcHJhdGhhbUBnbWFpbC5jb20iLCJyb2xlIjoiY2xpZW50IiwiaWF0IjoxNzYxMjcwNjY5LCJleHAiOjE3NjE4NzU0Njl9.7iCUK9fIXkJ0H-bi2Ud5_rZU-ZjbXDlgirLvZ0hIvtk';

console.log('========================================');
console.log('Property Information API Test Client');
console.log('========================================\n');

console.log(`API URL: ${API_URL}`);
console.log(`Deal ID: ${DEAL_ID}`);
console.log(`User: whoispratham@gmail.com\n`);

// Make the request
const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/client/property/${DEAL_ID}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

console.log('Sending request...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}\n`);

    try {
      const response = JSON.parse(data);
      console.log('Response Data:');
      console.log('========================================\n');
      console.log(JSON.stringify(response, null, 2));
      console.log('\n========================================\n');

      // Parse and display sections
      console.log('PARSED RESULTS:\n');

      // Seller Information
      console.log('📋 SELLER INFORMATION');
      console.log('─────────────────────────');
      console.log(`Primary Seller: ${response.primarySeller?.fullName || 'N/A'}`);
      console.log(`  Email: ${response.primarySeller?.email || 'N/A'}`);
      console.log(`  Phone: ${response.primarySeller?.phone || 'N/A'}`);
      console.log(`Additional Seller: ${response.additionalSeller?.fullName || 'N/A'}`);
      console.log(`  Email: ${response.additionalSeller?.email || 'N/A'}`);
      console.log(`  Phone: ${response.additionalSeller?.phone || 'N/A'}`);

      // Property Details
      console.log('\n🏠 PROPERTY DETAILS');
      console.log('─────────────────────────');
      console.log(`Address: ${response.propertyAddress || 'N/A'}`);
      console.log(`Deal Stage: ${response.dealStage || 'N/A'}`);
      console.log(`Next Step: ${response.nextStep || 'N/A'}`);

      // Agency Details
      console.log('\n🏢 AGENCY DETAILS');
      console.log('─────────────────────────');
      console.log(`Agency Name: ${response.agency?.name || 'N/A'}`);
      console.log(`Agency Phone: ${response.agency?.phone || 'N/A'}`);
      console.log(`Agent Name: ${response.agent?.fullName || 'N/A'}`);
      console.log(`  Phone: ${response.agent?.phone || 'N/A'}`);
      console.log(`  Email: ${response.agent?.email || 'N/A'}`);

      // Validation
      console.log('\n✅ VALIDATION RESULTS');
      console.log('─────────────────────────');

      const checks = [
        {
          name: 'Primary Seller Populated',
          pass: response.primarySeller?.fullName && response.primarySeller?.fullName !== 'N/A'
        },
        {
          name: 'Primary Seller Email',
          pass: response.primarySeller?.email && response.primarySeller?.email !== 'N/A'
        },
        {
          name: 'Primary Seller Phone',
          pass: response.primarySeller?.phone && response.primarySeller?.phone !== 'N/A'
        },
        {
          name: 'Agent Populated (Not N/A)',
          pass: response.agent?.fullName && response.agent?.fullName !== 'N/A'
        },
        {
          name: 'Agent Phone Populated',
          pass: response.agent?.phone && response.agent?.phone !== 'N/A'
        },
        {
          name: 'Agent Email Populated',
          pass: response.agent?.email && response.agent?.email !== 'N/A'
        },
        {
          name: 'Property Address Populated',
          pass: response.propertyAddress && response.propertyAddress !== 'N/A'
        },
        {
          name: 'Agency Name Populated',
          pass: response.agency?.name && response.agency?.name !== 'N/A'
        }
      ];

      let passCount = 0;
      checks.forEach(check => {
        const status = check.pass ? '✅' : '❌';
        console.log(`${status} ${check.name}`);
        if (check.pass) passCount++;
      });

      console.log(`\nPassed: ${passCount}/${checks.length}`);

      if (passCount === checks.length) {
        console.log('\n🎉 ALL CHECKS PASSED!');
      } else {
        console.log('\n⚠️ SOME CHECKS FAILED - See results above');
      }

    } catch (e) {
      console.log('Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.end();
