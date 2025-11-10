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
import * as tokenStorage from '../../services/storage/token-storage.js';

/**
 * Token storage moved to Vercel KV (Redis)
 * Benefits:
 * - Persists across server restarts
 * - Auto-managed by Vercel
 * - Fast sub-millisecond reads
 * - No manual connection management
 */

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

    // Store tokens in Vercel KV
    await tokenStorage.storeTokens(tokenData);

    console.log('[Smokeball Auth] ✅ Tokens obtained and stored successfully');

    return tokenData;

  } catch (error) {
    console.error('[Smokeball Auth] ❌ Error exchanging code for token:', error.response?.data || error.message);
    throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Refresh the access token using refresh token
 *
 * @param {string} refreshToken - Refresh token to use
 * @returns {Promise<Object>} New token response
 */
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
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
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokenData = response.data;

    // Update stored tokens in Vercel KV
    await tokenStorage.storeTokens(tokenData);

    console.log('[Smokeball Auth] ✅ Token refreshed successfully');

    return tokenData;

  } catch (error) {
    console.error('[Smokeball Auth] ❌ Error refreshing token:', error.response?.data || error.message);

    // Clear invalid tokens
    await clearTokens();

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
  // Use token storage service which handles auto-refresh
  return await tokenStorage.getValidAccessToken(refreshAccessToken);
}

/**
 * Clear stored tokens (logout)
 */
export async function clearTokens() {
  await tokenStorage.clearTokens();
}

/**
 * Check if currently authenticated
 *
 * @returns {Promise<boolean>} True if has valid tokens
 */
export async function isAuthenticated() {
  const tokens = await tokenStorage.loadTokens();
  return !!(tokens && tokens.access_token && tokens.refresh_token);
}

/**
 * Get token info (for debugging/status)
 *
 * @returns {Promise<Object>} Token status (without exposing actual tokens)
 */
export async function getTokenStatus() {
  const tokens = await tokenStorage.loadTokens();

  if (!tokens || !tokens.access_token) {
    return {
      authenticated: false,
      message: 'Not authenticated with Smokeball',
    };
  }

  const now = Date.now();
  const expiresIn = Math.floor((tokens.expires_at - now) / 1000); // seconds
  const expiresInMinutes = Math.floor(expiresIn / 60);

  return {
    authenticated: true,
    tokenType: 'Bearer',
    expiresAt: new Date(tokens.expires_at).toISOString(),
    expiresIn: `${expiresInMinutes} minutes`,
    needsRefresh: expiresIn < SMOKEBALL_CONFIG.tokenRefreshBuffer,
  };
}

/**
 * Manually set tokens (for testing or migration)
 *
 * @param {Object} tokens - { accessToken, refreshToken, expiresIn }
 */
export async function setTokens(tokens) {
  await tokenStorage.storeTokens({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn || 3600,
    token_type: tokens.tokenType || 'Bearer',
  });

  console.log('[Smokeball Auth] 📝 Tokens manually set');
}

export default {
  exchangeCodeForToken,
  refreshAccessToken,
  getCurrentAccessToken,
  clearTokens,
  isAuthenticated,
  getTokenStatus,
  setTokens,
};
