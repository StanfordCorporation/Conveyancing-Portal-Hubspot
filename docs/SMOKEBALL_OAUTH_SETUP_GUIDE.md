# Smokeball OAuth Setup & Testing Guide

## ✅ Status Check

### Credentials Verified:
- ✅ `SMOKEBALL_CLIENT_ID` matches PHP implementation
- ✅ `SMOKEBALL_CLIENT_SECRET` matches PHP implementation  
- ✅ `SMOKEBALL_API_KEY` matches PHP implementation
- ✅ `SMOKEBALL_AUTH_BASE_URL` configured correctly
- ✅ `SMOKEBALL_API_BASE_URL` configured correctly
- ✅ `REDIS_URL` configured for token storage

### Integration Fixed:
- ✅ Contact creation payload (person wrapper)
- ✅ Lead/matter creation payload (correct field names)
- ✅ Matter types fetching from API
- ✅ Staff lookup by name (Sean Kerswill, Laura Stuart)
- ✅ Australian address parsing utilities

---

## 🔐 Step 1: Complete OAuth Authentication

The server is running on `http://localhost:3001`

### 1a. Start OAuth Flow

Visit this URL in your browser:
```
http://localhost:3001/api/smokeball/setup
```

You'll see OAuth setup instructions.

### 1b. Click Authorization Link

Click on the authorization URL (or visit):
```
http://localhost:3001/api/smokeball/authorize
```

This will redirect you to Smokeball's login page.

### 1c. Log In to Smokeball

- Log in with your Smokeball account credentials
- **Same account you used in the PHP WordPress version**

### 1d. Grant Permissions

- Approve the permissions requested
- You'll be redirected back to `http://localhost:3001/api/smokeball/oauth-callback`

### 1e. Verify Success

You should see:
```json
{
  "message": "OAuth authentication successful!",
  "status": {
    "authenticated": true,
    "tokenValid": true,
    "expiresAt": "2024-..."
  }
}
```

The tokens are now stored in Redis and will auto-refresh! 🎉

---

## 🧪 Step 2: Run Test Scripts

### Test 1: Comprehensive Integration Test

```bash
cd backend
node test-smokeball-integration.js
```

**This tests:**
- ✅ Address parsing utilities
- ✅ Name parsing utilities
- ✅ Staff lookup (Sean Kerswill, Laura Stuart)
- ✅ Matter types lookup (by state/category/name)
- ✅ Contact creation with correct payload
- ✅ Full lead workflow (dry run - no actual lead created)

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════════════════╗
║          SMOKEBALL INTEGRATION - COMPREHENSIVE TESTS                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

=================================================================================
TEST 1: Address Parsing Utilities
=================================================================================
ℹ️  Parsing: 123 Main Street, Sydney NSW 2000
  State: New South Wales
✅ State extracted successfully
...

Results: 6/6 tests passed
✅ All tests passed! Integration is ready to use.
```

---

### Test 2: Staff API Test

```bash
cd backend
node test-smokeball-staff.js
```

**This tests:**
- Configuration validation
- Authentication status
- Direct staff endpoint call
- Staff service functions
- Staff lookup by name

**Expected Output:**
```
TEST SUMMARY
✅ Configuration                  PASSED
✅ Authentication                 PASSED
✅ Staff Endpoint (Direct)        PASSED
✅ Staff Service                  PASSED
✅ Raw HTTP Request              PASSED
```

---

### Test 3: Contacts API Test

```bash
cd backend
node test-smokeball-contacts.js
```

**This tests:**
- List existing contacts
- Different contact payload structures
- Find the correct payload format
- Clean up test contacts

**Expected Output:**
```
TEST 2: Test Contact Payload Structures
✓ Person Wrapper WORKED! Status: 200
...
```

---

## 🚀 Step 3: Test Real Lead Creation

### Option A: Via API Endpoint (Manual Test)

Use Postman or curl to create a test deal in HubSpot, which will trigger Smokeball lead creation:

```bash
curl -X POST http://localhost:3001/api/agent/leads \
  -H "Content-Type: application/json" \
  -d '{
    "propertyAddress": "123 Test Street, Brisbane QLD 4000",
    "transactionType": "sale",
    "clientName": "Test Client",
    "sellers": [
      {
        "name": "John Smith",
        "email": "john.smith@test.com",
        "mobile": "0400111222"
      }
    ]
  }'
```

### Option B: Via Frontend

1. Open agent portal: `http://localhost:3000`
2. Create a new lead
3. Monitor backend logs for Smokeball integration

### Option C: Direct Smokeball Workflow Test

Create a minimal test file:

```javascript
// test-real-lead-creation.js
import dotenv from 'dotenv';
import { createSmokeballLeadFromDeal } from './src/services/workflows/smokeball-lead-creation.js';

dotenv.config();

async function testRealLead() {
  // Use an existing HubSpot deal ID
  const dealId = 'YOUR_HUBSPOT_DEAL_ID';
  
  try {
    console.log('Creating Smokeball lead from HubSpot deal:', dealId);
    const result = await createSmokeballLeadFromDeal(dealId);
    
    console.log('✅ Success!');
    console.log('Lead ID:', result.leadId);
    console.log('Matter Type:', result.matterType);
    console.log('Client Role:', result.clientRole);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error(error.stack);
  }
}

testRealLead();
```

Then run:
```bash
node test-real-lead-creation.js
```

---

## 🔍 Step 4: Verify in Smokeball

After creating a test lead:

1. **Log in to Smokeball** (web or desktop app)
2. **Go to Leads/Matters** section
3. **Verify the lead appears** with:
   - ✅ Correct matter type (e.g., "Conveyancing - Sale")
   - ✅ Correct client(s) with contact details
   - ✅ Correct staff assignments (Sean Kerswill responsible, Laura Stuart assistant)
   - ✅ Referral type: "Real Estate Agent"
   - ✅ Lead status: Open

---

## 🐛 Troubleshooting

### "No tokens found" or "Re-authentication required"

**Solution:** Complete OAuth flow again:
```
http://localhost:3001/api/smokeball/setup
```

---

### "Staff member not found"

**Check staff names in Smokeball:**
- Ensure "Sean Kerswill" exists
- Ensure "Laura Stuart" exists

**Or update staff.js:**
```javascript
// backend/src/integrations/smokeball/staff.js

export async function findSean() {
  return await findStaffByName('Your', 'Name'); // Update here
}
```

---

### "Matter type not found"

**Check Smokeball:**
- Ensure "Conveyancing > Sale" exists for your states
- Ensure "Conveyancing > Purchase" exists for your states

**Debug:**
```bash
node test-smokeball-integration.js
```

Look for the "Matter Types Lookup" section to see available types.

---

### "Contact creation failed"

**Check payload structure:**

The test script will show if the `person` wrapper is working correctly.

**Verify authentication:**
```bash
curl http://localhost:3001/api/smokeball/status
```

Should show:
```json
{
  "authenticated": true,
  "tokenValid": true
}
```

---

### Token Expired

Tokens auto-refresh! But if you see "invalid_grant":

1. Clear tokens:
   ```bash
   curl -X POST http://localhost:3001/api/smokeball/logout
   ```

2. Re-authenticate:
   ```
   http://localhost:3001/api/smokeball/setup
   ```

---

## 📊 Monitoring

### View Current Token Status

```bash
curl http://localhost:3001/api/smokeball/status
```

### Check Logs

The server logs all Smokeball API calls:

```
[Smokeball Matters] 📝 Creating lead...
[Smokeball Matters] Matter Type ID: 0623643a-48a4-41d7-8c91-d35915b291cd_QLD
[Smokeball Matters] Client Role: Vendor
[Smokeball Matters] ✅ Lead created successfully
[Smokeball Matters] 🆔 Lead UUID: abc-123-def-456
```

---

## 🔄 Comparison: PHP vs Node.js

| Feature | PHP (WordPress) | Node.js (Fixed) | Status |
|---------|----------------|-----------------|--------|
| Token Storage | WordPress DB | Redis | ✅ Different but equivalent |
| OAuth Flow | Manual browser | Manual browser | ✅ Same |
| Contact Payload | `person` wrapper | `person` wrapper | ✅ Same |
| Lead Payload | Correct fields | Correct fields | ✅ Same |
| Matter Types | Fetched from API | Fetched from API | ✅ Same |
| Staff Lookup | By name | By name | ✅ Same |
| Auto Token Refresh | ✅ Yes | ✅ Yes | ✅ Same |

---

## ✅ Success Criteria

Your integration is working when:

1. ✅ OAuth authentication completes without errors
2. ✅ All 6 comprehensive tests pass
3. ✅ Staff members are found by name
4. ✅ Matter types are fetched correctly
5. ✅ Test contact is created successfully
6. ✅ Lead appears in Smokeball with correct data

---

## 🎯 Next Steps After Testing

### Production Deployment:

1. **Update redirect URI in Smokeball developer console:**
   ```
   https://your-production-domain.com/api/smokeball/oauth-callback
   ```

2. **Update .env:**
   ```env
   SMOKEBALL_REDIRECT_URI=https://your-production-domain.com/api/smokeball/oauth-callback
   ```

3. **Complete OAuth flow on production server**

4. **Test with real HubSpot deals**

5. **Monitor Smokeball for lead creation**

---

## 📞 Support

If you encounter issues:

1. **Run diagnostic tests first**
2. **Check server logs** for detailed error messages
3. **Compare API payloads** with expected structures
4. **Verify tokens haven't expired**

All test scripts include detailed logging to help diagnose issues!

---

## 🎉 You're Ready!

Your Smokeball integration now matches your old working PHP implementation with:
- ✅ Same API credentials
- ✅ Same payload structures
- ✅ Same matter type lookup logic
- ✅ Same staff assignments
- ✅ Comprehensive testing suite

Time to test it! 🚀

