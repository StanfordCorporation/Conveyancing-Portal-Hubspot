/**
 * DocuSign JWT Authentication Service
 * 
 * Handles JWT token generation and management using RSA keys
 * Implements token caching to avoid unnecessary OAuth calls
 */

import docusign from 'docusign-esign';
import docusignConfig from '../../config/docusign.js';
import fs from 'fs';
import path from 'path';

// Token cache
let cachedToken = null;
let tokenExpirationTime = null;

/**
 * Request JWT User Token from DocuSign
 * 
 * @param {Object} options
 * @param {string} options.integrationKey - DocuSign Integration Key (Client ID)
 * @param {string} options.userId - DocuSign User ID (Impersonated User GUID)
 * @param {string} options.oAuthBasePath - OAuth Base Path
 * @param {string} options.privateKey - RSA Private Key content
 * @param {number} options.expiresIn - Token expiration in seconds (default: 3600)
 * @param {string[]} options.scopes - OAuth scopes
 * @returns {Promise<{accessToken: string, expiresIn: number, tokenType: string}>}
 */
export async function requestJWTUserToken(options = {}) {
  const {
    integrationKey = docusignConfig.integrationKey,
    userId = docusignConfig.userId,
    oAuthBasePath = docusignConfig.oAuthBasePath,
    privateKey = docusignConfig.privateKey,
    expiresIn = docusignConfig.tokenExpirationInSeconds,
    scopes = ['signature', 'impersonation']
  } = options;

  console.log('[DocuSign JWT] Requesting JWT User Token...');
  console.log(`[DocuSign JWT] Integration Key: ${integrationKey}`);
  console.log(`[DocuSign JWT] User ID: ${userId}`);
  console.log(`[DocuSign JWT] OAuth Base Path: ${oAuthBasePath}`);
  
  // Debug private key format
  console.log(`[DocuSign JWT] Private Key Length: ${privateKey ? privateKey.length : 'undefined'}`);
  console.log(`[DocuSign JWT] Private Key Starts With: ${privateKey ? privateKey.substring(0, 50) + '...' : 'undefined'}`);
  console.log(`[DocuSign JWT] Private Key Ends With: ${privateKey ? '...' + privateKey.substring(privateKey.length - 50) : 'undefined'}`);

  try {
    // Create API client
    const dsApiClient = new docusign.ApiClient();
    
    // setOAuthBasePath expects just the hostname without protocol
    // Extract hostname from oAuthBasePath if it contains protocol
    const oAuthHost = oAuthBasePath.replace(/^https?:\/\//, '');
    dsApiClient.setOAuthBasePath(oAuthHost);

    // Request JWT token
    const results = await dsApiClient.requestJWTUserToken(
      integrationKey,
      userId,
      scopes,
      privateKey,
      expiresIn
    );

    console.log('[DocuSign JWT] ✅ JWT Token received successfully');
    console.log('[DocuSign JWT] Raw results object keys:', Object.keys(results || {}));
    console.log('[DocuSign JWT] Body keys:', Object.keys(results?.body || {}));
    
    // Extract token from results (handle different response structures)
    const accessToken = results.body?.access_token || results.accessToken;
    const expiresInValue = results.body?.expires_in || results.expiresIn || 3600;
    const tokenType = results.body?.token_type || results.tokenType || 'Bearer';
    
    if (!accessToken) {
      console.error('[DocuSign JWT] ❌ No access token found in response!');
      console.error('[DocuSign JWT] Response structure:', JSON.stringify(results, null, 2));
      throw new Error('JWT response did not contain an access token');
    }
    
    console.log('[DocuSign JWT] Access token (first 20 chars):', accessToken.substring(0, 20) + '...');
    console.log('[DocuSign JWT] Expires in:', expiresInValue, 'seconds');
    
    return {
      accessToken: accessToken,
      expiresIn: expiresInValue,
      tokenType: tokenType
    };

  } catch (error) {
    console.error('[DocuSign JWT] ❌ Error requesting JWT token:', error);
    
    // Provide helpful error messages
    if (error.response) {
      const errorBody = error.response.data || error.response.body;
      console.error('[DocuSign JWT] Error details:', errorBody);
      
      if (errorBody && errorBody.error === 'consent_required') {
        const oAuthHost = oAuthBasePath.replace(/^https?:\/\//, '');
        throw new Error(
          'Consent required: Please grant consent by visiting:\n' +
          `https://${oAuthHost}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=http://localhost:3001/api/docusign/oauth-callback`
        );
      }
    }
    
    throw new Error(`JWT Authentication failed: ${error.message}`);
  }
}

/**
 * Get a valid JWT access token (uses cache if available and not expired)
 * 
 * @param {boolean} forceRefresh - Force token refresh even if cached token is valid
 * @returns {Promise<string>} Access token
 */
export async function getAccessToken(forceRefresh = false) {
  // Check if we have a valid cached token
  if (!forceRefresh && cachedToken && tokenExpirationTime) {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer before expiration
    
    if (now < tokenExpirationTime - bufferTime) {
      console.log('[DocuSign JWT] Using cached access token');
      return cachedToken;
    } else {
      console.log('[DocuSign JWT] Cached token expired or expiring soon, refreshing...');
    }
  }

  // Request new token
  console.log('[DocuSign JWT] Requesting new access token...');
  const tokenData = await requestJWTUserToken();
  
  console.log('[DocuSign JWT] Token data received:', {
    hasAccessToken: !!tokenData.accessToken,
    accessTokenLength: tokenData.accessToken?.length,
    accessTokenPreview: tokenData.accessToken ? tokenData.accessToken.substring(0, 20) + '...' : 'undefined',
    expiresIn: tokenData.expiresIn
  });
  
  // Cache the token
  cachedToken = tokenData.accessToken;
  tokenExpirationTime = Date.now() + (tokenData.expiresIn * 1000);
  
  console.log(`[DocuSign JWT] Token cached successfully`);
  console.log(`[DocuSign JWT] Cached token (first 20 chars): ${cachedToken ? cachedToken.substring(0, 20) + '...' : 'undefined'}`);
  console.log(`[DocuSign JWT] Expires in ${tokenData.expiresIn} seconds`);
  
  return cachedToken;
}

/**
 * Clear cached token (useful for logout or when switching users)
 */
export function clearTokenCache() {
  console.log('[DocuSign JWT] Clearing token cache');
  cachedToken = null;
  tokenExpirationTime = null;
}

/**
 * Get DocuSign API Client with JWT authentication
 * Automatically handles token generation and caching
 * 
 * @param {boolean} forceRefresh - Force token refresh
 * @returns {Promise<docusign.ApiClient>}
 */
export async function getAuthenticatedClient(forceRefresh = false) {
  const accessToken = await getAccessToken(forceRefresh);
  
  console.log('[DocuSign JWT] Creating authenticated client');
  console.log('[DocuSign JWT] Access token for client:', accessToken ? accessToken.substring(0, 20) + '...' : 'undefined');
  
  if (!accessToken) {
    console.error('[DocuSign JWT] ❌ Cannot create authenticated client: accessToken is undefined!');
    throw new Error('Access token is undefined - JWT authentication failed');
  }
  
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(docusignConfig.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  
  console.log('[DocuSign JWT] ✅ Authenticated client created with base path:', docusignConfig.basePath);
  
  return dsApiClient;
}

/**
 * Get User Info from DocuSign
 * Useful for getting account ID and base path
 * 
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} User info including accounts
 */
export async function getUserInfo(accessToken = null) {
  try {
    const token = accessToken || await getAccessToken();
    
    const dsApiClient = new docusign.ApiClient();
    
    // setOAuthBasePath expects just the hostname without protocol
    const oAuthHost = docusignConfig.oAuthBasePath.replace(/^https?:\/\//, '');
    dsApiClient.setOAuthBasePath(oAuthHost);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + token);
    
    console.log('[DocuSign JWT] Fetching user info...');
    const userInfo = await dsApiClient.getUserInfo(token);
    
    console.log('[DocuSign JWT] ✅ User info retrieved');
    console.log(`[DocuSign JWT] Name: ${userInfo.name}`);
    console.log(`[DocuSign JWT] Email: ${userInfo.email}`);
    console.log(`[DocuSign JWT] Accounts: ${userInfo.accounts.length}`);
    
    return {
      name: userInfo.name,
      email: userInfo.email,
      accounts: userInfo.accounts.map(account => ({
        accountId: account.accountId,
        accountName: account.accountName,
        baseUri: account.baseUri,
        isDefault: account.isDefault === 'true'
      }))
    };
    
  } catch (error) {
    console.error('[DocuSign JWT] ❌ Error getting user info:', error);
    throw new Error(`Failed to get user info: ${error.message}`);
  }
}

/**
 * Test JWT authentication flow
 * Useful for debugging and initial setup
 * 
 * @returns {Promise<Object>} Test results
 */
export async function testJWTAuth() {
  console.log('\n=== Testing DocuSign JWT Authentication ===\n');
  
  try {
    // Step 1: Request token
    console.log('Step 1: Requesting JWT token...');
    const tokenData = await requestJWTUserToken();
    console.log('✅ Token received');
    console.log(`   Access Token (first 20 chars): ${tokenData.accessToken.substring(0, 20)}...`);
    console.log(`   Expires In: ${tokenData.expiresIn} seconds`);
    console.log(`   Token Type: ${tokenData.tokenType}`);
    
    // Step 2: Get user info
    console.log('\nStep 2: Getting user info...');
    const userInfo = await getUserInfo(tokenData.accessToken);
    console.log('✅ User info retrieved');
    console.log(`   Name: ${userInfo.name}`);
    console.log(`   Email: ${userInfo.email}`);
    console.log(`   Default Account: ${userInfo.accounts.find(a => a.isDefault)?.accountId}`);
    
    // Step 3: Test token caching
    console.log('\nStep 3: Testing token cache...');
    const cachedTokenResult = await getAccessToken();
    console.log('✅ Token retrieved from cache');
    
    console.log('\n=== JWT Authentication Test Complete ===\n');
    
    return {
      success: true,
      token: tokenData,
      userInfo: userInfo
    };
    
  } catch (error) {
    console.error('\n❌ JWT Authentication Test Failed');
    console.error(`Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  requestJWTUserToken,
  getAccessToken,
  clearTokenCache,
  getAuthenticatedClient,
  getUserInfo,
  testJWTAuth
};

