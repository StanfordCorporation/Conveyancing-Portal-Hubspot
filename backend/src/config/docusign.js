/**
 * DocuSign Configuration
 *
 * All credentials are loaded from environment variables for security.
 * See .env file for configuration.
 */

import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DOCUSIGN_INTEGRATION_KEY',
  'DOCUSIGN_USER_ID',
  'DOCUSIGN_ACCOUNT_ID',
  'DOCUSIGN_KEYPAIR_ID',
  'DOCUSIGN_PRIVATE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`[DocuSign Config] ⚠️ Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('[DocuSign Config] DocuSign integration may not work properly.');
}

const docusignConfig = {
  // Integration Key (also called Client ID)
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,

  // User ID (Impersonated User GUID)
  userId: process.env.DOCUSIGN_USER_ID,

  // Account ID
  accountId: process.env.DOCUSIGN_ACCOUNT_ID,

  // Base Path (Demo or Production)
  basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',

  // OAuth Base Path
  oAuthBasePath: process.env.DOCUSIGN_OAUTH_BASE_PATH || 'https://account-d.docusign.com',

  // RSA Key Pair ID (from DocuSign Admin Console)
  keypairId: process.env.DOCUSIGN_KEYPAIR_ID,

  // RSA Private Key for JWT Authentication
  privateKey: process.env.DOCUSIGN_PRIVATE_KEY,

  // RSA Public Key (for reference, not used in JWT flow)
  publicKey: process.env.DOCUSIGN_PUBLIC_KEY,

  // Return URL after signing (where user is redirected after completing signature)
  returnUrl: process.env.DOCUSIGN_RETURN_URL || 'http://localhost:3000/signing-complete',

  // Ping URL for keeping session alive during signing
  pingUrl: process.env.DOCUSIGN_PING_URL || 'http://localhost:3001/api/docusign/ping',

  // Token expiration in seconds (1 hour)
  tokenExpirationInSeconds: 3600,

  // Allowed frame ancestors (for embedded signing)
  frameAncestors: [
    'http://localhost:3000',
    'https://apps-d.docusign.com',
    'https://demo.docusign.net'
  ],

  // Allowed message origins (for embedded signing) - DocuSign only allows 1
  messageOrigins: [
    'https://apps-d.docusign.com'
  ],

  // Template ID for Property Disclosure Form (multiple signers with routing order)
  templateId: process.env.DOCUSIGN_TEMPLATE_ID
};

export default docusignConfig;
