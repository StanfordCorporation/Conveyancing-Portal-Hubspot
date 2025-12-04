# Stripe Fee Extraction - Quick Summary

## 🎯 What You Want

Store the **net amount** (after Stripe fees) in HubSpot's `payment_amount` field, not the gross amount.

## 💡 The Solution

**Use the metadata that's already being stored!**

The payment intent already contains `total_base_amount` in metadata, which is the exact net amount before fees were added.

## 📊 Current vs Proposed Flow

### **Current Flow** ❌
```
Customer Quote: $525.46
     ↓
Add Stripe Fees: +$9.38 (1.7% + $0.30)
     ↓
Customer Pays: $534.84
     ↓
Webhook Stores: payment_amount = $534.84 ❌ (WRONG - includes fees)
```

### **Proposed Flow** ✅
```
Customer Quote: $525.46
     ↓
Add Stripe Fees: +$9.38
     ↓
Customer Pays: $534.84
     ↓
Extract from metadata: total_base_amount = $525.46
     ↓
Webhook Stores:
  - payment_amount = $525.46 ✅ (NET - what you actually receive)
  - payment_amount_gross = $534.84 (optional - for reference)
  - stripe_fee = $9.38 (optional - for accounting)
```

## 🔧 Code Change Required

**File**: `backend/src/routes/webhook.js` (Line 126)

### Current:
```javascript
payment_amount: (paymentIntent.amount / 100).toString(), // Stores gross
```

### New:
```javascript
const netAmount = parseFloat(paymentIntent.metadata?.total_base_amount || '0');
const grossAmount = paymentIntent.amount / 100;
const stripeFee = grossAmount - netAmount;

// In updateDeal():
payment_amount: netAmount.toFixed(2), // ✅ NET amount
payment_amount_gross: grossAmount.toFixed(2), // Optional: gross for reference
stripe_fee: stripeFee.toFixed(2), // Optional: fee for accounting
```

## 📦 HubSpot Properties

### Modified:
- `payment_amount` - Now stores **NET** amount (what you receive)

### New (Optional but recommended):
- `payment_amount_gross` - Gross amount (what customer paid)
- `stripe_fee` - Processing fee amount

## ✅ Benefits

1. **Accurate Revenue**: HubSpot reflects actual money received
2. **Fee Tracking**: Know exactly how much was paid in fees
3. **Simple**: Uses existing metadata, no API calls needed
4. **Reliable**: No calculations, just use stored value
5. **Backward Compatible**: Falls back gracefully for old payments

## 🧪 Example

**Test Payment**:
- Property Searches: $425.00
- Conveyancing Deposit: $110.00
- **Net Total: $535.00**
- Stripe Fee: $9.40
- **Customer Charged: $544.40**

**HubSpot Stores**:
```javascript
{
  payment_amount: "535.00",        // ✅ What you receive
  payment_amount_gross: "544.40",  // What customer paid
  stripe_fee: "9.40",              // Fee amount
  payment_method: "Stripe",
  payment_status: "Pending"
}
```

## 🚀 Next Steps

1. Create HubSpot properties (`payment_amount_gross`, `stripe_fee`)
2. Update `handlePaymentSuccess()` in webhook.js
3. Test with test mode payments
4. Deploy to production

---

**Full detailed plan**: See `STRIPE_FEE_EXTRACTION_PLAN.md`
