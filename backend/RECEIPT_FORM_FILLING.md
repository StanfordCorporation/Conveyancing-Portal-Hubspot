# How the Deposit Funds Form is Filled

## Overview

The Python automation script (`smokeball_receipt_automation.py`) fills the Smokeball "Deposit Funds" form with payment details extracted from HubSpot deals. The form filling process is identical for both Stripe and Bank Transfer payments, but the **amount extraction differs**.

## Form Fields Filled

### 1. Date Deposited
- **Source**: `payment_date` from HubSpot deal (or current date if not set)
- **Format**: DD/MM/YYYY (e.g., "21/11/2025")
- **Location**: First text input field in the form
- **Method**: Finds label "Date Deposited" and fills the associated input

### 2. Received From
- **Source**: Contact associated with the deal (Primary Seller preferred)
- **Format**: "Lastname, Firstname" (e.g., "Stanford, Logan")
- **Location**: Combobox field labeled "Received From"
- **Method**: 
  - Finds label "Received From"
  - Clicks combobox to open dropdown
  - Types contact name in "Lastname, Firstname" format
  - Waits for dropdown to filter
  - Selects matching contact or presses Enter

### 3. Reason
- **Source**: Hardcoded as "On account of search fees"
- **Location**: Text input field labeled "Reason"
- **Method**: Finds label "Reason" and fills the associated input

### 4. Amount (Allocated Matters Section)
- **Location**: Spinbutton/number input in "Allocated Matters" section
- **Method**: Finds "Allocated Matters" section, then finds "Amount" label within it
- **Value differs by payment type** (see below)

## Amount Extraction: Stripe vs Bank Transfer

### Stripe Payments

**Amount Source**: `base_amount` from Stripe Payment Intent metadata

**Process**:
1. Fetches deal property: `stripe_payment_intent_id`
2. Calls Stripe API: `getPaymentIntent(stripe_payment_intent_id)`
3. Extracts: `paymentIntent.metadata.base_amount` (in cents)
4. Converts to dollars: `baseAmountCents / 100`
5. Uses this net amount (after Stripe fees) for receipt

**Example**:
- Customer pays: $85.00 (includes Stripe fees)
- Net amount after fees: $81.70
- **Form receives**: $81.70

**Code Location**: `backend/src/services/workflows/smokeball-receipt-automation.js` (lines 178-193)

```javascript
if (paymentMethod === 'Stripe') {
  const paymentIntent = await stripePayments.getPaymentIntent(deal.properties.stripe_payment_intent_id);
  const baseAmountCents = parseInt(paymentIntent.metadata?.base_amount);
  amount = baseAmountCents / 100; // Convert cents to dollars
  console.log(`💳 Stripe payment - Net amount after fees: $${amount.toFixed(2)}`);
}
```

### Bank Transfer Payments

**Amount Source**: `payment_amount` from HubSpot deal

**Process**:
1. Fetches deal property: `payment_amount` (already in dollars)
2. Parses as float: `parseFloat(deal.properties.payment_amount)`
3. Validates: Must be > 0
4. Uses this full amount (no fees deducted) for receipt

**Example**:
- Customer transfers: $81.70
- **Form receives**: $81.70 (full amount, no fees)

**Code Location**: `backend/src/services/workflows/smokeball-receipt-automation.js` (lines 194-201)

```javascript
else {
  // Bank Transfer - use payment_amount directly
  amount = parseFloat(deal.properties.payment_amount);
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid payment amount: ${deal.properties.payment_amount}`);
  }
  console.log(`🏦 Bank transfer - Amount: $${amount.toFixed(2)}`);
}
```

## Complete Form Filling Flow

### Step-by-Step Process

1. **Navigate to Matter Transactions Page**
   - URL: `https://app.smokeball.com.au/#/billing/view-matter/{matterId}/transactions/trust/{accountId}~2FTrust`
   - Waits for page to load

2. **Click "Deposit Funds" Button**
   - Finds button by role: `button[name='Deposit Funds']`
   - Clicks to open deposit dialog
   - Takes screenshot: `deposit-dialog-opened`

3. **Fill Date Deposited**
   - Finds label: "Date Deposited"
   - Locates associated input field
   - Fills with formatted date (DD/MM/YYYY)

4. **Fill Received From**
   - Finds label: "Received From"
   - Locates combobox
   - Clicks to open dropdown
   - Types: "Lastname, Firstname"
   - Waits for dropdown filtering
   - Selects matching contact or presses Enter

5. **Fill Reason**
   - Finds label: "Reason"
   - Locates associated input field
   - Fills with: "On account of search fees"

6. **Fill Amount**
   - Finds section: "Allocated Matters"
   - Finds label: "Amount" within that section
   - Locates spinbutton/number input
   - Fills with calculated amount (Stripe: net after fees, Bank Transfer: full amount)

7. **Submit or Test**
   - **Test Mode**: Takes screenshot, displays form summary, keeps browser open for 30 seconds
   - **Production**: Clicks "Process/Open Receipt" button, waits for submission, takes final screenshot

## Python Script Form Filling Code

**File**: `backend/smokeball_receipt_automation.py`

**Key Function**: `fill_receipt_form(self, receipt_data)`

**Receipt Data Structure**:
```python
receipt_data = {
    'amount': 81.70,           # Calculated amount (differs by payment type)
    'date': '21/11/2025',      # Formatted payment date
    'lastname': 'Stanford',     # Contact lastname
    'firstname': 'Logan',       # Contact firstname
    'reason': 'On account of search fees',  # Hardcoded reason
}
```

## Differences Summary

| Field | Stripe | Bank Transfer |
|-------|--------|---------------|
| **Amount Source** | `base_amount` from Payment Intent metadata | `payment_amount` from HubSpot deal |
| **Amount Calculation** | `baseAmountCents / 100` (net after fees) | `parseFloat(payment_amount)` (full amount) |
| **Amount Example** | $81.70 (from $85.00 gross) | $81.70 (full transfer) |
| **Date** | `payment_date` from deal | `payment_date` from deal |
| **Contact** | From deal associations | From deal associations |
| **Reason** | "On account of search fees" | "On account of search fees" |

## Error Handling

The form filling includes multiple fallback strategies:

1. **Primary Method**: Find by label text, then locate associated input
2. **Fallback Method**: Find all inputs of that type, use positional selection
3. **Screenshots**: Taken at each step for debugging
4. **Error Logging**: All failures are logged with details

## Testing

To test form filling:

```bash
# Test mode (fills form but doesn't submit)
python smokeball_receipt_automation.py \
  --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654 \
  --amount 81.70 \
  --lastname Stanford \
  --firstname Logan \
  --date 21/11/2025 \
  --test-mode

# Production mode (actually submits)
python smokeball_receipt_automation.py \
  --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654 \
  --amount 81.70 \
  --lastname Stanford \
  --firstname Logan \
  --date 21/11/2025 \
  --submit
```

## Screenshots

The automation takes screenshots at key points:
- `before-fill-form`: Before clicking Deposit Funds
- `deposit-dialog-opened`: After dialog opens
- `form-filled`: After all fields are filled
- `after-submit`: After clicking Process/Open Receipt (production only)
- `automation-error`: If any error occurs

Screenshots are saved to `backend/screenshots/` directory.

