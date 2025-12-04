# Deal Stage Regression - Quick Summary

## 🐛 The Problem

Deals paid through Stripe are moved back from **"Funds Provided"** (Step 6) to **"Searches Funds Requested"** (Step 5).

## 🔍 Root Cause

**File**: `backend/src/routes/webhook.js` **Line 407**

```javascript
if (firstSigner && firstSigner.status === 'completed') {
  hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id; // ❌ NO CHECK!
}
```

The DocuSign webhook ALWAYS moves the deal to "Funds Requested" when the first signer completes, **WITHOUT checking if payment was already made**.

## 📊 What Happens

```
Timeline:
---------
1. User signs DocuSign retainer
   → Deal moves to "Funds Requested" (Step 5) ✅

2. User pays with Stripe
   → Stripe webhook fires
   → Deal moves to "Funds Provided" (Step 6) ✅

3. DocuSign webhook fires again (delayed/duplicate)
   → Sees first signer still "completed"
   → Moves deal BACK to "Funds Requested" (Step 5) ❌❌❌

Result: Deal shows as unpaid even though payment succeeded!
```

## ✅ The Fix

**Add two guards** before moving to "Funds Requested":

```javascript
if (firstSigner && firstSigner.status === 'completed') {
  // ✅ Fetch current deal state
  const currentDeal = await dealsIntegration.getDeal(dealId, ['dealstage', 'payment_status']);
  const paymentStatus = currentDeal.properties.payment_status;
  const currentStage = currentDeal.properties.dealstage;

  // ✅ GUARD 1: Check if payment already made
  const paymentAlreadyMade = (paymentStatus === 'Pending' || paymentStatus === 'Paid');

  // ✅ GUARD 2: Check if already at Funds Provided
  const alreadyAtFundsProvided = (currentStage === '1904359900');

  // Only move to FUNDS_REQUESTED if safe to do so
  if (!paymentAlreadyMade && !alreadyAtFundsProvided) {
    hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id;
    console.log(`[DocuSign Webhook] ✅ Progressing to Funds Requested`);
  } else {
    console.log(`[DocuSign Webhook] ⚠️ Skipping - payment already made or stage already advanced`);
  }
}
```

## 🎯 What This Prevents

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Payment before late DocuSign webhook | ❌ Regresses to Step 5 | ✅ Stays at Step 6 |
| Multiple DocuSign webhooks | ❌ Keeps resetting stage | ✅ Ignores after payment |
| Second signer completes after payment | ❌ Moves back to Step 5 | ✅ Stays at Step 6 |

## 🛠️ Files to Update

1. **backend/src/routes/webhook.js** (Line 401-422)
   - Add guards before stage update

2. **backend/src/routes/docusign.js** (Line 508-517)
   - Same fix needed here

## 📋 Testing Checklist

- [ ] Test normal flow (sign → pay)
- [ ] Test fast payment (pay → sign)
- [ ] Test multiple signers
- [ ] Test delayed DocuSign webhooks
- [ ] Verify logs show guards working

---

**Full Analysis**: See `DEAL_STAGE_REGRESSION_ANALYSIS.md`
