# Webhook Testing Guide

## Overview

This guide will help you test the DocuSign webhook implementation using webhook.site before deploying to production.

---

## 🎯 Purpose of Testing

Before deploying the Cloudflare Worker to production, we need to:
1. **Understand the webhook payload structure** from DocuSign
2. **Verify the custom field** (hs_deal_id) is included in the payload
3. **Confirm recipient status** format matches our expectations
4. **Test the worker code** with real webhook data

---

## 🧪 Test Setup with webhook.site

### Step 1: Get Test Webhook URL

1. Go to [https://webhook.site](https://webhook.site)
2. You'll automatically get a unique URL like:
   ```
   https://webhook.site/abc-12345-def-67890-ghi
   ```
3. **Copy this URL** - this is your test webhook endpoint

### Step 2: Configure Backend to Use Test URL

Edit `backend/.env`:

```bash
# Add this line (temporarily for testing)
DOCUSIGN_WEBHOOK_URL=https://webhook.site/abc-12345-def-67890-ghi
```

### Step 3: Restart Backend

```bash
cd backend
npm run dev
```

Verify the configuration:
- Check console logs when creating envelope
- Should see: `[DocuSign] EventNotification configured for deal XXX → https://webhook.site/...`

---

## 🔬 Testing Procedure

### Test 1: Create and Send Envelope

1. **Login to Client Portal**
   ```
   http://localhost:3000
   ```

2. **Navigate to Signing Step** (Step 4)

3. **Click "Start Signing"**
   - This creates a new DocuSign envelope
   - Backend adds EventNotification with your test webhook URL
   - Backend adds custom field `hs_deal_id` with the HubSpot deal ID

4. **Check Backend Logs**
   ```
   [DocuSign] EventNotification configured for deal 123456789 → https://webhook.site/...
   [DocuSign] Custom field added: hs_deal_id = 123456789
   [DocuSign] ✅ Envelope created: abc-123-def-456
   ```

5. **Check webhook.site**
   - Refresh the webpage
   - You should see a POST request for "envelope-sent" event

---

### Test 2: Sign Document

1. **Complete the signature** in the embedded DocuSign iframe

2. **Check webhook.site**
   - You should receive multiple webhook events:
     - `recipient-completed` (when you finish signing)
     - `envelope-completed` (if all signers done) OR
     - `envelope-delivered` (if waiting for other signers)

---

### Test 3: Analyze Webhook Payload

On webhook.site, click on each received request to view the payload.

**Look for these key fields:**

#### Envelope Status
```json
{
  "event": "envelope-completed",
  "data": {
    "envelopeSummary": {
      "envelopeId": "abc-123-def-456",
      "status": "completed",  ← Key field
      "emailSubject": "Please sign: Property Disclosure",
      "statusDateTime": "2025-11-06T12:30:45.000Z"
    }
  }
}
```

#### Custom Fields (hs_deal_id)
```json
{
  "data": {
    "envelopeSummary": {
      "customFields": {
        "textCustomFields": [
          {
            "name": "hs_deal_id",  ← Our custom field
            "value": "123456789"   ← HubSpot deal ID
          }
        ]
      }
    }
  }
}
```

#### Recipient Status
```json
{
  "data": {
    "envelopeSummary": {
      "recipients": {
        "signers": [
          {
            "email": "whoispratham@gmail.com",
            "name": "Pratham Manocha",
            "status": "completed",  ← Signer status
            "signedDateTime": "2025-11-06T12:30:45.000Z"
          },
          {
            "email": "logan@stanford.au",
            "name": "Logan Stanford",
            "status": "sent",      ← Waiting for signature
            "signedDateTime": null
          }
        ]
      }
    }
  }
}
```

---

## ✅ Verification Checklist

After testing, verify the following:

- [ ] **envelope-sent** event received when envelope created
- [ ] **recipient-completed** event received when each signer completes
- [ ] **envelope-completed** event received when all signers complete
- [ ] **customFields.textCustomFields** contains `hs_deal_id`
- [ ] **hs_deal_id value** matches your HubSpot deal ID
- [ ] **recipients.signers** array contains all signers
- [ ] **signer.status** shows correct status (sent, delivered, completed)
- [ ] **signer.email** matches expected email addresses

---

## 📋 Sample Webhook Payloads

### Envelope Sent (Initial Event)

```json
{
  "event": "envelope-sent",
  "apiVersion": "v2.1",
  "uri": "/restapi/v2.1/accounts/xxx/envelopes/abc-123",
  "retryCount": 0,
  "configurationId": 12345,
  "generatedDateTime": "2025-11-06T12:00:00.000Z",
  "data": {
    "accountId": "af8995ad-b134-4144-acc0-5ca58db8f759",
    "userId": "9bdab216-34d5-4f33-ab31-a72f850fde78",
    "envelopeSummary": {
      "envelopeId": "abc-123-def-456",
      "status": "sent",
      "emailSubject": "Please sign: Property Disclosure",
      "statusDateTime": "2025-11-06T12:00:00.000Z",
      "customFields": {
        "textCustomFields": [
          {
            "name": "hs_deal_id",
            "value": "123456789",
            "show": "false",
            "required": "false"
          }
        ]
      },
      "recipients": {
        "signers": [
          {
            "userId": "xxx",
            "email": "whoispratham@gmail.com",
            "name": "Pratham Manocha",
            "recipientId": "1",
            "recipientIdGuid": "xxx",
            "requireIdLookup": "false",
            "routingOrder": "1",
            "status": "sent",
            "completedCount": "0",
            "deliveredDateTime": "2025-11-06T12:00:00.000Z"
          }
        ]
      }
    }
  }
}
```

### Recipient Completed

```json
{
  "event": "recipient-completed",
  "data": {
    "envelopeSummary": {
      "envelopeId": "abc-123-def-456",
      "status": "sent",
      "customFields": {
        "textCustomFields": [
          {
            "name": "hs_deal_id",
            "value": "123456789"
          }
        ]
      },
      "recipients": {
        "signers": [
          {
            "email": "whoispratham@gmail.com",
            "name": "Pratham Manocha",
            "status": "completed",
            "signedDateTime": "2025-11-06T12:30:45.000Z"
          },
          {
            "email": "logan@stanford.au",
            "name": "Logan Stanford",
            "status": "sent",
            "signedDateTime": null
          }
        ]
      }
    }
  }
}
```

### Envelope Completed

```json
{
  "event": "envelope-completed",
  "data": {
    "envelopeSummary": {
      "envelopeId": "abc-123-def-456",
      "status": "completed",
      "statusDateTime": "2025-11-06T12:45:00.000Z",
      "customFields": {
        "textCustomFields": [
          {
            "name": "hs_deal_id",
            "value": "123456789"
          }
        ]
      },
      "recipients": {
        "signers": [
          {
            "email": "whoispratham@gmail.com",
            "name": "Pratham Manocha",
            "status": "completed",
            "signedDateTime": "2025-11-06T12:30:45.000Z"
          },
          {
            "email": "logan@stanford.au",
            "name": "Logan Stanford",
            "status": "completed",
            "signedDateTime": "2025-11-06T12:45:00.000Z"
          }
        ]
      }
    }
  }
}
```

---

## 🔧 Adjust Worker Code (If Needed)

If the payload structure differs from what we expected, update the Cloudflare Worker:

**File:** `workers/docusign-webhook/src/index.js`

```javascript
// Extract envelope status
const envelope_status = payload.data.envelopeSummary.status;

// Extract deal ID from custom fields
const dealID = payload.data.envelopeSummary.customFields.textCustomFields
  .find((obj) => obj.name === "hs_deal_id")?.value;

// Extract recipient status
const recipient_status = payload.data.envelopeSummary.recipients.signers
  .map(({ email, status }) => ({ email, status }));
```

If any of these paths are incorrect based on the actual payload, adjust accordingly.

---

## 🚀 After Testing: Switch to Production URL

Once you've verified the webhook structure:

1. **Remove test URL** from `backend/.env`:
   ```bash
   # Remove or comment out:
   # DOCUSIGN_WEBHOOK_URL=https://webhook.site/...
   ```

2. **Worker will use production URL** (default):
   ```
   https://webhooks.stanfordlegal.com.au/docusign
   ```

3. **Deploy Worker** to Cloudflare:
   ```bash
   cd workers/docusign-webhook
   wrangler deploy
   ```

4. **Create test envelope** - should now send to production worker

5. **Verify in Cloudflare Dashboard** → Workers & Pages → Select worker → Logs

---

## 📊 Expected Timeline

| Event | When | What to Expect |
|-------|------|----------------|
| **Envelope Created** | Immediately | `envelope-sent` webhook |
| **Signer 1 Signs** | When clicked "Finish" | `recipient-completed` webhook |
| **All Signers Complete** | When last signer finishes | `envelope-completed` webhook |
| **Total Events** | Full flow | 3-5 webhook events |

---

## 🐛 Common Issues

### Issue: No webhooks received

**Possible Causes:**
1. Webhook URL incorrect
2. DocuSign event notification not configured
3. Custom field `hs_deal_id` missing

**Solution:**
- Check backend logs for: `[DocuSign] EventNotification configured`
- Verify envelope includes `eventNotification` in API request
- Re-deploy backend and create new envelope

### Issue: Webhooks received but missing hs_deal_id

**Possible Cause:**
- Custom field not added to envelope definition

**Solution:**
- Verify `env.customFields` is set in `makeEnvelopeFromTemplate()`
- Check `args.dealId` is passed when creating envelope

### Issue: Recipient status format different

**Possible Cause:**
- DocuSign API version differences

**Solution:**
- Adjust worker code to match actual payload structure
- Use webhook.site payload as reference

---

## ✅ Success Criteria

You know the webhook is working correctly when:

1. ✅ webhook.site receives POST requests from DocuSign
2. ✅ Payload includes `envelope-sent`, `recipient-completed`, `envelope-completed` events
3. ✅ `customFields.textCustomFields` array contains `hs_deal_id`
4. ✅ `hs_deal_id` value matches your HubSpot deal ID
5. ✅ `recipients.signers` array shows correct email and status
6. ✅ All expected events received (3-5 events per envelope)

---

**Ready to test? Follow the steps above and document your findings!**

