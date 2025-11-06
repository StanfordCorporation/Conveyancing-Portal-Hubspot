# Deployment Guide

## Overview

This guide covers deploying the Conveyancing Portal to production using a hybrid cloud architecture:

- **Frontend**: Cloudflare Pages
- **Backend API**: Vercel Serverless Functions
- **Webhooks**: Cloudflare Workers
- **DNS**: WP Engine or Cloudflare DNS

---

## Architecture Summary

```
DNS Configuration:

portal.stanfordlegal.com.au      → Cloudflare Pages (Frontend)
api.stanfordlegal.com.au         → Vercel (Backend API)
webhooks.stanfordlegal.com.au    → Cloudflare Workers (Webhooks)
```

---

## Prerequisites

### Accounts Required

1. **GitHub Account** - Code repository
2. **Cloudflare Account** - Frontend hosting & webhook workers
3. **Vercel Account** - Backend API hosting
4. **WP Engine Access** - DNS configuration (or use Cloudflare DNS)

### Access Credentials

1. **HubSpot** - Private Access Token
2. **DocuSign** - Integration Key, User ID, RSA Private Key
3. **Stripe** - Secret Key, Publishable Key, Webhook Secret
4. **Smokeball** - Client ID, Client Secret, API Key (optional)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/conveyancing-portal-hubspot.git
cd conveyancing-portal-hubspot
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Backend `.env` file:**
```bash
# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-au-xxx

# DocuSign
DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
DOCUSIGN_USER_ID=9bdab216-34d5-4f33-ab31-a72f850fde78
DOCUSIGN_ACCOUNT_ID=af8995ad-b134-4144-acc0-5ca58db8f759
DOCUSIGN_KEYPAIR_ID=69fb5ec8-a1e3-4b06-bdd4-0fb5c154a800
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_OAUTH_BASE_PATH=https://account-d.docusign.com

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Smokeball (Optional)
SMOKEBALL_CLIENT_ID=xxx
SMOKEBALL_CLIENT_SECRET=xxx
SMOKEBALL_API_KEY=xxx

# JWT
JWT_SECRET=your-random-secret-key
```

```bash
# Start development server
npm run dev

# Server runs on http://localhost:3001
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env
nano .env
```

**Frontend `.env` file:**
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

```bash
# Start development server
npm run dev

# Frontend runs on http://localhost:3000
```

### 4. Test Local Setup

Visit:
- Client Portal: http://localhost:3000
- Agent Portal: http://localhost:3000/agent
- Backend API: http://localhost:3001/api

---

## Production Deployment

### Step 1: Prepare Code Repository

```bash
# Initialize git (if not already)
git init

# Add remote repository
git remote add origin https://github.com/your-org/conveyancing-portal-hubspot.git

# Commit all code
git add .
git commit -m "Initial production setup"
git push origin main
```

### Step 2: Deploy Backend to Vercel

#### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 2.2 Login to Vercel

```bash
vercel login
```

#### 2.3 Deploy Backend

```bash
cd backend
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? Select your account
# - Link to existing project? N
# - What's your project's name? conveyancing-portal-backend
# - In which directory is your code located? ./
# - Want to override the settings? N

# Deploy to production
vercel --prod
```

#### 2.4 Configure Environment Variables in Vercel

Visit: https://vercel.com/your-account/conveyancing-portal-backend/settings/environment-variables

Add each variable from your local `.env`:

```
HUBSPOT_ACCESS_TOKEN=pat-au-xxx
DOCUSIGN_INTEGRATION_KEY=34d08817-3cbe-43ea-922f-348ae0dcd358
DOCUSIGN_USER_ID=9bdab216-34d5-4f33-ab31-a72f850fde78
DOCUSIGN_ACCOUNT_ID=af8995ad-b134-4144-acc0-5ca58db8f759
DOCUSIGN_KEYPAIR_ID=69fb5ec8-a1e3-4b06-bdd4-0fb5c154a800
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_BASE_PATH=https://na3.docusign.net/restapi
DOCUSIGN_OAUTH_BASE_PATH=https://account.docusign.com
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx (configure after webhook setup)
SMOKEBALL_CLIENT_ID=xxx
SMOKEBALL_CLIENT_SECRET=xxx
SMOKEBALL_API_KEY=xxx
JWT_SECRET=your-secure-random-secret
```

**Important:** Use **production** credentials (not test/demo)

#### 2.5 Redeploy Backend

```bash
vercel --prod
```

#### 2.6 Note Backend URL

Your backend will be available at:
```
https://conveyancing-portal-backend.vercel.app
```

---

### Step 3: Deploy Frontend to Cloudflare Pages

#### 3.1 Create Cloudflare Pages Project

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Pages**
3. Click **Create application** → **Connect to Git**
4. Select your GitHub repository
5. Configure build settings:
   - **Project name**: `stanford-portal`
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`

#### 3.2 Configure Environment Variables

In Cloudflare Pages project settings, add:

```
VITE_API_BASE_URL=https://api.stanfordlegal.com.au
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

#### 3.3 Deploy

Click **Save and Deploy**

Cloudflare will:
1. Clone your repository
2. Install dependencies
3. Run build command
4. Deploy to CDN

#### 3.4 Note Frontend URL

Your frontend will be available at:
```
https://stanford-portal.pages.dev
```

---

### Step 4: Deploy Webhooks to Cloudflare Workers

#### 4.1 Install Wrangler CLI

```bash
npm install -g wrangler
```

#### 4.2 Login to Cloudflare

```bash
wrangler login
```

#### 4.3 Create DocuSign Webhook Worker

Create `workers/docusign-webhook/src/index.js`:

```javascript
/**
 * Cloudflare Worker - DocuSign Webhook Handler
 * Receives DocuSign webhook events and updates HubSpot deals
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const payload = await request.json();
      console.info({ message: 'Received DocuSign webhook', payload });

      const envelope_status = payload.data.envelopeSummary.status;
      const dealID = payload.data.envelopeSummary.customFields.textCustomFields
        .find((obj) => obj.name === "hs_deal_id").value;
      const recipient_status = payload.data.envelopeSummary.recipients.signers
        .map(({ email, status }) => ({ email, status }));

      const hubspotToken = await env.HUBSPOT_ACCESS_TOKEN.get();

      const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealID}`;
      const hubspotPayload = {
        properties: {
          envelope_status,
          recipient_status: JSON.stringify(recipient_status)
        }
      };

      console.info({ 
        message: 'Sending PATCH to HubSpot', 
        dealID, 
        properties: { envelope_status, recipient_status } 
      });

      const hubspotResponse = await fetch(hubspotUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hubspotToken}`
        },
        body: JSON.stringify(hubspotPayload)
      });

      const responseData = await hubspotResponse.json();

      if (!hubspotResponse.ok) {
        console.error({ 
          message: 'HubSpot API error', 
          status: hubspotResponse.status, 
          data: responseData 
        });
        return new Response(JSON.stringify({
          error: 'Failed to update HubSpot deal',
          details: responseData
        }), {
          status: hubspotResponse.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.info({ message: 'Successfully updated HubSpot deal', dealID });

      return new Response(JSON.stringify({
        success: true,
        message: 'Deal updated successfully',
        dealId: dealID,
        hubspotResponse: responseData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error({ message: 'Error processing webhook', error: error.message });

      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
```

Create `workers/docusign-webhook/wrangler.toml`:

```toml
name = "stanford-docusign-webhook"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

# Secrets (set via wrangler secret put)
# HUBSPOT_ACCESS_TOKEN
```

#### 4.4 Deploy DocuSign Webhook

```bash
cd workers/docusign-webhook

# Set HubSpot token as secret
wrangler secret put HUBSPOT_ACCESS_TOKEN
# Paste your token when prompted

# Deploy worker
wrangler deploy
```

Worker will be available at:
```
https://stanford-docusign-webhook.workers.dev
```

#### 4.5 Create Stripe & Smokeball Workers (Similar Pattern)

Repeat steps 4.3-4.4 for:
- `workers/stripe-webhook/`
- `workers/smokeball-webhook/`

---

### Step 5: Configure DNS Records

#### Option A: Using Cloudflare DNS (Recommended)

1. Transfer domain to Cloudflare (or add as secondary DNS)
2. Add DNS records in Cloudflare Dashboard:

```
Type   Name       Target                                Proxy
CNAME  portal     stanford-portal.pages.dev             Yes
CNAME  api        conveyancing-portal-backend.vercel.app Yes
CNAME  webhooks   stanford-docusign-webhook.workers.dev  Yes
```

#### Option B: Using WP Engine DNS

1. Login to WP Engine Dashboard
2. Go to DNS Management
3. Add CNAME records:

```
portal      → stanford-portal.pages.dev
api         → conveyancing-portal-backend.vercel.app
webhooks    → stanford-docusign-webhook.workers.dev
```

**Note:** SSL certificates will be automatically provisioned by Cloudflare/Vercel

---

### Step 6: Configure Webhooks in External Services

#### 6.1 Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL:
   ```
   https://api.stanfordlegal.com.au/api/webhook/stripe
   ```
4. Select events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Click **Add endpoint**
6. Copy **Signing secret**: `whsec_xxx`
7. Add to Vercel environment variables:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   # Paste: whsec_xxx
   ```
8. Redeploy backend:
   ```bash
   vercel --prod
   ```

#### 6.2 DocuSign Event Notification

**Option A: Envelope-Level (Recommended)**

Add to envelope creation code in `backend/src/integrations/docusign/client.js`:

```javascript
eventNotification: {
  url: 'https://webhooks.stanfordlegal.com.au/docusign',
  loggingEnabled: true,
  requireAcknowledgment: true,
  envelopeEvents: [
    { envelopeEventStatusCode: 'sent' },
    { envelopeEventStatusCode: 'delivered' },
    { envelopeEventStatusCode: 'completed' },
    { envelopeEventStatusCode: 'declined' },
    { envelopeEventStatusCode: 'voided' }
  ],
  recipientEvents: [
    { recipientEventStatusCode: 'Sent' },
    { recipientEventStatusCode: 'Delivered' },
    { recipientEventStatusCode: 'Completed' },
    { recipientEventStatusCode: 'Declined' }
  ],
  customFields: {
    textCustomFields: [
      { name: 'hs_deal_id', value: dealId }
    ]
  }
}
```

**Option B: Account-Level (via DocuSign Admin)**

1. Go to DocuSign Admin → **Connect**
2. Click **Add Configuration** → **Custom**
3. Set Name: `Stanford Portal Webhooks`
4. Set URL: `https://webhooks.stanfordlegal.com.au/docusign`
5. Select events (same as above)
6. Enable logging
7. Save configuration

#### 6.3 Smokeball Webhooks

1. Use Smokeball API to register webhook:

```bash
# Script: register-smokeball-webhook.sh
curl -X POST https://api.smokeball.com.au/webhooks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stanford Portal - Matter Updates",
    "eventNotificationUrl": "https://api.stanfordlegal.com.au/api/webhook/smokeball",
    "eventTypes": [
      "matter.created",
      "matter.converted",
      "matter.updated"
    ]
  }'
```

---

### Step 7: Test Production Deployment

#### 7.1 Test Frontend

Visit: https://portal.stanfordlegal.com.au

Verify:
- [ ] Page loads correctly
- [ ] Assets loaded from CDN
- [ ] API calls work
- [ ] SSL certificate valid

#### 7.2 Test Backend API

```bash
curl https://api.stanfordlegal.com.au/health

# Should return: { "status": "healthy" }
```

#### 7.3 Test Webhooks

**Stripe:**
```bash
# Use Stripe CLI
stripe trigger payment_intent.succeeded --forward-to https://api.stanfordlegal.com.au/api/webhook/stripe
```

Verify in Stripe Dashboard → Webhooks → Recent deliveries → ✅ 200 response

**DocuSign:**
- Create and sign a test envelope
- Check Cloudflare Workers logs
- Verify HubSpot deal updated

**Smokeball:**
- Create a test matter in Smokeball
- Check backend logs
- Verify HubSpot deal updated

---

## CI/CD Setup with GitHub Actions

### 1. Create GitHub Secrets

Go to GitHub Repository → **Settings** → **Secrets and variables** → **Actions**

Add the following secrets:

```
VERCEL_TOKEN          → Get from Vercel Account Settings
CLOUDFLARE_API_TOKEN  → Get from Cloudflare Profile → API Tokens
VERCEL_ORG_ID         → From .vercel/project.json
VERCEL_PROJECT_ID     → From .vercel/project.json
```

### 2. Create Workflow Files

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Vercel

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Vercel CLI
        run: npm install -g vercel
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: backend
      
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: backend
      
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: backend
```

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Cloudflare Pages

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
        working-directory: frontend
      
      - name: Build
        run: npm run build
        working-directory: frontend
        env:
          VITE_API_BASE_URL: https://api.stanfordlegal.com.au
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy frontend/dist --project-name=stanford-portal
```

Create `.github/workflows/deploy-webhooks.yml`:

```yaml
name: Deploy Webhooks to Cloudflare Workers

on:
  push:
    branches: [main]
    paths: ['workers/**']

jobs:
  deploy-docusign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
          workingDirectory: workers/docusign-webhook
```

### 3. Test CI/CD

```bash
# Make a change
echo "# Test" >> backend/README.md

# Commit and push
git add .
git commit -m "Test CI/CD pipeline"
git push origin main

# Check GitHub Actions tab for deployment status
```

---

## Monitoring & Maintenance

### Application Logs

**Vercel:**
- Visit: https://vercel.com/your-account/conveyancing-portal-backend/logs
- Real-time function logs
- Error tracking

**Cloudflare Workers:**
- Visit: Cloudflare Dashboard → Workers & Pages → Select worker → Logs
- Tail logs: `wrangler tail`

**Cloudflare Pages:**
- Build logs in Cloudflare Dashboard
- Analytics in Workers & Pages → Analytics

### Performance Monitoring

**Vercel Analytics:**
- Enable in Vercel Dashboard
- View performance metrics, Core Web Vitals

**Cloudflare Web Analytics:**
- Enable in Cloudflare Dashboard
- Privacy-friendly analytics (no cookies)

### Error Tracking (Optional)

**Sentry Integration:**

```bash
npm install @sentry/node @sentry/browser
```

Initialize in backend & frontend:

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production'
});
```

---

## Troubleshooting

### Frontend Not Loading

1. Check Cloudflare Pages build logs
2. Verify DNS CNAME record
3. Check SSL certificate status
4. Verify environment variables set correctly

### Backend API Errors

1. Check Vercel function logs
2. Verify environment variables in Vercel dashboard
3. Test API endpoints directly
4. Check CORS configuration

### Webhooks Not Working

1. Verify webhook URL accessible publicly
2. Check webhook signature verification
3. Review Cloudflare Workers logs
4. Test with webhook testing tools (webhook.site)

### Database/HubSpot Issues

1. Verify HubSpot access token valid
2. Check API rate limits
3. Verify custom properties exist
4. Check network connectivity

---

## Rollback Procedures

### Backend Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Frontend Rollback

1. Go to Cloudflare Pages → Deployments
2. Find previous successful deployment
3. Click **...** → **Rollback to this deployment**

### Workers Rollback

```bash
cd workers/docusign-webhook
wrangler rollback
```

---

## Security Checklist

- [ ] All environment variables stored securely (not in code)
- [ ] HTTPS enforced on all domains
- [ ] Webhook signatures verified
- [ ] API rate limiting enabled
- [ ] CORS configured correctly
- [ ] Private keys encrypted
- [ ] Regular security updates (npm audit)
- [ ] Access tokens rotated regularly
- [ ] Logs monitored for suspicious activity

---

## Cost Estimate (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| **Cloudflare Pages** | Free | $0 |
| **Cloudflare Workers** | Free (< 100k requests) | $0 |
| **Vercel** | Hobby (< 100GB bandwidth) | $0 |
| **GitHub** | Free | $0 |
| **HubSpot** | Existing subscription | Included |
| **DocuSign** | Existing subscription | Included |
| **Stripe** | Pay-per-transaction | 1.75% + 30¢ |
| **Smokeball** | Existing subscription | Included |
| **Total** | | **~$0/month** |

**Scalability:**
- Cloudflare Workers: Upgrade to $5/month for 10M requests
- Vercel: Upgrade to Pro ($20/month) for 1TB bandwidth
- No additional infrastructure costs

---

## Support & Maintenance

**Production Support:**
- Monitor error logs daily
- Review webhook delivery status
- Check system health metrics
- Update dependencies monthly
- Security patches immediately

**Backup Strategy:**
- Code: Git repository (GitHub)
- Data: HubSpot (automatic backups)
- Environment variables: Documented in `.env.example`

**Documentation:**
- Keep this guide updated
- Document all configuration changes
- Maintain changelog of deployments

