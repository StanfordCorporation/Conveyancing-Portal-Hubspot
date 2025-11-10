# DocuSign Primary Seller Bug Fix

## Issue Description

**Bug Report:** When a deal has multiple sellers (primary + additional), the DocuSign signing session was showing the wrong person as the signer. Specifically, "Corey Sneesby" (an additional seller) was shown as the signer instead of the authenticated primary seller who was using the client portal.

**Root Cause:** The backend logic for determining which contact is the "primary seller" was using the **order of contacts returned from HubSpot** instead of identifying the **authenticated user** who actually logged into the portal.

## Impact

- Users logging into the client portal would see the wrong name when signing documents
- The first signer in DocuSign could be set incorrectly
- Confusion about who should sign first in multi-signer scenarios

## Solution

Updated the backend logic in two endpoints to ensure the **authenticated user is ALWAYS the primary seller** in the client portal context:

### 1. `/api/client/dashboard-complete` endpoint
**File:** `backend/src/routes/client.js` (lines 215-252)

**Changes:**
- Instead of assigning the first non-agent contact as primary seller, now explicitly checks if each contact matches the authenticated user's `contactId`
- The authenticated user is set as `primarySeller`
- All other non-agent contacts are added to `additionalSellers`
- Fallback: If authenticated user is not in the contact list, use the first non-agent contact

### 2. `/api/client/property/:dealId` endpoint
**File:** `backend/src/routes/client.js` (lines 522-570)

**Changes Made in Two Places:**

#### A. After Association Type Processing (lines 522-537)
Added a swap mechanism:
- If the authenticated user was marked as an "additional seller" by HubSpot association types
- Swap them to be the primary seller
- Move the previous primary seller to additional sellers
- This ensures the authenticated user is always primary, even if HubSpot association types are incorrect

#### B. In Heuristic Fallback (lines 539-571)
Updated the fallback logic:
- When no association types are found, check each contact
- If a contact matches `contactId` (authenticated user), assign as primary seller
- All other non-agent contacts are additional sellers

## Technical Details

### Before Fix
```javascript
// Old logic - assigns first non-agent as primary seller
if (!primarySeller) {
  primarySeller = contactData;
} else {
  additionalSellers.push(contactData);
}
```

### After Fix
```javascript
// New logic - authenticated user is always primary seller
if (contact.id === contactId) {
  primarySeller = contactData;
} else {
  additionalSellers.push(contactData);
}

// If authenticated user not in contacts, use first as fallback
if (!primarySeller && additionalSellers.length > 0) {
  primarySeller = additionalSellers.shift();
}
```

## Testing Recommendations

1. **Test with multiple sellers:**
   - Create a deal with 2+ sellers
   - Have the second seller (additional) log into the portal
   - Verify they see themselves as the primary signer in DocuSign
   - Verify their name appears in the "Signing as:" header

2. **Test DocuSign signing order:**
   - Verify the authenticated user is always signer #1 (routing order 1)
   - Verify additional sellers are signer #2, #3, etc.
   - Verify the signing session loads correctly

3. **Test edge cases:**
   - Deal with only one seller (should work as before)
   - Deal with no sellers (should fall back to authenticated user)
   - Multiple users logging in with same deal (each should see themselves as primary)

## Related Files

- `backend/src/routes/client.js` - Main fix location
- `backend/src/routes/docusign.js` - Uses seller data to create signing session
- `frontend/client-portal/src/components/dashboard/SigningStatus.jsx` - Sends seller data to backend
- `frontend/client-portal/src/components/dashboard/EmbeddedSigning.jsx` - Displays signing interface

## Deployment Notes

- **No database changes required**
- **No environment variable changes required**
- Backend code changes only
- Existing envelopes are not affected (stored data remains unchanged)
- New signing sessions will use the corrected logic

## Date Fixed
November 10, 2025

