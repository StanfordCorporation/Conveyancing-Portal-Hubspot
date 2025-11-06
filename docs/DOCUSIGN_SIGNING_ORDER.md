# DocuSign Signing Order Implementation

## Overview

This document describes the **signing order flow** implementation for DocuSign in the Conveyancing Portal. The feature enables **multiple signers** to sign documents in a specific sequence using DocuSign's routing order functionality.

### Key Features

✅ **Multiple Signers** - Support for primary seller + additional sellers
✅ **Sequential Signing** - Routing order ensures signers sign in sequence (1, 2, 3, etc.)
✅ **Embedded Signing** - All signers use embedded signing (iframe/new tab)
✅ **Automatic Signer Detection** - Extracts sellers from HubSpot deal associations
✅ **JWT Authentication** - Automatic token management via JWT
✅ **Flexible API** - Supports both single and multiple signer workflows

---

## Architecture

### Template Configuration

**Template ID**: `10e6d4c1-196d-4751-8f6e-f77f8b271c1a`

**Template Roles** (must match exactly):
- `Client 1` - Primary seller (routingOrder: 1)
- `Client 2` - Additional seller (routingOrder: 2)
- `Client 3` - Additional seller (routingOrder: 3)
- And so on...

**Routing Order**:
- Primary seller signs first (routingOrder: "1")
- Additional sellers sign in sequence (routingOrder: "2", "3", etc.)
- DocuSign prevents out-of-order signing

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Frontend calls /api/docusign/create-signing-session │
│     Body: { dealId: "12345" }                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. Backend fetches all contacts associated with deal    │
│     - Filters out agents (contact_type != "agent")      │
│     - Validates all sellers have emails                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. Backend builds signers array with routing order      │
│     [                                                    │
│       { name: "John Doe", routingOrder: 1, role: "Client 1" },  │
│       { name: "Jane Doe", routingOrder: 2, role: "Client 2" }   │
│     ]                                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. Backend creates DocuSign envelope with template      │
│     - Template ID: 10e6d4c1-196d-4751-8f6e-f77f8b271c1a │
│     - Multiple TemplateRoles with routingOrder          │
│     - Status: "sent" (envelope is active)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  5. Backend generates signing URL for first signer       │
│     - Uses createRecipientView() API                    │
│     - Returns embedded signing URL                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  6. Frontend displays embedded signing for Signer 1      │
│     - Signer 1 completes signing                        │
│     - DocuSign automatically notifies Signer 2          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  7. Signer 2 calls /api/docusign/get-signing-url         │
│     Body: { envelopeId: "...", contactId: "..." }       │
│     - Returns signing URL for Signer 2                  │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Create Signing Session (Multiple Signers)

**Endpoint**: `POST /api/docusign/create-signing-session`

**Description**: Creates a new DocuSign envelope with multiple signers and routing order. Returns envelope ID and signing URL for the first signer.

**Request Body**:
```json
{
  "dealId": "168359414202",
  "contactId": "123456789" // Optional - if provided, returns URL for this contact
}
```

**Response** (Success):
```json
{
  "success": true,
  "dealId": "168359414202",
  "envelopeId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "redirectUrl": "https://demo.docusign.net/Signing/MTRedeem/...",
  "signers": [
    {
      "contactId": "123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "routingOrder": 1,
      "roleName": "Client 1"
    },
    {
      "contactId": "987654321",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "routingOrder": 2,
      "roleName": "Client 2"
    }
  ],
  "currentSigner": {
    "contactId": "123456789",
    "name": "John Doe",
    "email": "john@example.com",
    "routingOrder": 1
  }
}
```

**Response** (Error - No contacts):
```json
{
  "error": "No contact associated",
  "message": "This deal has no associated contact for signing. Please associate a contact with this deal in HubSpot."
}
```

**Response** (Error - Missing email):
```json
{
  "error": "Contact missing email",
  "message": "Contact John Doe does not have an email address."
}
```

**Backend Logic**:
1. Fetch all contacts associated with the deal
2. Filter out agents (only include contacts with `contact_type != "agent"`)
3. Validate all sellers have email addresses
4. Build signers array with routing order (index + 1)
5. Create envelope with template `10e6d4c1-196d-4751-8f6e-f77f8b271c1a`
6. Generate signing URL for first signer (or specified contactId)
7. Return envelope info and all signers

---

### 2. Get Signing URL for Specific Recipient

**Endpoint**: `POST /api/docusign/get-signing-url`

**Description**: Generates a signing URL for a specific recipient on an existing envelope. Used when the second (or subsequent) signer needs to sign after the previous signer completes.

**Request Body**:
```json
{
  "envelopeId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "contactId": "987654321"
}
```

**Response** (Success):
```json
{
  "success": true,
  "envelopeId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "contactId": "987654321",
  "recipientName": "Jane Doe",
  "recipientEmail": "jane@example.com",
  "signingUrl": "https://demo.docusign.net/Signing/MTRedeem/..."
}
```

**Response** (Error):
```json
{
  "error": "Contact not found",
  "message": "No contact found with ID: 987654321"
}
```

**Backend Logic**:
1. Fetch contact details from HubSpot
2. Validate contact has email
3. Call DocuSign `createRecipientView()` API with:
   - `envelopeId` - existing envelope
   - `recipientEmail` - contact's email
   - `recipientName` - contact's full name
   - `clientUserId` - contact ID (for embedded signing)
4. Return signing URL

**Important**: This endpoint works only if:
- The envelope exists and is in "sent" status
- The recipient is included in the envelope's signers
- The recipient's routing order allows them to sign now

---

### 3. Get Envelope Status

**Endpoint**: `GET /api/docusign/envelope-status/:envelopeId`

**Description**: Get the current status of an envelope (completed, sent, etc.)

**Response**:
```json
{
  "success": true,
  "envelope": {
    "envelopeId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "status": "completed",
    "createdDateTime": "2025-10-31T10:00:00.000Z",
    "sentDateTime": "2025-10-31T10:00:00.000Z",
    "completedDateTime": "2025-10-31T11:00:00.000Z"
  }
}
```

---

## Frontend Integration

### Example: Initiating Signing for Multiple Sellers

```javascript
// Step 1: Create signing session
const createSigningSession = async (dealId) => {
  const response = await fetch('/api/docusign/create-signing-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealId })
  });

  const data = await response.json();

  if (!data.success) {
    console.error('Error:', data.message);
    return;
  }

  // Store envelope ID for later use
  const envelopeId = data.envelopeId;
  const signers = data.signers;

  console.log(`Envelope created with ${signers.length} signer(s)`);
  signers.forEach((signer, idx) => {
    console.log(`  ${idx + 1}. ${signer.name} (Order: ${signer.routingOrder})`);
  });

  // Open signing URL for first signer
  window.open(data.redirectUrl, '_blank');

  return { envelopeId, signers };
};

// Usage
const { envelopeId, signers } = await createSigningSession('168359414202');
```

### Example: Getting Signing URL for Second Signer

```javascript
// Step 2: Get signing URL for second signer
const getSigningUrlForSigner = async (envelopeId, contactId) => {
  const response = await fetch('/api/docusign/get-signing-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ envelopeId, contactId })
  });

  const data = await response.json();

  if (!data.success) {
    console.error('Error:', data.message);
    return;
  }

  console.log(`Signing URL for ${data.recipientName}: ${data.signingUrl}`);

  // Open signing URL
  window.open(data.signingUrl, '_blank');

  return data.signingUrl;
};

// Usage (after first signer completes)
await getSigningUrlForSigner(envelopeId, signers[1].contactId);
```

### Example: Checking Envelope Status

```javascript
// Step 3: Check envelope status
const checkEnvelopeStatus = async (envelopeId) => {
  const response = await fetch(`/api/docusign/envelope-status/${envelopeId}`);
  const data = await response.json();

  console.log(`Envelope status: ${data.envelope.status}`);

  return data.envelope;
};

// Usage
const status = await checkEnvelopeStatus(envelopeId);
if (status.status === 'completed') {
  console.log('All signers have completed signing!');
}
```

---

## Backend Implementation Details

### File: `backend/src/config/docusign.js`

**Updated**:
```javascript
// Template ID for Property Disclosure Form (multiple signers with routing order)
templateId: process.env.DOCUSIGN_TEMPLATE_ID || '10e6d4c1-196d-4751-8f6e-f77f8b271c1a'
```

### File: `backend/src/integrations/docusign/client.js`

**New Function**: `getRecipientSigningUrl(params)`
- Gets signing URL for a specific recipient on an existing envelope
- Supports JWT authentication
- Returns embedded signing URL

**Updated Function**: `makeEnvelopeFromTemplate(args)`
- Now supports both single signer (legacy) and multiple signers (new)
- Accepts `signers` array with routing order
- Each signer has: `email`, `name`, `clientUserId`, `roleName`, `routingOrder`
- Maps signers to DocuSign `TemplateRole` objects

**Updated Function**: `createEmbeddedSigningSession(params)`
- Now accepts `signers` array parameter
- Backward compatible with single signer flow
- Passes signers to `makeEnvelopeFromTemplate()`

### File: `backend/src/routes/docusign.js`

**Updated Endpoint**: `POST /api/docusign/create-signing-session`
- Fetches all contacts associated with deal
- Filters out agents (only includes sellers)
- Validates all sellers have emails
- Builds signers array with routing order
- Creates envelope with multiple signers
- Returns all signers and signing URL

**New Endpoint**: `POST /api/docusign/get-signing-url`
- Fetches contact details from HubSpot
- Generates signing URL for specific recipient
- Returns signing URL for embedding

---

## Signer Detection Logic

### How Signers are Identified

```javascript
// 1. Fetch all contacts associated with deal
const dealContacts = await getDealContacts(dealId);

// 2. Filter out agents (only include sellers)
const sellerContacts = dealContacts.filter(contact => {
  const contactType = contact.properties.contact_type || '';
  return contactType.toLowerCase() !== 'agent';
});

// 3. Build signers array with routing order
const signers = sellerContacts.map((contact, index) => {
  const routingOrder = index + 1; // Primary = 1, Additional = 2, 3, etc.
  const roleName = `Client ${routingOrder}`; // "Client 1", "Client 2", etc.

  return {
    email: contact.properties.email,
    name: `${contact.properties.firstname} ${contact.properties.lastname}`.trim(),
    clientUserId: contact.id,
    roleName,
    routingOrder,
    contactId: contact.id
  };
});
```

### Example Mapping

| Contact | Contact Type | HubSpot ID | Routing Order | Role Name | Signer? |
|---------|-------------|-----------|---------------|-----------|---------|
| John Doe | (not set) | 123456789 | 1 | Client 1 | ✅ Yes |
| Jane Doe | (not set) | 987654321 | 2 | Client 2 | ✅ Yes |
| Bob Agent | agent | 555555555 | - | - | ❌ No (filtered out) |

---

## Testing Guide

### Test Case 1: Single Signer

**Setup**:
- Deal with 1 associated contact (seller)
- Contact has email

**Steps**:
1. Call `POST /api/docusign/create-signing-session` with `dealId`
2. Verify response contains:
   - `envelopeId`
   - `redirectUrl`
   - `signers` array with 1 signer
   - `signers[0].routingOrder === 1`
   - `signers[0].roleName === "Client 1"`
3. Open `redirectUrl` in browser
4. Complete signing
5. Verify envelope status is "completed"

### Test Case 2: Multiple Signers (Primary + Additional)

**Setup**:
- Deal with 2 associated contacts (sellers)
- Both contacts have emails
- No contacts with `contact_type = "agent"`

**Steps**:
1. Call `POST /api/docusign/create-signing-session` with `dealId`
2. Verify response contains:
   - `envelopeId`
   - `redirectUrl` (for first signer)
   - `signers` array with 2 signers
   - `signers[0].routingOrder === 1`, `roleName === "Client 1"`
   - `signers[1].routingOrder === 2`, `roleName === "Client 2"`
3. Open `redirectUrl` for first signer
4. Complete signing as first signer
5. Call `POST /api/docusign/get-signing-url` with `envelopeId` and `signers[1].contactId`
6. Verify response contains `signingUrl`
7. Open `signingUrl` for second signer
8. Complete signing as second signer
9. Verify envelope status is "completed"

### Test Case 3: Agent Filtering

**Setup**:
- Deal with 3 associated contacts:
  - Contact 1: `contact_type = null` (seller)
  - Contact 2: `contact_type = "agent"` (agent)
  - Contact 3: `contact_type = null` (seller)

**Steps**:
1. Call `POST /api/docusign/create-signing-session` with `dealId`
2. Verify response contains:
   - `signers` array with **2 signers** (not 3)
   - Agent is not included in signers
   - `signers[0].routingOrder === 1` (Contact 1)
   - `signers[1].routingOrder === 2` (Contact 3)

### Test Case 4: Missing Email

**Setup**:
- Deal with 2 associated contacts
- Contact 1 has email
- Contact 2 does NOT have email

**Steps**:
1. Call `POST /api/docusign/create-signing-session` with `dealId`
2. Verify response is **error**:
   - `error: "Contact missing email"`
   - `message: "Contact [name] does not have an email address."`

### Test Case 5: Out of Order Signing (DocuSign blocks this)

**Setup**:
- Deal with 2 signers (routing order 1, 2)

**Steps**:
1. Create envelope
2. Try to get signing URL for second signer BEFORE first signer completes
3. DocuSign should return error or redirect to "waiting" page
4. First signer completes signing
5. Now second signer can access signing URL successfully

---

## Routing Order Behavior

### How DocuSign Enforces Routing Order

| Routing Order | When Can Sign | Notes |
|--------------|--------------|-------|
| 1 | Immediately after envelope is sent | Primary signer |
| 2 | After signer 1 completes | Receives email notification |
| 3 | After signer 2 completes | Receives email notification |

### Important Notes

- **Signer 2 cannot sign until Signer 1 completes**
- **Embedded signing URLs work for any routing order**, but DocuSign enforces the order
- If Signer 2 tries to access signing URL before Signer 1 completes, DocuSign shows a "waiting" message
- DocuSign automatically sends email notifications to next signer when previous completes

---

## Troubleshooting

### Issue: "No seller contacts" error

**Cause**: All contacts associated with the deal have `contact_type = "agent"`

**Solution**:
1. Check contact associations on the deal
2. Ensure at least one contact does NOT have `contact_type = "agent"`
3. Or remove `contact_type` property from seller contacts

### Issue: "Contact missing email" error

**Cause**: One or more seller contacts don't have email addresses

**Solution**:
1. Go to HubSpot
2. Find the contact mentioned in error message
3. Add email address to the contact
4. Try again

### Issue: Second signer gets "waiting" page

**Cause**: First signer hasn't completed signing yet (routing order enforced)

**Solution**:
- This is expected behavior!
- First signer must complete signing
- DocuSign will automatically notify second signer via email
- Or frontend can poll envelope status and enable signing when ready

### Issue: Wrong role name in template

**Cause**: DocuSign template roles don't match "Client 1", "Client 2", etc.

**Solution**:
1. Go to DocuSign admin console
2. Edit template `10e6d4c1-196d-4751-8f6e-f77f8b271c1a`
3. Rename roles to exactly: "Client 1", "Client 2", "Client 3", etc.
4. Save template
5. Try again

---

## Production Checklist

Before deploying to production:

- [ ] Verify DocuSign template `10e6d4c1-196d-4751-8f6e-f77f8b271c1a` exists
- [ ] Verify template roles are named: "Client 1", "Client 2", etc.
- [ ] Verify routing order is set in template (1, 2, 3, etc.)
- [ ] Test with 1 signer (single seller)
- [ ] Test with 2 signers (primary + additional)
- [ ] Test with 3+ signers
- [ ] Test agent filtering (ensure agents are excluded)
- [ ] Test error handling (missing email, no contacts, etc.)
- [ ] Update `DOCUSIGN_TEMPLATE_ID` environment variable
- [ ] Test in production DocuSign environment (not demo)
- [ ] Update OAuth URLs to production
- [ ] Grant consent in production environment

---

## Summary

### What Was Implemented

1. ✅ **Updated DocuSign config** with new template ID
2. ✅ **Enhanced `makeEnvelopeFromTemplate()`** to support multiple signers with routing order
3. ✅ **Added `getRecipientSigningUrl()`** function to get signing URLs for specific recipients
4. ✅ **Updated `/create-signing-session` endpoint** to:
   - Fetch all contacts from deal
   - Filter out agents
   - Validate emails
   - Create envelope with multiple signers
   - Return all signers and signing URL
5. ✅ **Added `/get-signing-url` endpoint** to get signing URLs for subsequent signers
6. ✅ **Backward compatible** - single signer flow still works

### Key Files Modified

- [backend/src/config/docusign.js](backend/src/config/docusign.js) - Updated template ID
- [backend/src/integrations/docusign/client.js](backend/src/integrations/docusign/client.js) - Added multi-signer support
- [backend/src/routes/docusign.js](backend/src/routes/docusign.js) - Updated endpoints for routing order

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/docusign/create-signing-session` | POST | Create envelope with multiple signers |
| `/api/docusign/get-signing-url` | POST | Get signing URL for specific recipient |
| `/api/docusign/envelope-status/:id` | GET | Check envelope status |

---

**Implementation Date**: October 31, 2025
**Status**: ✅ Complete and Ready for Testing
**Template ID**: `10e6d4c1-196d-4751-8f6e-f77f8b271c1a`
