# 🔔 Smokeball Webhook Setup Guide (For Vercel - Later)

## ⚠️ Important: Webhooks Are Optional!

**The Smokeball integration works fully without webhooks!**

All critical functionality uses **direct API calls**:
- ✅ Lead creation
- ✅ Contact management  
- ✅ Matter conversion
- ✅ Task creation

**Webhooks add optional background enhancements** for:
- Property details auto-population
- Matter number auto-sync
- Alternative task timing

---

## 📋 Webhook Endpoints Ready

### Backend Route Created:
**File:** `backend/src/routes/smokeball-webhook.js`

**Endpoints:**
- `POST /api/smokeball/webhook` - Receives Smokeball events
- `GET /api/smokeball/webhook/register` - Registers webhook with Smokeball

**Events Handled:**
- `matter.created` - New lead/matter created
- `matter.initialized` - Matter initialized (ignored to prevent duplicates)
- `matter.updated` - Matter updated
- `matter.converted` - Lead converted to matter

---

## 🚀 Setup Steps (When Ready)

### Step 1: Deploy Backend to Vercel

Your backend is already configured for Vercel deployment.

**Webhook URL will be:**
```
https://your-backend.vercel.app/api/smokeball/webhook
```

---

### Step 2: Register Webhook with Smokeball

After deployment, visit in your browser:
```
https://your-backend.vercel.app/api/smokeball/webhook/register
```

**This will:**
1. Generate a webhook key for signature verification
2. Register with Smokeball API
3. Subscribe to: matter.created, matter.updated, matter.converted
4. Return subscription ID

**Response:**
```json
{
  "success": true,
  "subscriptionId": "webhook-uuid",
  "webhookUrl": "https://your-backend.vercel.app/api/smokeball/webhook",
  "eventTypes": [
    "matter.created",
    "matter.initialized", 
    "matter.updated",
    "matter.converted"
  ],
  "webhookKey": "abc123...(hidden)"
}
```

---

### Step 3: Verify Webhook Registration

List active webhooks in Smokeball:
```bash
curl https://your-backend.vercel.app/api/smokeball/webhooks/list
```

---

## 📡 What Each Webhook Does

### 1. `matter.created` Webhook

**When:** New lead/matter created in Smokeball (after our API call)

**What It Does:**
```javascript
1. Find matching HubSpot deal by lead_uid
2. Update property details in Smokeball
   → Parse property address
   → Populate property layout fields:
     - Street number, name, type
     - Suburb, state, postcode
3. Create welcome call task
   → Assigned to Laura Stuart
   → Title: "Welcome call for {Client}"
   → Due: Today
```

**Benefit:** 
- Property fields auto-populated in Smokeball UI
- Welcome task created immediately (Stage 1 instead of waiting until Stage 3)

---

### 2. `matter.converted` Webhook

**When:** Lead manually converted to matter in Smokeball

**What It Does:**
```javascript
1. Find matching HubSpot deal by lead_uid
2. Capture matter number from webhook
3. Update HubSpot deal:
   → matter_uid = "2025-CV-001"
   → smokeball_sync_status = "Successfull"
```

**Benefit:**
- Matter number synced automatically
- No need to poll Smokeball API

**Current Without Webhook:**
- Matter number captured at Stage 3 (Quote Accepted)
- Works fine, webhook just adds auto-sync if conversion happens elsewhere

---

### 3. `matter.updated` Webhook

**When:** Matter details change in Smokeball

**What It Does:**
```javascript
1. Find matching HubSpot deal
2. Update matter_uid if number assigned
3. Update sync timestamp
```

**Benefit:** Keep HubSpot in sync with Smokeball changes

---

## 🔒 Webhook Security

### Authentication Methods:

**Option 1: API Key (Simple)**
```javascript
// Webhook handler checks:
const apiKey = req.headers['x-api-key'];
if (apiKey !== SMOKEBALL_CONFIG.apiKey) {
  return 401;
}
```

**Option 2: Signature Verification (Advanced)**
```javascript
// Smokeball signs payload with webhook key
const signature = req.headers['x-smokeball-signature'];
const expectedSignature = hmac_sha256(payload, webhookKey);
if (signature !== expectedSignature) {
  return 401;
}
```

**Current Implementation:** Uses API key validation (simpler)

---

## 🧪 Testing Webhooks (After Setup)

### Test matter.created:
1. Create a test lead in Smokeball manually
2. Check backend logs for webhook processing
3. Verify property details populated
4. Verify task created for Laura

### Test matter.converted:
1. Convert a test lead to matter in Smokeball
2. Check backend logs for webhook
3. Verify HubSpot deal updated with matter number

---

## 📂 File Structure

### Webhook Handler (Vercel):
```
backend/src/routes/smokeball-webhook.js
├── POST /webhook           - Main handler
├── GET /webhook/register   - Register with Smokeball
└── Helper functions:
    ├── handleMatterCreated()
    ├── handleMatterConverted()
    ├── handleMatterUpdated()
    ├── queuePostCreationTasks()
    ├── updatePropertyDetailsInMatter()
    └── createWelcomeCallTask()
```

### Supporting Functions:
```
backend/src/integrations/smokeball/matters.js
├── updateMatterLayout()    - Update property layout
├── registerWebhook()       - Register subscription
├── listWebhooks()          - List subscriptions
└── deleteWebhook()         - Delete subscription
```

---

## 🎯 Decision: Do You Need Webhooks?

### You DON'T Need Webhooks If:
- ✅ Direct API calls at Stage 3 work for your workflow
- ✅ Property details can be entered manually in Smokeball
- ✅ Tasks at Stage 3 (Quote Accepted) are fine

### You MIGHT Want Webhooks If:
- 🔄 You want property details auto-populated in Smokeball UI
- 🔄 You want tasks created earlier (Stage 1 vs Stage 3)
- 🔄 You want background processing for scalability
- 🔄 You convert leads to matters manually in Smokeball

---

## ⏱️ Webhook Setup Timeline

**Now:** Integration working fully ✅

**Week 1-2:** Use integration, collect feedback

**Week 3+:** If you want webhook enhancements:
1. Deploy backend to Vercel (15 min)
2. Register webhook URL (5 min)
3. Test webhook events (30 min)
4. Monitor and adjust (ongoing)

**Total Setup Time:** ~1 hour when ready

---

## 💡 Recommendation

### **Start Without Webhooks** ✅

1. ✅ Integration is fully functional now
2. ✅ All tests passing
3. ✅ Ready for production use
4. ✅ Works reliably via direct API calls

### **Add Webhooks Later** ⏳

After you've used the integration and confirmed it works:
- ⏳ Deploy to Vercel
- ⏳ Register webhook
- ⏳ Get background enhancements

**Don't block your launch waiting for webhooks!**

---

## 🎉 Summary

| Feature | Works Now (No Webhooks) | With Webhooks (Later) |
|---------|------------------------|----------------------|
| Lead creation | ✅ Stage 1 | ✅ Stage 1 |
| Contact creation | ✅ Stage 1 | ✅ Stage 1 |
| Staff assignment | ✅ Stage 1 | ✅ Stage 1 |
| Address updates | ✅ Stage 3 | ✅ Stage 3 |
| Lead → Matter | ✅ Stage 3 | ✅ Stage 3 |
| Welcome tasks | ✅ Stage 3 | ✅ Stage 1 (earlier) ⭐ |
| Property details | ❌ Manual | ✅ Auto-populated ⭐ |
| Matter number | ✅ Stage 3 capture | ✅ Auto-synced ⭐ |

**3 nice-to-have enhancements with webhooks, but everything works without them!**

---

## 📞 Questions?

**Q: Can I use the integration now without webhooks?**  
A: ✅ **YES!** Everything works via direct API calls.

**Q: What am I missing without webhooks?**  
A: Just optional background enhancements - not critical functionality.

**Q: When should I set up webhooks?**  
A: After deploying to Vercel and confirming the core integration works well.

**Q: Is webhook setup complex?**  
A: No - just one GET request to register. ~1 hour total.

**Q: Can I add webhooks later without breaking anything?**  
A: ✅ Yes! Webhooks are additive - they don't change existing functionality.

---

## ✅ You're Ready to Go!

**Your Smokeball integration is production-ready RIGHT NOW.**

Focus on:
1. ✅ Using the integration
2. ✅ Creating leads  
3. ✅ Testing the workflows
4. ✅ Getting user feedback

Add webhooks when you're ready for enhancements! 🚀

