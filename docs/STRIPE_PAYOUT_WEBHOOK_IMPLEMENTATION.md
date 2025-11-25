# Stripe Payout Webhook Implementation Summary

## Overview
Implemented a two-stage payment status tracking system for Stripe payments that distinguishes between payment success and payout completion.

## Changes Made

### 1. Payment Intent Success Handler (`payment_intent.succeeded`)
**File:** `backend/src/routes/webhook.js` - `handlePaymentSuccess()`

**Changes:**
- Changed `payment_status` from `'Paid'` to `'Pending'` when payment succeeds
- Removed `stripe_payment_intent_uid` field (no longer needed)
- Commented out Smokeball receipting functionality (to be re-enabled after testing)

**What happens:**
- When a payment succeeds, the deal is marked as `'Pending'`
- Payment details are stored (amount, date, payment intent ID, customer ID)
- Deal stage progresses to `FUNDS_PROVIDED` (Step 6)
- Smokeball receipting is currently disabled

### 2. Payout Paid Handler (`payout.paid`)
**File:** `backend/src/routes/webhook.js` - `handlePayoutPaid()`

**New functionality:**
- Handles `payout.paid` webhook events from Stripe
- Lists balance transactions for the payout using `stripe.balanceTransactions.list()` with `expand: ['data.source']`
- Extracts `deal_id` from `charge.metadata.deal_id` (no search needed)
- Updates deals to `payment_status: 'Paid'` when payout completes

**What happens:**
- When a payout is completed, Stripe sends `payout.paid` webhook
- System queries balance transactions for that payout
- For each charge transaction, extracts `deal_id` from charge metadata
- Updates corresponding HubSpot deals to `'Paid'` status

### 3. Webhook Route Update
**File:** `backend/src/routes/webhook.js` - Webhook switch statement

**Added:**
- New case handler for `payout.paid` event type

## Payment Flow

```
1. Customer completes payment
   ↓
2. Stripe sends payment_intent.succeeded webhook
   ↓
3. Backend updates deal:
   - payment_status = 'Pending'
   - Stores payment details
   - Progresses deal to FUNDS_PROVIDED stage
   ↓
4. Stripe processes payout (typically 2-7 days later)
   ↓
5. Stripe sends payout.paid webhook
   ↓
6. Backend queries balance transactions for payout
   ↓
7. Extracts deal_id from charge metadata
   ↓
8. Updates deal:
   - payment_status = 'Paid'
```

## Key Implementation Details

### Balance Transaction Query
```javascript
const balanceTransactions = await stripe.balanceTransactions.list({
  payout: payout.id,
  expand: ['data.source'],  // Expands charge objects directly
  limit: 100
});
```

### Deal ID Extraction
- Deal ID is extracted from `charge.metadata.deal_id`
- No search required - direct metadata access
- Each charge in the payout contains its associated deal_id

### Error Handling
- Continues processing other deals if one fails
- Logs errors but doesn't fail the entire webhook
- Returns success response to Stripe even if some updates fail

## Currently Disabled

### Smokeball Receipting
- Commented out in `handlePaymentSuccess()`
- Will be re-enabled after testing
- Located at lines 127-136 in `webhook.js`

## Testing Checklist

- [ ] Test `payment_intent.succeeded` webhook sets status to `'Pending'`
- [ ] Test `payout.paid` webhook updates status to `'Paid'`
- [ ] Verify deal_id extraction from charge metadata
- [ ] Test with multiple charges in a single payout
- [ ] Verify error handling for missing deal_ids
- [ ] Test Smokeball receipting when ready to re-enable

## API Endpoints

**Webhook Endpoint:** `POST /api/webhook/stripe`

**Supported Events:**
- `payment_intent.succeeded` → Sets status to `'Pending'`
- `payout.paid` → Sets status to `'Paid'`
- `payment_intent.payment_failed` → Sets status to `'Failed'`
- `payment_intent.canceled` → Sets status to `'Canceled'`

## Notes

- Payment status transitions: `Pending` → `Paid` (via payout webhook)
- Deal stage progression happens immediately on payment success
- Payout webhook may contain multiple charges/deals
- All balance transactions are processed in a single payout event

