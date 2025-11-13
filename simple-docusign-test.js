/**
 * Simple DocuSign Test
 * Tests JWT and shows account info
 */

import dotenv from 'dotenv';
import docusign from 'docusign-esign';

dotenv.config({ path: '.env.docusign' });

async function test() {
  try {
    console.log('🧪 Testing DocuSign JWT Authentication\n');
    
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    const userId = process.env.DOCUSIGN_USER_ID;
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
    const oAuthBasePath = (process.env.DOCUSIGN_OAUTH_BASE_PATH || 'https://account.docusign.com').replace(/\/oauth\/?$/, '').replace(/\/$/, '');
    
    console.log(`Integration Key: ${integrationKey}`);
    console.log(`User ID: ${userId}`);
    console.log(`OAuth Base: ${oAuthBasePath}`);
    console.log(`Private Key Length: ${privateKey?.length || 0}\n`);
    
    // Step 1: Get JWT Token
    console.log('Step 1: Getting JWT Token...');
    const apiClient = new docusign.ApiClient();
    apiClient.setOAuthBasePath(oAuthBasePath.replace(/^https?:\/\//, ''));
    
    const results = await apiClient.requestJWTUserToken(
      integrationKey,
      userId,
      ['signature', 'impersonation'],
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    console.log('✅ JWT Token obtained successfully!\n');
    
    // Step 2: Get User Info (which includes account details)
    console.log('Step 2: Getting User Account Info...');
    const userInfo = await apiClient.getUserInfo(accessToken);
    
    console.log('\n👤 User Information:');
    console.log(`   Name: ${userInfo.name}`);
    console.log(`   Email: ${userInfo.email}`);
    console.log(`   Sub: ${userInfo.sub}\n`);
    
    console.log(`📊 Accounts for this user (${userInfo.accounts.length}):\n`);
    
    userInfo.accounts.forEach((account, index) => {
      console.log(`Account ${index + 1}:`);
      console.log(`   Account ID: ${account.accountId}`);
      console.log(`   Account Name: ${account.accountName}`);
      console.log(`   Base URI: ${account.baseUri}`);
      console.log(`   Is Default: ${account.isDefault ? '✅' : '❌'}`);
      console.log('');
    });
    
    // Show recommended config
    const defaultAccount = userInfo.accounts.find(a => a.isDefault) || userInfo.accounts[0];
    
    console.log('✅ CORRECT CONFIGURATION TO USE:');
    console.log('=====================================');
    console.log(`DOCUSIGN_ACCOUNT_ID=${defaultAccount.accountId}`);
    console.log(`DOCUSIGN_BASE_PATH=${defaultAccount.baseUri}/restapi`);
    console.log('');
    console.log('⚠️  Update these in .env.docusign and Vercel!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body || error.response.data);
    }
    console.error('\nFull Error:', error);
  }
}

test();

