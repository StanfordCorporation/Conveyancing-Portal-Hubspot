# DocuSign URL Configuration - Quick Setup

## 🎯 Current Status

Your backend is deployed at: `https://conveyancing-portal-backend-fxcn40ltp.vercel.app`

## ❌ Problem

You have these set to `localhost` which doesn't work in production:
- ❌ `DOCUSIGN_RETURN_URL=http://localhost:3000/signing-complete`
- ❌ `DOCUSIGN_PING_URL=http://localhost:3001/api/docusign/ping`
- ❌ **No webhook configured in DocuSign Connect**

## ✅ Solution

### 1. Update Vercel Environment Variables (Backend Project)

Go to: https://vercel.com/stanford-corporations-projects/conveyancing-portal-backend/settings/environment-variables

Add/Update these:

```bash
DOCUSIGN_PING_URL=https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/docusign/ping

DOCUSIGN_RETURN_URL=https://YOUR-FRONTEND-URL/client/signing-complete
```

**⚠️ Replace `YOUR-FRONTEND-URL` with your actual client portal URL!**

### 2. Configure DocuSign Connect (Webhook)

**This is the critical missing piece!**

1. **Log in to DocuSign**:
   - Demo: https://admindemo.docusign.com/
   - Production: https://admin.docusign.com/

2. **Navigate to Connect**:
   - Settings → Integrations → Connect
   - Or direct link: https://admindemo.docusign.com/connect

3. **Add New Configuration**:
   ```
   Configuration Name: HubSpot Deal Updates
   URL to Publish: https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/webhook/docusign
   
   Events to Send:
   ✅ Envelope Sent
   ✅ Envelope Delivered
   ✅ Envelope Completed
   ✅ Envelope Declined
   ✅ Envelope Voided
   ✅ Recipient Signed
   
   Include Data:
   ✅ Include Custom Fields (CRITICAL!)
   ✅ Include Certificate of Completion
   ✅ Include Envelope Status
   ```

4. **Save & Activate** the configuration

### 3. Redeploy Backend (to apply new env vars)

```bash
cd backend
vercel --prod
```

Or trigger a redeploy from Vercel dashboard.

---

## 🧪 Testing

### Test the Webhook Endpoint

```bash
cd backend
npm install node-fetch  # if not already installed
node test-docusign-webhook.js vercel YOUR_HUBSPOT_DEAL_ID
```

### Check if it's Working

1. **Complete a DocuSign envelope** with a real deal
2. **Check Vercel logs**:
   ```bash
   vercel logs --follow
   ```
   
   You should see:
   ```
   [DocuSign Webhook] 📥 Received envelope status update
   [DocuSign Webhook] 📋 Deal ID: 12345
   [DocuSign Webhook] ✍️ Envelope Status: completed
   ```

3. **Check HubSpot**: The deal should have updated `envelope_status` and `recipient_status` properties

---

## 📊 Understanding the Flow

### Embedded Signing Flow:

```
1. User clicks "Sign Document" in client portal
         ↓
2. Backend creates DocuSign envelope with embedded signing URL
         ↓
3. Frontend loads DocuSign iframe
         ↓
4. User signs document
         ↓
5. DocuSign redirects to DOCUSIGN_RETURN_URL
   → User's browser goes to: /client/signing-complete
         ↓
6. SigningComplete.jsx detects iframe and breaks out to dashboard
```

### Webhook Flow (Parallel):

```
1. User completes signing
         ↓
2. DocuSign Connect sends webhook to:
   https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/webhook/docusign
         ↓
3. Webhook extracts:
   - envelope_status (e.g., "completed")
   - hs_deal_id from custom fields
   - recipient_status (who signed)
         ↓
4. Updates HubSpot deal properties
         ↓
5. If all signers complete → progresses deal to "Funds Requested" stage
```

### Ping Flow (During Signing):

```
While user is signing...
         ↓
DocuSign periodically pings: DOCUSIGN_PING_URL
         ↓
Backend responds with 200 OK
         ↓
Keeps signing session alive
```

---

## 🔍 Troubleshooting

### "localhost refused to connect"

**Cause**: Environment variables still point to localhost

**Fix**: 
1. Update Vercel environment variables (see above)
2. Redeploy backend

### "No logs show webhook call"

**Cause**: DocuSign Connect not configured

**Fix**: Follow Step 2 above to configure Connect

### "Missing hs_deal_id in custom fields"

**Cause**: DocuSign Connect not set to include custom fields

**Fix**: In Connect configuration, enable "Include Custom Fields"

### "Failed to update HubSpot deal"

**Causes**:
- Deal ID doesn't exist
- HubSpot token expired
- Token lacks permissions

**Fix**: Check `HUBSPOT_ACCESS_TOKEN` environment variable

---

## 📝 Checklist

- [ ] Update `DOCUSIGN_PING_URL` on Vercel
- [ ] Update `DOCUSIGN_RETURN_URL` on Vercel (with frontend URL)
- [ ] Configure DocuSign Connect with webhook URL
- [ ] Enable "Include Custom Fields" in Connect
- [ ] Redeploy backend
- [ ] Test with mock payload: `node test-docusign-webhook.js vercel DEAL_ID`
- [ ] Test with real DocuSign envelope
- [ ] Verify deal updates in HubSpot
- [ ] Check Vercel logs show webhook calls

---

## 🚀 Quick Commands

```bash
# Check current environment variables
vercel env ls

# Add/update environment variable
vercel env add DOCUSIGN_PING_URL production
# Enter: https://conveyancing-portal-backend-fxcn40ltp.vercel.app/api/docusign/ping

vercel env add DOCUSIGN_RETURN_URL production
# Enter: https://YOUR-FRONTEND-URL/client/signing-complete

# Redeploy
vercel --prod

# Watch logs
vercel logs --follow

# Test webhook
node test-docusign-webhook.js vercel YOUR_DEAL_ID
```

---

## ❓ What's Your Frontend URL?

You still need to provide your **frontend/client portal URL** for `DOCUSIGN_RETURN_URL`.

Find it by running:
```bash
cd frontend/client-portal
vercel ls
```

Or check your Vercel dashboard for the client portal project.

