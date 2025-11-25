# Dynamic Card Country Detection for Stripe Fees

## Overview

You now have **two options** for handling Stripe fee surcharging:

1. **Static Fee Structure** (RECOMMENDED) - Simple, fast, reliable
2. **Dynamic Detection** - Detects card country and adjusts fees accordingly

## Comparison

| Feature | Static (Recommended) | Dynamic Detection |
|---------|---------------------|-------------------|
| **Complexity** | Simple | Complex |
| **Speed** | Fast (instant) | Slower (2 API calls) |
| **User Experience** | Clean, predictable | Fee may change after card entry |
| **Error Handling** | Minimal edge cases | More potential failures |
| **Recommended For** | Most businesses | High international volume |

---

## Option 1: Static Fee Structure ⭐ RECOMMENDED

### How It Works

Apply **one fee rate** to all transactions, regardless of card origin.

### Configuration

In [backend/src/config/stripe.js](backend/src/config/stripe.js:31-41):

```javascript
feeConfig: {
  useDynamicDetection: false,  // ✅ Keep false for static
  defaultCardType: 'domestic',  // Use 'domestic' or 'international'
}
```

### Recommendations

**Use `domestic` rates (1.7%)** if:
- ✅ Most of your customers are Australian
- ✅ You want the simplest implementation
- ✅ You prefer predictable checkout flow
- ✅ Your average transaction is under $1000

**Use `international` rates (3.5%)** if:
- You have many international customers
- You want to be conservative (always covered)
- You're willing to charge slightly more for domestic cards

### Example: $100 Payment with Domestic Rates

```
Conveyancing Fee:           A$100.00
Card Surcharge (1.7%):      A$2.04
────────────────────────────────────
Total Charge:               A$102.04
```

**Customer from Australia**: Pays A$102.04 ✅
**Customer from overseas**: Pays A$102.04 ✅ (but your actual cost is ~$3.80)

### Pros & Cons

**Pros:**
- ✅ Simple implementation
- ✅ Fast checkout
- ✅ No surprises for customer
- ✅ Fewer edge cases
- ✅ Easier to test

**Cons:**
- ❌ May undercharge international cards (you absorb ~$1.21 difference per $100)
- ❌ Or overcharge domestic cards if you use international rates

---

## Option 2: Dynamic Detection

### How It Works

1. Customer enters card details
2. Payment is **authorized** (not captured)
3. Backend detects card country from Stripe
4. Fee is adjusted based on domestic (1.7%) or international (3.5%) rates
5. Payment is **captured** with correct amount

### Configuration

In [backend/src/config/stripe.js](backend/src/config/stripe.js:31-41):

```javascript
feeConfig: {
  useDynamicDetection: true,  // ✅ Enable dynamic detection
  defaultCardType: 'domestic', // Not used when dynamic is enabled
}
```

### Payment Flow

```
┌─────────────────────────────────────────────┐
│ 1. Create PaymentIntent                     │
│    Amount: International rates (conservative)│
│    Capture: Manual                          │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 2. Customer Enters Card                     │
│    Stripe authorizes payment                │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 3. Backend Detects Card Country             │
│    AU card → 1.7% + $0.30                   │
│    Other → 3.5% + $0.30                     │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 4. Update PaymentIntent Amount              │
│    Adjust to correct fee                    │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 5. Capture Payment                          │
│    Charge finalized                         │
└─────────────────────────────────────────────┘
```

### Example: $100 Payment with Dynamic Detection

**Australian Card:**
```
Initial authorization:       A$103.30 (international rates)
Card detected: AU
Final charge:               A$102.09 (domestic rates)
You receive:                A$100.00
```

**International Card:**
```
Initial authorization:       A$103.30 (international rates)
Card detected: US
Final charge:               A$103.30 (international rates)
You receive:                A$100.00
```

### Implementation Details

#### Backend Files

1. **Payment Integration** ([src/integrations/stripe/payments.js](backend/src/integrations/stripe/payments.js))
   - `createPaymentIntent()` - Now supports `manualCapture` flag
   - `getCardCountry()` - Retrieves card country from PaymentMethod
   - `updatePaymentIntentAmount()` - Adjusts amount before capture
   - `capturePaymentIntent()` - Finalizes payment

2. **Payment Routes** ([src/routes/payment.js](backend/src/routes/payment.js))
   - `POST /api/payment/create-payment-intent` - Creates PaymentIntent with dynamic config
   - `POST /api/payment/adjust-and-capture/:paymentIntentId` - Detects and adjusts fees

#### Frontend Files

[PaymentForm.jsx](frontend/client-portal/src/components/dashboard/PaymentForm.jsx:180-195) checks `useDynamicDetection` flag:
- If `false`: Payment auto-captures (normal flow)
- If `true`: Calls `/adjust-and-capture` endpoint after authorization

### Pros & Cons

**Pros:**
- ✅ Always charges exact fee (no over/undercharging)
- ✅ Fair to all customers
- ✅ Maximizes accuracy

**Cons:**
- ❌ More complex implementation
- ❌ Slower checkout (2 API calls)
- ❌ More potential failure points
- ❌ Customer sees initial amount that may change
- ❌ Harder to test and debug

---

## Cost Comparison

### Scenario: 100 transactions/month, $100 average

| Card Mix | Static (Domestic) | Static (International) | Dynamic |
|----------|------------------|----------------------|---------|
| **80% AU, 20% International** | | | |
| Your revenue | $9,833.60 (lose $166.40) | $10,000 | $10,000 |
| Customer total | $10,209 | $10,330 | $10,257 |
| Simplicity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| | | | |
| **50% AU, 50% International** | | | |
| Your revenue | $9,739 (lose $261) | $10,000 | $10,000 |
| Customer total | $10,209 | $10,330 | $10,270 |
| Simplicity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

### Break-Even Analysis

For dynamic detection to be worth the complexity, you need:
- **High volume** (>500 transactions/month)
- **High international mix** (>30% international cards)
- **Large transaction sizes** (>$500 average)

Otherwise, the ~$1-2 per transaction difference isn't worth the added complexity.

---

## Recommendation

### ⭐ Use Static with Domestic Rates (1.7%)

**Best for 90% of Australian conveyancing businesses:**

```javascript
// backend/src/config/stripe.js
feeConfig: {
  useDynamicDetection: false,
  defaultCardType: 'domestic',
}
```

**Why:**
- Most AU customers use AU cards (~85-90%)
- ~$1.21 loss per $100 on international cards is negligible
- Much simpler UX and implementation
- Faster checkout
- Fewer errors

### When to Consider Dynamic Detection

Only if **ALL** of these are true:
- ✅ You process >500 transactions/month
- ✅ >30% are international cards
- ✅ Average transaction size >$500
- ✅ You have development resources for testing/maintenance

---

## Testing

### Test Static Implementation

```bash
cd backend
node test-stripe-fees.js
```

### Test Dynamic Detection

1. Enable dynamic detection:
```javascript
// backend/src/config/stripe.js
feeConfig: {
  useDynamicDetection: true,
}
```

2. Use Stripe test cards:
   - **AU Domestic**: `4000000360000006` (Australia)
   - **International**: `4000000400000008` (United States)

3. Watch console logs for card country detection

---

## Migration Guide

### Switch from Static to Dynamic

1. Update config:
```javascript
// backend/src/config/stripe.js
feeConfig: {
  useDynamicDetection: true,
}
```

2. Test thoroughly with both AU and international test cards

3. Monitor logs for any errors during capture

### Switch from Dynamic to Static

1. Update config:
```javascript
// backend/src/config/stripe.js
feeConfig: {
  useDynamicDetection: false,
  defaultCardType: 'domestic', // or 'international'
}
```

2. That's it! Frontend automatically adapts

---

## Troubleshooting

### Dynamic Detection Issues

**Problem**: "Card country not available" error

**Solutions**:
- Ensure payment is confirmed before calling `/adjust-and-capture`
- Check that PaymentIntent has `payment_method` attached
- Verify Stripe API version supports card country

**Problem**: Customer charged wrong amount

**Solutions**:
- Check that `manualCapture: true` is set when `useDynamicDetection` is enabled
- Verify `/adjust-and-capture` endpoint is being called
- Review console logs for fee calculation

**Problem**: Payment authorized but not captured

**Solutions**:
- Check for errors in `/adjust-and-capture` endpoint
- Manually capture via Stripe dashboard if needed
- Add retry logic in frontend

---

## API Reference

### POST /api/payment/adjust-and-capture/:paymentIntentId

**Purpose**: Detect card country and capture payment with adjusted fee

**Request**:
```json
{
  "baseAmount": 10000  // Net amount you want to receive (cents)
}
```

**Response**:
```json
{
  "success": true,
  "paymentIntentId": "pi_xxx",
  "status": "succeeded",
  "cardType": "domestic",
  "cardCountry": "AU",
  "feeBreakdown": {
    "baseAmount": "A$100.00",
    "stripeFee": "A$2.04",
    "totalAmount": "A$102.04",
    "feePercentage": "1.7%"
  }
}
```

---

## Summary

| Approach | Best For | Setup Complexity | Accuracy |
|----------|----------|------------------|----------|
| **Static Domestic** | 🌟 Most businesses | ⭐⭐⭐⭐⭐ Easy | 90% |
| **Static International** | Conservative approach | ⭐⭐⭐⭐⭐ Easy | 100% (overcharge domestic) |
| **Dynamic** | High volume + international | ⭐⭐ Complex | 100% |

**Bottom Line**: Unless you have specific needs, stick with **static domestic rates** for simplicity and good UX.
