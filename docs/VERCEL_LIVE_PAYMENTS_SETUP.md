# Vercel Live Payments Setup Guide

## 🚀 Quick Checklist for Testing Stripe Payments on Vercel

### Step 1: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your backend project
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables:

#### Required Stripe Variables:

```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # ← Get from Stripe Dashboard after webhook setup
```

#### Other Required Variables:

Make sure these are also set:
```bash
HUBSPOT_ACCESS_TOKEN=your_hubspot_token
JWT_SECRET=your_jwt_secret
PORT=3001
# ... all your other env vars
```

**Important:**
- ✅ Set these for **Production** environment
- ✅ Set these for **Preview** environment (if you want to test)
- ✅ No quotes around values
- ✅ No spaces before/after `=`

---

### Step 2: Deploy Backend to Vercel

#### Option A: Deploy via CLI

```bash
cd backend
vercel --prod
```

#### Option B: Deploy via Git Push

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Enable Stripe payments"
   git push origin main
   ```

2. Vercel will auto-deploy

#### Option C: Deploy via Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Click **Deployments** tab
3. Click **Redeploy** on latest deployment

---

### Step 3: Get Your Vercel Backend URL

After deployment, note your backend URL:

```
https://your-project-name.vercel.app
```

Example: `https://conveyancing-portal-backend.vercel.app`

---

### Step 4: Set Up Stripe Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle **Test mode** OFF (top right) - Use **Live mode**
3. Go to **Developers** → **Webhooks**
4. Click **Add endpoint**
5. Enter your webhook URL:
   ```
   https://your-project-name.vercel.app/api/webhook/stripe
   ```
   Replace `your-project-name` with your actual Vercel project name

6. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
   - ✅ `charge.succeeded` (optional)
   - ✅ `charge.failed` (optional)

7. Click **Add endpoint**

8. **Copy the webhook signing secret** (`whsec_...`)

---

### Step 5: Update Webhook Secret in Vercel

1. Go back to Vercel Dashboard → **Settings** → **Environment Variables**
2. Update `STRIPE_WEBHOOK_SECRET` with the secret from Stripe Dashboard:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # ← From Stripe Dashboard
   ```
3. **Redeploy** your backend (Vercel will auto-redeploy when env vars change, or manually trigger)

---

### Step 6: Update Frontend Environment Variables

If you're deploying frontend to Vercel (or Cloudflare Pages):

#### For Vercel Frontend:

1. Go to your frontend project in Vercel Dashboard
2. **Settings** → **Environment Variables**
3. Add/Update:
   ```bash
   VITE_API_BASE_URL=https://your-project-name.vercel.app/api
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
   ```
4. Redeploy frontend

#### For Cloudflare Pages:

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Select your frontend project
3. **Settings** → **Environment Variables**
4. Add/Update:
   ```bash
   VITE_API_BASE_URL=https://your-project-name.vercel.app/api
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
   ```
5. Redeploy

---

### Step 7: Test Webhook Endpoint

1. In Stripe Dashboard → **Webhooks** → Your endpoint
2. Click **Send test webhook**
3. Select `payment_intent.succeeded`
4. Click **Send test webhook**
5. Check Vercel logs to verify it was received:
   - Go to Vercel Dashboard → **Deployments** → Click on latest deployment
   - Click **Functions** tab → View logs
   - Or use: `vercel logs` command

---

### Step 8: Test Payment Flow

1. Navigate to your live frontend URL
2. Complete a test payment with a **real card** (small amount)
3. Check:
   - ✅ Payment processes successfully
   - ✅ Webhook received in Vercel logs
   - ✅ HubSpot deal updated
   - ✅ Deal stage progressed to "Funds Provided"

---

## 🔍 Troubleshooting

### Webhook Not Received

**Check:**
1. Webhook URL is correct: `https://your-project.vercel.app/api/webhook/stripe`
2. Webhook secret matches in Vercel env vars
3. Backend was redeployed after adding webhook secret
4. Check Vercel function logs for errors

**View Logs:**
```bash
vercel logs --follow
```

### Payment Fails

**Check:**
1. `STRIPE_SECRET_KEY` is set correctly (starts with `sk_live_`)
2. `STRIPE_PUBLISHABLE_KEY` is set correctly (starts with `pk_live_`)
3. Frontend has `VITE_STRIPE_PUBLISHABLE_KEY` set
4. Check browser console for errors

### Environment Variables Not Loading

**Check:**
1. Variables are set for correct environment (Production/Preview)
2. No quotes around values
3. No typos in variable names
4. Backend was redeployed after adding variables

**Force Redeploy:**
```bash
vercel --prod --force
```

---

## 📋 Complete Environment Variables Checklist

### Backend (Vercel):

- [ ] `STRIPE_SECRET_KEY=sk_live_xxx`
- [ ] `STRIPE_PUBLISHABLE_KEY=pk_live_xxx`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_xxx`
- [ ] `HUBSPOT_ACCESS_TOKEN=xxx`
- [ ] `JWT_SECRET=xxx`
- [ ] `PORT=3001` (or let Vercel auto-detect)
- [ ] All other required env vars

### Frontend (Vercel/Cloudflare):

- [ ] `VITE_API_BASE_URL=https://your-backend.vercel.app/api`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx`

---

## 🎯 Quick Deploy Commands

```bash
# Deploy backend
cd backend
vercel --prod

# View logs
vercel logs --follow

# Check deployment status
vercel ls
```

---

## ✅ Post-Deployment Verification

1. ✅ Backend URL accessible: `https://your-project.vercel.app/api/payment/config`
2. ✅ Returns: `{ paymentsEnabled: true, publishableKey: "pk_live_..." }`
3. ✅ Webhook endpoint accessible: `https://your-project.vercel.app/api/webhook/stripe`
4. ✅ Stripe Dashboard shows webhook endpoint as active
5. ✅ Test webhook succeeds
6. ✅ Payment form loads on frontend
7. ✅ Test payment completes successfully
8. ✅ HubSpot deal updates automatically

---

## 🔐 Security Reminders

- ✅ Never commit `.env` files to Git
- ✅ Never expose `sk_live_` keys in frontend
- ✅ Never expose `whsec_` secrets anywhere
- ✅ Use Vercel's environment variables (not hardcoded)
- ✅ Use different keys for test vs production

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **View Logs:** `vercel logs --follow`
- **Check Deployment:** Vercel Dashboard → Deployments

