# Testing Stripe Webhooks Locally

## Option 1: Stripe CLI (Recommended - Easiest)

### Step 1: Install Stripe CLI

Download from: https://stripe.com/docs/stripe-cli

**Windows:**
```powershell
# Using Scoop
scoop install stripe

# Or download from GitHub releases
# https://github.com/stripe/stripe-cli/releases
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download binary from GitHub releases
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_windows_x86_64.zip
```

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate.

### Step 3: Start Your Backend Server

```bash
cd backend
npm start
```

Your backend should be running on `http://localhost:3001`

### Step 4: Forward Webhooks to Local Server

In a **separate terminal**, run:

```bash
stripe listen --forward-to localhost:3001/api/webhook/stripe
```

**Output will look like:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 5: Copy the Webhook Signing Secret

Copy the `whsec_xxxxxxxxxxxxx` secret that appears.

### Step 6: Update Your .env File

Add or update in `backend/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # ← Use the secret from Stripe CLI
```

### Step 7: Restart Backend Server

```bash
# Stop and restart backend
npm start
```

### Step 8: Trigger Test Webhook

In **another terminal**, trigger a test event:

```bash
stripe trigger payment_intent.succeeded
```

You should see the webhook received in your backend logs!

---

## Option 2: ngrok (Alternative)

If you prefer using ngrok instead of Stripe CLI:

### Step 1: Install ngrok

Download from: https://ngrok.com/download

### Step 2: Start Your Backend Server

```bash
cd backend
npm start
```

### Step 3: Expose Local Server with ngrok

In a **separate terminal**:

```bash
ngrok http 3001
```

**Output will look like:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

### Step 4: Configure Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Enter endpoint URL:
   ```
   https://abc123.ngrok.io/api/webhook/stripe
   ```
   (Replace `abc123` with your actual ngrok URL)

4. Select events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`

5. Click **Add endpoint**

6. Copy the **Signing secret** (`whsec_...`)

### Step 5: Update Your .env File

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # ← From Stripe Dashboard
```

### Step 6: Restart Backend Server

```bash
npm start
```

### Step 7: Test

Make a test payment or use Stripe Dashboard → Webhooks → Send test webhook

---

## Testing Checklist

- [ ] Backend server running on `localhost:3001`
- [ ] Stripe CLI forwarding webhooks (or ngrok running)
- [ ] Webhook secret added to `.env` file
- [ ] Backend restarted with new env vars
- [ ] Trigger test webhook: `stripe trigger payment_intent.succeeded`
- [ ] Check backend logs for webhook received message
- [ ] Verify HubSpot deal updated (if applicable)

---

## Troubleshooting

### Webhook signature verification fails

**Problem:** `Webhook signature verification failed`

**Solution:**
- Make sure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe CLI or Dashboard
- Ensure webhook route uses `express.raw()` middleware (already configured ✅)
- Restart backend after updating `.env`

### Webhook not received

**Problem:** No webhook events showing in logs

**Solution:**
- Verify Stripe CLI is running: `stripe listen --forward-to localhost:3001/api/webhook/stripe`
- Check backend is running on port 3001
- Verify endpoint URL is correct: `/api/webhook/stripe`
- Check Stripe CLI output for forwarding status

### ngrok URL changes

**Problem:** ngrok gives you a new URL each time

**Solution:**
- Use Stripe CLI instead (recommended) - no URL needed
- Or upgrade to ngrok paid plan for static URLs
- Or update webhook endpoint in Stripe Dashboard each time

---

## Quick Reference

**Local Backend URL:** `http://localhost:3001`  
**Webhook Endpoint:** `/api/webhook/stripe`  
**Full Local URL:** `http://localhost:3001/api/webhook/stripe`

**Stripe CLI Command:**
```bash
stripe listen --forward-to localhost:3001/api/webhook/stripe
```

**Trigger Test Event:**
```bash
stripe trigger payment_intent.succeeded
```

