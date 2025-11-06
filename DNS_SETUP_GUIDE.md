# DNS Configuration Guide for Stanford Legal Portal

## Overview

This guide will help you configure DNS records to point your subdomains to the deployed services.

---

## 🌐 Subdomain Architecture

```
stanfordlegal.com.au              → WP Engine (existing WordPress site)
portal.stanfordlegal.com.au       → Cloudflare Pages (React frontend)
api.stanfordlegal.com.au          → Vercel (Node.js backend)
webhooks.stanfordlegal.com.au     → Cloudflare Workers (webhook handlers)
```

---

## ⚙️ Option 1: Using Cloudflare DNS (Recommended)

### Step 1: Transfer DNS to Cloudflare (or Add as Secondary)

**Full Transfer (Recommended):**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Add a Site"
3. Enter: `stanfordlegal.com.au`
4. Select Free plan
5. Cloudflare will scan existing DNS records
6. Review and confirm records
7. Cloudflare will provide nameservers
8. Update nameservers at your domain registrar
9. Wait for DNS propagation (24-48 hours)

**Secondary DNS (Alternative):**
- Keep WP Engine as primary
- Add Cloudflare records for subdomains only
- Requires CNAME setup at WP Engine pointing to Cloudflare

### Step 2: Add DNS Records in Cloudflare

Once DNS is on Cloudflare, add these records:

```
Type   Name       Target                                        Proxy    TTL
CNAME  portal     stanford-portal.pages.dev                     Proxied  Auto
CNAME  api        your-backend-name.vercel.app                  Proxied  Auto
CNAME  webhooks   stanford-docusign-webhook.workers.dev         Proxied  Auto
```

**How to Add:**
1. Cloudflare Dashboard → Select `stanfordlegal.com.au`
2. DNS → Records → Add record
3. For each subdomain:
   - Type: CNAME
   - Name: `portal` (or `api`, `webhooks`)
   - Target: (from deployment URLs above)
   - Proxy status: Proxied (orange cloud)
   - TTL: Auto
4. Click Save

**Benefits of Cloudflare Proxy:**
- ✅ DDoS protection
- ✅ Web Application Firewall (WAF)
- ✅ CDN caching
- ✅ Automatic SSL/TLS
- ✅ Analytics

---

## ⚙️ Option 2: Using WP Engine DNS

### Step 1: Access WP Engine DNS Management

1. Login to [WP Engine Portal](https://my.wpengine.com)
2. Select your site: `stanfordlegal.com.au`
3. Go to: **Domains** → **DNS**

### Step 2: Add CNAME Records

Add these records in WP Engine DNS:

```
Type   Name       Points To
CNAME  portal     stanford-portal.pages.dev
CNAME  api        your-backend-name.vercel.app
CNAME  webhooks   stanford-docusign-webhook.workers.dev
```

**How to Add:**
1. Click "Add Record"
2. Select type: CNAME
3. Enter subdomain (e.g., `portal`)
4. Enter target (e.g., `stanford-portal.pages.dev`)
5. Click Save
6. Repeat for `api` and `webhooks`

**Note:** WP Engine DNS changes can take 1-24 hours to propagate.

---

## 📋 Deployment URLs to Use

After deploying each service, you'll get deployment URLs. Record them here:

### Frontend (Cloudflare Pages)

After deploying to Cloudflare Pages, you'll get:
```
Primary: https://stanford-portal.pages.dev
Custom: portal.stanfordlegal.com.au (after DNS configured)
```

### Backend (Vercel)

After deploying to Vercel, you'll get:
```
Primary: https://conveyancing-portal-backend.vercel.app
Custom: api.stanfordlegal.com.au (after DNS configured)
```

**Update in Frontend Environment:**
```bash
# frontend/.env (or Cloudflare Pages environment variables)
VITE_API_BASE_URL=https://api.stanfordlegal.com.au
```

### Webhooks (Cloudflare Workers)

After deploying each worker:
```
DocuSign:  https://stanford-docusign-webhook.workers.dev
Stripe:    https://stanford-stripe-webhook.workers.dev
Smokeball: https://stanford-smokeball-webhook.workers.dev
```

**Configure Custom Routes:**

In `wrangler.toml` for each worker:
```toml
[env.production]
routes = [
  { pattern = "webhooks.stanfordlegal.com.au/docusign", zone_name = "stanfordlegal.com.au" }
]
```

---

## ✅ Verification Checklist

### Step 1: Check DNS Propagation

Wait 1-24 hours after adding DNS records, then test:

```bash
# Test DNS resolution
nslookup portal.stanfordlegal.com.au
nslookup api.stanfordlegal.com.au
nslookup webhooks.stanfordlegal.com.au

# Should return CNAME records pointing to Cloudflare/Vercel
```

### Step 2: Test Each Subdomain

```bash
# Test frontend
curl https://portal.stanfordlegal.com.au
# Should return HTML

# Test backend
curl https://api.stanfordlegal.com.au/api/health
# Should return: {"status":"healthy"}

# Test webhook
curl https://webhooks.stanfordlegal.com.au/docusign
# Should return: {"error":"Method not allowed. Use POST."}
```

### Step 3: Verify SSL Certificates

Visit each URL in browser and check for:
- ✅ Green padlock icon
- ✅ Valid SSL certificate
- ✅ No certificate errors

---

## 🐛 Troubleshooting

### DNS Not Resolving

**Problem:** `nslookup` returns no results or wrong IP

**Solutions:**
1. Wait longer (DNS can take up to 48 hours)
2. Clear DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Mac
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```
3. Test with different DNS server:
   ```bash
   nslookup portal.stanfordlegal.com.au 8.8.8.8
   ```

### SSL Certificate Errors

**Problem:** Browser shows "Not Secure" or certificate errors

**Solutions:**
1. Wait for automatic SSL provisioning (can take 10-30 minutes)
2. Verify CNAME record is correct
3. Check Cloudflare SSL/TLS mode is set to "Full (strict)"
4. In Cloudflare: SSL/TLS → Edge Certificates → Enable "Always Use HTTPS"

### CNAME Already Exists Error

**Problem:** WP Engine says subdomain already exists

**Solutions:**
1. Delete existing CNAME record first
2. Or modify existing record to point to new target

### Cloudflare Not Proxying

**Problem:** DNS works but no Cloudflare features (orange cloud disabled)

**Solutions:**
1. In Cloudflare DNS, click the cloud icon to enable proxy
2. Orange cloud = Proxied (recommended)
3. Grey cloud = DNS only (not recommended)

---

## 🎯 Final Configuration

Once everything is set up, your URLs should be:

```
Main Website:       https://stanfordlegal.com.au (WP Engine)
Client Portal:      https://portal.stanfordlegal.com.au (Cloudflare Pages)
Agent Portal:       https://portal.stanfordlegal.com.au/agent (Cloudflare Pages)
Backend API:        https://api.stanfordlegal.com.au (Vercel)
DocuSign Webhook:   https://webhooks.stanfordlegal.com.au/docusign (Cloudflare Worker)
Stripe Webhook:     https://webhooks.stanfordlegal.com.au/stripe (Cloudflare Worker)
Smokeball Webhook:  https://webhooks.stanfordlegal.com.au/smokeball (Cloudflare Worker)
```

All URLs should:
- ✅ Return 200 status code
- ✅ Have valid SSL certificate
- ✅ Be accessible globally

---

## 📞 Need Help?

If you encounter issues:

1. Check [Cloudflare Community](https://community.cloudflare.com)
2. Check [Vercel Documentation](https://vercel.com/docs)
3. Check [WP Engine Support](https://wpengine.com/support)
4. Review `docs/DEPLOYMENT.md#troubleshooting`

---

**Once DNS is configured, your portal will be live! 🎉**

