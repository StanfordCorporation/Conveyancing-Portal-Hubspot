/**
 * Debug script for DocuSign JWT authentication
 * This helps identify what the JWT response structure looks like
 */

import dotenv from 'dotenv';
import docusign from 'docusign-esign';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.docusign' });

async function debugJWT() {
  console.log('\n=== DocuSign JWT Debug ===\n');
  
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  const oAuthBasePath = (process.env.DOCUSIGN_OAUTH_BASE_PATH || 'https://account.docusign.com');
  
  console.log('Configuration:');
  console.log(`- Integration Key: ${integrationKey}`);
  console.log(`- User ID: ${userId}`);
  console.log(`- OAuth Base: ${oAuthBasePath}`);
  console.log(`- Private Key Length: ${privateKey?.length || 0}\n`);
  
  try {
    // Create API client
    const dsApiClient = new docusign.ApiClient();
    const oAuthHost = oAuthBasePath.replace(/^https?:\/\//, '').replace(/\/oauth\/?$/, '');
    dsApiClient.setOAuthBasePath(oAuthHost);
    
    console.log(`Requesting JWT token from: ${oAuthHost}\n`);
    
    // Request JWT token
    const results = await dsApiClient.requestJWTUserToken(
      integrationKey,
      userId,
      ['signature', 'impersonation'],
      privateKey,
      3600
    );
    
    console.log('✅ JWT Token Request Successful!\n');
    
    // Debug: Log the entire response structure
    console.log('=== RAW RESPONSE STRUCTURE ===');
    console.log('typeof results:', typeof results);
    console.log('results is null?', results === null);
    console.log('results is undefined?', results === undefined);
    console.log('\nTop-level keys in results:', Object.keys(results || {}));
    console.log('\n=== RESPONSE DETAILS ===');
    
    // Check different possible locations for the token
    console.log('\n1. results.body:');
    if (results.body) {
      console.log('   typeof:', typeof results.body);
      console.log('   keys:', Object.keys(results.body));
      console.log('   access_token exists?', 'access_token' in results.body);
      console.log('   access_token value (first 30 chars):', 
        results.body.access_token ? results.body.access_token.substring(0, 30) + '...' : 'undefined/null');
      console.log('   expires_in:', results.body.expires_in);
      console.log('   token_type:', results.body.token_type);
    } else {
      console.log('   results.body is', results.body);
    }
    
    console.log('\n2. results direct properties:');
    console.log('   results.accessToken:', results.accessToken ? results.accessToken.substring(0, 30) + '...' : results.accessToken);
    console.log('   results.access_token:', results.access_token ? results.access_token.substring(0, 30) + '...' : results.access_token);
    console.log('   results.expiresIn:', results.expiresIn);
    console.log('   results.expires_in:', results.expires_in);
    
    console.log('\n3. Full results object (stringified):');
    try {
      const stringified = JSON.stringify(results, (key, value) => {
        // Truncate long strings (like tokens) for readability
        if (typeof value === 'string' && value.length > 100) {
          return value.substring(0, 100) + '... (truncated)';
        }
        return value;
      }, 2);
      console.log(stringified);
    } catch (e) {
      console.log('   Could not stringify results:', e.message);
    }
    
    // Try to extract token using the expected path
    const accessToken = results.body?.access_token;
    console.log('\n=== FINAL CHECK ===');
    console.log('Extracted access token:', accessToken ? accessToken.substring(0, 50) + '...' : 'FAILED TO EXTRACT');
    
    if (!accessToken) {
      console.error('\n❌ ERROR: Could not extract access token from response!');
      console.error('This is why the Authorization header shows "Bearer undefined"');
      process.exit(1);
    }
    
    console.log('\n✅ Access token extracted successfully!');
    console.log(`Token length: ${accessToken.length} characters`);
    
    // Test the token by getting user info
    console.log('\n=== TESTING TOKEN ===');
    const userInfo = await dsApiClient.getUserInfo(accessToken);
    console.log('✅ Token is valid!');
    console.log(`User: ${userInfo.name} (${userInfo.email})`);
    console.log(`Accounts: ${userInfo.accounts.length}`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('\nResponse error details:');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
  
  console.log('\n=== Debug Complete ===\n');
}

debugJWT();

