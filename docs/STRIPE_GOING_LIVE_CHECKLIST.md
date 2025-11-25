# Stripe Going Live Checklist

## ✅ Pre-Flight Checklist

Before switching to live mode, ensure you have:

- [ ] Completed Stripe account activation and verification
- [ ] Added your business information to Stripe Dashboard
- [ ] Verified your bank account details
- [ ] Reviewed Stripe's terms of service and pricing
- [ ] Tested payment flow thoroughly in test mode

---

## 🔑 Step 1: Update Environment Variables

### Backend Environment Variables

Update these in your backend hosting platform (Vercel/Railway/etc.):

```bash
# Change from test keys to live keys
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx        # ⚠️ Change from sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx    # ⚠️ Change from pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx       # ⚠️ NEW - Get from Stripe Dashboard
```

**Where to find live keys:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **API keys**
3. Toggle **Test mode** OFF (top right)
4. Copy **Publishable key** (`pk_live_...`)
5. Click **Reveal test key** → Copy **Secret key** (`sk_live_...`)

### Frontend Environment Variables

Update in your frontend hosting platform (Cloudflare Pages/Vercel/etc.):

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx  # ⚠️ Change from pk_test_xxx
```

**Note:** Frontend only needs the publishable key (never expose secret keys in frontend!)

---

## 🔗 Step 2: Set Up Live Webhook Endpoint

### 2.1 Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **Webhooks**
3. Toggle **Test mode** OFF (top right)
4. Click **Add endpoint**
5. Enter your webhook URL:
   ```
   https://your-backend-domain.com/api/webhook/stripe
   ```
   Example: `https://conveyancing-portal-backend.vercel.app/api/webhook/stripe`

6. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
   - ✅ `charge.succeeded` (optional)
   - ✅ `charge.failed` (optional)

7. Click **Add endpoint**

### 2.2 Get Webhook Signing Secret

1. After creating the endpoint, click on it
2. In the **Signing secret** section, click **Reveal**
3. Copy the secret (starts with `whsec_...`)
4. Add it to your backend environment variables as `STRIPE_WEBHOOK_SECRET`

### 2.3 Test Webhook Endpoint

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **Send test webhook**
3. Select `payment_intent.succeeded`
4. Click **Send test webhook**
5. Check your backend logs to verify it was received

---

## 🧪 Step 3: Verify Code Configuration

### 3.1 Check Payments Are Enabled

**File:** `backend/src/config/stripe.js`

```javascript
paymentsEnabled: true, // ✅ Must be true
```

### 3.2 Verify Fee Rates

**File:** `backend/src/utils/stripe-fees.js`

```javascript
export const STRIPE_FEES = {
  DOMESTIC: {
    percentage: 0.017, // 1.7%
    fixed: 30,        // $0.30 in cents
  },
  INTERNATIONAL: {
    percentage: 0.035, // 3.5%
    fixed: 30,         // $0.30 in cents
  },
};
```

### 3.3 No Test-Mode Specific Code

✅ **Good news:** Your codebase doesn't have any test-mode checks, so no code changes needed!

The code automatically works with live keys when you switch environment variables.

---

## 🚀 Step 4: Deploy Changes

### 4.1 Restart Backend Server

After updating environment variables, restart your backend:

```bash
# If using Vercel
vercel --prod

# If using Railway
# Changes auto-deploy when env vars are updated

# If running locally
npm start
```

### 4.2 Verify Frontend Deployment

Ensure frontend has the new `VITE_STRIPE_PUBLISHABLE_KEY` and rebuilds:

```bash
# Frontend should auto-rebuild when env vars change
# Or manually trigger rebuild in your hosting platform
```

---

## ✅ Step 5: Post-Launch Verification

### 5.1 Test Payment Flow

1. **Use a real card** (your own card with small amount)
2. Complete a test transaction
3. Verify:
   - ✅ Payment form loads correctly
   - ✅ Card details accepted
   - ✅ Fee calculation is correct
   - ✅ Payment processes successfully
   - ✅ Webhook received and processed
   - ✅ HubSpot deal updated correctly
   - ✅ Smokeball receipt created (if applicable)

### 5.2 Monitor Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/payments)
2. Verify payments appear in **Payments** section
3. Check for any failed payments or errors
4. Review webhook delivery logs

### 5.3 Check Backend Logs

Monitor your backend logs for:
- ✅ Webhook events received
- ✅ Payment processing success
- ✅ HubSpot updates completed
- ❌ Any errors or warnings

---

## 🔒 Security Checklist

- [ ] **Never commit live keys to Git** - Use environment variables only
- [ ] **Secret keys only in backend** - Never expose `sk_live_` keys
- [ ] **Webhook signature verification** - Already implemented ✅
- [ ] **HTTPS only** - Ensure all endpoints use HTTPS
- [ ] **Environment variable protection** - Don't expose in client-side code

---

## 📋 What You DON'T Need to Change

✅ **No code changes required** - The code automatically works with live keys

✅ **No test card removal** - Test cards only work in test mode anyway

✅ **No API version changes** - Already using latest (`2024-11-20.acacia`)

✅ **No fee calculation changes** - Already configured correctly

✅ **No webhook handler changes** - Already handles all necessary events

---

## 🆘 Troubleshooting

### Issue: Webhook not receiving events

**Solution:**
1. Verify webhook URL is correct and accessible
2. Check webhook secret matches environment variable
3. Ensure endpoint uses `express.raw()` middleware (already implemented ✅)
4. Check Stripe Dashboard → Webhooks → Delivery logs for errors

### Issue: Payment form not loading

**Solution:**
1. Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set correctly in frontend
2. Check browser console for errors
3. Ensure frontend has been rebuilt after env var change
4. Verify publishable key starts with `pk_live_`

### Issue: Payment fails with "Invalid API key"

**Solution:**
1. Verify `STRIPE_SECRET_KEY` starts with `sk_live_` (not `sk_test_`)
2. Ensure backend has been restarted after env var change
3. Check backend logs for authentication errors

### Issue: Webhook signature verification fails

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
2. Ensure webhook endpoint uses `express.raw()` middleware (already done ✅)
3. Check that webhook URL matches exactly in Stripe Dashboard

---

## 📞 Support Resources

- **Stripe Support:** https://support.stripe.com
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe API Docs:** https://stripe.com/docs/api
- **Webhook Testing:** Use Stripe CLI for local testing

---

## 🎯 Summary

**To go live, you only need to:**

1. ✅ Change `STRIPE_SECRET_KEY` from `sk_test_xxx` → `sk_live_xxx`
2. ✅ Change `STRIPE_PUBLISHABLE_KEY` from `pk_test_xxx` → `pk_live_xxx`
3. ✅ Change `VITE_STRIPE_PUBLISHABLE_KEY` from `pk_test_xxx` → `pk_live_xxx`
4. ✅ Set up webhook endpoint in Stripe Dashboard (live mode)
5. ✅ Add `STRIPE_WEBHOOK_SECRET` from webhook endpoint
6. ✅ Restart backend server
7. ✅ Test with a real card

**That's it!** No code changes needed. 🎉

