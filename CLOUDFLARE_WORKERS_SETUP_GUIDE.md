# Cloudflare Workers Webhook Setup Guide

## Overview

This guide shows how to deploy Cloudflare Workers as high-availability webhook receivers for DocuSign, Stripe, and Smokeball.

---

## 🎯 Architecture Options

### Option A: Single Worker (All Webhooks)
```
webhooks.stanfordlegal.com.au/docusign  ──┐
webhooks.stanfordlegal.com.au/stripe    ──┼─→ One Worker
webhooks.stanfordlegal.com.au/smokeball ──┘   (Path-based routing)
```

**Pros:** Single deployment, shared code, simpler management  
**Cons:** All webhooks go down if worker fails

### Option B: Separate Workers (Recommended)
```
webhooks.stanfordlegal.com.au/docusign  → DocuSign Worker
webhooks.stanfordlegal.com.au/stripe    → Stripe Worker
webhooks.stanfordlegal.com.au/smokeball → Smokeball Worker
```

**Pros:** Isolated failures, independent scaling, easier debugging  
**Cons:** More deployments, slight duplication

**We'll use Option B** (already created in `workers/` folder)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Project Structure (Already Created)

```
workers/
├── docusign-webhook/
│   ├── src/index.js       ✅ Created
│   └── wrangler.toml      ✅ Created
├── stripe-webhook/
│   ├── src/index.js       ⏳ To create
│   └── wrangler.toml      ⏳ To create
└── smokeball-webhook/
    ├── src/index.js       ⏳ To create
    └── wrangler.toml      ⏳ To create
```

---

## 📦 Step 1: Complete Worker Implementations

### DocuSign Worker (Already Created ✅)

File: `workers/docusign-webhook/src/index.js`

**Current implementation is good!** It already:
- ✅ Receives POST requests
- ✅ Extracts envelope status
- ✅ Gets deal ID from custom fields
- ✅ Updates HubSpot directly
- ✅ Returns 200 response

**Enhancement Needed:** Add signature verification

```javascript
// Add to existing code
async function verifyDocuSignSignature(payload, signature, key) {
  if (!signature || !key) return true; // Skip if not configured
  
  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(JSON.stringify(payload));
  const computedSignature = hmac.digest('base64');
  
  return computedSignature === signature;
}

// In fetch handler, before processing:
const signature = request.headers.get('X-DocuSign-Signature-1');
const isValid = await verifyDocuSignSignature(payload, signature, env.DOCUSIGN_HMAC_KEY);

if (!isValid) {
  return new Response(JSON.stringify({ error: 'Invalid signature' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

### Stripe Worker (To Create)

File: `workers/stripe-webhook/src/index.js`

```javascript
/**
 * Cloudflare Worker - Stripe Webhook Handler
 * Receives Stripe payment events and updates HubSpot deals
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
      // Get raw body for signature verification
      const rawBody = await request.text();
      const signature = request.headers.get('stripe-signature');
      
      // Verify Stripe signature
      const isValid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const payload = JSON.parse(rawBody);
      console.info({ message: 'Received Stripe webhook', type: payload.type });

      // Handle different event types
      if (payload.type === 'payment_intent.succeeded') {
        const paymentIntent = payload.data.object;
        const dealId = paymentIntent.metadata.dealId;
        const amount = (paymentIntent.amount / 100).toFixed(2);
        
        // Update HubSpot
        const hubspotToken = await env.HUBSPOT_ACCESS_TOKEN;
        const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
        
        await fetch(hubspotUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hubspotToken}`
          },
          body: JSON.stringify({
            properties: {
              payment_status: 'Paid',
              payment_amount: amount,
              payment_date: new Date().toISOString().split('T')[0],
              stripe_payment_intent_id: paymentIntent.id,
              dealstage: '1904359900' // FUNDS_PROVIDED
            }
          })
        });
        
        console.info({ message: 'HubSpot updated', dealId, amount });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });

    } catch (error) {
      console.error({ message: 'Error processing Stripe webhook', error: error.message });

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

/**
 * Verify Stripe webhook signature (HMAC-SHA256)
 */
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
  const signature = parts.find(p => p.startsWith('v1=')).split('=')[1];
  
  const payload = `${timestamp}.${rawBody}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return computedSignature === signature;
}
```

File: `workers/stripe-webhook/wrangler.toml`

```toml
name = "stanford-stripe-webhook"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

# Secrets (set via: wrangler secret put)
# HUBSPOT_ACCESS_TOKEN
# STRIPE_WEBHOOK_SECRET

[env.production]
name = "stanford-stripe-webhook"
routes = [
  { pattern = "webhooks.stanfordlegal.com.au/stripe", zone_name = "stanfordlegal.com.au" }
]
```

---

### Smokeball Worker (To Create)

File: `workers/smokeball-webhook/src/index.js`

```javascript
/**
 * Cloudflare Worker - Smokeball Webhook Handler
 * Receives Smokeball matter events and updates HubSpot deals
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
      console.info({ message: 'Received Smokeball webhook', eventType: payload.eventType });

      const eventType = payload.eventType;
      const matterData = payload.data;
      
      // Get HubSpot token
      const hubspotToken = await env.HUBSPOT_ACCESS_TOKEN;
      
      // Find deal by smokeball_lead_uid using direct lookup
      const dealUrl = `https://api.hubapi.com/crm/v3/objects/deals/${matterData.id}?idProperty=smokeball_lead_uid&properties=dealname,smokeball_lead_uid,matter_uid`;
      const dealResponse = await fetch(dealUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hubspotToken}`
        }
      });
      
      if (dealResponse.status === 404) {
        console.warn({ message: 'No deal found', leadUid: matterData.id });
        return new Response(JSON.stringify({ received: true, warning: 'No matching deal' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const deal = await dealResponse.json();
      
      // Update based on event type
      let updates = {};
      
      switch (eventType) {
        case 'matter.created':
          updates = {
            smokeball_last_sync: new Date().toISOString()
          };
          break;
          
        case 'matter.converted':
          updates = {
            lead_uid: matterData.id,
            matter_uid: matterData.number,
            smokeball_sync_status: 'synced',
            smokeball_last_sync: new Date().toISOString()
          };
          break;
          
        case 'matter.updated':
          updates = {
            smokeball_last_sync: new Date().toISOString()
          };
          break;
      }
      
      // Update HubSpot deal
      if (Object.keys(updates).length > 0) {
        await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${deal.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hubspotToken}`
          },
          body: JSON.stringify({ properties: updates })
        });
        
        console.info({ message: 'HubSpot updated', dealId: deal.id, eventType });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });

    } catch (error) {
      console.error({ message: 'Error processing Smokeball webhook', error: error.message });

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

File: `workers/smokeball-webhook/wrangler.toml`

```toml
name = "stanford-smokeball-webhook"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

# Secrets (set via: wrangler secret put)
# HUBSPOT_ACCESS_TOKEN

[env.production]
name = "stanford-smokeball-webhook"
routes = [
  { pattern = "webhooks.stanfordlegal.com.au/smokeball", zone_name = "stanfordlegal.com.au" }
]
```

---

## 🔐 Step 2: Configure Secrets

For each worker, set the required secrets:

### DocuSign Worker

```bash
cd workers/docusign-webhook

# Set HubSpot token
wrangler secret put HUBSPOT_ACCESS_TOKEN
# Paste your token when prompted

# Optional: Set HMAC key for signature verification
wrangler secret put DOCUSIGN_HMAC_KEY
# Paste your DocuSign Connect HMAC key
```

### Stripe Worker

```bash
cd workers/stripe-webhook

# Set HubSpot token
wrangler secret put HUBSPOT_ACCESS_TOKEN

# Set Stripe webhook secret
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_xxx from Stripe dashboard
```

### Smokeball Worker

```bash
cd workers/smokeball-webhook

# Set HubSpot token
wrangler secret put HUBSPOT_ACCESS_TOKEN
```

---

## 🚀 Step 3: Deploy Workers

### Deploy All Workers

```bash
# Deploy DocuSign worker
cd workers/docusign-webhook
wrangler deploy
# Note URL: https://stanford-docusign-webhook.workers.dev

# Deploy Stripe worker
cd ../stripe-webhook
wrangler deploy
# Note URL: https://stanford-stripe-webhook.workers.dev

# Deploy Smokeball worker
cd ../smokeball-webhook
wrangler deploy
# Note URL: https://stanford-smokeball-webhook.workers.dev
```

---

## 🌐 Step 4: Configure DNS & Custom Routes

### Option A: Using Cloudflare DNS (Recommended)

1. **Add Domain to Cloudflare** (if not already):
   - Dashboard → Add a Site → `stanfordlegal.com.au`

2. **Add DNS Record** for webhook subdomain:
   ```
   Type: CNAME
   Name: webhooks
   Target: stanford-docusign-webhook.workers.dev
   Proxy: Proxied (orange cloud)
   TTL: Auto
   ```

3. **Configure Routes in wrangler.toml**:

Each worker's `wrangler.toml` already has routes configured:

```toml
[env.production]
routes = [
  { pattern = "webhooks.stanfordlegal.com.au/docusign", zone_name = "stanfordlegal.com.au" }
]
```

4. **Redeploy workers** with route configuration:
   ```bash
   wrangler deploy --env production
   ```

### Option B: Using Worker Routes (Programmatic)

Alternatively, configure routes via Cloudflare Dashboard:
1. Go to: Workers & Pages → Select worker → Settings → Triggers
2. Add Route: `webhooks.stanfordlegal.com.au/docusign`
3. Select Zone: `stanfordlegal.com.au`

---

## 🧪 Step 5: Test Workers

### Test 1: Basic Connectivity

```bash
# Test DocuSign worker
curl -X POST https://webhooks.stanfordlegal.com.au/docusign \
  -H "Content-Type: application/json" \
  -d '{"test": "ok"}'

# Expected: {"error":"..."}  (because payload is invalid, but worker is reachable)

# Test Stripe worker
curl -X POST https://webhooks.stanfordlegal.com.au/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "ok"}'

# Test Smokeball worker
curl -X POST https://webhooks.stanfordlegal.com.au/smokeball \
  -H "Content-Type: application/json" \
  -d '{"test": "ok"}'
```

### Test 2: Using webhook.site

**For DocuSign:**

1. Go to [webhook.site](https://webhook.site)
2. Get your unique URL
3. Temporarily update `backend/.env`:
   ```bash
   DOCUSIGN_WEBHOOK_URL=https://webhook.site/your-unique-id
   ```
4. Create and sign a test envelope
5. Check webhook.site - you should see DocuSign events
6. Verify payload structure
7. Switch back to production URL:
   ```bash
   DOCUSIGN_WEBHOOK_URL=https://webhooks.stanfordlegal.com.au/docusign
   ```

**For Stripe:**

```bash
# Use Stripe CLI
stripe listen --forward-to https://webhooks.stanfordlegal.com.au/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded

# Check Stripe CLI output for webhook delivery status
```

---

## 🔍 Step 6: Debug with Live Logging

### Stream Worker Logs in Real-Time

```bash
# Tail DocuSign worker logs
cd workers/docusign-webhook
wrangler tail

# In another terminal, trigger a webhook
# You'll see logs in real-time!
```

### View Historical Logs

1. Go to Cloudflare Dashboard
2. Workers & Pages → Select worker
3. Click "Logs" or "Analytics"
4. View recent invocations and errors

---

## 🛡️ Step 7: Security Best Practices

### 1. Webhook Signature Verification

**Stripe (HMAC-SHA256):**
```javascript
// Web Crypto API (built into Workers)
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
  const signature = parts.find(p => p.startsWith('v1=')).split('=')[1];
  
  const payload = `${timestamp}.${rawBody}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return computedSignature === signature;
}
```

**DocuSign (HMAC-SHA256):**
```javascript
async function verifyDocuSignSignature(rawBody, signatureHeader, hmacKey) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(hmacKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody)
  );
  
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  
  return computedSignature === signatureHeader;
}
```

### 2. Rate Limiting (Optional)

```javascript
// Using Cloudflare KV for rate limiting
const rateLimitKey = `ratelimit:${clientIP}:${Date.now() / 60000}`;
const requests = await env.RATE_LIMIT_KV.get(rateLimitKey);

if (requests && parseInt(requests) > 100) {
  return new Response('Rate limit exceeded', { status: 429 });
}

await env.RATE_LIMIT_KV.put(rateLimitKey, (parseInt(requests || 0) + 1).toString(), {
  expirationTtl: 60
});
```

### 3. IP Allowlisting (Advanced)

```javascript
// Stripe IP ranges (example)
const STRIPE_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  // ... more IPs from Stripe docs
];

const clientIP = request.headers.get('CF-Connecting-IP');
if (!STRIPE_IPS.includes(clientIP)) {
  return new Response('Forbidden', { status: 403 });
}
```

---

## 🔧 Step 8: Configure External Services

### DocuSign Configuration

**Method 1: Envelope-Level (Already Configured in Code)**

The backend already adds `eventNotification` when creating envelopes. No additional setup needed!

**Method 2: Account-Level (Optional)**

1. Login to DocuSign Admin
2. Navigate to: **Settings → Connect → Add Configuration**
3. Configuration Type: **Custom**
4. Name: `Stanford Portal Webhooks`
5. URL to Publish: `https://webhooks.stanfordlegal.com.au/docusign`
6. Select Events:
   - ✅ Envelope Sent
   - ✅ Envelope Delivered
   - ✅ Envelope Completed
   - ✅ Envelope Declined
   - ✅ Envelope Voided
   - ✅ Recipient Sent
   - ✅ Recipient Delivered
   - ✅ Recipient Completed
   - ✅ Recipient Declined
7. Include Data: Everything except Documents (too large)
8. Enable Logging: **Yes**
9. Save Configuration

### Stripe Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: **Developers → Webhooks**
3. Click "Add endpoint"
4. Endpoint URL: `https://webhooks.stanfordlegal.com.au/stripe`
5. Select events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
6. Click "Add endpoint"
7. **Copy Signing Secret**: `whsec_xxx`
8. Add to worker:
   ```bash
   cd workers/stripe-webhook
   wrangler secret put STRIPE_WEBHOOK_SECRET
   # Paste: whsec_xxx
   ```

### Smokeball Configuration

Use Smokeball API to register webhook:

```bash
# Get OAuth token first (from your backend)
ACCESS_TOKEN=$(curl -s http://localhost:3001/api/smokeball/status | jq -r '.accessToken')

# Register webhook
curl -X POST https://api.smokeball.com.au/webhooks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-api-key: $SMOKEBALL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stanford Portal - Matter Updates",
    "eventNotificationUrl": "https://webhooks.stanfordlegal.com.au/smokeball",
    "eventTypes": [
      "matter.created",
      "matter.converted",
      "matter.updated"
    ],
    "key": "your-webhook-key-for-validation"
  }'
```

---

## 📊 Step 9: Monitor & Debug

### Real-Time Monitoring

```bash
# Stream logs from all workers
wrangler tail --name stanford-docusign-webhook
wrangler tail --name stanford-stripe-webhook
wrangler tail --name stanford-smokeball-webhook
```

### Check Webhook Deliveries

**Stripe Dashboard:**
- Developers → Webhooks → Click your endpoint
- View "Recent deliveries"
- Should show ✅ 200 responses

**DocuSign Admin:**
- Settings → Connect → Your configuration
- Click "Logs"
- View delivery attempts

### Cloudflare Analytics

1. Dashboard → Workers & Pages
2. Select worker → View Analytics
3. Monitor:
   - Request volume
   - Error rate
   - Response times
   - Geographic distribution

---

## 🎯 Complete Example: Single Worker (Alternative)

If you prefer **one worker for all webhooks**, here's how:

File: `workers/all-webhooks/src/index.js`

```javascript
/**
 * Unified Webhook Receiver
 * Handles DocuSign, Stripe, and Smokeball webhooks
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Route to appropriate handler
    if (path === '/docusign') return handleDocuSign(request, env);
    if (path === '/stripe') return handleStripe(request, env);
    if (path === '/smokeball') return handleSmokeball(request, env);

    return new Response('Not Found', { status: 404 });
  }
};

async function handleDocuSign(request, env) {
  const payload = await request.json();
  // ... DocuSign logic
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

async function handleStripe(request, env) {
  const rawBody = await request.text();
  // ... Stripe logic with signature verification
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

async function handleSmokeball(request, env) {
  const payload = await request.json();
  // ... Smokeball logic
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

File: `workers/all-webhooks/wrangler.toml`

```toml
name = "stanford-webhooks"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
routes = [
  { pattern = "webhooks.stanfordlegal.com.au/docusign", zone_name = "stanfordlegal.com.au" },
  { pattern = "webhooks.stanfordlegal.com.au/stripe", zone_name = "stanfordlegal.com.au" },
  { pattern = "webhooks.stanfordlegal.com.au/smokeball", zone_name = "stanfordlegal.com.au" }
]
```

---

## ✅ Verification Checklist

After deployment, verify each step:

### Deployment
- [ ] All workers deployed successfully
- [ ] Worker URLs noted
- [ ] Secrets configured for each worker
- [ ] Routes configured in wrangler.toml

### DNS
- [ ] CNAME record added: `webhooks → worker-url`
- [ ] DNS propagated (test with `nslookup webhooks.stanfordlegal.com.au`)
- [ ] HTTPS working (visit URL in browser)

### External Services
- [ ] DocuSign Connect configured (or EventNotification in code)
- [ ] Stripe webhook endpoint created
- [ ] Smokeball webhook registered
- [ ] All webhook secrets configured

### Testing
- [ ] Basic connectivity test (curl)
- [ ] webhook.site test shows correct payload
- [ ] Real webhook triggers successfully
- [ ] HubSpot deal updated correctly
- [ ] Logs show successful processing

---

## 🚨 Troubleshooting

### Worker Not Receiving Webhooks

1. **Check DNS:**
   ```bash
   nslookup webhooks.stanfordlegal.com.au
   # Should return CNAME to workers.dev
   ```

2. **Check Routes:**
   - Cloudflare Dashboard → Workers → Select worker → Triggers
   - Verify routes are configured

3. **Check External Service Configuration:**
   - DocuSign: Verify URL in Connect settings
   - Stripe: Check webhook endpoint URL
   - Smokeball: Verify webhook registration

### Signature Verification Failing

1. **Check Secret:**
   ```bash
   wrangler secret list
   # Verify STRIPE_WEBHOOK_SECRET exists
   ```

2. **Re-add Secret:**
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   # Paste fresh secret from dashboard
   ```

3. **Check Signature Algorithm:**
   - Stripe uses HMAC-SHA256
   - DocuSign uses HMAC-SHA256 or HMAC-SHA1
   - Verify algorithm matches

### Worker Errors (500 Status)

1. **Check Logs:**
   ```bash
   wrangler tail
   ```

2. **Check HubSpot Token:**
   - Verify token is valid
   - Test manually: `curl -H "Authorization: Bearer $TOKEN" https://api.hubapi.com/crm/v3/objects/deals`

3. **Check Payload Structure:**
   - Log full payload: `console.log(JSON.stringify(payload))`
   - Verify paths match actual structure

---

## 📈 Performance Optimization

### Async Processing (ctx.waitUntil)

For non-critical operations, process asynchronously:

```javascript
export default {
  async fetch(request, env, ctx) {
    const payload = await request.json();
    
    // Respond immediately
    const response = new Response(JSON.stringify({ received: true }), {
      status: 200
    });
    
    // Process asynchronously (doesn't block response)
    ctx.waitUntil(
      processWebhook(payload, env)
    );
    
    return response;
  }
};

async function processWebhook(payload, env) {
  // This runs in background
  await updateHubSpot(payload, env);
  await sendNotification(payload);
}
```

### Caching (Workers KV)

Store frequently accessed data:

```javascript
// Cache HubSpot property mappings
const cached = await env.KV_CACHE.get('property_mappings');
if (!cached) {
  const mappings = await fetchPropertyMappings();
  await env.KV_CACHE.put('property_mappings', JSON.stringify(mappings), {
    expirationTtl: 3600 // 1 hour
  });
}
```

---

## 📋 Post-Deployment Checklist

- [ ] All 3 workers deployed and accessible
- [ ] DNS configured and propagated
- [ ] SSL certificates active
- [ ] External services configured
- [ ] Signature verification enabled
- [ ] Secrets properly set
- [ ] Logging enabled
- [ ] Test webhooks triggered successfully
- [ ] HubSpot deals updated correctly
- [ ] Error handling tested
- [ ] Monitoring dashboards set up

---

## 🎉 You're Done!

Your webhook infrastructure is now:
- ✅ **Highly available** (99.99% uptime)
- ✅ **Globally distributed** (Cloudflare edge network)
- ✅ **Secure** (signature verification)
- ✅ **Fast** (sub-millisecond response times)
- ✅ **Scalable** (handles millions of requests)
- ✅ **Cost-effective** (free for most use cases)

---

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Workers KV (Storage)](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Workers Analytics](https://developers.cloudflare.com/workers/platform/analytics/)

---

**Next:** Follow `NEXT_STEPS.md` to complete your deployment! 🚀

