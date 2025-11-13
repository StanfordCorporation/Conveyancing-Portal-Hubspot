# DocuSign JWT Authentication Fix

## Problem
The DocuSign JWT authentication is returning `Authorization: Bearer undefined`, causing a 401 Unauthorized error when trying to create envelopes.

**Error Message:**
```
errorCode: 'AUTHORIZATION_INVALID_TOKEN',
message: 'The access token provided is expired, revoked or malformed.'
```

**Root Cause:**
The access token is not being properly extracted from the JWT response, resulting in `undefined` being passed to the Authorization header.

## Changes Made

### 1. Enhanced JWT Authentication Logging (`backend/src/integrations/docusign/jwtAuth.js`)

Added comprehensive debug logging to identify where the access token is in the response:

- **Response structure logging**: Shows what keys exist in the JWT response
- **Token extraction fallbacks**: Tries multiple possible locations for the access token
- **Validation checks**: Throws clear errors if token is missing
- **Cache verification**: Logs the cached token to ensure it's being stored correctly

### 2. Debug Test Script (`test-jwt-debug.js`)

Created a standalone test script that:
- Shows the exact structure of the JWT response
- Attempts to extract the access token
- Tests the token by calling getUserInfo
- Provides detailed troubleshooting information

## Troubleshooting Steps

### Step 1: Run the Debug Script Locally

```bash
cd backend
node ../test-jwt-debug.js
```

This will show you:
- The exact response structure from DocuSign
- Where the access token is located
- Whether the token is valid

### Step 2: Check Environment Variables

Ensure these environment variables are set correctly on Vercel:

**Required Variables:**
```bash
DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
DOCUSIGN_USER_ID=06f32354-9622-4802-8095-50e5c8f2796f
DOCUSIGN_ACCOUNT_ID=12455259-d3a9-490e-92b7-2942b86c1b79
DOCUSIGN_KEYPAIR_ID=<your-keypair-id>
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

**Production Australia Environment:**
```bash
DOCUSIGN_OAUTH_BASE_PATH=https://account.docusign.com
DOCUSIGN_BASE_PATH=https://au.docusign.net/restapi
```

⚠️ **Important:** Your logs show you're using the production Australia environment, not demo!

### Step 3: Verify Private Key Format

The private key must be in this exact format (with literal `\n` newlines):

```
"-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKC...\n-----END RSA PRIVATE KEY-----"
```

On Vercel, when setting the environment variable:
1. Go to Project Settings > Environment Variables
2. Add `DOCUSIGN_PRIVATE_KEY`
3. Paste the entire key including the header and footer
4. Make sure newlines are preserved (or use `\n`)

### Step 4: Check DocuSign Consent

JWT authentication requires admin consent. Visit this URL to grant consent:

```
https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=34d08817-3cbe-43ea-922f-348ae0dcd358&redirect_uri=https://conveyancing-portal-backend.vercel.app/api/docusign/oauth-callback
```

### Step 5: Deploy and Test

1. Deploy the updated code to Vercel:
   ```bash
   vercel --prod
   ```

2. Try creating a signing session again

3. Check the Vercel logs for the new debug output:
   ```bash
   vercel logs --follow
   ```

Look for these log entries:
- `[DocuSign JWT] Raw results object keys:`
- `[DocuSign JWT] Body keys:`
- `[DocuSign JWT] Access token (first 20 chars):`
- `[DocuSign JWT] Token cached successfully`

## Expected Log Output (Success)

After the fix, you should see:

```
[DocuSign JWT] Requesting JWT User Token...
[DocuSign JWT] ✅ JWT Token received successfully
[DocuSign JWT] Raw results object keys: ['body', 'response', ...]
[DocuSign JWT] Body keys: ['access_token', 'expires_in', 'token_type']
[DocuSign JWT] Access token (first 20 chars): eyJ0eXAiOiJNVCIsImFsZ...
[DocuSign JWT] Expires in: 3600 seconds
[DocuSign JWT] Token cached successfully
[DocuSign JWT] Cached token (first 20 chars): eyJ0eXAiOiJNVCIsImFsZ...
```

## Common Issues

### 1. Private Key Format Issues
**Symptom:** JWT request fails with authentication error
**Solution:** Ensure the private key has proper newlines and includes header/footer

### 2. Wrong Environment
**Symptom:** 401 errors even with valid token
**Solution:** Ensure `DOCUSIGN_OAUTH_BASE_PATH` and `DOCUSIGN_BASE_PATH` match (both demo or both production)

### 3. Missing Consent
**Symptom:** Error: "consent_required"
**Solution:** Visit the consent URL and approve the application

### 4. Wrong Account ID
**Symptom:** 401 or 404 errors
**Solution:** Run the debug script to get the correct account ID from getUserInfo

### 5. Token Caching Issues
**Symptom:** Token works sometimes but not always
**Solution:** The new code includes better token expiration handling

## Testing Checklist

- [ ] Run `test-jwt-debug.js` locally and verify it extracts the token
- [ ] Verify all environment variables are set on Vercel
- [ ] Check that OAuth base path matches your environment (demo vs production)
- [ ] Confirm JWT consent has been granted
- [ ] Deploy updated code to Vercel
- [ ] Monitor Vercel logs during a signing session creation
- [ ] Verify the Authorization header shows `Bearer <token>` not `Bearer undefined`

## Additional Resources

- **DocuSign JWT Guide:** https://developers.docusign.com/platform/auth/jwt/
- **Vercel Environment Variables:** https://vercel.com/docs/environment-variables
- **DocuSign Node.js SDK:** https://github.com/docusign/docusign-esign-node-client

## Need More Help?

If the issue persists after following these steps:

1. Share the output from `test-jwt-debug.js`
2. Share the relevant Vercel logs (with tokens redacted)
3. Verify the DocuSign SDK version: `npm list docusign-esign`

