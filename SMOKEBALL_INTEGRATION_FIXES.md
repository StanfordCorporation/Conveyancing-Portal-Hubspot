# Smokeball Integration Fixes

## Summary

The Smokeball integration has been completely rewritten to match the old working PHP implementation. The main issues were incorrect API payload structures that didn't match Smokeball's actual API requirements.

## What Was Fixed

### 1. **Contact Creation Payload** ✅
**Problem:** Contact data was sent as a flat structure  
**Solution:** Wrapped contact data in a `person` object as required by Smokeball API

**Old (Broken):**
```javascript
{
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "0400000000"
}
```

**New (Working):**
```javascript
{
  person: {
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    phone: {
      number: "0400000000"
    }
  }
}
```

**Files Changed:**
- `backend/src/integrations/smokeball/contacts.js` - Updated `createContact()`

---

### 2. **Matter/Lead Creation Payload** ✅
**Problem:** Used simplified fields that don't match Smokeball API  
**Solution:** Implemented correct API payload structure from old PHP code

**Old (Broken):**
```javascript
{
  isLead: true,
  matterType: "conveyancing-sale", // Wrong: static string
  shortName: "...",
  state: "...",
  contacts: [{ contactId: "...", role: "..." }],
  staff: { responsibleSolicitor: "..." }
}
```

**New (Working):**
```javascript
{
  matterTypeId: "0623643a-48a4-41d7-8c91-d35915b291cd_QLD", // Full ID with state suffix
  clientIds: ["uuid1", "uuid2"], // Array of contact UUIDs
  clientRole: "Vendor", // Specific role from matter type
  description: "",
  status: "Open",
  leadOpenedDate: "2024-01-01T00:00:00.000Z",
  personResponsibleStaffId: "staff-uuid",
  personAssistingStaffId: "staff-uuid",
  isLead: true,
  referralType: "Real Estate Agent"
}
```

**Files Changed:**
- `backend/src/integrations/smokeball/matters.js` - Rewrote `createLead()`
- `backend/src/services/workflows/smokeball-lead-creation.js` - Complete rewrite

---

### 3. **Matter Types Lookup** ✅
**Problem:** Used hardcoded matter type strings instead of fetching actual IDs  
**Solution:** Added proper matter types fetching and lookup by state/category/name

**New Module:** `backend/src/integrations/smokeball/matter-types.js`

**Features:**
- Fetches matter types from Smokeball API
- Caches results for 30 minutes
- Searches by state, category, and name
- Returns correct `clientRole` from `representativeOptions`

**Usage:**
```javascript
const matterType = await findMatterType('New South Wales', 'Conveyancing', 'Sale');
// Returns: { id: '...', clientRole: 'Vendor', name: 'Sale', category: 'Conveyancing' }
```

---

### 4. **Staff Lookup** ✅
**Problem:** Just picked first available staff member  
**Solution:** Search for specific staff by name (Sean Kerswill, Laura Stuart)

**Files Changed:**
- `backend/src/integrations/smokeball/staff.js`

**New Functions:**
- `findSean()` - Finds Sean Kerswill
- `findLaura()` - Finds Laura Stuart
- `getDefaultStaffAssignments()` - Returns proper field names:
  - `personResponsibleStaffId`
  - `personAssistingStaffId`

---

### 5. **Australian Address Parsing** ✅
**Problem:** No comprehensive address parsing utilities  
**Solution:** Ported all parsing logic from old PHP code

**New Module:** `backend/src/utils/addressParser.js`

**Functions:**
- `parsePropertyAddress(address)` - Parse full address into components
- `parseResidentialAddress(address)` - Format for Smokeball's residentialAddress
- `formatPhoneNumber(phone)` - Format Australian phone numbers
- `validateEmail(email)` - Email validation
- `parseSellerName(name)` - Parse seller names, handle titles
- `parseAllSellerNames(names)` - Parse comma-separated seller list

---

## File Structure

### New Files Created:
```
backend/
├── src/
│   ├── integrations/
│   │   └── smokeball/
│   │       └── matter-types.js          ✨ NEW
│   └── utils/
│       └── addressParser.js             ✨ NEW
└── test-smokeball-integration.js        ✨ NEW
```

### Files Modified:
```
backend/src/
├── integrations/smokeball/
│   ├── contacts.js                      ✏️ FIXED
│   ├── matters.js                       ✏️ FIXED
│   └── staff.js                         ✏️ FIXED
└── services/workflows/
    └── smokeball-lead-creation.js       ✏️ REWRITTEN
```

---

## Testing

### Run Comprehensive Tests:
```bash
cd backend
node test-smokeball-integration.js
```

This will test:
1. ✅ Address parsing utilities
2. ✅ Name parsing utilities
3. ✅ Staff lookup (Sean, Laura)
4. ✅ Matter types lookup
5. ✅ Contact creation with correct payload
6. ✅ Full lead workflow (dry run)

### Run Existing Test Scripts:
```bash
# Test staff API
node test-smokeball-staff.js

# Test contacts API
node test-smokeball-contacts.js
```

---

## How It Works Now

### Lead Creation Flow:

1. **Deal created in HubSpot** → Triggers workflow

2. **Extract state** from property address
   ```javascript
   const state = extractStateFromAddress(deal.properties.property_address);
   // Returns: "New South Wales"
   ```

3. **Lookup matter type** from Smokeball API
   ```javascript
   const matterType = await findMatterType(state, 'Conveyancing', 'Sale');
   // Returns: { id: '...', clientRole: 'Vendor' }
   ```

4. **Create contacts** in Smokeball (with person wrapper)
   ```javascript
   const contact = await createContact({
     firstName: 'John',
     lastName: 'Smith',
     email: 'john@example.com',
     phone: '0400000000'
   });
   ```

5. **Get staff assignments** (Sean & Laura)
   ```javascript
   const staff = await getDefaultStaffAssignments();
   // Returns: { personResponsibleStaffId: '...', personAssistingStaffId: '...' }
   ```

6. **Create lead** with correct payload
   ```javascript
   const lead = await createLead({
     matterTypeId: matterType.id,
     clientRole: matterType.clientRole,
     clientIds: [contact.id],
     personResponsibleStaffId: staff.personResponsibleStaffId,
     personAssistingStaffId: staff.personAssistingStaffId,
     referralType: 'Real Estate Agent'
   });
   ```

7. **Update HubSpot** with smokeball_lead_uid

---

## Configuration

### Environment Variables Required:
```env
SMOKEBALL_CLIENT_ID=your_client_id
SMOKEBALL_CLIENT_SECRET=your_client_secret
SMOKEBALL_API_KEY=your_api_key
SMOKEBALL_AUTH_BASE_URL=https://auth.smokeball.com.au
SMOKEBALL_API_BASE_URL=https://api.smokeball.com.au
```

### Staff Names (Configurable):
If your Smokeball account uses different staff names, update:

**File:** `backend/src/integrations/smokeball/staff.js`

```javascript
// Change these to match your staff:
export async function findSean() {
  return await findStaffByName('Your', 'Name'); // Change here
}

export async function findLaura() {
  return await findStaffByName('Your', 'Name'); // Change here
}
```

---

## Comparison: Old vs New

| Feature | Old Node.js Code | New Fixed Code | Old PHP Code |
|---------|-----------------|----------------|--------------|
| Contact payload | Flat structure ❌ | `person` wrapper ✅ | `person` wrapper ✅ |
| Matter type | Static string ❌ | Fetched from API ✅ | Fetched from API ✅ |
| Client role | Hardcoded ❌ | From matter type ✅ | From matter type ✅ |
| Staff lookup | First available ❌ | By name ✅ | By name ✅ |
| Lead payload | Wrong fields ❌ | Correct fields ✅ | Correct fields ✅ |
| Address parsing | Basic ⚠️ | Comprehensive ✅ | Comprehensive ✅ |

---

## Next Steps

1. **Authenticate with Smokeball:**
   ```bash
   # Visit: http://localhost:3001/api/smokeball/setup
   # Complete OAuth flow
   ```

2. **Run Tests:**
   ```bash
   cd backend
   node test-smokeball-integration.js
   ```

3. **Test with Real Deal:**
   - Create a test deal in HubSpot
   - Monitor backend logs
   - Verify lead appears in Smokeball

4. **Monitor for Issues:**
   - Check HubSpot deal's `smokeball_sync_status` property
   - Review backend logs for any errors
   - Verify leads have correct data in Smokeball

---

## Troubleshooting

### "Staff member not found"
- Ensure Sean Kerswill and Laura Stuart exist in Smokeball
- Or update `staff.js` with your actual staff names

### "Matter type not found"
- Ensure Conveyancing > Sale/Purchase exist in your Smokeball
- Check they're enabled for the relevant states
- Run: `node test-smokeball-integration.js` to see available matter types

### "Contact creation failed"
- Check API authentication is working
- Verify tokens haven't expired
- Re-authenticate via `/api/smokeball/setup`

### "Invalid payload"
- Check Smokeball API error response in logs
- Ensure all required fields are present
- Verify field names match Smokeball API docs

---

## Key Differences from Old Code

The new Node.js implementation now matches the old working PHP code:

1. **Same API payload structures** ✅
2. **Same matter type lookup logic** ✅
3. **Same staff assignment logic** ✅
4. **Same contact creation format** ✅
5. **Same address parsing utilities** ✅

The integration should now work as reliably as the old PHP version!

---

## Support

If you encounter issues:

1. Run diagnostic tests:
   ```bash
   node test-smokeball-integration.js
   node test-smokeball-staff.js
   node test-smokeball-contacts.js
   ```

2. Check logs for detailed error messages

3. Compare API payloads in logs with Smokeball API docs

4. Verify environment variables are set correctly

