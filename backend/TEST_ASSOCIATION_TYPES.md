# HubSpot Association Types - Test Suite

## Purpose

This test suite answers 5 critical questions about HubSpot's custom association types for the Agency Owner feature:

1. **API Endpoints** - Which v4 endpoints work for association types?
2. **Batch Queries** - Can we batch query association types for multiple contacts?
3. **Association Replacement** - How do we change association types (DELETE+CREATE vs PATCH)?
4. **Multiple Types** - Can a contact have multiple association types to the same company?
5. **Default Type** - What happens when we create contacts with/without explicit types?

---

## Prerequisites

1. Valid HubSpot access token in `.env` file
2. HubSpot developer account with permission to create test data
3. Custom association types **already created in HubSpot**:
   - Type 7: "Admin User" (USER_DEFINED)
   - Type 9: "View All User" (USER_DEFINED)
   - Type 279: Standard (HUBSPOT_DEFINED)

---

## Running the Tests

### Step 1: Ensure Environment is Set Up

```bash
cd backend

# Make sure .env has HUBSPOT_ACCESS_TOKEN
cat .env | grep HUBSPOT_ACCESS_TOKEN
```

### Step 2: Run the Test Suite

```bash
node test-association-types.js
```

### Expected Output

The script will:
1. ✅ Create test company and contacts
2. ✅ Run 5 test scenarios
3. ✅ Print detailed results for each question
4. ✅ Clean up test data
5. ✅ Print summary of all results

---

## What the Script Does

### Setup Phase
- Creates 1 test company (agency)
- Creates 3 test contacts (agents)
- All test data has `TEST_` prefix or timestamp

### Test Phase

#### Question 1: API Endpoints
Tests which v4 API endpoints work:
- `/crm/v4/objects/contacts/{id}/associations/companies/{companyId}`
- `/crm/v4/associations/contacts/{id}/companies/{companyId}`
- `/crm/v4/objects/contacts/{id}/associations/companies` (get all)

#### Question 2: Batch Queries
Tests if we can batch query association types:
```javascript
POST /crm/v4/associations/contacts/companies/batch/read
{
  "inputs": [
    { "id": "contact1" },
    { "id": "contact2" }
  ]
}
```

Checks if response includes `associationTypes` array.

#### Question 3: Association Replacement
Tests how to change association type from 279 → 7:
1. **DELETE** old association (type 279)
2. **PUT** new association (type 7)
3. Verify association changed
4. Test if **PATCH** is supported (likely not)

#### Question 4: Multiple Association Types
Tests if a contact can have BOTH type 7 and type 9 simultaneously:
1. Contact starts with type 7
2. Add type 9 without deleting type 7
3. Check if both exist (or if type 9 replaced type 7)

#### Question 5: Default Association Type
Tests what happens when creating contacts:
- Test A: Explicit type 279 in inline association
- Test B: Empty types array
- Test C: No association, then add later

### Cleanup Phase
- Deletes all test contacts
- Deletes test company
- Prints cleanup confirmation

---

## Expected Results

### Question 1: API Endpoints
**Expected:**
- ✅ Option A works (v4/objects/contacts/...)
- ✅ Get ALL companies works
- ❓ Option B may or may not work

**What we need:**
The endpoint that returns `associationTypes` array in response.

---

### Question 2: Batch Queries
**Expected:**
- ✅ Batch endpoint exists and works
- ✅ Response includes `associationTypes` for each contact-company pair

**What we need:**
Confirmation that batch queries return association type information.

---

### Question 3: Association Replacement
**Expected:**
- ✅ DELETE old + CREATE new works (2 API calls)
- ❌ PATCH does not work (not supported)

**What we need:**
Confirmation that we must delete old association before creating new one.

---

### Question 4: Multiple Association Types
**Expected:**
- ❌ Multiple types NOT supported (mutually exclusive)
- When adding type 9, type 7 gets replaced

**What we need:**
Confirmation that a contact can only have ONE association type per company.

---

### Question 5: Default Association Type
**Expected:**
- Type 279 (standard) is the default
- Empty types array → defaults to 279
- Explicit type required for custom types (7, 9)

**What we need:**
Confirmation of default behavior when creating agents.

---

## Sample Output

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     HubSpot Association Types - API Test Suite           ║
║                                                           ║
║     Testing 5 Critical Questions                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

============================================================
SETUP: Creating Test Data
============================================================
ℹ️  Creating test company...
✅ Test company created: 123456789
ℹ️  Creating test contact 1...
✅ Test contact 1 created: 987654321
✅ Setup complete!

============================================================
QUESTION 1: Which v4 API endpoints work for association types?
============================================================
ℹ️  Testing Option A: /crm/v4/objects/contacts/{id}/associations/companies/{companyId}
   GET /crm/v4/objects/contacts/987654321/associations/companies/123456789
✅ Option A: WORKS! ✓
📊 Response structure:
{
  "results": [
    {
      "toObjectId": "123456789",
      "associationTypes": [
        {
          "category": "HUBSPOT_DEFINED",
          "typeId": 279,
          "label": null
        }
      ]
    }
  ]
}

... (continues for all 5 questions)

============================================================
📊 RESULTS SUMMARY
============================================================

1️⃣  API ENDPOINTS:
   Option A (/crm/v4/objects/contacts/...): WORKS
   Option B (/crm/v4/associations/contacts/...): FAILED
   Get ALL companies: WORKS

2️⃣  BATCH QUERIES:
   Batch endpoint works: YES ✓
   Includes association types: YES ✓

3️⃣  ASSOCIATION REPLACEMENT:
   Method: DELETE + CREATE
   Works: YES ✓
   PATCH supported: NO ✗

4️⃣  MULTIPLE ASSOCIATION TYPES:
   Supports multiple types: NO ✗ (mutually exclusive)
   Types found: 9

5️⃣  DEFAULT ASSOCIATION TYPE:
   See detailed results in Question 5 output above

✅ ALL TESTS COMPLETE
```

---

## Troubleshooting

### Error: "Association type not found"
**Problem:** Custom association types (7, 9) don't exist in HubSpot
**Solution:** Ask HubSpot developer to create them first

### Error: "Invalid access token"
**Problem:** HUBSPOT_ACCESS_TOKEN in .env is missing or expired
**Solution:** Get new access token from HubSpot developer portal

### Error: "Rate limit exceeded"
**Problem:** Too many API calls in short time
**Solution:** Wait 10 seconds and try again

### Test hangs or times out
**Problem:** HubSpot API slow or network issue
**Solution:** Check internet connection, try again

---

## After Running Tests

### Next Steps:

1. **Review Results Summary** - Check which endpoints work
2. **Update Implementation Plan** - Use confirmed API patterns
3. **Share Results** - Post results in implementation doc
4. **Begin Development** - Start implementing with correct APIs

---

## Manual Verification (Optional)

You can manually verify results in HubSpot:

1. Go to HubSpot Contacts
2. Search for "TEST_AGENT"
3. Click on test contact
4. View "Associations" tab
5. Check association type to test company

---

## Safety Notes

- ✅ All test data has `TEST_` prefix or timestamp
- ✅ Script automatically cleans up test data
- ✅ No production data is modified
- ✅ Script uses separate test contacts/companies

---

## Questions?

If tests fail or produce unexpected results:
1. Check `.env` has valid HUBSPOT_ACCESS_TOKEN
2. Verify custom association types exist in HubSpot
3. Check HubSpot API status page
4. Review error messages in console output

---

**Ready to run?**
```bash
node test-association-types.js
```

Let's find out how HubSpot association types really work! 🚀
