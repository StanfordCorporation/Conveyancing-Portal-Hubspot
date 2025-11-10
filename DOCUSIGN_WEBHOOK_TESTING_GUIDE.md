# DocuSign Webhook Testing Guide

## Overview

Your DocuSign webhook is already implemented at `/api/webhook/docusign` in `backend/src/routes/webhook.js`. This guide will help you test it both locally and on Vercel.

## What the Webhook Does

When DocuSign sends an envelope status update, the webhook:

1. ✅ Receives the envelope status (`sent`, `completed`, `voided`, etc.)
2. ✅ Extracts the HubSpot deal ID from custom fields
3. ✅ Extracts recipient signing statuses
4. ✅ Updates the HubSpot deal with:
   - `envelope_status` property
   - `recipient_status` property (JSON string of signers)
5. ✅ If all signers complete, progresses deal to "Funds Requested" stage

---

## Method 1: Using the Test Script (Recommended)

### Prerequisites

```bash
cd backend
npm install node-fetch
```

### Step 1: Get a Real HubSpot Deal ID

Option A: From HubSpot UI
- Go to HubSpot → Deals
- Open any deal
- Copy the ID from the URL: `https://app.hubspot.com/contacts/.../deal/DEAL_ID_HERE`

Option B: Using the API
```bash
curl "https://api.hubapi.com/crm/v3/objects/deals?limit=1" \
  -H "Authorization: Bearer YOUR_HUBSPOT_TOKEN"
```

### Step 2: Update the Test Script

Edit `backend/test-docusign-webhook.js`:

```javascript
const ENDPOINTS = {
  local: 'http://localhost:3001/api/webhook/docusign',
  vercel: 'https://YOUR-ACTUAL-BACKEND.vercel.app/api/webhook/docusign', // Update this!
};
```

### Step 3: Run Tests

**Test locally:**
```bash
# Make sure your backend is running first
cd backend
npm start

# In another terminal
node test-docusign-webhook.js local YOUR_DEAL_ID
```

**Test on Vercel:**
```bash
node test-docusign-webhook.js vercel YOUR_DEAL_ID
```

**Run all test scenarios:**
```bash
node test-docusign-webhook.js local YOUR_DEAL_ID --all
```

This will test:
- ✉️ Envelope sent
- ✍️ First signer completed
- ✅ All signers completed (progresses deal stage)
- 🚫 Envelope voided

### Step 4: Verify in HubSpot

After running tests, check the deal in HubSpot:
- `envelope_status` should show the latest status
- `recipient_status` should show the signing progress
- If you ran "all signers completed", the deal should move to "Funds Requested" stage

---

## Method 2: Using cURL

### Test Locally

```bash
curl -X POST http://localhost:3001/api/webhook/docusign \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "envelopeSummary": {
        "status": "completed",
        "envelopeId": "test-envelope-123",
        "customFields": {
          "textCustomFields": [
            {
              "name": "hs_deal_id",
              "value": "YOUR_DEAL_ID"
            }
          ]
        },
        "recipients": {
          "signers": [
            {
              "email": "seller1@example.com",
              "name": "John Seller",
              "status": "completed",
              "recipientId": "1"
            },
            {
              "email": "seller2@example.com",
              "name": "Jane Seller",
              "status": "completed",
              "recipientId": "2"
            }
          ]
        }
      }
    }
  }'
```

### Test on Vercel

Replace `localhost:3001` with your Vercel URL:

```bash
curl -X POST https://your-backend.vercel.app/api/webhook/docusign \
  -H "Content-Type: application/json" \
  -d '{ ... same payload ... }'
```

---

## Method 3: Using Postman

### Setup

1. Open Postman
2. Create a new POST request
3. Enter URL:
   - Local: `http://localhost:3001/api/webhook/docusign`
   - Vercel: `https://your-backend.vercel.app/api/webhook/docusign`
4. Set Headers:
   - `Content-Type: application/json`
5. Set Body (raw JSON):

```json
{
  "data": {
    "envelopeSummary": {
      "status": "completed",
      "envelopeId": "test-envelope-123",
      "customFields": {
        "textCustomFields": [
          {
            "name": "hs_deal_id",
            "value": "YOUR_DEAL_ID"
          }
        ]
      },
      "recipients": {
        "signers": [
          {
            "email": "seller1@example.com",
            "name": "John Seller",
            "status": "completed",
            "recipientId": "1"
          },
          {
            "email": "seller2@example.com",
            "name": "Jane Seller",
            "status": "completed",
            "recipientId": "2"
          }
        ]
      }
    }
  }
}
```

6. Click **Send**

### Expected Response

```json
{
  "success": true,
  "message": "Envelope status updated successfully",
  "dealId": "YOUR_DEAL_ID",
  "envelope_status": "completed",
  "recipient_status": [
    {
      "email": "seller1@example.com",
      "status": "completed"
    },
    {
      "email": "seller2@example.com",
      "status": "completed"
    }
  ]
}
```

---

## Method 4: Using Webhook Testing Services

### Option A: webhook.site

1. Go to https://webhook.site
2. Copy your unique URL
3. Forward requests to your endpoint using the test script or manually

### Option B: ngrok (for local testing)

```bash
# Install ngrok
npm install -g ngrok

# Start your backend
cd backend
npm start

# In another terminal, expose it
ngrok http 3001

# Use the ngrok URL in DocuSign webhook settings
# Example: https://abc123.ngrok.io/api/webhook/docusign
```

---

## Method 5: Real DocuSign Testing

### Step 1: Configure DocuSign Connect

1. Log in to DocuSign Admin
2. Go to **Settings** → **Connect**
3. Add a new configuration
4. Set webhook URL:
   - Production: `https://your-backend.vercel.app/api/webhook/docusign`
   - Testing: Use ngrok URL
5. Enable events:
   - ✅ Envelope Sent
   - ✅ Envelope Delivered
   - ✅ Envelope Completed
   - ✅ Envelope Voided
   - ✅ Recipient Signed
6. Include Custom Fields: ✅ Enabled

### Step 2: Create a Test Envelope

1. Create a test envelope in DocuSign
2. Add custom field: `hs_deal_id` with a real HubSpot deal ID
3. Send to a test email (your own)
4. Sign the document
5. Watch the webhook logs

### Step 3: Monitor Logs

**On Vercel:**
```bash
vercel logs YOUR_PROJECT_NAME
```

**Locally:**
Check your terminal where the backend is running

---

## Troubleshooting

### Error: "Missing hs_deal_id in envelope custom fields"

**Cause:** The payload doesn't contain the custom field or it's named incorrectly.

**Fix:** Make sure your DocuSign envelope has a text custom field named exactly `hs_deal_id`.

### Error: "Failed to update HubSpot deal"

**Causes:**
1. Deal ID doesn't exist in HubSpot
2. HubSpot API token is invalid/expired
3. Missing permissions on the token

**Fix:** 
- Verify the deal ID exists
- Check `HUBSPOT_ACCESS_TOKEN` environment variable
- Ensure token has `crm.objects.deals.write` scope

### Error: "ECONNREFUSED"

**Cause:** Backend server isn't running.

**Fix:**
```bash
cd backend
npm start
```

### No Logs Appearing

**Vercel:**
- Check if environment variables are set correctly
- Use `vercel logs` command
- Check Vercel dashboard → Your Project → Logs

**Local:**
- Make sure you're looking at the correct terminal window
- Logs appear where you ran `npm start`

---

## Next Steps

### 1. Deploy to Production

Your webhook endpoint will be:
```
https://your-backend.vercel.app/api/webhook/docusign
```

Update DocuSign Connect configuration with this URL.

### 2. Set Environment Variables on Vercel

```bash
vercel env add HUBSPOT_ACCESS_TOKEN
# Enter your token when prompted
```

Or via Vercel dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add `HUBSPOT_ACCESS_TOKEN`

### 3. Monitor in Production

```bash
# Stream logs in real-time
vercel logs --follow

# Or view in dashboard
# https://vercel.com/your-team/your-project/logs
```

### 4. Add Alert Monitoring (Optional)

Consider adding error monitoring:
- Sentry
- LogRocket  
- Datadog
- Or email alerts when webhook fails

---

## Testing Checklist

- [ ] Local test with mock payload
- [ ] Vercel test with mock payload
- [ ] Test with real HubSpot deal ID
- [ ] Verify deal updates in HubSpot
- [ ] Test all envelope statuses (sent, completed, voided)
- [ ] Test stage progression when all signers complete
- [ ] Configure DocuSign Connect with production URL
- [ ] Test with real DocuSign envelope
- [ ] Monitor logs on Vercel
- [ ] Document webhook URL for team

---

## Comparison: Current Implementation vs Cloudflare Worker

Your existing webhook (`/api/webhook/docusign`) is **better** than the Cloudflare Worker version because it also:

✅ Progresses deal to "Funds Requested" stage when all signatures complete  
✅ Includes comprehensive logging  
✅ Handles errors gracefully  
✅ Already integrated with your Express backend  

The Cloudflare Worker version would require separate deployment and maintenance.

**Recommendation:** Stick with your current implementation - it's more feature-complete!

---

## Questions?

- Check backend logs: `backend/src/routes/webhook.js` (line 174-230)
- Review DocuSign integration: `docs/DOCUSIGN_INTEGRATION.md`
- See webhook guide: `WEBHOOK_TESTING_GUIDE.md`

