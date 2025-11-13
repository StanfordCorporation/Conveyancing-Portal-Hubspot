/**
 * DocuSign Authentication Test Script
 * 
 * This script tests your DocuSign credentials by:
 * 1. Loading environment variables from .env.docusign
 * 2. Authenticating with JWT
 * 3. Creating a test envelope
 * 4. Generating an embedded signing URL
 * 
 * Usage: node test-docusign-auth.js
 */

import dotenv from 'dotenv';
import docusign from 'docusign-esign';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.docusign
dotenv.config({ path: '.env.docusign' });

// Configuration
const config = {
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
  userId: process.env.DOCUSIGN_USER_ID,
  accountId: process.env.DOCUSIGN_ACCOUNT_ID,
  keypairId: process.env.DOCUSIGN_KEYPAIR_ID,
  privateKey: process.env.DOCUSIGN_PRIVATE_KEY,
  basePath: process.env.DOCUSIGN_BASE_PATH || 'https://au.docusign.net/restapi',
  oAuthBasePath: process.env.DOCUSIGN_OAUTH_BASE_PATH || 'https://account.docusign.com',
  templateId: process.env.DOCUSIGN_TEMPLATE_ID,
  returnUrl: 'https://portal.stanfordlegal.com.au/client/dashboard?signing=complete'
};

// Test signers
const testSigners = [
  {
    name: 'Test Signer 1',
    email: 'test1@example.com',
    clientUserId: 'test1_' + Date.now(),
    routingOrder: 1,
    roleName: 'Client 1'
  },
  {
    name: 'Test Signer 2', 
    email: 'test2@example.com',
    clientUserId: 'test2_' + Date.now(),
    routingOrder: 2,
    roleName: 'Client 2'
  }
];

console.log('🧪 DocuSign Authentication Test Script');
console.log('=====================================\n');

// Validate configuration
function validateConfig() {
  console.log('🔍 Validating configuration...');
  
  const requiredFields = [
    'integrationKey',
    'userId', 
    'accountId',
    'keypairId',
    'privateKey'
  ];
  
  const missing = requiredFields.filter(field => !config[field]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(field => console.error(`   - DOCUSIGN_${field.toUpperCase()}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables found');
  console.log(`   Integration Key: ${config.integrationKey}`);
  console.log(`   User ID: ${config.userId}`);
  console.log(`   Account ID: ${config.accountId}`);
  console.log(`   Keypair ID: ${config.keypairId}`);
  console.log(`   Base Path: ${config.basePath}`);
  console.log(`   OAuth Base Path: ${config.oAuthBasePath}`);
  console.log(`   Private Key Length: ${config.privateKey.length} characters`);
  console.log(`   Template ID: ${config.templateId || 'Not set'}\n`);
}

// Get JWT access token
async function getJWTToken() {
  console.log('🔐 Requesting JWT access token...');
  
  try {
    const dsApiClient = new docusign.ApiClient();
    
    // Extract hostname from OAuth base path
    const oAuthHost = config.oAuthBasePath.replace(/^https?:\/\//, '');
    dsApiClient.setOAuthBasePath(oAuthHost);
    
    const results = await dsApiClient.requestJWTUserToken(
      config.integrationKey,
      config.userId,
      ['signature', 'impersonation'],
      config.privateKey,
      3600 // 1 hour
    );
    
    console.log('✅ JWT token received successfully');
    console.log(`   Token Type: ${results.body.token_type}`);
    console.log(`   Expires In: ${results.body.expires_in} seconds\n`);
    
    return results.body.access_token;
    
  } catch (error) {
    console.error('❌ JWT authentication failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response?.body) {
      console.error(`   Details: ${JSON.stringify(error.response.body, null, 2)}`);
    } else if (error.response?.data) {
      console.error(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.response) {
      console.error(`   Response Status: ${error.response.status}`);
      console.error(`   Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    }
    
    // Additional debugging
    console.error(`   Full Error Object: ${JSON.stringify(error, null, 2)}`);
    
    throw error;
  }
}

// Create test envelope
async function createTestEnvelope(accessToken) {
  console.log('📄 Creating test envelope...');
  
  try {
    const dsApiClient = new docusign.ApiClient();
    // Set the complete base path WITH /restapi
    dsApiClient.setBasePath(config.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    
    console.log(`   API Base Path: ${config.basePath}`);
    console.log(`   Account ID: ${config.accountId}`);
    console.log(`   Token Length: ${accessToken.length}`);
    console.log(`   Token (first 30 chars): ${accessToken.substring(0, 30)}...`);
    
    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    
    // Create envelope definition
    const envelope = new docusign.EnvelopeDefinition();
    envelope.emailSubject = 'DocuSign Test - Please Sign';
    envelope.status = 'sent';
    
    // Use template if available, otherwise create simple document
    if (config.templateId) {
      console.log(`   Using template: ${config.templateId}`);
      envelope.templateId = config.templateId;
      
      // Create template roles for signers
      envelope.templateRoles = testSigners.map(signer => 
        docusign.TemplateRole.constructFromObject({
          email: signer.email,
          name: signer.name,
          clientUserId: signer.clientUserId,
          roleName: signer.roleName,
          routingOrder: signer.routingOrder.toString()
        })
      );
      
    } else {
      console.log('   Creating simple document envelope (no template)');
      
      // Create simple document
      const doc = new docusign.Document();
      doc.documentBase64 = Buffer.from('Simple Test Document\n\nPlease sign below:\n\n\n_________________\nSignature').toString('base64');
      doc.name = 'Test Document';
      doc.fileExtension = 'txt';
      doc.documentId = '1';
      envelope.documents = [doc];
      
      // Create signers
      const signers = testSigners.map((signer, index) => {
        const signerObj = docusign.Signer.constructFromObject({
          email: signer.email,
          name: signer.name,
          clientUserId: signer.clientUserId,
          recipientId: (index + 1).toString(),
          routingOrder: signer.routingOrder.toString()
        });
        
        // Add signature tab
        const signHere = docusign.SignHere.constructFromObject({
          documentId: '1',
          pageNumber: '1',
          xPosition: '100',
          yPosition: '200'
        });
        
        signerObj.tabs = docusign.Tabs.constructFromObject({
          signHereTabs: [signHere]
        });
        
        return signerObj;
      });
      
      envelope.recipients = docusign.Recipients.constructFromObject({
        signers: signers
      });
    }
    
    // Add custom field for deal ID (for webhook testing)
    envelope.customFields = docusign.CustomFields.constructFromObject({
      textCustomFields: [{
        name: 'hs_deal_id',
        value: 'test_deal_' + Date.now(),
        show: 'false',
        required: 'false'
      }]
    });
    
    // Create envelope
    const envelopeResults = await envelopesApi.createEnvelope(config.accountId, {
      envelopeDefinition: envelope
    });
    
    console.log('✅ Test envelope created successfully');
    console.log(`   Envelope ID: ${envelopeResults.envelopeId}`);
    console.log(`   Status: ${envelopeResults.status}\n`);
    
    return envelopeResults.envelopeId;
    
  } catch (error) {
    console.error('❌ Failed to create envelope:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Status: ${error.response?.status || 'unknown'}`);
    
    if (error.response?.body) {
      console.error(`   Response Body: ${JSON.stringify(error.response.body, null, 2)}`);
    } else if (error.response?.data) {
      console.error(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.response?.text) {
      console.error(`   Response Text: ${error.response.text}`);
    }
    
    console.error(`\n   Request URL: ${error.config?.baseURL}${error.config?.url}`);
    console.error(`   Request Method: ${error.config?.method}`);
    
    throw error;
  }
}

// Generate signing URL for first signer
async function generateSigningUrl(accessToken, envelopeId) {
  console.log('🔗 Generating embedded signing URL...');
  
  try {
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(config.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    
    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    
    // Create recipient view request for first signer
    const firstSigner = testSigners[0];
    const viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = config.returnUrl;
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = firstSigner.email;
    viewRequest.userName = firstSigner.name;
    viewRequest.clientUserId = firstSigner.clientUserId;
    viewRequest.pingFrequency = '600';
    viewRequest.pingUrl = 'https://conveyancing-portal-backend.vercel.app/api/docusign/ping';
    
    // Frame settings for embedded signing
    viewRequest.frameAncestors = ['https://portal.stanfordlegal.com.au'];
    viewRequest.messageOrigins = ['https://apps.docusign.com'];
    
    const recipientViewResults = await envelopesApi.createRecipientView(
      config.accountId,
      envelopeId,
      { recipientViewRequest: viewRequest }
    );
    
    console.log('✅ Signing URL generated successfully');
    console.log(`   Signer: ${firstSigner.name} (${firstSigner.email})`);
    console.log(`   URL: ${recipientViewResults.url}\n`);
    
    return recipientViewResults.url;
    
  } catch (error) {
    console.error('❌ Failed to generate signing URL:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response?.body) {
      console.error(`   Details: ${JSON.stringify(error.response.body, null, 2)}`);
    }
    
    throw error;
  }
}

// Main test function
async function runTest() {
  try {
    validateConfig();
    
    const accessToken = await getJWTToken();
    const envelopeId = await createTestEnvelope(accessToken);
    const signingUrl = await generateSigningUrl(accessToken, envelopeId);
    
    console.log('🎉 Test completed successfully!');
    console.log('=====================================');
    console.log(`Envelope ID: ${envelopeId}`);
    console.log(`Signing URL: ${signingUrl}`);
    console.log('\n💡 Next steps:');
    console.log('1. Open the signing URL in a browser');
    console.log('2. Complete the signing process');
    console.log('3. Check if webhooks are received (if configured)');
    console.log('4. Verify the envelope status in DocuSign admin');
    
  } catch (error) {
    console.error('\n💥 Test failed!');
    console.error('=====================================');
    console.error('Please check your configuration and try again.');
    console.error('\nCommon issues:');
    console.error('- Private key format (must include BEGIN/END headers)');
    console.error('- Wrong User ID or Integration Key');
    console.error('- Missing admin consent for JWT');
    console.error('- Incorrect base path for your DocuSign environment');
    
    process.exit(1);
  }
}

// Run the test
runTest();
