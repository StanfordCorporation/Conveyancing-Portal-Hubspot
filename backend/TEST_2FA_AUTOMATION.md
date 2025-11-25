# Testing 2FA Automation for Smokeball Receipt Creation

## Overview

The Python automation script (`smokeball_receipt_automation.py`) supports automatic 2FA token generation using TOTP (Time-based One-Time Password). This allows the automation to run fully unattended without manual 2FA code input.

## Current Status

✅ **2FA Support Implemented**: The automation script already includes 2FA token generation functionality  
⚠️ **Configuration Required**: `SMOKEBALL_2FA_SECRET` needs to be added to your `.env` file

## How It Works

1. The script checks for `SMOKEBALL_2FA_SECRET` environment variable
2. If found, it uses `pyotp` library to generate TOTP codes automatically
3. During login, if 2FA is required, it automatically fills the code
4. If not configured, it falls back to manual input (prompts user)

## Setup Instructions

### Step 1: Get Your 2FA Secret

You need to extract the base32 secret from your authenticator app. The method depends on your app:

**Google Authenticator:**
- Cannot directly export secrets (security feature)
- You'll need to re-setup 2FA and save the secret during setup
- Or use an app that supports secret export (like Authy, Microsoft Authenticator)

**Authy:**
- Settings → Accounts → Select account → Show QR Code
- The secret is in the URL or can be extracted from the QR code

**Microsoft Authenticator:**
- Export feature available in some versions
- Or re-setup and save the secret

**General Method:**
- When setting up 2FA, you're usually shown a QR code
- The QR code contains a URL like: `otpauth://totp/Smokeball:user@example.com?secret=ABCDEFGHIJKLMNOP&issuer=Smokeball`
- Extract the `secret=` part (this is your base32 secret)

### Step 2: Add to .env File

Add the following line to your `backend/.env` file:

```env
SMOKEBALL_2FA_SECRET=YOUR_BASE32_SECRET_HERE
```

**Important:**
- The secret should be in base32 format (uppercase letters A-Z and numbers 2-7)
- No spaces or special characters
- Example: `JBSWY3DPEHPK3PXP`

### Step 3: Verify Installation

Ensure `pyotp` is installed:

```bash
pip install pyotp
```

This should already be in `requirements-automation.txt`.

## Testing 2FA Automation

### Run the Test Script

A dedicated test script is available to verify 2FA token generation:

```bash
cd backend
python test-2fa-automation.py
```

**Expected Output (when configured correctly):**

```
[TEST] Testing 2FA Token Generation
============================================================
[OK] Found SMOKEBALL_2FA_SECRET in environment
   Secret length: 16 characters
   Secret preview: JBSWY3DPEHPK3...

[INFO] Generating TOTP code...
[OK] Successfully generated 2FA code: 123456
   Code length: 6 digits

[TEST] Testing code generation over time:
   (Codes should change every 30 seconds)
   Code 1: 123456 (valid for 28 more seconds)
   Code 2: 123456 (valid for 27 more seconds)
   Code 3: 123456 (valid for 26 more seconds)

[OK] 2FA token generation is working correctly!

[INFO] This means the Python automation script will be able to:
   - Automatically generate 2FA codes during login
   - Complete login without manual intervention
   - Run fully automated receipt creation

[TEST] Testing Automation Script 2FA Integration
============================================================
[OK] Successfully imported SmokeBallReceiptAutomation
[OK] 2FA secret is configured in automation class
[OK] generate_totp_code() works: 123456

[SUMMARY] Test Summary
============================================================
   Basic 2FA Generation: [PASS]
   Automation Integration: [PASS]

[SUCCESS] All tests passed! 2FA automation is ready to use.
```

### Test with Actual Login

To test the full automation flow including 2FA:

```bash
cd backend
python smokeball_receipt_automation.py \
  --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654 \
  --amount 81.70 \
  --lastname Stanford \
  --firstname Logan \
  --test-mode
```

**What to Watch For:**

1. **Login Process:**
   - Script enters username and password
   - If 2FA is required, you should see: `🔐 2FA required...`
   - Then: `🔐 Generated 2FA code: 123456`
   - Code should be automatically filled
   - Login should complete without manual input

2. **If Manual Input is Required:**
   - You'll see: `⚠️ Manual 2FA required - please enter code:`
   - This means `SMOKEBALL_2FA_SECRET` is not configured or invalid

## Troubleshooting

### Issue: "SMOKEBALL_2FA_SECRET not found"

**Solution:**
- Check that `.env` file exists in `backend/` directory
- Verify the variable name is exactly `SMOKEBALL_2FA_SECRET`
- Ensure no quotes around the secret value
- Restart your terminal/IDE after adding to `.env`

### Issue: "Failed to generate TOTP code"

**Possible Causes:**
1. **Invalid Secret Format:**
   - Secret must be base32 (A-Z, 2-7 only)
   - No spaces, dashes, or special characters
   - Check for typos

2. **Wrong Secret:**
   - Secret doesn't match your authenticator app
   - Verify by comparing generated code with your app

3. **Time Sync:**
   - TOTP codes depend on system time
   - Ensure your system clock is synchronized
   - Run: `python -c "import time; print(time.time())"` to check

### Issue: "2FA code doesn't work"

**Solution:**
- Verify the secret matches your authenticator app
- Check system time is correct
- Codes expire every 30 seconds - try again
- Ensure secret is in base32 format (not hex or other encoding)

### Issue: "pyotp not installed"

**Solution:**
```bash
pip install pyotp
```

Or install all automation requirements:
```bash
pip install -r requirements-automation.txt
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Keep Secret Secure:**
   - Never commit `.env` file to version control
   - Use environment variables in production
   - Restrict file permissions: `chmod 600 .env`

2. **Secret Storage:**
   - Consider using a secrets manager in production
   - Rotate secrets periodically
   - Use different secrets for different environments

3. **Access Control:**
   - Limit who can access the `.env` file
   - Use least privilege principle

## Integration with Webhook Automation

When the automation runs from webhooks (via `triggerReceiptAutomationForDeal`), it will:

1. ✅ Automatically generate 2FA codes if `SMOKEBALL_2FA_SECRET` is configured
2. ❌ Fail if 2FA is required but secret is not configured (no manual input available)

**Recommendation:** Always configure `SMOKEBALL_2FA_SECRET` for production webhook automation.

## Next Steps

1. ✅ Get your 2FA secret from your authenticator app
2. ✅ Add `SMOKEBALL_2FA_SECRET` to `backend/.env`
3. ✅ Run `python test-2fa-automation.py` to verify
4. ✅ Test full automation with `--test-mode` flag
5. ✅ Once verified, automation will work automatically from webhooks

## References

- [pyotp Documentation](https://github.com/pyotp/pyotp)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [Base32 Encoding](https://en.wikipedia.org/wiki/Base32)

