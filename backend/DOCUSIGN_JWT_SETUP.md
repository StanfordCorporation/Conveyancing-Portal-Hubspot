# DocuSign JWT Authentication Setup

This document explains the JWT (JSON Web Token) authentication implementation for DocuSign integration in the Conveyancing Portal.

## Overview

JWT authentication allows the backend to automatically generate DocuSign access tokens without manual intervention. This is the recommended approach for server-to-server integrations.

## Features

✅ **Automatic Token Generation** - No need to manually provide access tokens  
✅ **Token Caching** - Tokens are cached and automatically refreshed when expired  
✅ **RSA Key-Based Security** - Uses RSA-2048 key pair for secure authentication  
✅ **User Impersonation** - Backend acts on behalf of a specific DocuSign user  
✅ **Production Ready** - Environment variable support for secure key storage

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React App)    │
└────────┬────────┘
         │
         │ POST /api/docusign/create-signing-session
         │ { dealId: "123456" }
         │
         ▼
┌─────────────────────────────────────────────┐
│          Backend API Routes                 │
│  /api/docusign/create-signing-session       │
│  /api/docusign/envelope-status/:id          │
│  /api/docusign/test-jwt                     │
│  /api/docusign/user-info                    │
└────────┬────────────────────────────────────┘
         │
         │ getAccessToken()
         │
         ▼
┌─────────────────────────────────────────────┐
│       JWT Authentication Service            │
│  - Token generation with RSA keys           │
│  - Token caching (1 hour expiry)            │
│  - Automatic token refresh                  │
└────────┬────────────────────────────────────┘
         │
         │ JWT Token Request
         │
         ▼
┌─────────────────────────────────────────────┐
│          DocuSign OAuth API                 │
│  https://account-d.docusign.com/oauth       │
└────────┬────────────────────────────────────┘
         │
         │ Access Token
         │
         ▼
┌─────────────────────────────────────────────┐
│        DocuSign eSignature API              │
│  - Create envelopes                         │
│  - Get envelope status                      │
│  - Generate signing URLs                    │
└─────────────────────────────────────────────┘
```

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── docusign.js              # DocuSign configuration (includes RSA keys)
│   ├── integrations/
│   │   └── docusign/
│   │       ├── jwtAuth.js           # JWT authentication service (NEW)
│   │       └── client.js            # DocuSign API client (updated for JWT)
│   └── routes/
│       └── docusign.js              # DocuSign API routes (updated for JWT)
├── test-jwt-auth.js                 # Test script for JWT authentication
└── DOCUSIGN_JWT_SETUP.md           # This file
```

## Configuration

### RSA Keys

The RSA key pair is stored in `backend/src/config/docusign.js`:

- **Keypair ID**: `69fb5ec8-a1e3-4b06-bdd4-0fb5c154a800`
- **Private Key**: Embedded in config (for demo) or via `DOCUSIGN_PRIVATE_KEY` env var
- **Public Key**: Stored for reference (not used in JWT flow)

### Environment Variables

For production, store credentials as environment variables:

```bash
# DocuSign Credentials
DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
DOCUSIGN_USER_ID=9bdab216-34d5-4f33-ab31-a72f850fde78
DOCUSIGN_ACCOUNT_ID=af8995ad-b134-4144-acc0-5ca58db8f759

# OAuth Paths
DOCUSIGN_OAUTH_BASE_PATH=https://account-d.docusign.com
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi

# RSA Keys (Production)
DOCUSIGN_KEYPAIR_ID=69fb5ec8-a1e3-4b06-bdd4-0fb5c154a800
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAuwa6rRXGRtik...
-----END RSA PRIVATE KEY-----"
```

## JWT Authentication Flow

### 1. Initial Setup (One-Time)

Before using JWT authentication, you must grant consent:

1. **Generate Consent URL**:
   ```
   https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=34d08817-3cbe-43ea-922f-348ae0dcd358&redirect_uri=http://localhost:3001/api/docusign/oauth-callback
   ```

2. **Visit URL in Browser** - Login to DocuSign and grant consent

3. **Redirect** - You'll be redirected to the callback URL with a code

4. **Consent Granted** - JWT authentication is now enabled

### 2. Runtime Authentication

```javascript
// The JWT service handles everything automatically:

import { getAccessToken } from './src/integrations/docusign/jwtAuth.js';

// Get a valid access token (cached if available)
const accessToken = await getAccessToken();

// Use token with DocuSign API
// Token is automatically refreshed when expired
```

### 3. Token Lifecycle

```
┌─────────────────┐
│  Request Token  │
└────────┬────────┘
         │
         ▼
    ┌─────────┐     Yes    ┌─────────────────┐
    │ Cached? │────────────>│ Return Cached   │
    └────┬────┘             └─────────────────┘
         │ No
         ▼
┌──────────────────┐
│ Request from API │
│  (RSA Signature) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Cache Token     │
│ (Expires: 1 hr)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Return Token    │
└──────────────────┘
```

## API Endpoints

### Test JWT Authentication
```http
GET /api/docusign/test-jwt
```

Runs comprehensive JWT authentication tests.

**Response:**
```json
{
  "success": true,
  "message": "JWT authentication working correctly",
  "data": {
    "token": { ... },
    "userInfo": { ... }
  }
}
```

### Get User Info
```http
GET /api/docusign/user-info
```

Retrieves DocuSign user information (name, email, accounts).

### Refresh Token
```http
POST /api/docusign/refresh-token
```

Forces a token refresh (bypasses cache).

### Create Signing Session (Updated)
```http
POST /api/docusign/create-signing-session
Content-Type: application/json

{
  "dealId": "12345"
}
```

**Note**: No longer requires `accessToken` in the request body - JWT handles it automatically!

### Get Envelope Status (Updated)
```http
GET /api/docusign/envelope-status/:envelopeId
```

**Note**: No longer requires `accessToken` query parameter - JWT handles it automatically!

## Testing

### Command-Line Test

Run the comprehensive test suite:

```bash
cd backend
node test-jwt-auth.js
```

**Test Coverage:**
1. ✅ JWT Token Generation
2. ✅ Token Caching
3. ✅ User Info Retrieval
4. ✅ API Client Creation
5. ✅ Token Refresh

**Sample Output:**
```
================================================================================
  DocuSign JWT Authentication Test Suite
================================================================================

ℹ️  Configuration:
   Integration Key: 34d08817-3cbe-43ea-922f-348ae0dcd358
   User ID: 9bdab216-34d5-4f33-ab31-a72f850fde78
   Account ID: af8995ad-b134-4144-acc0-5ca58db8f759
   ...

================================================================================
  Test 1: JWT Token Generation
================================================================================

ℹ️  Requesting JWT token from DocuSign...
✅ JWT token generated successfully
   Token (first 30 chars): eyJ0eXAiOiJKV1QiLCJhbGciOiJS...
   Token length: 1247 characters

...

🎉 ALL TESTS PASSED! (5/5)
✅ DocuSign JWT authentication is configured correctly!
✅ You can now use JWT authentication in your application.
```

### API Endpoint Test

Test via the API:

```bash
# Test JWT authentication
curl http://localhost:3001/api/docusign/test-jwt

# Get user info
curl http://localhost:3001/api/docusign/user-info

# Force token refresh
curl -X POST http://localhost:3001/api/docusign/refresh-token
```

## Usage Examples

### Frontend (React)

The frontend **no longer needs** to handle access tokens:

```javascript
// Old way (manual token required)
const response = await fetch('/api/docusign/create-signing-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealId: '12345',
    accessToken: 'manually-generated-token'  // ❌ No longer needed!
  })
});

// New way (JWT automatic)
const response = await fetch('/api/docusign/create-signing-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealId: '12345'  // ✅ That's it!
  })
});
```

### Backend (Node.js)

```javascript
import { getAccessToken, getAuthenticatedClient } from './src/integrations/docusign/jwtAuth.js';

// Method 1: Get access token
const token = await getAccessToken();
console.log('Token:', token);

// Method 2: Get authenticated API client
const apiClient = await getAuthenticatedClient();
const envelopesApi = new docusign.EnvelopesApi(apiClient);

// Use API normally
const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);
```

## Security Best Practices

### Development
- ✅ RSA keys are embedded in config for easy testing
- ✅ All credentials in code are for **demo environment only**

### Production
- ⚠️ **NEVER commit private keys to git**
- ✅ Store keys in environment variables
- ✅ Use secret management (AWS Secrets Manager, Azure Key Vault, etc.)
- ✅ Rotate keys periodically
- ✅ Use production OAuth base path: `https://account.docusign.com`
- ✅ Use production API base path: `https://www.docusign.net/restapi`

### Example Production Setup

```javascript
// .env file
DOCUSIGN_PRIVATE_KEY_PATH=/secure/path/to/private.key

// config/docusign.js
import fs from 'fs';

const privateKey = process.env.DOCUSIGN_PRIVATE_KEY 
  || fs.readFileSync(process.env.DOCUSIGN_PRIVATE_KEY_PATH, 'utf8');
```

## Troubleshooting

### Error: `consent_required`

**Problem**: The application hasn't been granted consent.

**Solution**: 
1. Visit the consent URL (see "Initial Setup" section)
2. Login and grant consent
3. Run test again

### Error: `invalid_grant`

**Problem**: User credentials or integration key is incorrect.

**Solution**:
1. Verify `DOCUSIGN_INTEGRATION_KEY` in config
2. Verify `DOCUSIGN_USER_ID` in config
3. Ensure RSA keypair ID matches the one in DocuSign Admin

### Error: `account_not_found`

**Problem**: Account ID doesn't match the user's account.

**Solution**:
1. Run: `GET /api/docusign/user-info`
2. Use the account ID from the response
3. Update `DOCUSIGN_ACCOUNT_ID` in config

### Token Caching Issues

**Problem**: Token cache not working as expected.

**Solution**:
```javascript
import { clearTokenCache } from './src/integrations/docusign/jwtAuth.js';

// Clear cache manually
clearTokenCache();

// Get fresh token
const newToken = await getAccessToken(true);
```

## Key Improvements Over Manual Tokens

| Feature | Manual Tokens | JWT Authentication |
|---------|--------------|-------------------|
| **Setup** | Generate token manually in DocuSign Admin | One-time consent, then automatic |
| **Expiration** | Manual refresh required | Automatic refresh |
| **Security** | Token stored in frontend/requests | Token generated on backend only |
| **User Experience** | Frontend must handle token management | Frontend just calls API |
| **Token Lifetime** | Varies (often 8 hours) | 1 hour (with auto-refresh) |
| **Error Handling** | Manual retry logic needed | Built-in retry with cache |

## Next Steps

1. ✅ **Grant Consent** - Visit consent URL and authorize application
2. ✅ **Run Tests** - Execute `node test-jwt-auth.js`
3. ✅ **Update Frontend** - Remove manual token handling
4. ✅ **Test Integration** - Create test signing session
5. ✅ **Production** - Move keys to environment variables

## References

- [DocuSign JWT Authentication Guide](https://developers.docusign.com/platform/auth/jwt/)
- [DocuSign Node.js SDK](https://github.com/docusign/docusign-node-client)
- [OAuth 2.0 JWT Bearer Flow](https://datatracker.ietf.org/doc/html/rfc7523)

## Support

For issues or questions:
- Check the troubleshooting section above
- Run `node test-jwt-auth.js` for diagnostic information
- Review DocuSign API logs in the admin console
- Contact: [support contact]

---

**Last Updated**: October 31, 2025  
**Version**: 1.0.0  
**Environment**: Demo (account-d.docusign.com)

