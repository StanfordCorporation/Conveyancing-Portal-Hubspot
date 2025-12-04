# Stripe Fee Extraction Plan: Store Net Amount in HubSpot

## 📋 Overview

Currently, when a Stripe payment succeeds, the **gross amount** (including Stripe fees) is stored in HubSpot's `payment_amount` field. This plan outlines how to modify the webhook handler to store the **net amount** (after extracting Stripe fees) instead.

---

## 🎯 Goal

**Store the net payment amount in HubSpot, excluding Stripe processing fees**

### Example:
- Customer pays: **$534.84** (gross amount with fees)
- Stripe fee: **$9.38** (1.7% + $0.30)
- Net received: **$525.46**
- **HubSpot should store: $525.46** ✅

---

## 📊 Current Flow Analysis

### 1. Payment Creation Flow ([payment.js:41-166](c:\Users\PrathamManochaStanfo\OneDrive - The Stanford Corporation\Desktop\Conveyancing-Portal-Hubspot\backend\src\routes\payment.js#L41-L166))

```javascript
// Step 1: Calculate base amount (searches + deposit)
const totalDueNow = quote.grandTotal + conveyancing.depositNow; // e.g., $525.46

// Step 2: Add Stripe fees to get gross amount
const feeCalculation = calculateAmountWithFees(amountInCents, { useDomestic });
// gross: $534.84, fee: $9.38, net: $525.46

// Step 3: Create payment intent with GROSS amount
const paymentIntent = await stripePayments.createPaymentIntent({
  amount: feeCalculation.grossAmountInCents, // $534.84 (includes fees)
  metadata: {
    deal_id: dealId,
    searches_amount: quote.grandTotal.toString(),
    conveyancing_deposit: conveyancing.depositNow.toString(),
    total_base_amount: totalDueNow.toString(), // ✅ NET AMOUNT STORED HERE
    // Fee details
    fee_percent: feeCalculation.feePercent,
    fixed_fee: feeCalculation.fixedFee,
    gross_amount: feeCalculation.grossAmountInCents,
    stripe_fee: feeCalculation.stripeFeeInCents,
  },
});
```

**Key insight**: The **net amount** is already stored in `metadata.total_base_amount`!

### 2. Current Webhook Handler ([webhook.js:102-150](c:\Users\PrathamManochaStanfo\OneDrive - The Stanford Corporation\Desktop\Conveyancing-Portal-Hubspot\backend\src\routes\webhook.js#L102-L150))

```javascript
export async function handlePaymentSuccess(paymentIntent) {
  const dealId = paymentIntent.metadata?.deal_id;

  // Extract payment breakdown from metadata
  const searchesAmount = parseFloat(paymentIntent.metadata?.searches_amount || '0');
  const conveyancingDeposit = parseFloat(paymentIntent.metadata?.conveyancing_deposit || '0');
  const totalBaseAmount = parseFloat(paymentIntent.metadata?.total_base_amount || '0');

  // ❌ PROBLEM: Stores GROSS amount (includes fees)
  await dealsIntegration.updateDeal(dealId, {
    payment_method: 'Stripe',
    payment_status: 'Pending',
    payment_amount: (paymentIntent.amount / 100).toString(), // ❌ GROSS AMOUNT
    // ...
  });
}
```

**Issue**: `paymentIntent.amount` is the **gross amount** ($534.84), not the net amount ($525.46).

---

## ✅ Solution: Use Metadata for Net Amount

The simplest and most reliable solution is to use `metadata.total_base_amount` which already contains the net amount.

### Why This Approach?
1. ✅ **Already calculated** - No additional computation needed
2. ✅ **Reliable** - Exact amount the business intended to receive
3. ✅ **No API calls** - Everything is in the webhook payload
4. ✅ **Backward compatible** - Metadata exists for all new payments
5. ✅ **Auditable** - Can verify against Stripe dashboard

---

## 🔧 Implementation Changes

### File: `backend/src/routes/webhook.js`

#### Current Code (Lines 102-150):
```javascript
export async function handlePaymentSuccess(paymentIntent) {
  console.log(`[Webhook] 🎉 Payment succeeded!`);
  console.log(`[Webhook] 💳 Payment Intent ID: ${paymentIntent.id}`);
  console.log(`[Webhook] 💰 Amount: $${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`);

  const dealId = paymentIntent.metadata?.deal_id;

  if (dealId) {
    try {
      // Extract payment breakdown from metadata
      const searchesAmount = parseFloat(paymentIntent.metadata?.searches_amount || '0');
      const conveyancingDeposit = parseFloat(paymentIntent.metadata?.conveyancing_deposit || '0');
      const totalBaseAmount = parseFloat(paymentIntent.metadata?.total_base_amount || '0');

      console.log(`[Webhook] 📊 Payment breakdown:`);
      console.log(`[Webhook]   - Searches: $${searchesAmount}`);
      console.log(`[Webhook]   - Conveyancing Deposit: $${conveyancingDeposit}`);
      console.log(`[Webhook]   - Total: $${totalBaseAmount}`);

      // Update deal: mark as pending
      await dealsIntegration.updateDeal(dealId, {
        payment_method: 'Stripe',
        payment_status: 'Pending',
        payment_amount: (paymentIntent.amount / 100).toString(), // ❌ GROSS AMOUNT
        payment_date: new Date().toISOString().split('T')[0],
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer,
        dealstage: DEAL_STAGES.FUNDS_PROVIDED.id,
        // Save payment breakdown
        searches_quote_amount: searchesAmount.toString(),
        quote_amount: totalBaseAmount.toString(),
      });

      console.log(`[Webhook] ✅ Deal ${dealId} updated - marked as pending`);
    } catch (error) {
      console.error(`[Webhook] ⚠️ Error updating HubSpot deal:`, error.message);
    }
  }
}
```

#### Updated Code:
```javascript
export async function handlePaymentSuccess(paymentIntent) {
  console.log(`[Webhook] 🎉 Payment succeeded!`);
  console.log(`[Webhook] 💳 Payment Intent ID: ${paymentIntent.id}`);

  const dealId = paymentIntent.metadata?.deal_id;

  if (dealId) {
    try {
      // Extract payment breakdown from metadata
      const searchesAmount = parseFloat(paymentIntent.metadata?.searches_amount || '0');
      const conveyancingDeposit = parseFloat(paymentIntent.metadata?.conveyancing_deposit || '0');
      const totalBaseAmount = parseFloat(paymentIntent.metadata?.total_base_amount || '0');

      // Extract fee information from metadata
      const grossAmount = paymentIntent.amount / 100; // What customer paid
      const netAmount = totalBaseAmount; // What business receives (after fees)
      const stripeFee = grossAmount - netAmount; // Stripe processing fee

      console.log(`[Webhook] 💰 Payment breakdown:`);
      console.log(`[Webhook]   - Gross Amount (charged to customer): $${grossAmount.toFixed(2)}`);
      console.log(`[Webhook]   - Stripe Fee: $${stripeFee.toFixed(2)}`);
      console.log(`[Webhook]   - Net Amount (business receives): $${netAmount.toFixed(2)}`);
      console.log(`[Webhook]   - Breakdown: Searches $${searchesAmount} + Deposit $${conveyancingDeposit}`);

      // Update deal: mark as pending with NET amount
      await dealsIntegration.updateDeal(dealId, {
        payment_method: 'Stripe',
        payment_status: 'Pending',
        payment_amount: netAmount.toFixed(2), // ✅ NET AMOUNT (after fees)
        payment_amount_gross: grossAmount.toFixed(2), // NEW: Gross amount (for reference)
        stripe_fee: stripeFee.toFixed(2), // NEW: Stripe processing fee
        payment_date: new Date().toISOString().split('T')[0],
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer,
        dealstage: DEAL_STAGES.FUNDS_PROVIDED.id,
        // Save payment breakdown
        searches_quote_amount: searchesAmount.toString(),
        quote_amount: totalBaseAmount.toString(),
      });

      console.log(`[Webhook] ✅ Deal ${dealId} updated - marked as pending`);
      console.log(`[Webhook] 💾 Stored net amount: $${netAmount.toFixed(2)} (after $${stripeFee.toFixed(2)} fee)`);
      console.log(`[Webhook] 🔗 Stripe Payment Intent: ${paymentIntent.id}`);

    } catch (error) {
      console.error(`[Webhook] ⚠️ Error updating HubSpot deal:`, error.message);
    }
  }
}
```

---

## 📦 New HubSpot Properties Required

### 1. `payment_amount` (EXISTING - Modified usage)
- **Type**: Number
- **Purpose**: Net amount received by business (after Stripe fees)
- **Example**: `525.46`
- **Change**: Now stores NET instead of GROSS

### 2. `payment_amount_gross` (NEW - Optional but recommended)
- **Type**: Number
- **Purpose**: Total amount charged to customer (includes fees)
- **Example**: `534.84`
- **Why**: Helps reconcile with Stripe dashboard

### 3. `stripe_fee` (NEW - Optional but recommended)
- **Type**: Number
- **Purpose**: Stripe processing fee amount
- **Example**: `9.38`
- **Why**: Useful for accounting and fee tracking

---

## 🔄 Data Flow Comparison

### Before (Current):
```
Customer pays: $534.84
       ↓
Stripe webhook fires
       ↓
HubSpot stores: payment_amount = $534.84 ❌ (includes fees)
```

### After (Proposed):
```
Customer pays: $534.84 (gross)
       ↓
Stripe webhook fires
       ↓
Extract from metadata:
  - total_base_amount = $525.46 (net)
  - Calculate fee = $9.38
       ↓
HubSpot stores:
  - payment_amount = $525.46 ✅ (net, what you receive)
  - payment_amount_gross = $534.84 (optional, for reference)
  - stripe_fee = $9.38 (optional, for accounting)
```

---

## 🧪 Testing Plan

### Test Case 1: Standard Domestic Card Payment
**Input**:
- Searches: $425.00
- Deposit: $110.00
- Net total: $535.00
- Stripe fee (1.7% + $0.30): $9.40
- Gross charge: $544.40

**Expected HubSpot values**:
- `payment_amount`: `535.00` ✅
- `payment_amount_gross`: `544.40`
- `stripe_fee`: `9.40`

### Test Case 2: International Card Payment
**Input**:
- Net total: $535.00
- Stripe fee (3.5% + $0.30): $19.64
- Gross charge: $554.64

**Expected HubSpot values**:
- `payment_amount`: `535.00` ✅
- `payment_amount_gross`: `554.64`
- `stripe_fee`: `19.64`

### Test Case 3: Bank Transfer (No change)
**Input**:
- Amount: $535.00

**Expected HubSpot values**:
- `payment_amount`: `535.00` (no fees for bank transfer)
- `payment_amount_gross`: (empty)
- `stripe_fee`: (empty)

---

## 🚨 Edge Cases & Error Handling

### 1. Missing Metadata
**Scenario**: Older payment intent without `total_base_amount` metadata

**Solution**: Fallback to gross amount with warning
```javascript
const totalBaseAmount = parseFloat(paymentIntent.metadata?.total_base_amount || '0');

if (totalBaseAmount === 0) {
  console.warn(`[Webhook] ⚠️ No total_base_amount in metadata for ${paymentIntent.id}`);
  console.warn(`[Webhook] ⚠️ Falling back to gross amount`);
  const grossAmount = paymentIntent.amount / 100;
  // Use gross amount as fallback
  await dealsIntegration.updateDeal(dealId, {
    payment_amount: grossAmount.toFixed(2),
    // ... other fields
  });
} else {
  // Normal flow with net amount
}
```

### 2. Refunds
**Scenario**: Payment is refunded after being recorded

**Solution**: Create separate refund handling
```javascript
case 'charge.refunded':
  await handleRefund(event.data.object);
  break;
```

### 3. Partial Captures
**Scenario**: Payment captured for less than authorized amount

**Solution**: Use actual captured amount from charge
```javascript
// If payment was partially captured, use actual captured amount
const actualAmount = paymentIntent.amount_received || paymentIntent.amount;
```

---

## 📝 Implementation Steps

1. ✅ **Review current implementation** (DONE)
2. **Create HubSpot properties** (if not exist):
   - `payment_amount_gross` (Number)
   - `stripe_fee` (Number)
3. **Update webhook.js**:
   - Modify `handlePaymentSuccess()` function
   - Extract net amount from metadata
   - Calculate Stripe fee
   - Update HubSpot with net amount
4. **Add logging**:
   - Log gross vs net amounts
   - Log fee calculations
   - Add warnings for missing metadata
5. **Test thoroughly**:
   - Test with domestic card
   - Test with international card
   - Test backward compatibility
6. **Deploy**:
   - Deploy to staging first
   - Verify webhook handling
   - Deploy to production

---

## ✅ Benefits of This Approach

1. **Accurate Revenue Tracking**: HubSpot shows actual revenue received
2. **Fee Transparency**: Easy to see how much was paid in fees
3. **Accounting Friendly**: Separate fields for gross, net, and fees
4. **Backward Compatible**: Falls back to gross amount if metadata missing
5. **No Breaking Changes**: Bank transfers and existing flows unaffected
6. **Simple Implementation**: Uses existing metadata, no complex calculations

---

## 🔍 Alternative Approaches (Considered but Not Recommended)

### Option 1: Retrieve from Stripe Charge API
**Pros**: Most accurate, includes actual fees charged
**Cons**:
- Requires additional API call (slower, rate limits)
- More complex error handling
- Charge might not exist yet when webhook fires

### Option 2: Reverse Calculate from Formula
**Pros**: No dependency on metadata
**Cons**:
- Risk of calculation errors
- Need to know if domestic/international
- Floating point precision issues
- Complex for dynamic detection mode

### Option 3: Wait for Balance Transaction
**Pros**: Shows actual settled amount
**Cons**:
- Delayed (balance transactions settle later)
- Requires listening to different webhook event
- More complex flow

---

## 📊 Success Metrics

After implementation, verify:
- ✅ `payment_amount` in HubSpot = Net amount (matches `total_base_amount`)
- ✅ `payment_amount_gross` = Customer charge (matches Stripe dashboard)
- ✅ `stripe_fee` = Difference between gross and net
- ✅ Bank transfers continue to work (no fees)
- ✅ No webhook errors in logs
- ✅ Receipt automation still works correctly

---

## 🛡️ Rollback Plan

If issues arise:
1. Revert webhook.js to previous version
2. HubSpot will continue to store gross amounts
3. No data loss (old behavior restored)
4. Can investigate and fix issues offline

---

## 📚 Documentation Updates Needed

After implementation:
- Update README with new HubSpot fields
- Document fee extraction logic
- Add troubleshooting guide for fee discrepancies
- Update API documentation

---

## 🎯 Summary

**The recommended approach is to:**
1. Extract `total_base_amount` from payment intent metadata
2. Store this as `payment_amount` in HubSpot (net amount)
3. Optionally store `payment_amount_gross` and `stripe_fee` for reference
4. Add proper logging and error handling
5. Maintain backward compatibility

This ensures HubSpot accurately reflects the **net revenue** received by the business, while maintaining a complete audit trail of fees paid.
