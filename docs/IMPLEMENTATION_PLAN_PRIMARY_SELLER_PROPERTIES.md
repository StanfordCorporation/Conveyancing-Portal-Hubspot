# Implementation Plan: Add Primary Seller Properties to Deals

## Objective
Populate two **deal-level** properties in HubSpot when deals are created from both workflows:
- `primary_seller_full_name` - Full name of the primary seller (deal property)
- `primary_seller_phone` - Phone number of the primary seller (deal property)

## Important Clarifications

### ✅ What We ARE Doing:
- Adding deal-level properties (`primary_seller_full_name`, `primary_seller_phone`) to deals
- Extracting data from the primary seller contact that was already created/found
- Populating these properties during deal creation

### ❌ What We ARE NOT Doing:
- **NOT modifying contact creation** - Contact creation already handles name and phone at the contact level
- **NOT changing contact properties** - Contacts already have `firstname`, `lastname`, `phone` properties
- **NOT touching contact integration code** - Contact creation workflow remains unchanged

### Key Distinction:
- **Contact Level:** Contact objects have `firstname`, `lastname`, `phone` properties (already implemented)
- **Deal Level:** Deal objects will have `primary_seller_full_name`, `primary_seller_phone` properties (NEW - to be implemented)
- These are **separate properties** on **different objects** (Contact vs Deal)

## Current State Analysis

### Contact Creation (Already Working - DO NOT MODIFY)
Both workflows already create/find contacts with:
- `firstname` and `lastname` (contact properties)
- `phone` (contact property)
- Contact creation happens via `findOrCreateContact()` → `createContact()` → HubSpot API

### Deal Creation (Current State)
- Deals are created with properties like: `dealname`, `dealstage`, `pipeline`, `property_address`, etc.
- **Missing:** `primary_seller_full_name` and `primary_seller_phone` (deal properties)
- Deal creation happens via `createDealWithAssociations()` → `createDeal()` → HubSpot API

### Data Available at Deal Creation Time

#### Disclosure Workflow (`client-disclosure.js`)
- **Primary Seller Contact Object:** `primarySeller` (already created/found)
  - `primarySeller.properties.firstname`
  - `primarySeller.properties.lastname`
  - `primarySeller.properties.phone`
- **Deal Creation Location:** Line 187-196
- **Deal Data Object:** `dealData` object passed to `createDealWithAssociations()`

#### Agent Lead Creation Workflow (`agent-lead-creation.js`)
- **Primary Seller Contact Object:** `primarySeller` (already created/found)
  - `primarySeller.properties.firstname`
  - `primarySeller.properties.lastname`
  - `primarySeller.properties.phone`
- **Deal Creation Location:** Line 159-171
- **Deal Data Object:** `dealData` object passed to `createDealWithAssociations()`

## Implementation Steps

### Step 1: Update Disclosure Workflow (`client-disclosure.js`)

**Location:** Line 187-196 (dealData object creation - AFTER contact creation)

**Changes:**
1. Extract primary seller full name from the already-created `primarySeller` contact:
   ```javascript
   const primarySellerFullName = `${primarySeller.properties?.firstname || ''} ${primarySeller.properties?.lastname || ''}`.trim();
   ```

2. Extract primary seller phone from the already-created `primarySeller` contact:
   ```javascript
   const primarySellerPhone = primarySeller.properties?.phone || null;
   ```

3. Add these properties to `dealData` object (deal-level properties):
   ```javascript
   const dealData = {
     dealname: `${formData.property.address} - ${formData.seller.firstname} ${formData.seller.lastname}`,
     dealstage: '1923713518',
     pipeline: HUBSPOT.PIPELINES.FORM_2S,
     property_address: formData.property.address,
     transaction_type: 'sale',
     number_of_owners: (additionalSellerIds.length + 1).toString(),
     lead_source: 'Disclosure_Page',
     // NEW: Deal-level primary seller properties
     primary_seller_full_name: primarySellerFullName,
     primary_seller_phone: primarySellerPhone,
     ...initializeDisclosureFields()
   };
   ```

**Rationale:** 
- Use `primarySeller.properties` since the contact is already created/found at this point
- These are deal-level properties, separate from contact properties
- Contact creation (Step 1) remains completely untouched

---

### Step 2: Update Agent Lead Creation Workflow (`agent-lead-creation.js`)

**Location:** Line 159-171 (dealData object creation - AFTER contact creation)

**Changes:**
1. Extract primary seller full name from the already-created `primarySeller` contact:
   ```javascript
   const primarySellerFullName = `${primarySeller.properties?.firstname || ''} ${primarySeller.properties?.lastname || ''}`.trim();
   ```

2. Extract primary seller phone from the already-created `primarySeller` contact:
   ```javascript
   const primarySellerPhone = primarySeller.properties?.phone || null;
   ```

3. Add these properties to `dealData` object (deal-level properties):
   ```javascript
   const dealData = {
     dealname: `${leadData.property.address} - ${primarySellerNames.firstname} ${primarySellerNames.lastname}`,
     dealstage: '1923713518',
     pipeline: HUBSPOT.PIPELINES.FORM_2S,
     property_address: leadData.property.address,
     number_of_owners: (additionalSellerIds.length + 1).toString(),
     lead_source: 'Agent_Portal',
     is_draft: leadData.isDraft ? 'Yes' : null,
     agent_title_search: leadData.agentTitleSearch || null,
     agent_title_search_file: leadData.agentTitleSearchFile || null,
     // NEW: Deal-level primary seller properties
     primary_seller_full_name: primarySellerFullName,
     primary_seller_phone: primarySellerPhone,
     ...transformedQuestionnaireData
   };
   ```

**Rationale:**
- Use `primarySeller.properties` since the contact is already created/found at this point
- These are deal-level properties, separate from contact properties
- Contact creation (Step 1) remains completely untouched

---

### Step 3: Update Deal Creation Function (`deals.js`)

**Location:** Line 29-81 (properties payload in `createDeal()` function)

**Changes:**
1. Add the two new deal-level properties to the `properties` object in the payload:
   ```javascript
   const payload = {
     properties: {
       dealname: dealData.dealname,
       dealstage: dealData.dealstage || '1923713518',
       pipeline: HUBSPOT.PIPELINES.FORM_2S,
       property_address: dealData.property_address || '',
       number_of_owners: dealData.number_of_owners || 1,
       lead_source: dealData.lead_source || null,
       is_draft: dealData.is_draft === 'Yes' ? 'Yes' : null,
       agent_title_search: dealData.agent_title_search || null,
       agent_title_search_file: dealData.agent_title_search_file || null,
       
       // NEW: Deal-level primary seller properties
       primary_seller_full_name: dealData.primary_seller_full_name || '',
       primary_seller_phone: dealData.primary_seller_phone || null,
       
       // ... existing disclosure/questionnaire fields ...
     }
   };
   ```

**Rationale:** 
- These properties are sent to HubSpot API when creating the deal
- Use empty string for full_name and null for phone if not provided (HubSpot format)
- This is purely deal-level - no contact creation involved

---

## Data Flow (Contact vs Deal)

### Contact Creation Flow (Already Working - DO NOT MODIFY):
```
Input Data (formData.seller or leadData.client)
  ↓
findOrCreateContact() / searchContactByEmailOrPhone()
  ↓
createContact() [if not found]
  ↓
HubSpot API: POST /crm/v3/objects/contacts
  ↓
Contact Created with: firstname, lastname, phone (contact properties)
```

### Deal Creation Flow (NEW - Add Deal Properties):
```
Primary Seller Contact (already created/found)
  ↓
Extract: primarySeller.properties.firstname, lastname, phone
  ↓
Build: primarySellerFullName, primarySellerPhone
  ↓
Add to dealData object
  ↓
createDealWithAssociations(dealData)
  ↓
createDeal(dealData)
  ↓
HubSpot API: POST /crm/v3/objects/deals
  ↓
Deal Created with: primary_seller_full_name, primary_seller_phone (deal properties)
```

### Complete Flow (Contact + Deal):
```
1. Create/Find Contact → Contact has: firstname, lastname, phone
2. Create Deal → Deal has: primary_seller_full_name, primary_seller_phone
   └─ Data extracted from contact created in step 1
```

## Edge Cases & Considerations

### 1. Contact Already Exists
- **Scenario:** Primary seller contact already exists in HubSpot
- **Handling:** Use `primarySeller.properties` which contains the existing contact's data
- **Impact:** Deal properties will use the data from the existing contact

### 2. Missing Phone Number
- **Scenario:** Phone number not available in contact properties
- **Handling:** Set `primary_seller_phone` to `null` (not empty string)
- **Rationale:** HubSpot handles null values better for optional fields

### 3. Missing Name Parts
- **Scenario:** Only firstname or only lastname in contact properties
- **Handling:** Use `.trim()` to clean up, empty string if both are missing
- **Rationale:** Ensures clean data format

### 4. Contact Properties Structure
- **Scenario:** `primarySeller.properties` may have different structure
- **Handling:** Use optional chaining (`?.`) and provide fallbacks
- **Rationale:** Defensive programming for edge cases

## Testing Checklist

### Disclosure Workflow Tests:
- [ ] Test with new primary seller (contact created, then deal created with properties)
- [ ] Test with existing primary seller (contact found, then deal created with properties)
- [ ] Test with missing phone number in contact
- [ ] Test with only firstname (no lastname) in contact
- [ ] Test with only lastname (no firstname) in contact
- [ ] Verify contact still has firstname, lastname, phone (unchanged)
- [ ] Verify deal has primary_seller_full_name and primary_seller_phone (new)

### Agent Lead Creation Workflow Tests:
- [ ] Test with new primary seller (contact created, then deal created with properties)
- [ ] Test with existing primary seller (contact found, then deal created with properties)
- [ ] Test with missing phone number in contact
- [ ] Test with fullName containing multiple words
- [ ] Test with single-word fullName
- [ ] Verify contact still has firstname, lastname, phone (unchanged)
- [ ] Verify deal has primary_seller_full_name and primary_seller_phone (new)

### Integration Tests:
- [ ] Verify contact creation still works (unchanged)
- [ ] Verify both workflows create deals with the new deal properties
- [ ] Verify deal properties appear correctly in HubSpot UI
- [ ] Verify deal properties are queryable via HubSpot API
- [ ] Verify contact properties remain separate from deal properties

## Files to Modify

1. **`backend/src/services/workflows/client-disclosure.js`**
   - Line ~187-196: Add `primary_seller_full_name` and `primary_seller_phone` to `dealData` object
   - **DO NOT modify:** Contact creation code (lines 46-72)

2. **`backend/src/services/workflows/agent-lead-creation.js`**
   - Line ~159-171: Add `primary_seller_full_name` and `primary_seller_phone` to `dealData` object
   - **DO NOT modify:** Contact creation code (lines 36-73)

3. **`backend/src/integrations/hubspot/deals.js`**
   - Line ~29-81: Add `primary_seller_full_name` and `primary_seller_phone` to `createDeal()` payload
   - **DO NOT modify:** Contact integration files

## Validation

After implementation, verify:
1. ✅ Contact creation still works (firstname, lastname, phone on contacts)
2. ✅ Deal creation includes new properties (`primary_seller_full_name`, `primary_seller_phone`)
3. ✅ `primary_seller_full_name` contains the full name (firstname + lastname from contact)
4. ✅ `primary_seller_phone` contains the phone number from contact (or null if not provided)
5. ✅ Properties are visible in HubSpot deal records
6. ✅ Contact properties and deal properties are separate (no conflicts)

## Notes

- **Contact properties** (`firstname`, `lastname`, `phone`) are set during contact creation - **DO NOT MODIFY**
- **Deal properties** (`primary_seller_full_name`, `primary_seller_phone`) are set during deal creation - **NEW IMPLEMENTATION**
- Phone numbers in contacts are normalized to international format (via `normalizePhoneToInternational()`)
- Using `primarySeller.properties` ensures we get normalized/standardized data from the contact
- Empty strings for full_name and null for phone match HubSpot's expected format for optional fields
- The deal properties are set at deal creation time (static snapshot from contact at that moment)
- These properties already exist in HubSpot - we're just populating them
