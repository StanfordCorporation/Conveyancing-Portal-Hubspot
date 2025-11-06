/**
 * PKCE (Proof Key for Code Exchange) Helpers
 * Implements RFC 7636 for secure OAuth2 authorization
 *
 * PKCE Flow:
 * 1. Generate code_verifier (random string)
 * 2. Create code_challenge from SHA256(code_verifier)
 * 3. Send code_challenge to authorization endpoint
 * 4. Send code_verifier to token endpoint
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically random code verifier
 * Must be 43-128 characters, using [A-Z], [a-z], [0-9], "-", ".", "_", "~"
 *
 * @returns {string} Base64URL-encoded random string (64 bytes = ~86 characters)
 */
export function generateCodeVerifier() {
  const randomBytes = crypto.randomBytes(64);
  return base64URLEncode(randomBytes);
}

/**
 * Generate code challenge from code verifier using SHA-256
 * Challenge = BASE64URL(SHA256(ASCII(code_verifier)))
 *
 * @param {string} codeVerifier - The code verifier string
 * @returns {string} Base64URL-encoded SHA-256 hash
 */
export function generateCodeChallenge(codeVerifier) {
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest();

  return base64URLEncode(hash);
}

/**
 * Base64 URL-safe encoding (RFC 7636)
 * Converts standard Base64 to URL-safe variant:
 * - Replace '+' with '-'
 * - Replace '/' with '_'
 * - Remove '=' padding
 *
 * @param {Buffer} buffer - Buffer to encode
 * @returns {string} URL-safe Base64 string
 */
export function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate both code verifier and challenge
 * Convenience function for PKCE flow initialization
 *
 * @returns {Object} { codeVerifier, codeChallenge }
 */
export function generatePKCEPair() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
  };
}

/**
 * Validate code verifier format (RFC 7636)
 * Must be 43-128 characters long
 * Must only contain [A-Z], [a-z], [0-9], "-", ".", "_", "~"
 *
 * @param {string} codeVerifier - Code verifier to validate
 * @returns {boolean} True if valid
 */
export function isValidCodeVerifier(codeVerifier) {
  if (!codeVerifier || typeof codeVerifier !== 'string') {
    return false;
  }

  const length = codeVerifier.length;
  if (length < 43 || length > 128) {
    return false;
  }

  // Check allowed characters: [A-Za-z0-9-._~]
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(codeVerifier);
}

/**
 * Generate state parameter for OAuth2 flow
 * Prevents CSRF attacks by validating the callback
 *
 * @returns {string} Random state string
 */
export function generateState() {
  const randomBytes = crypto.randomBytes(32);
  return base64URLEncode(randomBytes);
}

// Export for testing
export default {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  isValidCodeVerifier,
  generateState,
  base64URLEncode,
};
