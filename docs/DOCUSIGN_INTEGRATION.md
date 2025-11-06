# DocuSign Embedded Signing Integration - Complete Guide

## Overview

Successfully integrated DocuSign embedded signing for **Step 4: Document Signature** in the Client Dashboard. Clients can now sign property disclosure forms directly within the portal using DocuSign's focused view.

## User Flow

1. **Step 1**: Property Selection & Information
2. **Step 2**: Questionnaire (Sections 1-5)
3. **Step 3**: Dynamic Quote
4. **Step 4**: Document Signature (NEW! DocuSign Embedded Signing) ✅
5. **Step 5**: Payment

## Implementation Details

### Backend Components

#### 1. DocuSign SDK Installation
```bash
npm install docusign-esign
```

#### 2. Configuration File
**File:** `backend/src/config/docusign.js`

Contains DocuSign credentials:
- Integration Key: `34d08817-3cbe-43ea-922f-348ae0dcd358`
- User ID: `9bdab216-34d5-4f33-ab31-a72f850fde78`
- Account ID: `af8995ad-b134-4144-acc0-5ca58db8f759`
- Base Path: `https://demo.docusign.net/restapi` (Demo environment)

**⚠️ IMPORTANT:** Move these to environment variables in production!

#### 3. DocuSign Integration Service
**File:** `backend/src/integrations/docusign/client.js`

**Functions:**
- `createEmbeddedSigningSession(params)` - Creates envelope and returns signing URL
- `getEnvelopeStatus(accessToken, envelopeId)` - Gets envelope status
- `getDocuSignClient(accessToken)` - Returns configured API client

**Key Features:**
- Supports embedded signing (focused view)
- Anchor-based signature fields (`/sn1/` in PDF)
- Configurable return URLs
- Session keep-alive with ping URLs

#### 4. DocuSign Routes
**File:** `backend/src/routes/docusign.js`

**Endpoints:**

1. **POST /api/docusign/create-signing-session**
   - Creates embedded signing session for a deal
   - Fetches signer details from HubSpot
   - Returns signing URL and envelope ID

   **Request:**
   ```json
   {
     "dealId": "123456789",
     "accessToken": "your-docusign-access-token"
   }
   ```

   **Response:**
   ```json
   {
     "success": true,
     "dealId": "123456789",
     "envelopeId": "abc-123-def-456",
     "redirectUrl": "https://demo.docusign.net/Signing/...",
     "signerName": "John Doe",
     "signerEmail": "john@example.com"
   }
   ```

2. **GET /api/docusign/envelope-status/:envelopeId**
   - Get envelope status
   - Query param: `accessToken`

3. **POST /api/docusign/ping**
   - Keep-alive endpoint for embedded signing sessions

#### 5. Server Registration
**File:** `backend/src/server.js` (line 114)
```javascript
app.use('/api/docusign', docusignRoutes);
```

### Frontend Components

#### 1. EmbeddedSigning Component
**File:** `frontend/client-portal/src/components/dashboard/EmbeddedSigning.jsx`

Displays DocuSign iframe with embedded signing session.

**Props:**
- `dealId` - HubSpot deal ID
- `docusignAccessToken` - DocuSign access token
- `onComplete` - Callback when signing is complete

**Features:**
- Creates signing session via API
- Displays iframe with DocuSign focused view
- Listens for signing completion events
- Shows loading and error states

#### 2. DocuSignAccessTokenWrapper Component
**File:** `frontend/client-portal/src/components/dashboard/DocuSignAccessTokenWrapper.jsx`

Manages DocuSign access token and wraps EmbeddedSigning component.

**Features:**
- Token input UI with instructions
- Stores token in localStorage
- Token management (save/clear)
- Renders EmbeddedSigning when token is set

#### 3. ClientDashboard Integration
**File:** `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx` (lines 512-528)

Added signature section as Step 4:
```jsx
{activeSection === 'signature' && (
  <section id="signature" className="content-section active">
    <div className="content-header">
      <h1 className="content-title">Sign Your Documents</h1>
      <p className="content-subtitle">Review and electronically sign your property disclosure forms</p>
    </div>
    <div className="content-card">
      {currentProperty && currentProperty.id ? (
        <DocuSignAccessTokenWrapper dealId={currentProperty.id} />
      ) : (
        <div className="empty-state">
          <p>Select a property to proceed with document signing</p>
        </div>
      )}
    </div>
  </section>
)}
```

### Styling

**Files Created:**
- `embedded-signing.css` - Iframe and signing UI styles
- `docusign-wrapper.css` - Token setup and status bar styles

## How It Works

### 1. User Navigates to Step 4 (Signature)

User clicks "Step 4: Awaiting Signature" in the sidebar.

### 2. Token Setup (First Time Only)

If no DocuSign access token is stored:
- Shows token input screen with instructions
- User generates token from DocuSign Admin Console
- User enters token and clicks "Save Token & Continue"
- Token stored in localStorage

### 3. Creating Signing Session

Frontend calls backend:
```javascript
POST /api/docusign/create-signing-session
{
  dealId: "123456789",
  accessToken: "eyJ..."
}
```

Backend:
1. Fetches deal from HubSpot
2. Gets contact details (signer email/name)
3. Loads PDF document (currently sample PDF)
4. Creates DocuSign envelope with document
5. Generates embedded signing URL
6. Returns URL to frontend

### 4. Displaying DocuSign Iframe

Frontend receives signing URL and displays it in an iframe:
```jsx
<iframe
  src={signingUrl}
  className="signing-iframe"
  title="DocuSign Embedded Signing"
  frameBorder="0"
  allow="camera; microphone"
/>
```

### 5. User Signs Document

1. User reviews document in iframe
2. Clicks signature field
3. Places signature using DocuSign UI
4. Clicks "Finish" in DocuSign

### 6. Signing Completion

DocuSign sends message event to parent window:
```javascript
window.addEventListener('message', (event) => {
  if (event.data === 'signing_complete') {
    // Document signed successfully!
    onComplete(envelopeId);
  }
});
```

## Setup Instructions

### Step 1: DocuSign Account Setup

1. **Create DocuSign Developer Account**
   - Go to https://developers.docusign.com/
   - Sign up for a free developer account

2. **Create Integration**
   - Go to Settings → Apps and Keys
   - Click "Add App and Integration Key"
   - Note the Integration Key (already provided)

3. **Get User ID**
   - In Apps and Keys, find "API Username" (GUID)
   - Note the User ID (already provided)

### Step 2: Generate Access Token

For development/testing, manually generate access token:

1. Go to https://admindemo.docusign.com/
2. Login with your DocuSign account
3. Settings → API and Keys
4. Under "Service Integration", click "Generate Token"
5. Copy the token (valid for 8 hours)

### Step 3: Prepare PDF Document

Create a PDF with signature field markers:

1. Add text `/sn1/` where you want signature to appear
2. Or use absolute positioning (coordinates) in code
3. Save PDF to `backend/src/documents/sample-disclosure.pdf`

**Example PDF marker:**
```
Property Disclosure Form

I hereby certify that the information provided is true and accurate.

Signature: /sn1/
Date: __________
```

### Step 4: Test the Integration

1. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend:**
   ```bash
   cd frontend/client-portal
   npm run dev
   ```

3. **Navigate to Dashboard:**
   - Login as a client
   - Select a property
   - Click "Step 4: Awaiting Signature"

4. **Enter Access Token:**
   - Paste your DocuSign access token
   - Click "Save Token & Continue"

5. **Sign Document:**
   - DocuSign iframe loads
   - Click signature field
   - Place signature
   - Click "Finish"

## Important Notes

### Security Considerations

⚠️ **Current Implementation (Development Only):**
- Access token stored in localStorage
- Manual token entry required
- Token expires after 8 hours

✅ **Production Implementation Required:**
- Implement OAuth 2.0 Authorization Code Grant flow
- Store tokens securely on backend
- Auto-refresh tokens before expiration
- Use JWT authentication

### OAuth 2.0 Flow (Production)

1. User clicks "Sign Document"
2. Redirect to DocuSign OAuth consent screen
3. User authorizes application
4. DocuSign redirects back with authorization code
5. Backend exchanges code for access token
6. Store token securely (encrypted database)
7. Use token for API calls

**OAuth Endpoint:**
```javascript
router.get('/oauth-callback', (req, res) => {
  const authCode = req.query.code;
  // Exchange code for access token
  // Store token securely
  // Redirect user to signing page
});
```

### PDF Document Management

**Current:** Uses sample PDF from `backend/src/documents/sample-disclosure.pdf`

**Production TODO:**
1. Generate PDFs dynamically from questionnaire answers
2. Pre-fill property details in PDF
3. Store signed documents in HubSpot Files
4. Link signed documents to deal record

### Signature Field Positioning

**Anchor-based (Recommended):**
```javascript
signHere: {
  anchorString: '/sn1/',
  anchorYOffset: '10',
  anchorUnits: 'pixels',
  anchorXOffset: '20'
}
```

**Absolute positioning:**
```javascript
signHere: {
  documentId: '1',
  pageNumber: '1',
  xPosition: '100',
  yPosition: '200'
}
```

## API Reference

### Backend Endpoints

#### POST /api/docusign/create-signing-session

Creates embedded signing session.

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| dealId | string | Yes | HubSpot deal ID |
| accessToken | string | Yes | DocuSign access token |

**Response:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation status |
| dealId | string | HubSpot deal ID |
| envelopeId | string | DocuSign envelope ID |
| redirectUrl | string | Embedded signing URL |
| signerName | string | Signer's full name |
| signerEmail | string | Signer's email |

#### GET /api/docusign/envelope-status/:envelopeId

Get envelope status.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| accessToken | string | Yes |

**Response:**
| Field | Type | Description |
|-------|------|-------------|
| envelopeId | string | Envelope ID |
| status | string | sent, delivered, completed, declined, voided |
| createdDateTime | string | ISO timestamp |
| sentDateTime | string | ISO timestamp |
| completedDateTime | string | ISO timestamp (null if not completed) |

## Files Created

### Backend
1. `backend/src/config/docusign.js` - DocuSign configuration
2. `backend/src/integrations/docusign/client.js` - DocuSign integration service
3. `backend/src/routes/docusign.js` - DocuSign API endpoints

### Frontend
1. `frontend/client-portal/src/components/dashboard/EmbeddedSigning.jsx` - Iframe component
2. `frontend/client-portal/src/components/dashboard/embedded-signing.css` - Iframe styles
3. `frontend/client-portal/src/components/dashboard/DocuSignAccessTokenWrapper.jsx` - Token wrapper
4. `frontend/client-portal/src/components/dashboard/docusign-wrapper.css` - Wrapper styles

### Documentation
1. `DOCUSIGN_INTEGRATION.md` - This file

## Files Modified

1. `backend/src/server.js` - Added DocuSign routes
2. `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx` - Added signature section
3. `backend/package.json` - Added docusign-esign dependency

## Environment Variables

Add to `.env` file in production:

```env
# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
DOCUSIGN_USER_ID=9bdab216-34d5-4f33-ab31-a72f850fde78
DOCUSIGN_ACCOUNT_ID=af8995ad-b134-4144-acc0-5ca58db8f759
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_OAUTH_BASE_PATH=https://account-d.docusign.com
DOCUSIGN_PRIVATE_KEY_PATH=./private.key
DOCUSIGN_RETURN_URL=http://localhost:3000/client/dashboard?signing=complete
DOCUSIGN_PING_URL=http://localhost:3001/api/docusign/ping
```

## Next Steps (Production Readiness)

### High Priority
1. **Implement OAuth 2.0 Flow**
   - Authorization Code Grant
   - Token refresh mechanism
   - Secure token storage

2. **Create Sample PDF Document**
   - Add signature markers (`/sn1/`)
   - Save to `backend/src/documents/`

3. **Dynamic PDF Generation**
   - Generate PDFs from questionnaire data
   - Pre-fill property information
   - Multiple signature fields if needed

### Medium Priority
4. **Store Signed Documents**
   - Upload to HubSpot Files
   - Link to deal record
   - Update deal stage on completion

5. **Error Handling**
   - Token expiration handling
   - Network failure retry
   - User-friendly error messages

6. **Webhook Integration**
   - Receive envelope status updates
   - Auto-progress to next step
   - Send email notifications

### Low Priority
7. **Multi-Signer Support**
   - Support multiple signers per envelope
   - Sequential signing order
   - Carbon copy recipients

8. **Template Support**
   - Use DocuSign templates
   - Dynamic field mapping
   - Reusable documents

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] DocuSign routes registered correctly
- [ ] Frontend compiles without errors
- [ ] Token input screen displays properly
- [ ] Token saves to localStorage
- [ ] Signing session API call succeeds
- [ ] DocuSign iframe loads correctly
- [ ] Signature field appears in document
- [ ] User can place signature
- [ ] Signing completion event received
- [ ] onComplete callback fires
- [ ] Token can be changed/cleared

## Troubleshooting

### Issue: "Failed to create signing session"
**Solution:** Check that:
- Access token is valid (not expired)
- Integration Key matches DocuSign account
- Account ID is correct
- PDF document exists at specified path

### Issue: Iframe doesn't load
**Solution:**
- Check browser console for CORS errors
- Verify `frameAncestors` in config includes your domain
- Ensure access token has correct permissions

### Issue: Signature field not visible
**Solution:**
- Check PDF contains anchor text `/sn1/`
- Or switch to absolute positioning
- Verify document uploaded correctly

### Issue: Token expires too quickly
**Solution:**
- Implement OAuth flow (tokens last longer)
- Implement token refresh mechanism
- Use JWT authentication for better token management

## Status

✅ **Backend**: DocuSign integration service and endpoints created
✅ **Frontend**: Embedded signing components created and integrated
✅ **Step 4**: Signature section added to ClientDashboard
⚠️ **Testing**: Requires access token and sample PDF document
🔴 **Production**: OAuth 2.0 flow needs implementation

## Support Resources

- [DocuSign Developer Center](https://developers.docusign.com/)
- [DocuSign eSignature API](https://developers.docusign.com/docs/esign-rest-api/)
- [Embedded Signing Guide](https://developers.docusign.com/docs/esign-rest-api/how-to/request-signature-in-app-embedded/)
- [Node.js SDK Docs](https://github.com/docusign/docusign-esign-node-client)
