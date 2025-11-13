/**
 * DocuSign Account Info Retrieval
 * This script gets the correct Account ID and Base Path for your user
 */

import dotenv from 'dotenv';
import docusign from 'docusign-esign';
import axios from 'axios';

dotenv.config({ path: '.env.docusign' });

const config = {
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
  userId: process.env.DOCUSIGN_USER_ID,
  privateKey: process.env.DOCUSIGN_PRIVATE_KEY,
  oAuthBasePath: process.env.DOCUSIGN_OAUTH_BASE_PATH || 'https://account.docusign.com'
};

async function getUserAccountInfo() {
  try {
    console.log('🔍 Getting Account Information for User...\n');
    
    // Get JWT token
    const dsApiClient = new docusign.ApiClient();
    const oAuthHost = config.oAuthBasePath.replace(/^https?:\/\//, '');
    dsApiClient.setOAuthBasePath(oAuthHost);
    
    const results = await dsApiClient.requestJWTUserToken(
      config.integrationKey,
      config.userId,
      ['signature', 'impersonation'],
      config.privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    console.log('✅ JWT Token obtained\n');
    
    // Get user info directly via API call
    // Remove /oauth if it's already in the base path
    const baseUrl = config.oAuthBasePath.replace(/\/oauth\/?$/, '');
    const userInfoUrl = `${baseUrl}/oauth/userinfo`;
    
    console.log(`   Calling: ${userInfoUrl}\n`);
    
    const response = await axios.get(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const userInfo = response.data;
    
    console.log('👤 User Information:');
    console.log(JSON.stringify(userInfo, null, 2));
    console.log('');
    
    const accounts = userInfo.accounts || [];
    
    if (!accounts || accounts.length === 0) {
      console.error('❌ No accounts found for this user!');
      return;
    }
    
    console.log(`📊 Found ${accounts.length} account(s):\n`);
    
    accounts.forEach((account, index) => {
      console.log(`Account ${index + 1}:`);
      console.log(`   Account ID: ${account.accountId}`);
      console.log(`   Account Name: ${account.accountName}`);
      console.log(`   Base URI: ${account.baseUri}`);
      console.log(`   Is Default: ${account.isDefault}`);
      console.log(`   Organization: ${account.organizationId || 'N/A'}`);
      console.log('');
    });
    
    // Show the correct values to use
    const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
    
    console.log('✅ RECOMMENDED CONFIGURATION:');
    console.log('=====================================');
    console.log(`DOCUSIGN_ACCOUNT_ID=${defaultAccount.accountId}`);
    console.log(`DOCUSIGN_BASE_PATH=${defaultAccount.baseUri}/restapi`);
    console.log('');
    console.log('Update these in your .env.docusign and Vercel environment variables!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.body) {
      console.error('Details:', error.response.body);
    }
  }
}

getUserAccountInfo();

