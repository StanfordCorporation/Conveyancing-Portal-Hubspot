# Aircall SMS Integration for OTP

The Conveyancing Portal uses **Aircall** for sending SMS OTP (One-Time Password) verification codes to mobile numbers.

## Overview

- **Service**: Aircall Agent Conversation API
- **Use Case**: SMS OTP verification for client portal login
- **Endpoint**: `/numbers/{lineId}/messages/native/send`
- **Visibility**: Messages appear in Aircall apps for agent visibility
- **No Line Configuration Required**: Uses Agent Conversation endpoint

---

## Configuration

### 1. Aircall Credentials

Your Aircall credentials are already configured in `backend/.env`:

```env
AIRCALL_API_ID=35e9a8a3e5ed402e628598a30200e36f
AIRCALL_TOKEN=5b8eda50f7ec7cc267cc3dc3b81ac69e
AIRCALL_FROM_NUMBER=+61483980010
AIRCALL_LINE_ID=846163
```

### 2. API Details

| Setting | Value |
|---------|-------|
| **API Base URL** | `https://api.aircall.io/v1` |
| **Authentication** | Basic Auth (API ID + Token) |
| **From Number** | +61 483 980 010 |
| **Line ID** | 846163 |
| **Endpoint** | `/numbers/846163/messages/native/send` |

---

## How It Works

### OTP SMS Flow

```
1. User enters mobile number on login page
2. Backend generates 6-digit OTP
3. Backend calls Aircall API to send SMS
4. Aircall sends SMS to user's mobile
5. SMS appears in Aircall apps (for agent visibility)
6. User enters OTP to verify and login
```

### SMS Message Format

```
Your verification code is: 123456

This code will expire in 5 minutes.

Stanford Legal - Conveyancing Portal
```

---

## Phone Number Formatting

The integration automatically formats Australian phone numbers to E.164 international format:

| Input Format | Output (E.164) | Description |
|--------------|----------------|-------------|
| `0412345678` | `+61412345678` | Australian mobile |
| `61412345678` | `+61412345678` | With country code, no + |
| `+61412345678` | `+61412345678` | Already formatted |

---

## Implementation Details

### Files Created

1. **[backend/config/aircall.config.js](backend/config/aircall.config.js)**
   - Aircall configuration settings
   - API credentials
   - Line ID

2. **[backend/services/aircall/client.js](backend/services/aircall/client.js)**
   - Aircall API client
   - Phone number formatting
   - SMS sending functions
   - OTP SMS wrapper

3. **[backend/utils/otp.js](backend/utils/otp.js)** (Updated)
   - Integrated Aircall for SMS sending
   - Fallback to console in development mode

### Usage in Code

```javascript
import { sendOTPSMS } from './services/aircall/client.js';

// Send OTP via Aircall
const result = await sendOTPSMS('0412345678', '123456');

// Result:
// {
//   success: true,
//   messageId: 'msg_abc123',
//   message: 'OTP sent to 0412345678 via Aircall'
// }
```

---

## Testing

### Test SMS Sending

```bash
# Start backend
cd backend
npm run dev
```

**Test via API:**
```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "0412345678",
    "method": "mobile"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent to 0412345678",
  "otp": "123456"  // Only in development
}
```

### Test from Login Page

1. **Open:** http://localhost:3000/login
2. **Select:** "Mobile" tab
3. **Enter:** 0412 345 678
4. **Click:** "Send Verification Code"
5. **Check:** SMS received on mobile
6. **Check:** Aircall app shows sent message

---

## Development vs Production

### Development Mode

- OTP is logged to console
- Fallback to console if Aircall fails
- OTP returned in API response

```javascript
// Development: OTP in response
{
  "success": true,
  "otp": "123456",  // ⚠️ Only in development
  "message": "OTP sent to +61412345678"
}
```

### Production Mode

- No OTP in console or response
- Aircall is required (no fallback)
- Strict error handling

```javascript
// Production: No OTP in response
{
  "success": true,
  "message": "OTP sent to +61412345678"
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Aircall API credentials not configured` | Missing API ID or Token | Check `backend/.env` |
| `Invalid phone number format` | Phone not in valid format | Use Australian mobile format |
| `Aircall Line ID not configured` | Missing Line ID | Add `AIRCALL_LINE_ID=846163` to .env |
| `Aircall API error: ...` | API request failed | Check Aircall API status |

### Logs

**Backend Console:**
```
[Aircall] API Request: { url: 'https://api.aircall.io/v1/numbers/846163/messages/native/send', method: 'POST', hasData: true }
[Aircall] SMS sent successfully: { messageId: 'msg_123', to: '+61412345678', endpoint: 'native-agent-conversation' }
[OTP SMS] Sending OTP 123456 to 0412345678 via Aircall
```

---

## API Endpoints

### Aircall API Used

**1. Send SMS (Native Agent Conversation)**
```
POST https://api.aircall.io/v1/numbers/{lineId}/messages/native/send

Headers:
  Authorization: Basic {base64(apiId:token)}
  Content-Type: application/json

Body:
{
  "to": "+61412345678",
  "body": "Your verification code is: 123456..."
}

Response:
{
  "id": "msg_abc123",
  "to": "+61412345678",
  "body": "Your verification code is: 123456...",
  "status": "sent"
}
```

---

## Advantages of Agent Conversation Endpoint

✅ **No Line Configuration Required** - Works with Line ID only
✅ **Agent Visibility** - Messages appear in Aircall apps
✅ **Simple Integration** - No 'from' field needed
✅ **Reliable Delivery** - Uses Aircall's native SMS infrastructure
✅ **Audit Trail** - All messages visible in Aircall dashboard

---

## Monitoring

### Aircall Dashboard

1. Login to [Aircall Dashboard](https://dashboard.aircall.io)
2. Navigate to **Messages** → **SMS**
3. View sent OTP messages
4. Track delivery status
5. Monitor failed sends

### Application Logs

Check backend logs for:
- OTP generation
- SMS sending attempts
- Aircall API responses
- Error details

---

## Security

### OTP Security

- ✅ 6-digit random OTP
- ✅ 5-minute expiry
- ✅ One-time use only
- ✅ Stored in-memory (not database)
- ✅ Auto-cleanup after use/expiry

### Aircall Security

- ✅ Basic Auth with API credentials
- ✅ HTTPS only
- ✅ Rate limiting on API
- ✅ Message encryption in transit

---

## Troubleshooting

### SMS Not Received

1. **Check phone number format:**
   - Must be Australian mobile (04xx xxx xxx)
   - Or international format (+614xx xxx xxx)

2. **Verify Aircall credentials:**
   ```bash
   # Test Aircall connection
   curl -u "API_ID:TOKEN" https://api.aircall.io/v1/numbers
   ```

3. **Check backend logs:**
   ```bash
   cd backend
   npm run dev
   # Look for [Aircall] logs
   ```

4. **Verify Line ID:**
   - Ensure Line ID 846163 is correct
   - Check Aircall dashboard for active lines

### Fallback in Development

If Aircall fails in development, the system logs OTP to console:
```
[OTP SMS] DEVELOPMENT FALLBACK - OTP 123456 for 0412345678
```

---

## Next Steps

1. ✅ **Test SMS sending** via login page
2. ✅ **Verify Aircall dashboard** shows messages
3. ✅ **Test OTP verification** flow
4. ✅ **Monitor delivery rates**
5. ✅ **Set up error alerting** (optional)

---

## Support

- **Aircall Support:** [support@aircall.io](mailto:support@aircall.io)
- **API Docs:** [https://developer.aircall.io](https://developer.aircall.io)
- **Dashboard:** [https://dashboard.aircall.io](https://dashboard.aircall.io)

---

**Your Aircall SMS integration is ready for OTP delivery!** 🚀
