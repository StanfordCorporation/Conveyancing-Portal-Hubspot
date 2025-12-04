/**
 * Test: Search Matters by Matter Number and Fetch Descriptions
 * 
 * Usage:
 *   node backend/tests/test-matter-number-search.js 25-1665
 *   node backend/tests/test-matter-number-search.js 25-1665 25-1666
 * 
 * Environment Variables Required:
 *   SMOKEBALL_API_KEY (required)
 *   SMOKEBALL_ACCESS_TOKEN (optional - if not provided, will try API key only)
 *   SMOKEBALL_API_BASE_URL (optional - defaults to https://api.smokeball.com.au)
 * 
 * Note: This test bypasses Redis and makes direct API calls
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const SMOKEBALL_API_BASE = process.env.SMOKEBALL_API_BASE_URL || 'https://api.smokeball.com.au';
const SMOKEBALL_API_KEY = process.env.SMOKEBALL_API_KEY;
const SMOKEBALL_ACCESS_TOKEN = process.env.SMOKEBALL_ACCESS_TOKEN;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

/**
 * Make direct API request to Smokeball
 */
async function makeSmokeballRequest(method, endpoint, params = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add API key (required)
  if (SMOKEBALL_API_KEY) {
    headers['x-api-key'] = SMOKEBALL_API_KEY;
  }

  // Add Bearer token if available (required for most endpoints)
  if (SMOKEBALL_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${SMOKEBALL_ACCESS_TOKEN}`;
  }

  const config = {
    method,
    url: `${SMOKEBALL_API_BASE}${endpoint}`,
    headers,
  };

  if (method === 'GET' && Object.keys(params).length > 0) {
    config.params = params;
  } else if (method !== 'GET') {
    config.data = params;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
  }
}

/**
 * Search matters by matter number using OData $filter (if supported)
 */
async function searchMattersByNumberOData(matterNumbers) {
  const numbers = Array.isArray(matterNumbers) ? matterNumbers : [matterNumbers];
  
  try {
    log(`🔍 Attempting OData $filter search for: ${numbers.join(', ')}`, 'cyan');
    
    // Build OData filter: number eq '25-2126' or number eq '25-2127'
    const filterConditions = numbers.map(num => `number eq '${num}'`).join(' or ');
    const filterQuery = `$filter=${encodeURIComponent(filterConditions)}`;
    
    log(`   Query: ${filterQuery}`, 'cyan');
    
    const result = await makeSmokeballRequest('GET', `/matters?${filterQuery}`);
    
    if (!result.success) {
      if (result.status === 400) {
        log(`⚠️  OData filter syntax not supported: ${result.error}`, 'yellow');
      } else {
        log(`⚠️  OData filter failed: ${result.error}`, 'yellow');
      }
      return [];
    }
    
    // Handle OData response format
    const results = Array.isArray(result.data) ? result.data : result.data?.value || [];
    
    log(`✅ OData search found ${results.length} matter(s)`, 'green');
    return results;
    
  } catch (error) {
    log(`⚠️  OData filter error: ${error.message}`, 'yellow');
    return [];
  }
}

/**
 * Search matters by matter number using client-side filtering
 */
async function searchMattersByNumberClientSide(matterNumbers) {
  const numbers = Array.isArray(matterNumbers) ? matterNumbers : [matterNumbers];
  const normalizedNumbers = numbers.map(n => n.trim().toLowerCase());
  
  try {
    log(`🔍 Fetching all matters and filtering client-side for: ${numbers.join(', ')}`, 'cyan');
    
    // Fetch all matters
    const result = await makeSmokeballRequest('GET', '/matters', {});
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch matters');
    }
    
    // Handle OData response format
    const allMatters = Array.isArray(result.data) ? result.data : result.data?.value || [];
    
    log(`   Fetched ${allMatters.length} total matters`, 'cyan');
    
    // Filter by matter number (case-insensitive)
    const matches = allMatters.filter(matter => {
      if (!matter.number) return false;
      return normalizedNumbers.includes(matter.number.trim().toLowerCase());
    });
    
    log(`✅ Client-side search found ${matches.length} matching matter(s)`, 'green');
    return matches;
    
  } catch (error) {
    log(`❌ Client-side search failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main test function
 */
async function testMatterNumberSearch(matterNumbers) {
  logSection('🔍 Test: Search Matters by Matter Number');
  
  // Validate environment variables
  if (!SMOKEBALL_API_KEY) {
    log('❌ SMOKEBALL_API_KEY environment variable is required', 'red');
    log('   Set it in your .env file or export it before running the test', 'yellow');
    process.exit(1);
  }
  
  if (!SMOKEBALL_ACCESS_TOKEN) {
    log('⚠️  SMOKEBALL_ACCESS_TOKEN not set - some endpoints may require authentication', 'yellow');
    log('   You may need to complete OAuth flow first or provide an access token', 'yellow');
  }
  
  const numbers = Array.isArray(matterNumbers) ? matterNumbers : [matterNumbers];
  log(`Searching for matter number(s): ${numbers.join(', ')}\n`, 'bright');
  
  let results = [];
  
  // Try OData filter first (more efficient)
  logSection('METHOD 1: OData $filter (Server-Side)');
  results = await searchMattersByNumberOData(matterNumbers);
  
  // If OData didn't work or returned no results, try client-side filtering
  if (results.length === 0) {
    logSection('METHOD 2: Client-Side Filtering');
    try {
      results = await searchMattersByNumberClientSide(matterNumbers);
    } catch (error) {
      log(`❌ Failed: ${error.message}`, 'red');
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        log('\n💡 Authentication Error:', 'yellow');
        log('   - You need to provide SMOKEBALL_ACCESS_TOKEN', 'yellow');
        log('   - Complete OAuth flow: visit /api/smokeball/setup', 'yellow');
        log('   - Or set SMOKEBALL_ACCESS_TOKEN in your .env file', 'yellow');
      }
      
      process.exit(1);
    }
  }
  
  // Display results
  logSection('📊 RESULTS');
  
  if (results.length === 0) {
    log(`❌ No matters found with number(s): ${numbers.join(', ')}`, 'red');
    log('\n💡 Tips:', 'yellow');
    log('   - Verify matter numbers are correct', 'yellow');
    log('   - Ensure matters are converted (not leads - leads have number: null)', 'yellow');
    log('   - Check if authentication is working (provide SMOKEBALL_ACCESS_TOKEN)', 'yellow');
    return;
  }
  
  log(`✅ Found ${results.length} matching matter(s):\n`, 'green');
  
  results.forEach((matter, index) => {
    log(`\n${index + 1}. Matter: ${matter.number || 'N/A'}`, 'cyan');
    log(`   ID: ${matter.id}`, 'cyan');
    log(`   Short Name: ${matter.shortName || 'N/A'}`, 'cyan');
    log(`   Status: ${matter.status || 'N/A'}`, 'cyan');
    log(`   Is Lead: ${matter.isLead ? 'Yes' : 'No'}`, 'cyan');
    
    // Description field
    if (matter.description) {
      log(`   Description: ${matter.description}`, 'green');
    } else {
      log(`   Description: (not set)`, 'yellow');
    }
    
    // Additional useful fields
    if (matter.matterType) {
      log(`   Matter Type: ${matter.matterType.name || matter.matterType}`, 'cyan');
    }
    
    if (matter.createdDate) {
      log(`   Created: ${matter.createdDate}`, 'cyan');
    }
  });
  
  // Summary
  logSection('📋 SUMMARY');
  log(`Total matters found: ${results.length}`, 'bright');
  log(`Matter numbers searched: ${numbers.join(', ')}`, 'bright');
  
  const withDescriptions = results.filter(m => m.description).length;
  log(`Matters with descriptions: ${withDescriptions}/${results.length}`, 
    withDescriptions === results.length ? 'green' : 'yellow');
}

// Run test
const matterNumbers = process.argv.slice(2);

if (matterNumbers.length === 0) {
  log('❌ Usage: node test-matter-number-search.js <matter-number-1> [matter-number-2] ...', 'red');
  log('   Example: node test-matter-number-search.js 25-1665 25-1666', 'yellow');
  log('\nEnvironment Variables:', 'bright');
  log('   SMOKEBALL_API_KEY (required)', 'cyan');
  log('   SMOKEBALL_ACCESS_TOKEN (optional but recommended)', 'cyan');
  log('   SMOKEBALL_API_BASE_URL (optional)', 'cyan');
  process.exit(1);
}

testMatterNumberSearch(matterNumbers).catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
