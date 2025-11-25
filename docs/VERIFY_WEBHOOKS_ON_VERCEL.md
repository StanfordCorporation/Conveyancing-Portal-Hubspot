# How to Verify Webhooks Are Working on Vercel

## 🧪 Method 1: Test Webhook from Stripe Dashboard (Easiest)

### Step 1: Send Test Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle top right)
3. Go to **Developers** → **Webhooks**
4. Click on your webhook endpoint
5. Click **Send test webhook** button
6. Select event: `payment_intent.succeeded`
7. Click **Send test webhook**

### Step 2: Check Vercel Logs

**Option A: Via Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your backend project
3. Click **Deployments** tab
4. Click on the latest deployment
5. Click **Functions** tab
6. Look for webhook logs showing:
   ```
   [Webhook] 🔔 WEBHOOK REQUEST RECEIVED: POST /api/webhook/stripe
   [Webhook] ✅ Verified webhook event: payment_intent.succeeded
   [Webhook] 🎉 Payment succeeded!
   ```

**Option B: Via Vercel CLI**
```bash
cd backend
vercel logs --follow
```

Then send test webhook from Stripe Dashboard and watch for logs.

---

## 🧪 Method 2: View Real-Time Logs During Payment

### Step 1: Start Log Streaming

```bash
cd backend
vercel logs --follow
```

### Step 2: Complete a Test Payment

1. Navigate to your live frontend
2. Complete a payment with a real card (small amount)
3. Watch the logs in real-time

### Step 3: Look For These Logs

You should see:
```
[Webhook] 🔔 WEBHOOK REQUEST RECEIVED: POST /api/webhook/stripe
[Webhook] ✅ Verified webhook event: payment_intent.succeeded
[Webhook] 🎉 Payment succeeded!
[Webhook] 💳 Payment Intent ID: pi_xxx
[Webhook] ✅ Deal 188022025712 updated - marked as paid
[Webhook] 🎯 Deal stage progressed to: Funds Provided
```

---

## 🧪 Method 3: Check Webhook Delivery Status in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Go to **Recent deliveries** tab
4. Check delivery status:
   - ✅ **Succeeded** = Webhook received and processed
   - ❌ **Failed** = Click to see error details
   - ⏳ **Pending** = Still being sent

5. Click on a delivery to see:
   - Request details
   - Response from your server
   - Response time
   - Status code (200 = success)

---

## 🧪 Method 4: Check HubSpot Deal Updates

After a payment completes, verify HubSpot was updated:

1. Go to HubSpot → **Deals**
2. Find the deal that was paid
3. Check these fields:
   - ✅ `payment_status` = "Paid"
   - ✅ `payment_method` = "Stripe"
   - ✅ `payment_amount` = Amount paid
   - ✅ `payment_date` = Today's date
   - ✅ `stripe_payment_intent_id` = Payment intent ID
   - ✅ `dealstage` = "Funds Provided" (Step 6)

---

## 🧪 Method 5: Use Manual Update Endpoint to Test

If webhook didn't fire, you can manually trigger the update:

```bash
# Replace with your actual payment intent ID
curl -X POST https://your-project.vercel.app/api/payment/manual-update/pi_3SUjXwQ5StC23VnG2T3bPn5Z \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

This will:
- Fetch payment intent from Stripe
- Update HubSpot deal
- Receipt to Smokeball
- Progress deal stage

---

## 🔍 What to Look For in Logs

### ✅ Success Indicators:

```
[Webhook] 🔔 WEBHOOK REQUEST RECEIVED: POST /api/webhook/stripe
[Webhook] ✅ Verified webhook event: payment_intent.succeeded
[Webhook] 🎉 Payment succeeded!
[Webhook] ✅ Deal 188022025712 updated - marked as paid
[Webhook] 🎯 Deal stage progressed to: Funds Provided
[Webhook] ✅ Payment receipted to Smokeball - Transaction ID: xxx
```

### ❌ Error Indicators:

```
[Webhook] ❌ Webhook signature verification failed
[Webhook] ❌ STRIPE_WEBHOOK_SECRET is not set
[Webhook] ❌ Error updating HubSpot deal
[Webhook] ❌ Error receipting payment to Smokeball
```

---

## 🐛 Troubleshooting

### Webhook Not Received

**Check:**
1. Webhook URL is correct: `https://your-project.vercel.app/api/webhook/stripe`
2. Backend is deployed and accessible
3. Webhook endpoint exists in Stripe Dashboard
4. Check Stripe Dashboard → Webhooks → Recent deliveries for errors

**Test endpoint accessibility:**
```bash
curl https://your-project.vercel.app/api/webhook/stripe
# Should return 404 or method not allowed (not 500 error)
```

### Signature Verification Fails

**Check:**
1. `STRIPE_WEBHOOK_SECRET` is set in Vercel env vars
2. Secret matches the one from Stripe Dashboard
3. Backend was redeployed after adding secret
4. Check logs for: `[Webhook] Webhook secret starts with: whsec_...`

### HubSpot Not Updated

**Check:**
1. Webhook received successfully (check logs)
2. Deal ID exists in payment metadata
3. HubSpot API token is valid
4. Check logs for: `[Webhook] ✅ Deal updated` or error messages

---

## 📊 Quick Health Check Script

Create a test script to verify everything:

```bash
# Test 1: Check webhook endpoint exists
curl -X POST https://your-project.vercel.app/api/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return webhook error (not 404)

# Test 2: Check payment config
curl https://your-project.vercel.app/api/payment/config
# Should return: { paymentsEnabled: true, publishableKey: "pk_live_..." }

# Test 3: Check Stripe Dashboard webhook status
# Go to Stripe Dashboard → Webhooks → Your endpoint
# Check "Recent deliveries" for success/failure
```

---

## ✅ Success Checklist

After deploying, verify:

- [ ] Webhook endpoint accessible (not 404)
- [ ] Test webhook from Stripe Dashboard succeeds
- [ ] Vercel logs show webhook received
- [ ] Signature verification passes
- [ ] HubSpot deal updates automatically
- [ ] Deal stage progresses to "Funds Provided"
- [ ] Smokeball receipt created (if applicable)
- [ ] Real payment triggers webhook successfully

---

## 🎯 Expected Flow

1. **Payment completes** → Stripe sends webhook
2. **Vercel receives webhook** → Logs show: `🔔 WEBHOOK REQUEST RECEIVED`
3. **Signature verified** → Logs show: `✅ Verified webhook event`
4. **HubSpot updated** → Logs show: `✅ Deal updated - marked as paid`
5. **Deal progressed** → Logs show: `🎯 Deal stage progressed to: Funds Provided`
6. **Smokeball receipted** → Logs show: `✅ Payment receipted to Smokeball`

If all steps show ✅, your webhooks are working perfectly! 🎉

