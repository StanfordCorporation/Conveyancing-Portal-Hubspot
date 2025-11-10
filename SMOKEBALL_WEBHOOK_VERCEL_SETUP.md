# 🔔 Smokeball Webhook Setup on Vercel

## ✅ Prerequisites (Already Done!)

- ✅ Backend deployed to Vercel: `conveyancing-portal-backend.vercel.app`
- ✅ Smokeball OAuth completed (tokens in Redis)
- ✅ Webhook handler code created: `backend/src/routes/smokeball-webhook.js`
- ✅ Redis configured on Vercel (for token storage)

---

## 🎯 Quick Setup (5 Minutes)

### Step 1: Register Webhook with Smokeball

**Open your browser and visit:**
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
```

**What This Does:**
1. ✅ Generates a webhook key for security
2. ✅ Registers your Vercel endpoint with Smokeball API
3. ✅ Subscribes to these events:
   - `matter.created` - New lead/matter created
   - `matter.initialized` - Matter initialized
   - `matter.updated` - Matter updated  
   - `matter.converted` - Lead converted to matter

**Expected Response:**
```json
{
  "success": true,
  "subscriptionId": "abc-123-def-456",
  "webhookUrl": "https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook",
  "eventTypes": [
    "matter.created",
    "matter.initialized",
    "matter.updated",
    "matter.converted"
  ],
  "webhookKey": "abc123...(hidden)"
}
```

**Save this:** Copy the `subscriptionId` - you'll need it if you want to delete/update the webhook later.

---

### Step 2: Test Webhook Immediately

**Create a Test Lead in Smokeball:**

1. **Option A: Via API (from your backend):**
   - Create a test deal in HubSpot from agent portal
   - Watch Vercel logs for lead creation
   - Smokeball will send `matter.created` webhook

2. **Option B: Manually in Smokeball:**
   - Log into Smokeball
   - Create a test lead manually
   - Smokeball will send `matter.created` webhook
   - Check Vercel logs

**View Vercel Logs:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **conveyancing-portal-backend**
3. Click **Logs** tab
4. Filter by `/api/smokeball/webhook`

**Expected Log Output:**
```
[Smokeball Webhook] 📨 Received webhook: matter.created
[Smokeball Webhook] ✅ Found HubSpot deal: 123456
[Smokeball Webhook] 📍 Updating property details...
[Smokeball Webhook] ✅ Property details updated
[Smokeball Webhook] 📞 Creating welcome call task...
[Smokeball Webhook] ✅ Welcome call task created
```

---

### Step 3: Test Lead Conversion

**Convert a Lead to Matter in Smokeball:**

1. Find a test lead in Smokeball
2. Manually convert it to a matter
3. Smokeball will send `matter.converted` webhook
4. Check Vercel logs

**Expected Result:**
- ✅ `matter_uid` updated in HubSpot deal
- ✅ Matter number saved (e.g., "2025-CV-001")

---

## 📋 Webhook Flow Diagram

### Current Flow (Without Webhooks - Working NOW):
```
Stage 1: Client Disclosure
    ↓
    API: Create Smokeball Lead
    ↓
    ✅ Lead created
    ✅ lead_uid saved to HubSpot
    
Stage 3: Quote Accepted
    ↓
    API: Update addresses
    API: Convert to matter
    API: Create tasks
    ↓
    ✅ Matter created
    ✅ matter_uid saved to HubSpot
```

### Enhanced Flow (With Webhooks - After Setup):
```
Stage 1: Client Disclosure
    ↓
    API: Create Smokeball Lead
    ↓
    ✅ Lead created
    ✅ lead_uid saved to HubSpot
    ↓
    📡 WEBHOOK: matter.created
    ↓ (Background - Async)
    ✨ Property details auto-populated
    ✨ Welcome call task created
    
Stage 3: Quote Accepted
    ↓
    API: Update addresses
    API: Convert to matter
    API: Create tasks
    ↓
    ✅ Matter created
    ↓
    📡 WEBHOOK: matter.converted
    ↓ (Background - Async)
    ✨ Matter number auto-captured
    ✨ HubSpot updated
```

---

## 🔍 Webhook Event Details

### Event 1: `matter.created`

**When:** New lead/matter created in Smokeball

**Smokeball Sends:**
```json
{
  "type": "matter.created",
  "subscriptionId": "webhook-sub-id",
  "payload": {
    "id": "lead-uuid",
    "number": null,
    "isLead": true,
    "status": "Open",
    "shortName": "John Smith - 123 Main St",
    ...
  }
}
```

**Your Backend Does:**
1. Find HubSpot deal by `lead_uid`
2. Get matter from Smokeball (to find property layout)
3. Parse property address
4. Update property details layout fields
5. Create welcome call task for Laura

**Result:**
- ✅ Property fields populated in Smokeball UI
- ✅ Task created immediately

---

### Event 2: `matter.converted`

**When:** Lead converted to matter in Smokeball

**Smokeball Sends:**
```json
{
  "type": "matter.converted",
  "subscriptionId": "webhook-sub-id",
  "payload": {
    "id": "matter-uuid",
    "number": "2025-CV-001",
    "isLead": false,
    "status": "Open",
    ...
  }
}
```

**Your Backend Does:**
1. Find HubSpot deal by `lead_uid`
2. Extract matter number: "2025-CV-001"
3. Update HubSpot deal:
   - `matter_uid` = "2025-CV-001"
   - `smokeball_sync_status` = "Successfull"

**Result:**
- ✅ Matter number automatically synced to HubSpot

---

### Event 3: `matter.updated`

**When:** Matter details change in Smokeball

**Smokeball Sends:**
```json
{
  "type": "matter.updated",
  "subscriptionId": "webhook-sub-id",
  "payload": {
    "id": "matter-uuid",
    "number": "2025-CV-001",
    ...
  }
}
```

**Your Backend Does:**
1. Find HubSpot deal
2. Update sync timestamp
3. Update matter number if changed

**Result:**
- ✅ HubSpot stays in sync with Smokeball

---

## 🐛 Troubleshooting

### Webhook Not Receiving Events

**Check 1: Is webhook registered?**
```bash
curl https://conveyancing-portal-backend.vercel.app/api/smokeball/webhooks/list
```

Should show your subscription.

**Check 2: Check Vercel logs**
```
Vercel Dashboard → conveyancing-portal-backend → Logs
Filter: /api/smokeball/webhook
```

**Check 3: Test webhook manually**

Send a test webhook:
```bash
curl -X POST https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_SMOKEBALL_API_KEY" \
  -d '{
    "type": "matter.created",
    "payload": {
      "id": "test-matter-id",
      "isLead": true,
      "number": null
    }
  }'
```

Expected: 200 response + logs showing processing

---

### "Unauthorized" Webhook Response

**Problem:** API key validation failing

**Fix:** Webhook sends API key in header:
```
x-api-key: YOUR_SMOKEBALL_API_KEY
```

Make sure your `.env` has:
```bash
SMOKEBALL_API_KEY=NO5glMfrqP5BuwxPgnqsp7hKzeU5p2Tw7jhPqjC2
```

And it's configured in Vercel environment variables.

---

### Property Details Not Updating

**Problem:** Property layout not found in matter

**Debug:**
1. Check if matter has "Property Details" layout
2. Get matter via API: `GET /matters/{id}`
3. Look for `items["Property Details"]`

**Note:** Property layout might not exist immediately after lead creation - Smokeball creates it asynchronously.

---

### Welcome Task Not Created

**Problem:** Laura Stuart not found

**Check:** 
```bash
# From backend directory
node test-smokeball-staff.js
```

Should show Laura: `96e1e03f-0b5b-4f4c-ae9d-62b8c88cc63b`

If not found, update `staff.js` with correct staff names.

---

## 📊 Monitoring Webhooks

### View Webhook Deliveries (Smokeball Side):

Unfortunately, Smokeball doesn't provide a webhook delivery dashboard. You need to:

1. **Check Vercel logs** for received webhooks
2. **Monitor HubSpot** for updated properties
3. **Check Smokeball** for tasks/property updates

### View Your Webhook Logs (Vercel):

```
Vercel Dashboard → conveyancing-portal-backend → Logs → Real-time
```

Filter by: `/webhook`

**Healthy Webhook Logs Look Like:**
```
[Smokeball Webhook] 📨 Received webhook: matter.created
[Smokeball Webhook] ✅ Found HubSpot deal: 123456
[Smokeball Webhook] ✅ Property details updated
[Smokeball Webhook] ✅ Welcome call task created
```

---

## 🔧 Webhook Management

### List Active Webhooks:
```javascript
GET /api/smokeball/webhooks/list
```

### Delete Webhook (if needed):
```javascript
DELETE /api/smokeball/webhooks/{subscriptionId}
```

### Re-register Webhook:
Just visit the register URL again:
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
```

---

## 🎯 What Webhooks Give You

### Without Webhooks (Current - Fully Working):
- ✅ Lead creation at Stage 1
- ✅ All automation at Stage 3 (Quote Accepted)
- ✅ Everything works via direct API calls

### With Webhooks (Enhancement):
- ✅ Lead creation at Stage 1
- ✨ **Property details auto-populated** (background)
- ✨ **Welcome task at Stage 1** (earlier)
- ✅ All automation at Stage 3
- ✨ **Matter number auto-synced** (background)

**Adds background processing and earlier task creation!**

---

## ⏱️ When to Set Up Webhooks

### NOW (Recommended):
- ✅ Takes 5 minutes
- ✅ Backend already deployed
- ✅ Code already written
- ✅ Just one GET request to register
- ✅ Adds useful enhancements

### LATER (Also Fine):
- ⏳ Current integration works fully without webhooks
- ⏳ Can add anytime after Vercel deployment
- ⏳ No rush - everything works now

---

## 🚀 Quick Start Checklist

To set up Smokeball webhooks on Vercel RIGHT NOW:

### ☐ Step 1: Verify Backend is Running
```bash
curl https://conveyancing-portal-backend.vercel.app/health
```

Should return: `{ "status": "ok" }`

### ☐ Step 2: Verify Smokeball Auth
```bash
curl https://conveyancing-portal-backend.vercel.app/api/smokeball/status
```

Should return: `{ "authenticated": true }`

If not authenticated, visit:
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/setup
```

### ☐ Step 3: Register Webhook
**Visit in browser:**
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
```

**Save the subscription ID from response!**

### ☐ Step 4: Test Webhook
Create a test lead in HubSpot or Smokeball, check Vercel logs.

### ☐ Step 5: Monitor
Check Vercel logs for webhook processing over next few days.

---

## 📞 That's It!

**Webhook setup is just ONE browser visit!**

Visit: `https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register`

Everything else is automatic! 🎉

---

## 🎯 What Happens After Setup

### Automatic Background Processing:

**When you create a lead:**
```
1. Your app calls Smokeball API
   ↓
2. Lead created in Smokeball
   ↓
3. Smokeball sends matter.created webhook to Vercel
   ↓
4. Vercel backend processes in background:
   ✨ Property details populated
   ✨ Welcome task created for Laura
   ↓
5. User doesn't notice - happens automatically!
```

**When lead converts to matter:**
```
1. Conversion happens (manually in Smokeball or via your Stage 3 API)
   ↓
2. Smokeball assigns matter number "2025-CV-001"
   ↓
3. Smokeball sends matter.converted webhook
   ↓
4. Vercel backend captures it
   ↓
5. HubSpot deal updated automatically
```

---

## 💡 Pro Tips

### Tip 1: Use Vercel Log Drains (Optional)

Send webhook logs to external service:

1. Vercel Dashboard → Project → Settings → Log Drains
2. Add integration: Datadog, Logtail, Axiom, etc.
3. Get better webhook monitoring and alerts

### Tip 2: Set Up Alerts

Get notified when webhooks fail:

1. Vercel Dashboard → Project → Settings → Notifications
2. Enable: "Function errors"
3. Add email or Slack integration

### Tip 3: Monitor Webhook Health

Check periodically:
```bash
# List active webhooks
curl https://conveyancing-portal-backend.vercel.app/api/smokeball/webhooks/list
```

Should show 1 active subscription.

---

## 🎉 Ready to Set Up?

**Just visit this URL:**
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
```

**And you're done!** 🚀

The webhook will start receiving events immediately and processing them in the background.

---

## 📞 Support

**Webhook not working?**

1. Check Vercel logs for errors
2. Verify Smokeball OAuth is authenticated
3. Test with manual webhook curl command
4. Check subscription ID was returned

**Need help?** All webhook code is in:
- `backend/src/routes/smokeball-webhook.js`

Fully documented and ready to debug!

