# ⚡ Smokeball Webhook - Vercel Setup (3 Steps - 5 Minutes)

## 🎯 Quick Setup Checklist

Your backend is already deployed on Vercel. Setting up the webhook is just **3 simple steps**:

---

## ☐ Step 1: Verify Smokeball OAuth (30 seconds)

**Check if authenticated:**

Visit in your browser:
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/status
```

**✅ If you see:**
```json
{
  "authenticated": true,
  "tokenValid": true,
  ...
}
```
→ **Skip to Step 2!**

**❌ If you see:**
```json
{
  "authenticated": false,
  ...
}
```
→ **Complete OAuth first:**

Visit:
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/setup
```

Then click the authorization link and log in to Smokeball.

---

## ☐ Step 2: Register Webhook with Smokeball (1 click)

**Visit this URL in your browser:**
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
```

**✅ Expected Response:**
```json
{
  "success": true,
  "subscriptionId": "abc-123-def-456-ghi-789",
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

**📝 IMPORTANT:** Save the `subscriptionId` somewhere safe (e.g., in a note).

**❌ If you get an error:**
- Check Step 1 - make sure OAuth is authenticated
- Check Vercel logs for error details

---

## ☐ Step 3: Test the Webhook (2 minutes)

### Test Method 1: Create a Lead from Agent Portal

1. Open: `https://frontend-blue-sigma-57.vercel.app`
2. Log in as agent
3. Create a new test lead
4. Check Vercel logs

### Test Method 2: Send Test Webhook

Use curl to send a test webhook:

```bash
curl -X POST https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: NO5glMfrqP5BuwxPgnqsp7hKzeU5p2Tw7jhPqjC2" \
  -d '{
    "type": "matter.created",
    "payload": {
      "id": "test-matter-123",
      "isLead": true,
      "number": null,
      "status": "Open"
    }
  }'
```

**✅ Expected Response:**
```json
{
  "success": true,
  "message": "matter.created processed",
  "matterId": "test-matter-123",
  "dealId": null
}
```

(dealId will be null for test since no matching HubSpot deal exists)

### View Logs:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **conveyancing-portal-backend**
3. Click **Logs** tab
4. You should see:
   ```
   [Smokeball Webhook] 📨 Received webhook: matter.created
   [Smokeball Webhook] Processing...
   ```

---

## ✅ That's It! Webhook is Active!

Smokeball will now send events to your Vercel backend automatically:

- 📨 **matter.created** → Property details populated + Welcome task created
- 📨 **matter.converted** → Matter number auto-synced to HubSpot
- 📨 **matter.updated** → Sync timestamp updated

---

## 🎯 What Happens Now

### Every Time You Create a Lead:

```
1. Lead created in Smokeball
   ↓
2. Smokeball sends matter.created webhook
   ↓
3. Your Vercel backend receives it (within seconds)
   ↓
4. Backend processes in background:
   ✨ Property address parsed into components
   ✨ Property layout updated in Smokeball
   ✨ Welcome call task created for Laura
   ↓
5. Done! (Happens automatically in background)
```

### Every Time a Lead Converts to Matter:

```
1. Lead → Matter conversion happens (Stage 3 or manual)
   ↓
2. Smokeball assigns matter number "2025-CV-001"
   ↓
3. Smokeball sends matter.converted webhook
   ↓
4. Your Vercel backend receives it
   ↓
5. Backend updates HubSpot:
   ✨ matter_uid = "2025-CV-001"
   ✨ smokeball_sync_status = "Successfull"
   ↓
6. Done! (No manual syncing needed)
```

---

## 📊 Monitoring Webhooks

### View Webhook Activity:

**Vercel Dashboard:**
```
1. Go to conveyancing-portal-backend
2. Click "Logs"
3. Filter by: "/smokeball/webhook"
4. See real-time webhook processing
```

**Healthy Logs Look Like:**
```
[Smokeball Webhook] 📨 Received webhook: matter.created
[Smokeball Webhook] ✅ Found HubSpot deal: 123456
[Smokeball Webhook] 📍 Updating property details...
[Smokeball Webhook] ✅ Property details updated
[Smokeball Webhook] 📞 Creating welcome call task...
[Smokeball Webhook] ✅ Welcome call task created for Laura
```

---

## 🔧 Managing Webhooks

### List Active Webhooks:

Visit:
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhooks/list
```

Should show 1 active subscription.

### Delete Webhook (if needed):

```bash
curl -X DELETE https://conveyancing-portal-backend.vercel.app/api/smokeball/webhooks/{subscriptionId}
```

Replace `{subscriptionId}` with the ID from Step 2.

### Re-register Webhook:

Just visit Step 2 URL again - it will create a new subscription.

---

## ❓ FAQ

**Q: Is the webhook required for Smokeball integration to work?**  
A: ❌ No! Integration works fully without webhooks via direct API calls.

**Q: What do webhooks add?**  
A: ✨ Background enhancements: property auto-population, earlier task creation, auto matter number sync.

**Q: Can I set this up later?**  
A: ✅ Yes! You can add webhooks anytime. Current integration works great without them.

**Q: How do I know if webhook is working?**  
A: Check Vercel logs after creating a lead - should see webhook processing logs.

**Q: What if webhook fails?**  
A: Integration still works! Webhooks are additive - direct API calls handle critical functionality.

---

## 🎉 Summary

**Setup Time:** 5 minutes  
**Complexity:** One URL visit  
**Benefit:** Automatic background processing

**Ready?** Just visit:
```
https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
```

And you're done! 🚀

---

## 📞 Next Steps After Setup

1. ✅ Webhook registered
2. ✅ Create test leads to verify it works
3. ✅ Monitor Vercel logs for webhook activity
4. ✅ Check Smokeball for auto-populated property details
5. ✅ Verify Laura gets welcome tasks
6. ✅ Go live! 🎊

