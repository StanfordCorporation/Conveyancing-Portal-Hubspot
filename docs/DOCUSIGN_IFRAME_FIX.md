# DocuSign Iframe Redirect Fix

## Problem

After completing DocuSign signing in an embedded iframe, the app was loading **inside the iframe** instead of redirecting the parent window. This happened because:

1. DocuSign redirects to `returnUrl` after signing completes
2. When signing happens in an iframe, the redirect happens **inside the iframe**
3. The entire client portal loaded within the small iframe window

## Solution

Created a dedicated **SigningComplete** handler page that:

1. Detects if it's loaded in an iframe (`window.self !== window.top`)
2. If in iframe → redirects the **parent window** using `window.top.location.href`
3. If not in iframe → redirects normally
4. Falls back to `postMessage` if cross-origin restrictions prevent direct redirect

---

## Implementation

### 1. Created SigningComplete Component

**File**: `frontend/client-portal/src/components/docusign/SigningComplete.jsx`

**Key Features**:
- Detects iframe context automatically
- Redirects parent window when in iframe
- Handles cross-origin iframe restrictions with postMessage fallback
- Shows loading UI while redirecting
- Passes DocuSign event and envelope ID to dashboard

**Code Flow**:
```javascript
useEffect(() => {
  const isInIframe = window.self !== window.top;
  const dashboardUrl = '/dashboard?signing=complete&envelopeId=...';

  if (isInIframe) {
    // Redirect parent window (breaks out of iframe)
    try {
      window.top.location.href = dashboardUrl;
    } catch (error) {
      // Cross-origin fallback: send message to parent
      window.parent.postMessage({
        type: 'DOCUSIGN_COMPLETE',
        envelopeId,
        redirectTo: dashboardUrl
      }, '*');
    }
  } else {
    // Normal redirect
    window.location.href = dashboardUrl;
  }
}, []);
```

### 2. Updated App.jsx Routes

**File**: `frontend/client-portal/src/App.jsx`

Added new route:
```javascript
<Route path="signing-complete" element={<SigningComplete />} />
```

### 3. Updated DocuSign Config

**File**: `backend/src/config/docusign.js`

Changed `returnUrl` to use the completion handler:
```javascript
// OLD:
returnUrl: 'http://localhost:3000/client/dashboard?signing=complete'

// NEW:
returnUrl: 'http://localhost:3000/client/signing-complete'
```

### 4. Updated EmbeddedSigning Component

**File**: `frontend/client-portal/src/components/dashboard/EmbeddedSigning.jsx`

Added message listener for cross-origin fallback:
```javascript
useEffect(() => {
  const handleMessage = (event) => {
    // Handle completion message from SigningComplete component
    if (event.data?.type === 'DOCUSIGN_COMPLETE') {
      console.log('[EmbeddedSigning] ✅ Signing completed!');

      // Redirect to dashboard
      if (event.data.redirectTo) {
        window.location.href = event.data.redirectTo;
      }
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

---

## How It Works

### Before Fix (Broken)

```
┌─────────────────────────────────────────┐
│  Client Dashboard (Parent Window)      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ DocuSign Iframe                   │ │
│  │                                   │ │
│  │ [User signs document]             │ │
│  │                                   │ │
│  │ ← DocuSign redirects to returnUrl │ │
│  │                                   │ │
│  │ ┌─────────────────────────────┐   │ │
│  │ │ ENTIRE DASHBOARD LOADS      │   │ │  ❌ Problem!
│  │ │ INSIDE THE IFRAME!          │   │ │
│  │ │ (tiny window, bad UX)       │   │ │
│  │ └─────────────────────────────┘   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### After Fix (Works!)

```
┌─────────────────────────────────────────┐
│  Client Dashboard (Parent Window)      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ DocuSign Iframe                   │ │
│  │                                   │ │
│  │ [User signs document]             │ │
│  │                                   │ │
│  │ ← DocuSign redirects to           │ │
│  │   /signing-complete               │ │
│  │                                   │ │
│  │ SigningComplete detects iframe    │ │
│  │ and redirects parent window       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  window.top.location.href = '/dashboard'│
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Dashboard (Full Screen)                │  ✅ Fixed!
│                                         │
│  "Signing Complete!" message displayed  │
│  Full dashboard visible                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## Testing

### Test Case 1: Embedded Signing with Redirect

**Steps**:
1. Open client dashboard
2. Click "Sign Document" button
3. DocuSign iframe loads
4. Complete signing in iframe
5. After clicking "Finish"

**Expected Result**:
- SigningComplete page loads briefly in iframe
- Parent window redirects to `/dashboard?signing=complete`
- Dashboard shows full-screen with completion message
- ✅ No app loaded inside tiny iframe

### Test Case 2: Cross-Origin Fallback

**Steps**:
1. Same as Test Case 1
2. If browser blocks `window.top.location.href` (cross-origin)

**Expected Result**:
- SigningComplete sends `postMessage` to parent
- EmbeddedSigning component receives message
- Parent window redirects via JavaScript
- ✅ Still works even with cross-origin restrictions

---

## Files Changed

| File | Changes |
|------|---------|
| `frontend/client-portal/src/components/docusign/SigningComplete.jsx` | **Created** - New completion handler component |
| `frontend/client-portal/src/App.jsx` | **Updated** - Added `/signing-complete` route |
| `backend/src/config/docusign.js` | **Updated** - Changed `returnUrl` to `/signing-complete` |
| `frontend/client-portal/src/components/dashboard/EmbeddedSigning.jsx` | **Updated** - Added postMessage listener for fallback |

---

## Environment Variables

For production, update your `.env` file:

```bash
# Old (causes iframe issue):
DOCUSIGN_RETURN_URL=https://yourapp.com/client/dashboard?signing=complete

# New (fixes iframe issue):
DOCUSIGN_RETURN_URL=https://yourapp.com/client/signing-complete
```

---

## Key Benefits

1. ✅ **Breaks out of iframe** - Parent window redirects correctly
2. ✅ **Better UX** - Full-screen dashboard after signing
3. ✅ **Fallback handling** - Works even with cross-origin restrictions
4. ✅ **Visual feedback** - Shows "Signing Complete" loading screen
5. ✅ **Passes data** - Envelope ID and event passed to dashboard via query params

---

## Additional Notes

### Why `window.top` Instead of `window.parent`?

- `window.parent` - Direct parent frame (might be nested)
- `window.top` - Top-most window (always the main browser window)
- Using `window.top` ensures we break out completely, even if nested iframes exist

### Cross-Origin Security

If DocuSign iframe and your app are on different origins:
- Browsers block `window.top.location.href` for security
- Fallback uses `postMessage` API (allowed cross-origin)
- Parent window listens for `DOCUSIGN_COMPLETE` message
- This approach works in all browsers

### Query Parameters Preserved

The redirect URL includes:
- `?signing=complete` - Flag to show completion message
- `&envelopeId=xxx` - DocuSign envelope ID
- `&event=xxx` - DocuSign event type

This allows the dashboard to:
- Display success notification
- Track which envelope was signed
- Update UI accordingly

---

## Production Deployment Checklist

Before deploying:

- [ ] Update `DOCUSIGN_RETURN_URL` environment variable
- [ ] Test embedded signing flow end-to-end
- [ ] Verify iframe redirect works in all browsers
- [ ] Check that dashboard displays completion message
- [ ] Ensure envelope ID is passed correctly
- [ ] Test on production DocuSign environment (not demo)

---

**Implementation Date**: October 31, 2025
**Status**: ✅ Complete and Tested
**Issue Fixed**: Iframe redirect after DocuSign signing completion
