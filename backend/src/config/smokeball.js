/**
 * Smokeball Configuration
 * OAuth2 + PKCE settings for Smokeball API integration
 */

import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables (warn only - don't block server startup)
const requiredEnvVars = [
  'SMOKEBALL_CLIENT_ID',
  'SMOKEBALL_CLIENT_SECRET',
  'SMOKEBALL_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

export const SMOKEBALL_ENABLED = missingVars.length === 0;

if (missingVars.length > 0) {
  console.warn('[Smokeball Config] ⚠️ Smokeball integration disabled - missing environment variables:');
  missingVars.forEach(varName => console.warn(`  - ${varName}`));
  console.warn('[Smokeball Config] ℹ️ Server will start, but Smokeball features will not work.');
  console.warn('[Smokeball Config] ℹ️ Add credentials to .env to enable Smokeball integration.');
} else {
  console.log('[Smokeball Config] ✅ Smokeball integration enabled');
}

/**
 * Smokeball OAuth2 + PKCE Configuration
 */
export const SMOKEBALL_CONFIG = {
  // OAuth2 Credentials
  clientId: process.env.SMOKEBALL_CLIENT_ID,
  clientSecret: process.env.SMOKEBALL_CLIENT_SECRET,
  apiKey: process.env.SMOKEBALL_API_KEY,

  // API Endpoints (Australia)
  authBaseUrl: process.env.SMOKEBALL_AUTH_BASE_URL || 'https://auth.smokeball.com.au',
  apiBaseUrl: process.env.SMOKEBALL_API_BASE_URL || 'https://api.smokeball.com.au',

  // OAuth2 Flow
  redirectUri: process.env.SMOKEBALL_REDIRECT_URI || 'http://localhost:3001/api/smokeball/oauth-callback',
  scopes: ['openid', 'offline_access', 'sb.api'], // Required scopes for Smokeball API

  // Authorization Endpoints
  authorizationEndpoint: `${process.env.SMOKEBALL_AUTH_BASE_URL || 'https://auth.smokeball.com.au'}/oauth2/authorize`,
  tokenEndpoint: `${process.env.SMOKEBALL_AUTH_BASE_URL || 'https://auth.smokeball.com.au'}/oauth2/token`,

  // PKCE Settings
  codeChallengeMethod: 'S256', // SHA-256 hashing

  // Token Management
  tokenRefreshBuffer: parseInt(process.env.SMOKEBALL_TOKEN_REFRESH_BUFFER) || 300, // 5 minutes (in seconds)

  // Trust Account
  trustAccountId: process.env.SMOKEBALL_TRUST_ACCOUNT_ID || null,
};

/**
 * Smokeball API Configuration
 */
export const SMOKEBALL_API = {
  // Base paths
  basePath: SMOKEBALL_CONFIG.apiBaseUrl,

  // API Endpoints
  endpoints: {
    // Matter endpoints
    matters: '/matters',
    matter: (id) => `/matters/${id}`,

    // Contact endpoints
    contacts: '/contacts',
    contact: (id) => `/contacts/${id}`,

    // Staff endpoints
    staff: '/staff',
    staffMember: (id) => `/staff/${id}`,

    // Task endpoints
    tasks: '/tasks',
    task: (id) => `/tasks/${id}`,

    // Bank account endpoints
    bankAccounts: '/bankaccounts',
    bankAccount: (id) => `/bankaccounts/${id}`,
    transactions: (accountId) => `/bankaccounts/${accountId}/transactions`,
    transaction: (accountId, transactionId) => `/bankaccounts/${accountId}/transactions/${transactionId}`,

    // Matter type endpoints
    matterTypes: '/mattertypes',

    // Webhook endpoints
    webhooks: '/webhooks',
  },

  // Default headers
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': SMOKEBALL_CONFIG.apiKey,
  },
};

/**
 * Matter Type IDs (from Smokeball)
 * Note: These may vary per Smokeball instance - verify with your account
 */
export const MATTER_TYPES = {
  CONVEYANCING_PURCHASE: 'conveyancing-purchase',
  CONVEYANCING_SALE: 'conveyancing-sale',
  // Add more as needed based on your Smokeball setup
};

/**
 * Transaction Types for Trust Account
 */
export const TRANSACTION_TYPES = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRANSFER: 'Transfer',
};

/**
 * Smokeball State Mapping
 * Maps Australian state codes to Smokeball format
 */
export const STATE_MAPPING = {
  'NSW': 'New South Wales',
  'VIC': 'Victoria',
  'QLD': 'Queensland',
  'WA': 'Western Australia',
  'SA': 'South Australia',
  'TAS': 'Tasmania',
  'ACT': 'Australian Capital Territory',
  'NT': 'Northern Territory',
};

/**
 * Reverse state mapping (full name to code)
 */
export const STATE_CODE_MAPPING = Object.fromEntries(
  Object.entries(STATE_MAPPING).map(([code, name]) => [name, code])
);

console.log('[Smokeball Config] ✅ Configuration loaded successfully');
console.log(`[Smokeball Config] 📍 Auth URL: ${SMOKEBALL_CONFIG.authBaseUrl}`);
console.log(`[Smokeball Config] 📍 API URL: ${SMOKEBALL_CONFIG.apiBaseUrl}`);
console.log(`[Smokeball Config] 🔄 Redirect URI: ${SMOKEBALL_CONFIG.redirectUri}`);
