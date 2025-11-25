# Smokeball Receipt Automation

This script automates creating receipts in Smokeball web app using Playwright, since the API doesn't support Trust account transactions.

## Installation

```bash
# Install dependencies
npm install playwright dotenv speakeasy

# Install Playwright browsers
npx playwright install chromium
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

```bash
# Basic usage with default values
node smokeball-receipt-automation.js

# With custom matter ID
node smokeball-receipt-automation.js ce2582fe-b415-4f95-b9b9-c79c903a4654

# With all parameters
node smokeball-receipt-automation.js <matterId> <amount> <payorId> <payorName>

# Example:
node smokeball-receipt-automation.js ce2582fe-b415-4f95-b9b9-c79c903a4654 81.70 996e77c6-0072-4e8b-a836-72ed96b01c51 "Logan Stanford"
```

## Default Receipt Values

- **Matter ID**: `ce2582fe-b415-4f95-b9b9-c79c903a4654`
- **Amount**: `$81.70`
- **Payor ID**: `996e77c6-0072-4e8b-a836-72ed96b01c51`
- **Payor Name**: `Logan Stanford`
- **Date**: `2025-11-21 at 11:27:57 am`
- **Description**: `Bank Transfer deposit`
- **Reason**: `On account of test search fees`
- **Note**: `Janelle May on 2025-11-21 at 11:27:57 am`
- **Type**: `Deposit`

## How It Works

1. **Login**: Opens browser, navigates to Smokeball, logs in with credentials
2. **2FA**: If configured, generates TOTP code automatically; otherwise prompts for manual input
3. **Navigate**: Goes directly to matter's trust account transactions page
4. **Create Receipt**: 
   - Clicks "Add" or "New Transaction" button
   - Fills in all receipt fields
   - Submits the form
5. **Screenshots**: Takes debug screenshots at each step (saved as `debug-receipt-*.png`)

## Troubleshooting

- **Browser doesn't open**: Check Playwright installation with `npx playwright install chromium`
- **2FA fails**: Enter code manually if speakeasy not configured
- **Can't find form fields**: Check screenshots in `debug-receipt-*.png` files
- **Form submission fails**: The script will take a screenshot - check the UI structure

## Notes

- Browser runs in **non-headless mode** by default (visible) for debugging
- Set `headless: true` in the script for production use
- Screenshots are saved automatically for debugging
- The script waits 5 seconds before closing browser to show results

