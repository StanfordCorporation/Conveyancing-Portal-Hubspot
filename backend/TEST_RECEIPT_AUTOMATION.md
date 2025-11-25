# Testing Receipt Automation - Complete Guide

## Overview

This guide explains how to test the complete receipt automation flow for both **Stripe** and **Bank Transfer** payments, and how the form fields are filled in each case.

## How Form Fields Are Filled

### Common Fields (Both Payment Types)

| Field | Value Source | Format | Example |
|-------|-------------|--------|---------|
| **Date Deposited** | `payment_date` from deal (or current date) | DD/MM/YYYY | "21/11/2025" |
| **Received From** | Contact from deal associations | "Lastname, Firstname" | "Stanford, Logan" |
| **Reason** | Hardcoded | Text | "On account of search fees" |
| **Amount** | **Differs by payment type** (see below) | Decimal | 81.70 |

### Amount Field - Stripe vs Bank Transfer

#### Stripe Payments

**Amount Calculation:**
1. Fetches `stripe_payment_intent_id` from deal
2. Calls Stripe API to get payment intent
3. Extracts `base_amount` from payment intent metadata (in cents)
4. Converts to dollars: `baseAmountCents / 100`
5. **Uses net amount after Stripe fees**

**Example:**
- Customer pays: $85.00 (gross, includes Stripe fees)
- Stripe fees: ~$3.30
- Net amount: $81.70
- **Form receives: $81.70**

**Why?** We receipt the net amount that actually reaches the trust account, not the gross amount charged to the customer.

#### Bank Transfer Payments

**Amount Calculation:**
1. Fetches `payment_amount` from deal (already in dollars)
2. Parses as float
3. Validates it's > 0
4. **Uses full transfer amount**

**Example:**
- Customer transfers: $81.70
- No fees deducted
- **Form receives: $81.70**

**Why?** Bank transfers have no processing fees, so we receipt the full amount transferred.

## Testing the Automation

### Prerequisites

1. ✅ 2FA configured (`SMOKEBALL_2FA_SECRET` in `.env`)
2. ✅ Python dependencies installed (`pip install -r requirements-automation.txt`)
3. ✅ Playwright browser installed (`playwright install chromium`)
4. ✅ HubSpot deal with:
   - `payment_status` = "Paid"
   - `payment_method` = "Stripe" or "Bank Transfer"
   - `matter_uid` or `smokeball_lead_uid` set
   - For Stripe: `stripe_payment_intent_id` set
   - For Bank Transfer: `payment_amount` set
   - `payment_date` set (optional, uses current date if not set)

### Test Method 1: Using Node.js Test Script

**Test Mode (Form Filled But Not Submitted):**
```bash
cd backend
node test-receipt-automation-full.js <dealId> --test-mode
```

**Production Mode (Actually Creates Receipt):**
```bash
cd backend
node test-receipt-automation-full.js <dealId>
```

**Example:**
```bash
# Test with Stripe payment deal (test mode)
node test-receipt-automation-full.js 123456789 --test-mode

# Test with Bank Transfer deal (production)
node test-receipt-automation-full.js 987654321
```

### Test Method 2: Direct Python Script

**Test Mode:**
```bash
cd backend
python smokeball_receipt_automation.py \
  --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654 \
  --amount 81.70 \
  --lastname Stanford \
  --firstname Logan \
  --date 21/11/2025 \
  --test-mode
```

**Production Mode:**
```bash
cd backend
python smokeball_receipt_automation.py \
  --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654 \
  --amount 81.70 \
  --lastname Stanford \
  --firstname Logan \
  --date 21/11/2025 \
  --submit
```

### Test Method 3: Via API Route

**Test Mode:**
```bash
curl -X POST http://localhost:3000/api/smokeball/receipt/create \
  -H "Content-Type: application/json" \
  -d '{
    "dealId": "123456789",
    "testMode": true
  }'
```

**Production Mode:**
```bash
curl -X POST http://localhost:3000/api/smokeball/receipt/create \
  -H "Content-Type: application/json" \
  -d '{
    "dealId": "123456789"
  }'
```

## What to Watch For During Testing

### 1. Login Process
- ✅ Username and password entered automatically
- ✅ 2FA code generated automatically (if configured)
- ✅ Login completes without manual intervention

### 2. Navigation
- ✅ Browser navigates to matter transactions page
- ✅ URL format: `.../view-matter/{matterId}/transactions/trust/{accountId}~2FTrust`
- ✅ Page loads successfully

### 3. Form Filling
- ✅ "Deposit Funds" button clicked
- ✅ Dialog opens
- ✅ Date field filled (DD/MM/YYYY format)
- ✅ Received From field filled ("Lastname, Firstname")
- ✅ Reason field filled ("On account of search fees")
- ✅ Amount field filled (correct value based on payment type)

### 4. Amount Verification

**For Stripe Payments:**
- Check console logs for: `💳 Stripe payment - Net amount after fees: $XX.XX`
- Verify amount matches `base_amount` from Stripe payment intent metadata
- Should be less than gross amount (fees deducted)

**For Bank Transfer:**
- Check console logs for: `🏦 Bank transfer - Amount: $XX.XX`
- Verify amount matches `payment_amount` from deal
- Should be full transfer amount (no fees)

### 5. Submission (Production Mode Only)
- ✅ "Process/Open Receipt" button clicked
- ✅ Receipt created successfully
- ✅ Sync status updated to "Successful" in HubSpot

## Expected Console Output

### Stripe Payment Example

```
[Receipt Automation] 🚀 Triggering automation for deal 123456789...
[Receipt Automation] 📋 Fetching deal 123456789...
[Receipt Automation] 💳 Stripe payment - Net amount after fees: $81.70
[Receipt Automation] 👤 Found contact: Stanford, Logan
[Receipt Automation] 📅 Using date: 21/11/2025
[Receipt Automation] 🐍 Executing Python script...
[Receipt Automation] 🔐 Logging into Smokeball...
[Receipt Automation] 🔐 2FA required...
[Receipt Automation] 🔐 Generated 2FA code: 123456
[Receipt Automation] ✅ 2FA verification successful
[Receipt Automation] ✅ Successfully logged in
[Receipt Automation] 📋 Navigating to matter transactions...
[Receipt Automation] 💰 Filling receipt form...
[Receipt Automation] ✅ Form has been filled successfully!
[Receipt Automation] ✅ Sync status updated to Successful
```

### Bank Transfer Example

```
[Receipt Automation] 🚀 Triggering automation for deal 987654321...
[Receipt Automation] 📋 Fetching deal 987654321...
[Receipt Automation] 🏦 Bank transfer - Amount: $81.70
[Receipt Automation] 👤 Found contact: Stanford, Logan
[Receipt Automation] 📅 Using date: 21/11/2025
[Receipt Automation] 🐍 Executing Python script...
[Receipt Automation] 🔐 Logging into Smokeball...
[Receipt Automation] 🔐 2FA required...
[Receipt Automation] 🔐 Generated 2FA code: 123456
[Receipt Automation] ✅ 2FA verification successful
[Receipt Automation] ✅ Successfully logged in
[Receipt Automation] 📋 Navigating to matter transactions...
[Receipt Automation] 💰 Filling receipt form...
[Receipt Automation] ✅ Form has been filled successfully!
[Receipt Automation] ✅ Sync status updated to Successful
```

## Troubleshooting

### Issue: "Payment status is not Paid"

**Solution:**
- Ensure deal has `payment_status` = "Paid"
- Check HubSpot deal properties

### Issue: "No matter_uid or smokeball_lead_uid found"

**Solution:**
- Create Smokeball lead first
- Ensure `matter_uid` or `smokeball_lead_uid` is set on deal

### Issue: "Stripe payment intent ID not found"

**Solution:**
- For Stripe payments, ensure `stripe_payment_intent_id` is set
- Check that payment intent exists in Stripe

### Issue: "Could not extract base_amount from payment intent metadata"

**Solution:**
- Verify payment intent has `metadata.base_amount` set
- Check Stripe payment intent creation code

### Issue: "Invalid payment amount"

**Solution:**
- For Bank Transfer, ensure `payment_amount` is set and > 0
- Check deal properties in HubSpot

### Issue: Form fields not filling correctly

**Solution:**
- Check screenshots in `backend/screenshots/` directory
- Verify Smokeball UI hasn't changed
- Check browser console for errors

## Screenshots

The automation takes screenshots at key points:
- `before-fill-form.png`: Before clicking Deposit Funds
- `deposit-dialog-opened.png`: After dialog opens
- `form-filled.png`: After all fields are filled
- `after-submit.png`: After submission (production only)
- `automation-error.png`: If any error occurs

Check `backend/screenshots/` directory for debugging.

## Next Steps After Testing

1. ✅ Verify receipt appears in Smokeball
2. ✅ Check HubSpot deal sync status is "Successful"
3. ✅ Verify receipt amount matches expected value
4. ✅ Confirm receipt date is correct
5. ✅ Verify contact name is correct

## Production Deployment

Once testing is complete:

1. ✅ Remove `--test-mode` flags
2. ✅ Ensure `SMOKEBALL_2FA_SECRET` is configured
3. ✅ Verify webhook handlers are calling `triggerReceiptAutomationForDeal`
4. ✅ Monitor logs for automation triggers
5. ✅ Set up error alerts for failed automations

