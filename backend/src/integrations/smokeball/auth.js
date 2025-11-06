/**
 * Smokeball OAuth2 Token Management
 * Handles token storage, refresh, and expiry
 *
 * OAuth2 Flow:
 * 1. User visits /api/smokeball/setup
 * 2. Redirects to Smokeball authorization
 * 3. Callback receives authorization code
 * 4. Exchange code for access + refresh tokens
 * 5. Auto-refresh tokens before expiry
 */

import axios from 'axios';
import { SMOKEBALL_CONFIG } from '../../config/smokeball.js';

/**
 * In-memory token store
 * TODO: Move to database for production (supports multiple users)
 */
const tokenStore = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null, // Unix timestamp (ms)
  tokenType: 'Bearer',
};

/**
 * Exchange authorization code for access token
 *
 * @param {string} authorizationCode - Code from OAuth callback
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Promise<Object>} Token response
 */
export async function exchangeCodeForToken(authorizationCode, codeVerifier) {
  try {
    console.log('[Smokeball Auth] 🔄 Exchanging authorization code for token...');

    const response = await axios.post(
      SMOKEBALL_CONFIG.tokenEndpoint,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SMOKEBALL_CONFIG.clientId,
        client_secret: SMOKEBALL_CONFIG.clientSecret,
        code: authorizationCode,
        redirect_uri: SMOKEBALL_CONFIG.redirectUri,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokenData = response.data;

    // Store tokens
    storeTokens(tokenData);

    console.log('[Smokeball Auth] ✅ Tokens obtained and stored successfully');
    console.log(`[Smokeball Auth] ⏰ Token expires at: ${new Date(tokenStore.expiresAt).toISOString()}`);

    return tokenData;

  } catch (error) {
    console.error('[Smokeball Auth] ❌ Error exchanging code for token:', error.response?.data || error.message);
    throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Refresh the access token using refresh token
 *
 * @returns {Promise<Object>} New token response
 */
export async function refreshAccessToken() {
  if (!tokenStore.refreshToken) {
    throw new Error('No refresh token available. Please re-authenticate.');
  }

  try {
    console.log('[Smokeball Auth] 🔄 Refreshing access token...');

    const response = await axios.post(
      SMOKEBALL_CONFIG.tokenEndpoint,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: SMOKEBALL_CONFIG.clientId,
        client_secret: SMOKEBALL_CONFIG.clientSecret,
        refresh_token: tokenStore.refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokenData = response.data;

    // Update stored tokens
    storeTokens(tokenData);

    console.log('[Smokeball Auth] ✅ Token refreshed successfully');
    console.log(`[Smokeball Auth] ⏰ New token expires at: ${new Date(tokenStore.expiresAt).toISOString()}`);

    return tokenData;

  } catch (error) {
    console.error('[Smokeball Auth] ❌ Error refreshing token:', error.response?.data || error.message);

    // Clear invalid tokens
    clearTokens();

    throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}. Please re-authenticate.`);
  }
}

/**
 * Get current valid access token
 * Automatically refreshes if expired or about to expire
 *
 * @returns {Promise<string>} Valid access token
 */
export async function getCurrentAccessToken() {
  if (!tokenStore.accessToken) {
    throw new Error('Not authenticated with Smokeball. Please visit: /api/smokeball/setup');
  }

  // Check if token needs refresh (within buffer time)
  const bufferMs = SMOKEBALL_CONFIG.tokenRefreshBuffer * 1000;
  const needsRefresh = Date.now() >= (tokenStore.expiresAt - bufferMs);

  if (needsRefresh) {
    console.log('[Smokeball Auth] ⏰ Token expiring soon, refreshing...');
    await refreshAccessToken();
  }

  return tokenStore.accessToken;
}

/**
 * Store tokens in memory
 *
 * @param {Object} tokenData - Token response from Smokeball
 */
function storeTokens(tokenData) {
  tokenStore.accessToken = tokenData.access_token;
  tokenStore.refreshToken = tokenData.refresh_token || tokenStore.refreshToken; // Preserve if not returned
  tokenStore.tokenType = tokenData.token_type || 'Bearer';

  // Calculate expiry timestamp (current time + expires_in seconds)
  const expiresInMs = tokenData.expires_in * 1000;
  tokenStore.expiresAt = Date.now() + expiresInMs;
}

/**
 * Clear stored tokens (logout)
 */
export function clearTokens() {
  tokenStore.accessToken = null;
  tokenStore.refreshToken = null;
  tokenStore.expiresAt = null;
  console.log('[Smokeball Auth] 🗑️ Tokens cleared');
}

/**
 * Check if currently authenticated
 *
 * @returns {boolean} True if has valid tokens
 */
export function isAuthenticated() {
  return !!(tokenStore.accessToken && tokenStore.refreshToken);
}

/**
 * Get token info (for debugging/status)
 *
 * @returns {Object} Token status (without exposing actual tokens)
 */
export function getTokenStatus() {
  if (!isAuthenticated()) {
    return {
      authenticated: false,
      message: 'Not authenticated with Smokeball',
    };
  }

  const now = Date.now();
  const expiresIn = Math.floor((tokenStore.expiresAt - now) / 1000); // seconds
  const expiresInMinutes = Math.floor(expiresIn / 60);

  return {
    authenticated: true,
    tokenType: tokenStore.tokenType,
    expiresAt: new Date(tokenStore.expiresAt).toISOString(),
    expiresIn: `${expiresInMinutes} minutes`,
    needsRefresh: expiresIn < SMOKEBALL_CONFIG.tokenRefreshBuffer,
  };
}

/**
 * Manually set tokens (for testing or migration)
 *
 * @param {Object} tokens - { accessToken, refreshToken, expiresIn }
 */
export function setTokens(tokens) {
  storeTokens({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn || 3600,
    token_type: tokens.tokenType || 'Bearer',
  });

  console.log('[Smokeball Auth] 📝 Tokens manually set');
}

// Export token store for testing (use with caution)
export { tokenStore };

export default {
  exchangeCodeForToken,
  refreshAccessToken,
  getCurrentAccessToken,
  clearTokens,
  isAuthenticated,
  getTokenStatus,
  setTokens,
};
