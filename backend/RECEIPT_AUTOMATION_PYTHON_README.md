# Smokeball Receipt Automation (Python)

This Python script automates creating receipts in Smokeball web app using Playwright, since the API doesn't support Trust account transactions.

## Installation

```bash
# Install Python dependencies
pip install -r requirements-automation.txt

# Install Playwright browsers
playwright install chromium
```

## Setup

1. Add to your `.env` file:
```env
SMOKEBALL_USERNAME=your-email@stanford.au
SMOKEBALL_PASSWORD=your-password
SMOKEBALL_2FA_SECRET=your-base32-secret  # Optional, for automatic 2FA
```

2. To get your 2FA secret:
   - Open Google Authenticator or similar app
   - Find your Smokeball entry
   - Export the secret (base32 format)
   - Or scan QR code again and extract the secret parameter

## Usage

### Test Mode (Default - Does NOT create receipt)

```bash
# Basic usage with default values (test mode)
python smokeball_receipt_automation.py

# With custom parameters
python smokeball_receipt_automation.py \
    --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654 \
    --amount 81.70 \
    --lastname Stanford \
    --firstname Logan \
    --reason "On account of test search fees" \
    --date "21/11/2025"
```

### Actually Create Receipt (Submit)

```bash
# Use --submit flag to actually create the receipt
python smokeball_receipt_automation.py --submit

# Or disable test mode explicitly
python smokeball_receipt_automation.py --submit --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654
```

## Default Receipt Values

- **Matter ID**: `ce2582fe-b415-4f95-b9b9-c79c903a4654`
- **Amount**: `$81.70`
- **Contact**: `Stanford, Logan` (lastname, firstname format)
- **Date**: `21/11/2025`
- **Reason**: `On account of test search fees`
- **Description**: `Bank Transfer deposit` (auto-filled)
- **Type**: `Deposit` (pre-selected)

## How It Works

1. **Login**: Opens browser, navigates to Smokeball, logs in with credentials
2. **2FA**: If configured, generates TOTP code automatically; otherwise prompts for manual input
3. **Navigate**: Goes directly to matter's trust account transactions page
4. **Fill Form**: 
   - Clicks "Deposit Funds" button
   - Fills Date Deposited
   - Enters contact name in "Lastname, Firstname" format
   - Fills Reason
   - Fills Amount in Allocated Matters section
   - Matter is pre-filled automatically
5. **Test Mode**: Stops before clicking "Process/Open Receipt" button
6. **Submit Mode**: Clicks "Process/Open Receipt" to create the receipt

## Test Mode vs Submit Mode

- **Test Mode (default)**: Fills all form fields but stops before final submission. Browser stays open for 30 seconds for inspection.
- **Submit Mode**: Actually creates the receipt by clicking "Process/Open Receipt"

## Screenshots

The script automatically takes screenshots at key points:
- `screenshots/receipt-login-page-*.png`
- `screenshots/receipt-deposit-dialog-opened-*.png`
- `screenshots/receipt-form-filled-*.png`
- `screenshots/receipt-after-submit-*.png` (if submitted)

## Troubleshooting

### 2FA Issues
- If 2FA secret is not configured, the script will prompt for manual input
- Make sure your 2FA secret is in base32 format

### Contact Not Found
- The script enters contact name as "Lastname, Firstname"
- If contact doesn't appear in dropdown, it will leave the typed text
- Make sure the contact exists in Smokeball

### Form Fields Not Found
- The script uses multiple selector strategies
- Check screenshots in `screenshots/` directory to see what the page looks like
- You may need to adjust selectors if Smokeball UI changes

## Example Output

```
🤖 Starting Smokeball Receipt Automation...
🎯 Matter ID: ce2582fe-b415-4f95-b9b9-c79c903a4654
💰 Amount: $81.70
👤 Contact: Stanford, Logan
📅 Date: 21/11/2025
🧪 Test Mode: True

🚀 Initializing browser...
✅ Browser initialized
🔐 Logging into Smokeball...
🔐 2FA required...
🔐 Generated 2FA code: 123456
✅ 2FA verification successful
✅ Successfully logged in
📋 Navigating to matter transactions...
✅ Transactions page loaded
💰 Filling receipt form...
🔘 Clicking "Deposit Funds" button...
📅 Filling date: 21/11/2025
✅ Date filled
👤 Filling Received From: Stanford, Logan
✅ Selected contact from dropdown: Stanford, Logan
📝 Filling reason: On account of test search fees
✅ Reason filled
💰 Filling amount: $81.70
✅ Amount filled

============================================================
🧪 TEST MODE: Stopping before final submission
============================================================
✅ Form has been filled successfully!
📋 Form Summary:
   - Date: 21/11/2025
   - Received From: Stanford, Logan
   - Reason: On account of test search fees
   - Amount: $81.70
   - Matter: Pre-filled

⚠️ To actually create the receipt, run without --test-mode flag
============================================================

⏸️ Keeping browser open for 30 seconds for inspection...
   Press Ctrl+C to close early
```

