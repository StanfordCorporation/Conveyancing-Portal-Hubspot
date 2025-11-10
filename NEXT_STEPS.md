# 🎯 Next Steps - Vercel Deployment & GitHub Integration

## Overview

Your backend and frontend are **already deployed on Vercel**! ✅

The remaining tasks will:
1. **Connect your Vercel projects to GitHub** (enables automatic deployments)
2. **Configure webhooks** to use your Vercel backend
3. **Set up production monitoring**

This is a simplified guide focusing on **Vercel-only deployment** (no Cloudflare needed).

---

## ✅ What's Been Completed

1. ✅ **Backend deployed to Vercel** - conveyancing-portal-backend.vercel.app
2. ✅ **Frontend deployed to Vercel** - frontend-blue-sigma-57.vercel.app
3. ✅ **DocuSign webhook endpoint created** - `/api/webhook/docusign`
4. ✅ **Stripe webhook endpoint** - `/api/webhook/stripe`
5. ✅ **Smokeball webhook endpoint** - `/api/smokeball/webhook` (November 10, 2025)
6. ✅ **Smokeball Integration Fixed** - Complete rewrite matching old PHP code (November 10, 2025)
7. ✅ **DocuSign Primary Seller Bug Fixed** - Authenticated user always shown as primary signer (November 10, 2025)
8. ✅ **Agency Owner Features** - First agent auto-admin, team management (November 7, 2025)
9. ✅ **Client Dashboard Auth Fix** - Fixed localStorage key mismatch (November 7, 2025)
10. ✅ **Rates Notice Skip Option** - Added checkbox to skip section 5 (November 7, 2025)
11. ✅ **GitHub Repository** - https://github.com/StanfordCorporation/Conveyancing-Portal-Hubspot.git

---

## 📋 Manual Tasks Checklist

Complete these tasks in order:

### Step 1: Connect Vercel Projects to GitHub ⏳

**Priority:** CRITICAL
**Time Required:** 10 minutes

This enables **automatic deployments** whenever you push to GitHub.

#### Backend Connection:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **conveyancing-portal-backend** project
3. Click **"Connect Git Repository"** button (shown in your screenshot)
4. Select **GitHub**
5. Select repository: **StanfordCorporation/Conveyancing-Portal-Hubspot**
6. Configure:
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** (leave blank - no build needed for Node.js)
   - **Output Directory:** (leave blank)
   - **Install Command:** `npm install`
7. Click **Connect**

#### Frontend Connection:

1. Go back to Vercel Dashboard
2. Click on **frontend** project
3. Click **"Connect Git Repository"**
4. Select **GitHub**
5. Select repository: **StanfordCorporation/Conveyancing-Portal-Hubspot**
6. Configure:
   - **Root Directory:** `frontend/client-portal`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
7. Click **Connect**

**Verification:**
- [ ] Backend project shows GitHub icon and repo name
- [ ] Frontend project shows GitHub icon and repo name
- [ ] Both projects show "Connected to Git"

---

### Step 2: Configure Backend Environment Variables ⏳

**Priority:** CRITICAL
**Time Required:** 10 minutes

Ensure all environment variables are set in Vercel:

1. Go to **conveyancing-portal-backend** → Settings → Environment Variables
2. Verify these variables exist (if not, add them):

```bash
# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-au-xxx

# DocuSign
DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
DOCUSIGN_USER_ID=9bdab216-34d5-4f33-ab31-a72f850fde78
DOCUSIGN_ACCOUNT_ID=af8995ad-b134-4144-acc0-5ca58db8f759
DOCUSIGN_KEYPAIR_ID=69fb5ec8-a1e3-4b06-bdd4-0fb5c154a800
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# IMPORTANT: Use PRODUCTION URLs (not demo)
DOCUSIGN_BASE_PATH=https://na3.docusign.net/restapi
DOCUSIGN_OAUTH_BASE_PATH=https://account.docusign.com

# Stripe (use PRODUCTION keys)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Configure after Step 5

# Smokeball
SMOKEBALL_CLIENT_ID=xxx
SMOKEBALL_CLIENT_SECRET=xxx
SMOKEBALL_API_KEY=xxx

# Security
JWT_SECRET=your-secure-random-secret

# CORS (add Vercel frontend URL)
FRONTEND_URL=https://frontend-blue-sigma-57.vercel.app
```

3. Click **Save**
4. **Redeploy:** Go to Deployments tab → Click "⋯" on latest → Redeploy

**Verification:**
- [ ] All environment variables configured
- [ ] Production URLs used (not demo/test)
- [ ] Redeployment successful

---

### Step 3: Configure Frontend Environment Variables ⏳

**Priority:** HIGH
**Time Required:** 5 minutes

1. Go to **frontend** project → Settings → Environment Variables
2. Add these variables:

```bash
# Backend API (your Vercel backend URL)
VITE_API_BASE_URL=https://conveyancing-portal-backend.vercel.app

# Stripe (production publishable key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

3. Click **Save**
4. **Redeploy:** Deployments tab → Redeploy latest

**Verification:**
- [ ] Frontend can connect to backend API
- [ ] Stripe checkout works
- [ ] No CORS errors in browser console

---

### Step 4: Update DocuSign Webhook URL ⏳

**Priority:** HIGH
**Time Required:** 5 minutes

Point DocuSign webhooks to your Vercel backend:

1. **Update your backend `.env` file:**
   ```bash
   # backend/.env
   DOCUSIGN_WEBHOOK_URL=https://conveyancing-portal-backend.vercel.app/api/webhook/docusign
   ```

2. **Commit and push to GitHub:**
   ```bash
   git add backend/.env
   git commit -m "chore: Update DocuSign webhook URL to Vercel backend"
   git push origin main
   ```

3. **Auto-deployment will trigger!** ✨
   - Vercel will detect the push
   - Automatically rebuild and redeploy
   - Check Deployments tab to monitor progress

**Verification:**
- [ ] Webhook URL updated
- [ ] GitHub push triggered auto-deployment
- [ ] Deployment successful
- [ ] DocuSign sends events to Vercel endpoint

---

### Step 5: Configure Smokeball Webhook ⏳

**Priority:** MEDIUM (Optional - integration works without it)
**Time Required:** 2 minutes

**Note:** Smokeball integration is **fully functional without webhooks**. Webhooks add optional background enhancements.

**Setup:**

1. **Verify Smokeball OAuth is authenticated:**
   ```bash
   curl https://conveyancing-portal-backend.vercel.app/api/smokeball/status
   ```
   
   Should return: `{ "authenticated": true }`
   
   If not, complete OAuth first at: `https://conveyancing-portal-backend.vercel.app/api/smokeball/setup`

2. **Register webhook with Smokeball (ONE CLICK):**
   
   Visit in your browser:
   ```
   https://conveyancing-portal-backend.vercel.app/api/smokeball/webhook/register
   ```

3. **Save the subscription ID** from the response

4. **Test it:**
   - Create a test lead in HubSpot from agent portal
   - Check Vercel logs: `conveyancing-portal-backend → Logs`
   - Look for: `[Smokeball Webhook] 📨 Received webhook`

**What Webhook Adds:**
- ✨ Property details auto-populated in Smokeball UI
- ✨ Welcome call task created immediately at Stage 1
- ✨ Matter number auto-synced when conversion happens

**Verification:**
- [ ] Smokeball webhook registered
- [ ] Subscription ID saved
- [ ] Webhook receives events (check Vercel logs)
- [ ] Property details populate automatically
- [ ] Tasks created for Laura

**📚 Detailed Guide:** See `SMOKEBALL_WEBHOOK_VERCEL_SETUP.md`

---

### Step 6: Configure Stripe Webhook ⏳

**Priority:** HIGH
**Time Required:** 10 minutes

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL:
   ```
   https://conveyancing-portal-backend.vercel.app/api/webhook/stripe
   ```
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Click **Add endpoint**
6. **Copy the Signing Secret** (starts with `whsec_`)
7. Add to Vercel backend:
   - Go to backend project → Settings → Environment Variables
   - Add: `STRIPE_WEBHOOK_SECRET` = `whsec_xxx`
8. Redeploy backend (Deployments → Redeploy)

**Verification:**
- [ ] Webhook endpoint created in Stripe
- [ ] Signing secret configured in Vercel
- [ ] Test payment triggers webhook successfully

---

### Step 7: Test Webhooks ⏳

**Priority:** MEDIUM
**Time Required:** 20 minutes

#### Test DocuSign Webhook:

1. **Use webhook.site for initial testing:**
   ```bash
   # Temporarily change in backend/.env
   DOCUSIGN_WEBHOOK_URL=https://webhook.site/your-unique-url
   ```

2. **Create and sign test envelope:**
   - Login to client portal
   - Start signing process
   - Complete signature
   - Check webhook.site for received events

3. **Verify payload includes:**
   - `data.envelopeSummary.status`
   - `data.envelopeSummary.customFields.textCustomFields` (contains `hs_deal_id`)
   - `data.envelopeSummary.recipients.signers`

4. **Switch back to Vercel URL:**
   ```bash
   DOCUSIGN_WEBHOOK_URL=https://conveyancing-portal-backend.vercel.app/api/webhook/docusign
   ```

#### Test Stripe Webhook:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select `payment_intent.succeeded`
5. Check Vercel logs for successful processing

**Verification:**
- [ ] DocuSign webhook receives events
- [ ] HubSpot deal updates with envelope status
- [ ] Stripe webhook processes payments
- [ ] All webhook logs show success

---

### Step 8: Set Up Custom Domains (Optional) ⏳

**Priority:** LOW
**Time Required:** 30 minutes + DNS propagation

If you want custom domains like `portal.stanfordlegal.com.au`:

#### Backend Domain:

1. Go to **conveyancing-portal-backend** → Settings → Domains
2. Click **Add Domain**
3. Enter: `api.stanfordlegal.com.au`
4. Add DNS record (CNAME):
   ```
   api.stanfordlegal.com.au → cname.vercel-dns.com
   ```
5. Wait for SSL certificate (automatic)

#### Frontend Domain:

1. Go to **frontend** → Settings → Domains
2. Click **Add Domain**
3. Enter: `portal.stanfordlegal.com.au`
4. Add DNS record (CNAME):
   ```
   portal.stanfordlegal.com.au → cname.vercel-dns.com
   ```
5. Wait for SSL certificate

#### Update URLs After Domain Setup:

1. Backend `.env`:
   ```bash
   DOCUSIGN_WEBHOOK_URL=https://api.stanfordlegal.com.au/api/webhook/docusign
   FRONTEND_URL=https://portal.stanfordlegal.com.au
   ```

2. Frontend env variables:
   ```bash
   VITE_API_BASE_URL=https://api.stanfordlegal.com.au
   ```

3. Update Stripe webhook URL to `https://api.stanfordlegal.com.au/api/webhook/stripe`

**Verification:**
- [ ] Custom domains resolve correctly
- [ ] SSL certificates issued (automatic)
- [ ] All services use custom domains

---

### Step 9: Enable Vercel Production Protection ⏳

**Priority:** MEDIUM
**Time Required:** 5 minutes

Protect your production environment:

1. Go to each project → Settings → Deployment Protection
2. Enable:
   - **Vercel Authentication** - Require login to access deployments
   - **Password Protection** - Add password for preview deployments
3. Configure allowed domains for production

**Verification:**
- [ ] Preview deployments require password
- [ ] Production deployment accessible
- [ ] No unauthorized access

---

### Step 10: Set Up Production Monitoring ⏳

**Priority:** MEDIUM
**Time Required:** 15 minutes

Monitor your Vercel deployments:

#### Vercel Built-in Monitoring:

1. Go to each project → **Analytics**
2. Enable:
   - Function invocations tracking
   - Error tracking
   - Performance monitoring

#### Logging:

1. Go to each project → **Logs**
2. Configure log drains (optional):
   - Send logs to external service (Datadog, Logtail, etc.)

#### Alerts:

1. Go to **Integrations** → **Add Integration**
2. Add **Slack** or **Email** notifications for:
   - Deployment failures
   - Function errors
   - Performance issues

**Verification:**
- [ ] Analytics enabled
- [ ] Error tracking active
- [ ] Alerts configured

---

### Step 11: End-to-End Testing ⏳

**Priority:** HIGH
**Time Required:** 30 minutes

**Test Complete Workflow:**

```
1. Create Deal in HubSpot
   ↓
   Verify: Smokeball lead created

2. Progress to Stage 3 (Quote Accepted)
   ↓
   Verify: Smokeball tasks created for Laura

3. Progress to Stage 4 (Awaiting Retainer)
   ↓
   Sign document via DocuSign
   ↓
   Verify: Webhook received by Vercel backend
   ↓
   Verify: HubSpot deal updated with envelope_status
   ↓
   Verify: Deal progressed to Stage 5 (Funds Requested)

4. Make Payment via Stripe
   ↓
   Verify: Stripe webhook received
   ↓
   Verify: Deal progressed to Stage 6 (Funds Provided)
   ↓
   Verify: Payment receipted in Smokeball

5. Check All Logs
   ↓
   Vercel: Function execution logs
   ↓
   Stripe: Webhook delivery status
   ↓
   HubSpot: Deal timeline updated
```

**Verification Checklist:**
- [ ] Deal creation triggers Smokeball lead
- [ ] DocuSign signing triggers webhook
- [ ] Envelope status updates in HubSpot
- [ ] Stage progression works automatically
- [ ] Payment triggers Stripe webhook
- [ ] Payment receipted in Smokeball
- [ ] All logs show successful operations
- [ ] No errors in any system

---

## 🚀 GitHub Actions for Auto-Deployment (Optional)

If you want GitHub Actions to trigger Vercel deployments (alternative to Vercel's built-in Git integration):

### Create `.github/workflows/deploy-vercel.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy Backend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./backend
          vercel-args: '--prod'

      - name: Deploy Frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID_FRONTEND }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_FRONTEND }}
          working-directory: ./frontend/client-portal
          vercel-args: '--prod'
```

### GitHub Secrets Needed:

```
VERCEL_TOKEN                 # From vercel.com/account/tokens
VERCEL_ORG_ID               # Backend org ID
VERCEL_PROJECT_ID           # Backend project ID
VERCEL_ORG_ID_FRONTEND      # Frontend org ID
VERCEL_PROJECT_ID_FRONTEND  # Frontend project ID
```

**Note:** Vercel's built-in GitHub integration is simpler and recommended for most use cases.

---

## 🎯 Recommended Execution Order

**Week 1:**
1. ☐ Connect Vercel Projects to GitHub (Step 1)
2. ☐ Configure Backend Environment Variables (Step 2)
3. ☐ Configure Frontend Environment Variables (Step 3)
4. ☐ Update DocuSign Webhook URL (Step 4)
5. ☐ Configure Smokeball Webhook (Step 5) - Optional but recommended
6. ☐ Configure Stripe Webhook (Step 6)

**Week 2:**
7. ☐ Test All Webhooks (Step 7)
8. ☐ Set Up Custom Domains (Step 8) - Optional
9. ☐ Enable Production Protection (Step 9)
10. ☐ Set Up Monitoring (Step 10)

**Week 3:**
11. ☐ End-to-End Testing (Step 11)
12. ☐ Go Live! 🎉

---

## ⚠️ Important Notes

### Before Going Live

1. **Use Production Credentials:**
   - ✅ DocuSign: Use `na3.docusign.net` (NOT demo)
   - ✅ Stripe: Use `sk_live_xxx` and `pk_live_xxx` (NOT test keys)
   - ✅ HubSpot: Verify production account

2. **Security Check:**
   - [ ] All `.env` files in `.gitignore`
   - [ ] No sensitive data in repository
   - [ ] Webhook signatures verified
   - [ ] HTTPS enforced on all domains
   - [ ] Environment variables in Vercel (not in code)

3. **Backup Current System:**
   - Export current data
   - Document current HubSpot configuration
   - Take screenshots of current workflows

### Webhook URLs Reference

Once deployed, your webhook endpoints will be:

```bash
# DocuSign
https://conveyancing-portal-backend.vercel.app/api/webhook/docusign

# Stripe
https://conveyancing-portal-backend.vercel.app/api/webhook/stripe

# Smokeball (if using)
https://conveyancing-portal-backend.vercel.app/api/webhook/smokeball
```

After custom domain setup:
```bash
https://api.stanfordlegal.com.au/api/webhook/docusign
https://api.stanfordlegal.com.au/api/webhook/stripe
https://api.stanfordlegal.com.au/api/webhook/smokeball
```

---

## 📞 Support Resources

**Vercel Documentation:**
- [Deploying with Git](https://vercel.com/docs/deployments/git)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Custom Domains](https://vercel.com/docs/custom-domains)
- [Serverless Functions](https://vercel.com/docs/serverless-functions)

**External Resources:**
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [DocuSign Connect](https://developers.docusign.com/platform/webhooks/connect/)

**Troubleshooting:**
- Check Vercel function logs: Project → Logs
- Check Vercel deployment logs: Project → Deployments
- Monitor webhook delivery: Stripe/DocuSign dashboards

---

## 🎉 You're 80% Complete!

**Completed:** Backend + Frontend deployed on Vercel ✅
**Remaining:** Connect to GitHub & configure webhooks

Everything is already built and deployed - just needs to be connected!

---

**Ready to proceed? Start with Step 1 and work through the checklist above.**

Good luck! 🚀
