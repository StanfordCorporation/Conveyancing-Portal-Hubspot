# Stripe Fee Surcharging Implementation

## Overview

This implementation allows you to pass Stripe processing fees on to your customers, ensuring you receive the full intended net amount after fees are deducted.

## How It Works

### Fee Calculation Formula

```
gross_amount = (net_amount + fixed_fee) / (1 - percentage_fee)
```

### Australian Stripe Fees

**Domestic Cards (default):**
- Percentage: 1.7%
- Fixed Fee: A$0.30

**International Cards:**
- Percentage: 3.5%
- Fixed Fee: A$0.30

### Example Calculation

If you want to receive **A$100.00** net:

```
Conveyancing Fee:     A$100.00
Card Surcharge (1.7%): A$2.04
─────────────────────────────
Total Charge:         A$102.04

After Stripe deducts A$2.04, you receive A$100.00
```

## Implementation Details

### Backend Changes

#### 1. Fee Calculator Utility ([src/utils/stripe-fees.js](backend/src/utils/stripe-fees.js))

```javascript
import { calculateAmountWithFees } from '../utils/stripe-fees.js';

// You want to receive $100.00
const netAmount = 10000; // cents

const result = calculateAmountWithFees(netAmount, { useDomestic: true });
// result.grossAmountInCents = 10204 (A$102.04)
// result.stripeFeeInCents = 204 (A$2.04)
// result.netAmountInCents = 10000 (A$100.00)
```

#### 2. Payment Route Updates ([src/routes/payment.js](backend/src/routes/payment.js:46-104))

The `/api/payment/create-payment-intent` endpoint now:
1. Calculates the gross amount including Stripe fees
2. Creates a PaymentIntent with the gross amount
3. Returns fee breakdown for frontend display
4. Stores fee details in payment metadata

**Request:**
```json
POST /api/payment/create-payment-intent
{
  "dealId": "123456789",
  "amount": 10000  // A$100.00 net amount you want to receive
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "customerId": "cus_xxx",
  "feeBreakdown": {
    "baseAmount": "A$100.00",
    "stripeFee": "A$2.09",
    "totalAmount": "A$102.09",
    "feePercentage": "1.75%",
    "baseAmountCents": 10000,
    "stripeFeeInCents": 209,
    "totalAmountCents": 10209
  }
}
```

### Frontend Changes

#### 1. Payment Form ([frontend/client-portal/src/components/dashboard/PaymentForm.jsx](frontend/client-portal/src/components/dashboard/PaymentForm.jsx:200-223))

The payment form now displays a clear breakdown:

```
┌─────────────────────────────────────┐
│     Complete Payment                │
├─────────────────────────────────────┤
│ Conveyancing Fee:        A$100.00   │
│ Card Processing          A$2.09     │
│ Surcharge (1.75%):                  │
│ ─────────────────────────────────   │
│ Total Charge:            A$102.09   │
│                                     │
│ ⚠️ A 1.75% card processing         │
│    surcharge applies to this        │
│    payment.                         │
└─────────────────────────────────────┘
```

#### 2. Styling ([frontend/client-portal/src/components/dashboard/payment-form.css](frontend/client-portal/src/components/dashboard/payment-form.css:99-165))

Professional styling added for the fee breakdown display with:
- Clear visual hierarchy
- Highlighted surcharge notice
- Color-coded amounts
- Mobile-responsive design

## Compliance & Best Practices

### ✅ Stripe Terms of Service Compliant

The implementation includes clear disclosure of surcharges before payment, which satisfies Stripe's requirements.

### ✅ Australian RBA Guidelines

The Reserve Bank of Australia allows surcharging but requires:
- ✅ **Transparency**: Customers see the exact surcharge before paying
- ✅ **Reasonableness**: Surcharge only covers actual costs (1.75% for domestic cards)
- ✅ **Clear labeling**: Displayed as "Card Processing Surcharge"

### PaymentIntent Metadata

All fee information is stored in Stripe's payment metadata for record-keeping:

```javascript
{
  deal_id: "123456789",
  base_amount: 10000,
  fee_percent: 0.0175,
  fixed_fee: 0.30,
  gross_amount: 10209,
  stripe_fee: 209
}
```

## Testing

### Run Test Script

```bash
cd backend
node test-stripe-fees.js
```

This verifies calculations for various payment amounts.

### Test Cards (Stripe Test Mode)

Use these test cards to verify the payment flow:

- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

Any future expiry date and any 3-digit CVC will work.

## Usage Examples

### Example 1: $100 Payment

```
Input: You want to receive $100.00
Output: Customer pays $102.09
Result: You receive $100.00 (Stripe keeps $2.09)
```

### Example 2: $500 Payment

```
Input: You want to receive $500.00
Output: Customer pays $509.21
Result: You receive $500.00 (Stripe keeps $9.21)
```

### Example 3: $1000 Payment

```
Input: You want to receive $1000.00
Output: Customer pays $1018.12
Result: You receive $1000.00 (Stripe keeps $18.12)
```

## Configuration Options

### Fee Detection Mode

The system supports two modes - configured in [backend/src/config/stripe.js](backend/src/config/stripe.js:31-41):

**Option 1: Static (Recommended)** - Uses one fee rate for all cards
```javascript
feeConfig: {
  useDynamicDetection: false,
  defaultCardType: 'domestic',  // or 'international'
}
```

**Option 2: Dynamic** - Detects card country and adjusts fees automatically
```javascript
feeConfig: {
  useDynamicDetection: true,
}
```

📚 **See [DYNAMIC_FEE_DETECTION.md](DYNAMIC_FEE_DETECTION.md) for detailed comparison and implementation guide**

### Update Fee Rates

If Stripe changes their fee structure, update [src/utils/stripe-fees.js](backend/src/utils/stripe-fees.js:13-23):

```javascript
export const STRIPE_FEES = {
  DOMESTIC: {
    percentage: 0.017,   // 1.7%
    fixed: 30,           // A$0.30 in cents
  },
  INTERNATIONAL: {
    percentage: 0.035,   // 3.5%
    fixed: 30,           // A$0.30 in cents
  },
};
```

## API Changes Summary

### Breaking Changes
❌ None - The API is backward compatible

### New Response Fields
✅ `feeBreakdown` object added to `/api/payment/create-payment-intent` response

## Files Modified/Created

### Created:
- `backend/src/utils/stripe-fees.js` - Fee calculation utility
- `backend/test-stripe-fees.js` - Test script for fee calculations
- `STRIPE_FEE_SURCHARGING.md` - This documentation

### Modified:
- `backend/src/routes/payment.js` - Updated to calculate and apply fees
- `frontend/client-portal/src/components/dashboard/PaymentForm.jsx` - Display fee breakdown
- `frontend/client-portal/src/components/dashboard/payment-form.css` - Styling for breakdown

## Next Steps

1. ✅ **Test in Stripe Test Mode**: Verify the payment flow works as expected
2. ✅ **Review fee disclosure**: Ensure compliance with local regulations
3. 🔄 **Deploy to production**: When ready, deploy both backend and frontend
4. 📧 **Update email templates**: Include fee breakdown in payment confirmation emails
5. 📊 **Monitor transactions**: Track that fees are being calculated correctly

## Support

For Stripe fee information:
- [Stripe Australia Pricing](https://stripe.com/au/pricing)
- [Stripe Payment Intents API](https://stripe.com/docs/api/payment_intents)

For RBA surcharging guidelines:
- [RBA Card Surcharging](https://www.rba.gov.au/payments-and-infrastructure/review-of-card-payments-regulation/conclusions/surcharging.html)
