# Stripe Payments - Currently Disabled

## ⚠️ Status: PAYMENTS DISABLED

Credit card payments via Stripe are currently **DISABLED** and will show an error message to users.

---

## 🔧 How to Re-Enable Payments

Follow these 3 simple steps:

### Step 1: Enable Payments in Config

**File:** [backend/src/config/stripe.js](backend/src/config/stripe.js:32)

Change this line:
```javascript
paymentsEnabled: false, // TODO: Set to true to re-enable payments
```

To:
```javascript
paymentsEnabled: true, // ✅ Payments enabled
```

### Step 2: Uncomment Payment Methods

**File:** [backend/src/integrations/stripe/payments.js](backend/src/integrations/stripe/payments.js:38-54)

Find this section:
```javascript
// automatic_payment_methods: {
//   enabled: true,
// },

// Temporary: No payment methods enabled (disables all payment methods including cards)
payment_method_types: [], // Empty array = no payment methods available
```

Replace with:
```javascript
automatic_payment_methods: {
  enabled: true,
},

// payment_method_types: [], // ✅ Re-enabled automatic payment methods
```

### Step 3: Restart Backend Server

```bash
cd backend
npm start
```

That's it! Payments are now re-enabled.

---

## 🧪 Testing After Re-enabling

1. Navigate to a deal in the client portal
2. Try to make a payment
3. You should see the payment form with Stripe Elements
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any future expiry, any 3-digit CVC

---

## 🚫 What Happens When Payments Are Disabled?

### Backend Behavior

When a user tries to create a payment:

**Response:**
```json
{
  "error": "Payments are temporarily unavailable",
  "paymentsDisabled": true,
  "message": "Credit card payments are currently disabled. Please contact us for alternative payment methods."
}
```

**HTTP Status:** `503 Service Unavailable`

### Frontend Behavior

**Clean UX - No Error Messages!**

When payments are disabled, users experience a seamless flow:

1. **Payment Method Selection Screen:**
   - Credit card option is **completely hidden**
   - Only "Bank Transfer" option is shown
   - Bank Transfer gets "Only Option" badge
   - No error messages or warnings

2. **If User Somehow Reaches Payment Form:**
   - Form returns `null` (shows nothing)
   - No error message displayed
   - Clean, silent handling

**Result:** Users are gently guided to Bank Transfer without seeing any error messages or disabled states.

---

## 📊 Files Modified

| File | Change | Purpose |
|------|--------|---------|
| [backend/src/config/stripe.js](backend/src/config/stripe.js:32) | Added `paymentsEnabled: false` | Feature flag to disable payments |
| [backend/src/routes/payment.js](backend/src/routes/payment.js:42-49) | Added payments check | Returns 503 error if disabled |
| [backend/src/integrations/stripe/payments.js](backend/src/integrations/stripe/payments.js:38-54) | Commented out payment methods | Prevents payment processing at Stripe level |
| [frontend/.../PaymentForm.jsx](frontend/client-portal/src/components/dashboard/PaymentForm.jsx:98-114) | Returns `null` when disabled | Hides payment form completely |
| [frontend/.../PaymentMethodSelection.jsx](frontend/client-portal/src/components/dashboard/PaymentMethodSelection.jsx:13-30) | Checks payment status on load | Hides credit card option when disabled |

---

## 🔐 Security Note

Even with `paymentsEnabled: false`, we've added **multiple layers** of protection:

1. ✅ **Config flag check** - Backend rejects payment creation with 503 error
2. ✅ **Empty payment methods** - Stripe PaymentIntent has no payment methods enabled
3. ✅ **Frontend option hiding** - Credit card option not shown in payment method selection
4. ✅ **Silent form handling** - PaymentForm returns null if somehow accessed

This ensures no payments can be processed accidentally, while providing a clean UX without error messages.

---

## 💡 Alternative Payment Methods

While Stripe payments are disabled, you may want to:

- Accept bank transfers (EFT/BPAY)
- Accept checks
- Use other payment processors
- Process payments manually

Update your customer communication accordingly.

---

## 📝 Summary

**Current State:** ❌ Payments DISABLED
**User Impact:** Users see error message instead of payment form
**Data Impact:** None - no data is lost, just payment processing is paused
**Reversible:** ✅ Yes - follow 3 steps above to re-enable

---

## Quick Re-enable Checklist

- [ ] Set `paymentsEnabled: true` in config
- [ ] Uncomment `automatic_payment_methods` block
- [ ] Comment out `payment_method_types: []` line
- [ ] Restart backend server
- [ ] Test with Stripe test card
- [ ] Verify payment form displays correctly
- [ ] Check fee breakdown shows up
- [ ] Confirm payment completes successfully
