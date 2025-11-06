/**
 * Smokeball Integration Routes
 * OAuth2 + PKCE authentication and API endpoints
 */

import express from 'express';
import { SMOKEBALL_CONFIG, SMOKEBALL_ENABLED } from '../config/smokeball.js';
import { generatePKCEPair, generateState } from '../integrations/smokeball/pkce.js';
import * as smokeballAuth from '../integrations/smokeball/auth.js';

const router = express.Router();

/**
 * Middleware: Check if Smokeball integration is enabled
 */
function requireSmokeballEnabled(req, res, next) {
  if (!SMOKEBALL_ENABLED) {
    return res.status(503).json({
      error: 'Smokeball integration not configured',
      message: 'Smokeball integration is disabled. Please configure SMOKEBALL_CLIENT_ID, SMOKEBALL_CLIENT_SECRET, and SMOKEBALL_API_KEY in .env file.',
    });
  }
  next();
}

/**
 * In-memory PKCE state storage
 * TODO: Move to Redis/database for production (session-based)
 */
const pkceStore = new Map();

/**
 * GET /api/smokeball/setup
 * Initial setup page - displays OAuth setup instructions
 */
router.get('/setup', requireSmokeballEnabled, (req, res) => {
  const isAuthenticated = smokeballAuth.isAuthenticated();

  if (isAuthenticated) {
    const status = smokeballAuth.getTokenStatus();
    return res.json({
      message: 'Smokeball integration is already authenticated',
      status,
      actions: {
        viewStatus: '/api/smokeball/status',
        logout: '/api/smokeball/logout (POST)',
      },
    });
  }

  res.json({
    message: 'Smokeball OAuth2 Setup',
    instructions: [
      '1. Click the authorization link below',
      '2. Log in to your Smokeball account',
      '3. Grant permissions to this application',
      '4. You will be redirected back automatically',
    ],
    authorizationUrl: `${req.protocol}://${req.get('host')}/api/smokeball/authorize`,
  });
});

/**
 * GET /api/smokeball/authorize
 * Redirect to Smokeball authorization endpoint
 */
router.get('/authorize', requireSmokeballEnabled, (req, res) => {
  try {
    console.log('[Smokeball OAuth] 🔐 Starting OAuth2 + PKCE flow...');

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = generatePKCEPair();
    const state = generateState();

    // Store PKCE parameters for callback validation
    pkceStore.set(state, {
      codeVerifier,
      timestamp: Date.now(),
    });

    // Clean up old PKCE entries (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of pkceStore.entries()) {
      if (value.timestamp < tenMinutesAgo) {
        pkceStore.delete(key);
      }
    }

    // Build authorization URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: SMOKEBALL_CONFIG.clientId,
      redirect_uri: SMOKEBALL_CONFIG.redirectUri,
      scope: SMOKEBALL_CONFIG.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: SMOKEBALL_CONFIG.codeChallengeMethod,
    });

    const authorizationUrl = `${SMOKEBALL_CONFIG.authorizationEndpoint}?${authParams.toString()}`;

    console.log('[Smokeball OAuth] 🔗 Redirecting to Smokeball authorization...');

    // Redirect user to Smokeball
    res.redirect(authorizationUrl);

  } catch (error) {
    console.error('[Smokeball OAuth] ❌ Error starting OAuth flow:', error.message);
    res.status(500).json({ error: 'Failed to start OAuth flow', details: error.message });
  }
});

/**
 * GET /api/smokeball/oauth-callback
 * OAuth2 callback endpoint - exchanges code for token
 */
router.get('/oauth-callback', requireSmokeballEnabled, async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error('[Smokeball OAuth] ❌ OAuth error:', error, error_description);
      return res.status(400).json({
        error: 'OAuth authorization failed',
        details: error_description || error,
      });
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing required parameters: code and state',
      });
    }

    console.log('[Smokeball OAuth] ✅ Authorization code received');

    // Retrieve PKCE code verifier
    const pkceData = pkceStore.get(state);

    if (!pkceData) {
      console.error('[Smokeball OAuth] ❌ Invalid state parameter (CSRF check failed)');
      return res.status(400).json({
        error: 'Invalid state parameter. PKCE validation failed.',
      });
    }

    // Remove used PKCE data
    pkceStore.delete(state);

    console.log('[Smokeball OAuth] 🔄 Exchanging authorization code for tokens...');

    // Exchange code for access token
    const tokenData = await smokeballAuth.exchangeCodeForToken(code, pkceData.codeVerifier);

    console.log('[Smokeball OAuth] ✅ OAuth2 flow completed successfully!');

    // Success response
    res.json({
      success: true,
      message: 'Smokeball integration authenticated successfully',
      tokenInfo: {
        tokenType: tokenData.token_type,
        expiresIn: `${Math.floor(tokenData.expires_in / 60)} minutes`,
      },
      nextSteps: [
        'Your application is now connected to Smokeball',
        'You can start using Smokeball API features',
        'Check /api/smokeball/status for authentication status',
      ],
    });

  } catch (error) {
    console.error('[Smokeball OAuth] ❌ Callback error:', error.message);
    res.status(500).json({
      error: 'Failed to complete OAuth flow',
      details: error.message,
    });
  }
});

/**
 * GET /api/smokeball/status
 * Check authentication status
 */
router.get('/status', requireSmokeballEnabled, (req, res) => {
  const status = smokeballAuth.getTokenStatus();

  if (status.authenticated) {
    res.json({
      authenticated: true,
      status,
      message: 'Connected to Smokeball',
    });
  } else {
    res.json({
      authenticated: false,
      message: 'Not connected to Smokeball',
      setupUrl: '/api/smokeball/setup',
    });
  }
});

/**
 * POST /api/smokeball/logout
 * Clear authentication tokens
 */
router.post('/logout', requireSmokeballEnabled, (req, res) => {
  smokeballAuth.clearTokens();

  res.json({
    success: true,
    message: 'Logged out from Smokeball',
    setupUrl: '/api/smokeball/setup',
  });
});

/**
 * GET /api/smokeball/test
 * Test Smokeball API connection by fetching staff members
 */
router.get('/test', requireSmokeballEnabled, async (req, res) => {
  try {
    if (!smokeballAuth.isAuthenticated()) {
      return res.status(401).json({
        error: 'Not authenticated',
        setupUrl: '/api/smokeball/setup',
      });
    }

    const { get } = await import('../integrations/smokeball/client.js');

    console.log('[Smokeball Test] 🧪 Testing API connection...');

    // Simple test: fetch staff members
    const staff = await get('/staff');

    console.log('[Smokeball Test] ✅ API connection successful!');

    res.json({
      success: true,
      message: 'Smokeball API connection working',
      sampleData: {
        staffCount: staff?.length || 0,
        firstStaff: staff?.[0] || null,
      },
    });

  } catch (error) {
    console.error('[Smokeball Test] ❌ API test failed:', error.message);
    res.status(500).json({
      error: 'API test failed',
      details: error.message,
    });
  }
});

export default router;
