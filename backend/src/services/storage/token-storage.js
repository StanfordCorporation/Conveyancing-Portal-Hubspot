/**
 * Token Storage Service using Redis
 * Stores and retrieves OAuth tokens for Smokeball integration
 *
 * Redis automatically handles:
 * - Connection pooling
 * - Auto-reconnection
 * - Persistent storage across server restarts
 */

import { createClient } from 'redis';

// Lazy Redis client - created on first use
let redis = null;

/**
 * Get or create Redis client
 * Ensures connection is established before use
 */
async function getRedisClient() {
  if (!redis) {
    const redisUrl = process.env.KV_URL || process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('Redis URL not configured. Please set KV_URL or REDIS_URL environment variable.');
    }

    console.log('[Redis] Creating new Redis client...');
    redis = createClient({ url: redisUrl });

    redis.on('error', (err) => console.error('[Redis] Connection error:', err));
    redis.on('connect', () => console.log('[Redis] Connected successfully'));

    await redis.connect();
  }

  return redis;
}

/**
 * Store Smokeball OAuth tokens
 * @param {Object} tokenData - Token data from Smokeball OAuth
 * @param {string} tokenData.access_token - Access token
 * @param {string} tokenData.refresh_token - Refresh token
 * @param {number} tokenData.expires_in - Expires in seconds
 */
export async function storeTokens(tokenData) {
  try {
    const redis = await getRedisClient();

    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
    };

    await redis.set('smokeball:tokens', JSON.stringify(tokens));

    console.log('[Token Storage] ✅ Tokens stored successfully');
    console.log(`[Token Storage] 📅 Expires at: ${new Date(tokens.expires_at).toISOString()}`);

    return tokens;
  } catch (error) {
    console.error('[Token Storage] ❌ Error storing tokens:', error.message);
    throw error;
  }
}

/**
 * Load Smokeball OAuth tokens
 * @returns {Promise<Object|null>} Token data or null if not found
 */
export async function loadTokens() {
  try {
    const redis = await getRedisClient();
    const tokensStr = await redis.get('smokeball:tokens');

    if (!tokensStr) {
      console.warn('[Token Storage] ⚠️ No tokens found in storage');
      return null;
    }

    const tokens = JSON.parse(tokensStr);

    console.log('[Token Storage] ✅ Tokens loaded successfully');
    console.log(`[Token Storage] 📅 Expires at: ${new Date(tokens.expires_at).toISOString()}`);

    return tokens;
  } catch (error) {
    console.error('[Token Storage] ❌ Error loading tokens:', error.message);
    throw error;
  }
}

/**
 * Check if access token is expired or about to expire
 * @param {Object} tokens - Token data
 * @returns {boolean} True if expired or expires within 5 minutes
 */
export function isTokenExpired(tokens) {
  if (!tokens || !tokens.expires_at) {
    return true;
  }

  // Consider expired if less than 5 minutes remaining
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  const isExpired = Date.now() >= (tokens.expires_at - bufferTime);

  if (isExpired) {
    console.log('[Token Storage] ⏰ Token expired or expiring soon');
  }

  return isExpired;
}

/**
 * Get valid access token, refreshing if necessary
 * @param {Function} refreshFunction - Function to refresh tokens (should call Smokeball API)
 * @returns {Promise<string>} Valid access token
 */
export async function getValidAccessToken(refreshFunction) {
  try {
    let tokens = await loadTokens();

    // If no tokens or expired, refresh
    if (!tokens || isTokenExpired(tokens)) {
      console.log('[Token Storage] 🔄 Refreshing access token...');

      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token available. Re-authentication required.');
      }

      // Call the provided refresh function (e.g., Smokeball API refresh)
      const newTokenData = await refreshFunction(tokens.refresh_token);

      // Store new tokens
      tokens = await storeTokens(newTokenData);
    }

    return tokens.access_token;
  } catch (error) {
    console.error('[Token Storage] ❌ Error getting valid access token:', error.message);
    throw error;
  }
}

/**
 * Clear stored tokens (for logout or re-authentication)
 */
export async function clearTokens() {
  try {
    const redis = await getRedisClient();
    await redis.del('smokeball:tokens');
    console.log('[Token Storage] 🗑️ Tokens cleared successfully');
  } catch (error) {
    console.error('[Token Storage] ❌ Error clearing tokens:', error.message);
    throw error;
  }
}

// Export getRedisClient for testing
export { getRedisClient };
