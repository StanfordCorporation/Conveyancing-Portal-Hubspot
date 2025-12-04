# Backend Changes Plan: Conveyancing Deposit Integration

## Overview
This document outlines all backend changes required to handle the $110 conveyancing deposit separately from property searches, track both deposit and settlement amounts, and integrate with payment processing.

## 🎯 SIMPLIFIED APPROACH SUMMARY

**Key Insight**: Deposit is MANDATORY (always paid with searches), so we can minimize new properties!

### What Changes:
- ✅ **Frontend**: Show breakdown (searches + deposit = total)
- ✅ **Payment**: Charge total amount (searches + $110)
- ✅ **Storage**: Add ONLY 2 new HubSpot properties
- ✅ **Calculations**: Most values computed on-demand

### New HubSpot Properties (Just 2!):
1. `searches_amount` - Property searches subtotal
2. `conveyancing_settlement_outstanding` - Amount due at settlement

### Everything Else (Calculated):
- Conveyancing total: **$847** (Standard) or **$968** (Body Corp)
- Deposit: Always **$110**
- Total due now: `searches_amount + 110`
- Settlement: **$737** (Standard/no body corp) or **$858** (Body Corp)

### Data Flow Example:
```
User completes questionnaire
         ↓
Quote calculated:
  - Searches: $175.48 (varies)
  - Body Corporate: Yes
         ↓
Frontend displays:
  ┌─────────────────────────────────┐
  │ Property Searches:     $175.48  │
  │ Conveyancing Deposit:  $110.00  │
  │ ─────────────────────────────── │
  │ TOTAL DUE NOW:        $285.48  │
  │                                 │
  │ Due at Settlement:     $858.00  │
  │ (includes body corp fees)       │
  └─────────────────────────────────┘
         ↓
User pays $285.48 (via Stripe + fees)
         ↓
HubSpot Deal Updated:
  - payment_amount: 285.48        (EXISTING)
  - searches_amount: 175.48       (NEW #1)
  - conveyancing_settlement_outstanding: 858  (NEW #2)
  - payment_status: Pending       (EXISTING)
```

---

## 1. HubSpot Custom Properties (Deal Object)

### Existing Properties (Already in HubSpot)
These properties ALREADY exist and will be used:

| Property Name | Field Type | Current Usage |
|--------------|-----------|---------------|
| `payment_method` | String | Stripe / Bank Transfer |
| `payment_status` | String | Pending / Paid / Failed |
| `payment_amount` | Number | **Total amount paid** (searches + deposit) |
| `payment_date` | Date | When payment was made |
| `stripe_payment_intent_id` | String | Stripe reference |
| `body_corporate` | Enum | yes / no (determines settlement amount) |

### New Properties to Create in HubSpot
**ONLY 2 new properties needed:**

| Property Name | Field Type | Purpose |
|--------------|-----------|---------|
| `searches_amount` | Number | Property searches subtotal (for reporting) |
| `conveyancing_settlement_outstanding` | Number | Amount due at settlement ($737 or $858) |

### Why This Minimal Approach?
- **Deposit is MANDATORY**: Always paid with searches, no optional checkbox needed
- **Use Existing Fields**: `payment_amount` stores total (searches + deposit)
- **Calculate on Demand**: Deposit is always $110, total fee is $847 (Standard) or $968 (Body Corp)
- **Settlement Tracking**: Only need to track what's outstanding
- **Clean Reporting**: `searches_amount` separates revenue streams

### Calculations (No Storage Required)
These are calculated on-the-fly, not stored:
- Conveyancing total fee: $847 (Standard) or $968 (Body Corp)
- Conveyancing deposit: Always $110
- Settlement amount: $737 (Standard/no body corp) or $858 (Body Corp)
- Total due now: `searches_amount` + $110

---

## 2. Quote Calculation Endpoint Updates

### File: `backend/src/routes/quote.js`

**Current Status**: ✅ Already updated with conveyancing object

**Additional Changes Needed**:

```javascript
// After calculating quote and conveyancing
const totalPaymentDue = quote.grandTotal + conveyancing.depositNow;

// Update HubSpot deal with MINIMAL data (only 2 new fields!)
await dealsIntegration.updateDeal(dealId, {
  // NEW FIELD 1: Track searches amount for reporting
  searches_amount: quote.grandTotal,

  // NEW FIELD 2: Track settlement outstanding
  conveyancing_settlement_outstanding: conveyancing.settlementAmount
});

console.log(`[Quote] 💾 Saved quote to HubSpot:`);
console.log(`[Quote]   - Searches Amount: $${quote.grandTotal}`);
console.log(`[Quote]   - Total Due Now: $${totalPaymentDue} (searches + $110 deposit)`);
console.log(`[Quote]   - Settlement Outstanding: $${conveyancing.settlementAmount}`);
```

**Why**: Minimal storage, everything else calculated on-demand

---

## 3. Payment Flow Changes

### File: `backend/src/routes/payment.js`

**Current Behavior**:
- Creates payment intent for full quote amount
- Updates `payment_amount` field on success

**Required Changes**:

#### A. Update Payment Intent Creation

```javascript
router.post('/create-payment-intent', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.body;

    // Fetch quote with conveyancing data
    const quoteResponse = await axios.post('/quote/calculate', { dealId });
    const { quote, conveyancing } = quoteResponse.data;

    // Calculate total amount due now (searches + deposit)
    const totalDueNow = quote.grandTotal + conveyancing.depositNow;

    // Calculate fees including Stripe surcharge
    const feeCalculation = calculateAmountWithFees(
      totalDueNow * 100, // Convert to cents
      { useDomestic }
    );

    // Create payment intent
    const paymentIntent = await stripePayments.createPaymentIntent({
      amount: feeCalculation.grossAmountInCents,
      customerId: customer.id,
      description: `Property Searches ($${quote.grandTotal}) + Conveyancing Deposit ($${conveyancing.depositNow})`,
      metadata: {
        deal_id: dealId,
        searches_amount: quote.grandTotal,
        conveyancing_deposit: conveyancing.depositNow,
        total_base_amount: totalDueNow,
        conveyancing_settlement_amount: conveyancing.settlementAmount,
        body_corporate_status: conveyancing.bodyCorporateStatus
      }
    });

    // Return breakdown to frontend
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentBreakdown: {
        searchesTotal: quote.grandTotal,
        conveyancingDeposit: conveyancing.depositNow,
        subtotal: totalDueNow,
        stripeFee: feeCalculation.breakdown.stripeFee,
        totalCharge: feeCalculation.breakdown.grossAmount
      }
    });
  }
});
```

**Why**:
- Automatically includes deposit in payment
- Provides transparent breakdown to user
- Stores metadata for webhook processing

---

## 4. Webhook Handler Updates

### File: `backend/src/routes/webhook.js`

**Current Behavior**:
- Updates `payment_amount`, `payment_status`, `payment_method`
- Progresses deal to FUNDS_PROVIDED stage

**Required Changes**:

```javascript
export async function handlePaymentSuccess(paymentIntent) {
  const dealId = paymentIntent.metadata?.deal_id;
  const searchesAmount = parseFloat(paymentIntent.metadata?.searches_amount || 0);
  const settlementAmount = parseFloat(paymentIntent.metadata?.conveyancing_settlement_amount || 0);

  if (dealId) {
    await dealsIntegration.updateDeal(dealId, {
      // EXISTING FIELDS - Payment tracking
      payment_method: 'Stripe',
      payment_status: 'Pending',
      payment_amount: (paymentIntent.amount / 100).toString(), // Total: searches + $110
      payment_date: new Date().toISOString().split('T')[0],
      stripe_payment_intent_id: paymentIntent.id,

      // NEW FIELD 1 - Searches breakdown
      searches_amount: searchesAmount.toString(),

      // NEW FIELD 2 - Settlement outstanding
      conveyancing_settlement_outstanding: settlementAmount.toString(),

      // Progress deal stage
      dealstage: DEAL_STAGES.FUNDS_PROVIDED.id
    });

    console.log(`[Webhook] ✅ Payment processed:`);
    console.log(`[Webhook]   - Total Paid: $${paymentIntent.amount / 100}`);
    console.log(`[Webhook]   - Breakdown: Searches $${searchesAmount} + Deposit $110`);
    console.log(`[Webhook]   - Outstanding at Settlement: $${settlementAmount}`);
  }
}
```

**Why**:
- Clear audit trail of what was paid
- Track deposit separately from searches
- Know outstanding settlement amount

---

## 5. Payment Instructions Component Updates

### File: `frontend/client-portal/src/components/dashboard/PaymentInstructions.jsx`

**Current Behavior**:
- Fetches quote.grandTotal
- Shows single payment amount

**Required Changes**:

```javascript
const fetchQuote = async () => {
  const response = await axios.post(`${API_BASE_URL}/quote/calculate`, { dealId });

  if (response.data.success) {
    const { quote, conveyancing } = response.data;

    // Calculate total due now
    const totalDueNow = quote.grandTotal + conveyancing.depositNow;

    setQuoteAmount(totalDueNow);
    setPaymentBreakdown({
      searches: quote.grandTotal,
      deposit: conveyancing.depositNow,
      totalDueNow: totalDueNow,
      settlementAmount: conveyancing.settlementAmount,
      bodyCorporate: conveyancing.bodyCorporateStatus
    });
  }
};

// In JSX:
<div className="payment-breakdown">
  <h3>Payment Due Now</h3>
  <div className="breakdown-line">
    <span>Property Searches</span>
    <span>${paymentBreakdown.searches}</span>
  </div>
  <div className="breakdown-line">
    <span>Conveyancing Deposit</span>
    <span>${paymentBreakdown.deposit}</span>
  </div>
  <div className="breakdown-total">
    <span>Total Due Now</span>
    <span>${paymentBreakdown.totalDueNow}</span>
  </div>

  <div className="settlement-info">
    <p>💡 <strong>Due at Settlement:</strong> ${paymentBreakdown.settlementAmount}</p>
    {paymentBreakdown.bodyCorporate === 'yes' && (
      <p className="text-sm">Includes Body Corporate fees</p>
    )}
  </div>
</div>
```

**Why**: Users see exactly what they're paying for and what's still owed

---

## 6. Client Dashboard Quote Display

### File: `frontend/client-portal/src/components/dashboard/ClientDashboard.jsx`

**Required Changes**:

```javascript
// When storing quote amounts
const handleQuoteUpdate = (quote, conveyancing) => {
  const totalDueNow = quote.grandTotal + conveyancing.depositNow;

  setQuoteAmounts(prev => ({
    ...prev,
    [currentProperty.id]: {
      totalDueNow: totalDueNow,
      breakdown: {
        searches: quote.grandTotal,
        deposit: conveyancing.depositNow,
        settlement: conveyancing.settlementAmount
      }
    }
  }));
};

// Pass to PaymentInstructions
<PaymentInstructions
  dealId={currentProperty.id}
  quoteAmount={quoteAmounts[currentProperty.id]?.totalDueNow || '0.00'}
  breakdown={quoteAmounts[currentProperty.id]?.breakdown}
  {...otherProps}
/>
```

---

## 7. New API Endpoint: Settlement Amount Retrieval

### File: `backend/src/routes/client.js`

**Purpose**: Allow agents/clients to see outstanding settlement amount

```javascript
router.get('/property/:dealId/settlement-info', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.params;

    const deal = await dealsIntegration.getDeal(dealId, [
      'conveyancing_settlement_outstanding', // NEW FIELD
      'payment_status',                       // EXISTING
      'property_address'                      // EXISTING
    ]);

    const settlementInfo = {
      propertyAddress: deal.properties.property_address,
      totalFee: 770, // Always $770
      depositPaid: deal.properties.payment_status === 'Paid', // If payment made, deposit included
      settlementOutstanding: deal.properties.conveyancing_settlement_outstanding || '0',
    };

    res.json({
      success: true,
      settlementInfo
    });
  } catch (error) {
    console.error('[Settlement Info] Error:', error);
    res.status(500).json({ error: 'Failed to fetch settlement info' });
  }
});
```

---

## 8. Bank Transfer Flow Updates

### File: `backend/src/routes/client.js` - `/property/:dealId/bank-transfer`

**Current Behavior**: Records bank transfer for full quote amount

**Required Changes**:

```javascript
router.post('/property/:dealId/bank-transfer', authenticateJWT, async (req, res) => {
  const { dealId } = req.params;
  const { amount } = req.body; // Total: searches + deposit

  // Fetch quote to get breakdown
  const quoteResponse = await axios.post('/quote/calculate', { dealId });
  const { quote, conveyancing } = quoteResponse.data;

  await dealsIntegration.updateDeal(dealId, {
    // EXISTING FIELDS
    payment_method: 'Bank Transfer',
    payment_status: 'Pending',
    payment_amount: amount.toString(), // Total: searches + $110
    payment_date: new Date().toISOString().split('T')[0],

    // NEW FIELD 1 - Searches breakdown
    searches_amount: quote.grandTotal.toString(),

    // NEW FIELD 2 - Settlement outstanding
    conveyancing_settlement_outstanding: conveyancing.settlementAmount.toString(),

    // Progress stage
    dealstage: DEAL_STAGES.FUNDS_PROVIDED.id
  });

  res.json({ success: true });
});
```

---

## 9. Constants File Updates

### File: `backend/src/config/constants.js`

**Add new constants**:

```javascript
export const CONVEYANCING = {
  TOTAL_FEE: 770,
  DEPOSIT: 110,
  SETTLEMENT_WITHOUT_BODY_CORP: 660,
  SETTLEMENT_WITH_BODY_CORP: 770
};

export const PAYMENT_COMPONENTS = {
  SEARCHES: 'searches',
  DEPOSIT: 'deposit',
  SETTLEMENT: 'settlement'
};
```

---

## 10. Testing Checklist

### Backend Testing
- [ ] Quote calculation returns correct conveyancing data
- [ ] HubSpot deal properties update correctly
- [ ] Payment intent includes both searches + deposit
- [ ] Webhook handler updates all required fields
- [ ] Bank transfer flow records correct amounts
- [ ] Settlement info endpoint returns correct data

### Integration Testing
- [ ] Body corporate = 'Yes' → Settlement = $770
- [ ] Body corporate = 'No' → Settlement = $660
- [ ] Payment metadata preserved through Stripe
- [ ] All amounts displayed correctly in frontend

### Data Validation
- [ ] No rounding errors in cent calculations
- [ ] Stripe fee calculations include deposit
- [ ] Payment breakdown adds up correctly
- [ ] Settlement amount matches body corporate status

---

## Complexity Comparison

### ❌ Original Plan (Too Complex):
- 10 new HubSpot properties
- Tracking deposit paid/unpaid state
- Separate payment date for deposit
- Redundant total fields

### ✅ Simplified Plan (Optimal):
- **2 new HubSpot properties**
- Deposit always included in payment
- Single payment flow
- Calculate values on-demand

### Savings:
- **80% fewer properties** to create and maintain
- **Simpler code** with less state management
- **Clearer logic** - deposit is never optional
- **Same functionality** with less complexity

---

## Implementation Order

1. **Create HubSpot properties** (Just 2! - Do this first in HubSpot admin)
   - `searches_amount` (Number)
   - `conveyancing_settlement_outstanding` (Number)
2. **Update constants file** with conveyancing values
3. **Enhance quote endpoint** to save to HubSpot (2 fields)
4. **Update payment intent creation** with breakdown metadata
5. **Update webhook handler** to populate new fields
6. **Update frontend components** to display breakdown
7. **Add settlement info endpoint**
8. **Update bank transfer flow**
9. **Test end-to-end** with real payments (test mode)
10. **Deploy to production**

---

## Database Schema Notes

### HubSpot Deal Properties Summary

```
EXISTING (No changes needed):
- payment_method: String (Stripe, Bank Transfer)
- payment_status: String (Pending, Paid, Failed)
- payment_amount: Number (stores: searches + $110 deposit)
- payment_date: Date
- stripe_payment_intent_id: String
- body_corporate: Enum (yes, no) - determines settlement amount

NEW (ONLY 2 PROPERTIES TO CREATE):
- searches_amount: Number - property searches subtotal
- conveyancing_settlement_outstanding: Number - $660 or $770

CALCULATED (Not stored, computed on-demand):
- Conveyancing total: Always $770
- Deposit: Always $110
- Total due now: searches_amount + 110
- Settlement: Based on body_corporate (660 or 770)
```

---

## Success Metrics

After implementation, we should see:
- ✅ Clear breakdown of searches vs conveyancing in payments
- ✅ Accurate tracking of deposit paid vs settlement outstanding
- ✅ Proper handling of body corporate fee differences
- ✅ Complete audit trail in HubSpot
- ✅ Transparent pricing for clients
- ✅ Easy reporting for finance team

---

## Migration & Backward Compatibility

### Existing Deals (Before This Feature):
- `payment_amount` contains only searches cost
- `searches_amount` will be empty
- `conveyancing_settlement_outstanding` will be empty

### New Deals (After Implementation):
- `payment_amount` contains searches + $110
- `searches_amount` populated with searches subtotal
- `conveyancing_settlement_outstanding` populated with $660/$770

### Handling Mixed States:
```javascript
// In any endpoint that reads payment data:
const searchesAmount = deal.properties.searches_amount
  ? parseFloat(deal.properties.searches_amount)
  : parseFloat(deal.properties.payment_amount || 0); // Fallback to old field

const depositPaid = deal.properties.searches_amount ? true : false;
// If searches_amount exists, it's a new deal with deposit included
```

### No Breaking Changes:
- Old deals continue to work
- New deals get enhanced tracking
- Reports can distinguish old vs new by checking `searches_amount` field

---

## Notes

- **Stripe Fee Calculation**: The deposit amount must be included in the Stripe fee calculation since it's part of the total charge
- **Body Corporate Logic**: Settlement amount changes based on body corporate status - this is already calculated in the quote endpoint
- **Payment Timing**: Deposit is due immediately with searches; settlement amount is collected separately at closing
- **Refund Handling**: If a deal falls through, can refund full amount or itemize (searches vs deposit)
- **Agent Portal**: Agents should see deposit status in their deal view (future enhancement)
- **Mandatory Deposit**: No UI for skipping deposit - it's always included in the payment
