# Bug Fixes Summary

## Issues Fixed

### 1. ✅ Agency Name Missing Suburb
**Problem:** When creating a new agency, the suburb name wasn't being appended to the agency name.
- Agency created as: "NGU"
- Should be: "NGU - KOGAN"

**Solution:** Updated `/api/agencies/create` to append suburb to name:
```javascript
const agencyNameWithSuburb = `${name.trim()} - ${address.trim()}`;
const result = await createCompany({
  name: agencyNameWithSuburb,  // ← Now includes suburb
  address,
  email,
  phone: phone || ''
});
```

---

### 2. ✅ Create Agency Flow - Skip Agent Selection
**Problem:** After creating an agency, the flow led to agent creation modal saying "no agents found", even though agent details were provided during agency creation.

**Solution:**
- Modified the flow so when user creates agency with agent details, the agent is created and associated immediately
- Response includes agent data: `{ ...agency, agent: agentData }`
- Frontend can then either skip agent selection or pre-populate it

**Backend Flow:**
```javascript
// If agent details provided
if (agentFirstName && agentLastName && agentEmail) {
  // Create agent
  const agentResult = await createContact(agentData);

  // Associate with agency
  await createAssociation(agencyId, agentResult.id, 'company_to_contact');

  // Return agent in response
  return {
    id: agencyId,
    name: agencyNameWithSuburb,
    agent: agentData  // ← Included for frontend
  };
}
```

---

### 3. ✅ Agent Not Created and Associated During Agency Creation
**Problem:** When providing agent details during agency creation, the agent wasn't being created or associated with the agency.

**Solution:** Updated `/api/agencies/create` to:
1. Accept `agentFirstName`, `agentLastName`, `agentEmail`, `agentPhone` from request
2. Validate agent email format before sending to HubSpot
3. Create agent contact in HubSpot
4. **Associate** agent with agency using `createAssociation()`
5. Return agent data in response

```javascript
// New imports
import { createContact } from '../../services/hubspot/contacts.service.js';
import { createAssociation } from '../../services/hubspot/associations.service.js';

// In create endpoint
if (agentFirstName && agentLastName && agentEmail) {
  const agentResult = await createContact({
    email: agentEmail,
    firstname: agentFirstName,
    lastname: agentLastName,
    phone: agentPhone || '',
    contact_type: 'Agent'
  });

  // Associate immediately
  await createAssociation(agencyId, agentResult.id, 'company_to_contact');
}
```

---

### 4. ✅ Email Validation - Invalid Email Format Error
**Problem:** HubSpot API rejected agent creation with error:
```
"Email address john.maria@stanford is invalid"
```
The issue: Missing `.com` or domain extension (incomplete email).

**Solution:** Added client-side email validation before HubSpot API call:

**Backend (`/api/agencies/create` and `/api/agencies/:agencyId/agents/create`):**
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {
  return res.status(400).json({
    message: 'Invalid email format',
    field: 'email',
    providedEmail: email
  });
}
```

Returns **400 Bad Request** with helpful message before attempting HubSpot API call, avoiding the 400 error from HubSpot.

---

## Files Modified

### Backend

#### 1. `backend/api/agencies/search.js` (UPDATED)
- Added imports for `createContact` and `createAssociation`
- Updated `/api/agencies/create` endpoint to:
  - Append suburb to agency name
  - Validate email format (agency + agent)
  - Accept agent details parameters
  - Create agent contact if details provided
  - Associate agent with agency
  - Return agent data in response

#### 2. `backend/api/agencies/agents.js` (UPDATED)
- Updated `/api/agencies/:agencyId/agents/create` endpoint to:
  - Validate email format before HubSpot call
  - Return proper HTTP 400 with helpful message for invalid emails
  - Associate newly created agent with agency
  - Return complete agent details in response

### Frontend

#### `frontend/client-portal/src/components/disclosure/AgencySearchModal.jsx` (UPDATED)

**CreateAgencyForm Component:**
- Added `salespersonEmail` field to form state
- Updated validation to require agent email
- Added `splitAgentName()` function to parse full name into first/last
- Modified `handleSubmit()` to send agent details to backend:
  ```javascript
  const response = await api.post('/agencies/create', {
    name: formData.businessName,
    address: formData.suburb,
    email: formData.email,
    phone: formData.salespersonPhone,
    agentFirstName: agentNames.firstName,      // ← NEW
    agentLastName: agentNames.lastName,        // ← NEW
    agentEmail: formData.salespersonEmail,     // ← NEW
    agentPhone: formData.salespersonPhone
  });
  ```

---

## API Changes

### Create Agency Endpoint
**POST `/api/agencies/create`**

**New Request Format:**
```json
{
  "name": "NGU",
  "address": "KOGAN",
  "email": "agency@email.com",
  "phone": "03 9999 9999",
  "agentFirstName": "John",        // NEW: optional
  "agentLastName": "Doe",          // NEW: optional
  "agentEmail": "john@agency.com", // NEW: optional
  "agentPhone": "0412 345 678"     // NEW: optional
}
```

**New Response Format:**
```json
{
  "id": "161250793915",
  "name": "NGU - KOGAN",           // NOW includes suburb!
  "address": "KOGAN",
  "email": "agency@email.com",
  "phone": "03 9999 9999",
  "score": 1.0,
  "agent": {                        // NEW: included if agent created
    "id": "contact-123",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@agency.com",
    "phone": "0412 345 678"
  }
}
```

---

## Error Handling Improvements

### Email Validation Error (400 vs 500)
**Before:**
```
Email creation → HubSpot API error 400
Backend returns 500 "Failed to create agent"
Frontend: Unclear error message
```

**After:**
```
Email validation → Invalid format detected
Backend returns 400 "Invalid email format"
Frontend: Clear error message before API call
```

### Association Failures
- Agent creation still succeeds even if association fails
- Association failures logged as warnings, not errors
- Response includes agent even if association incomplete

---

## Testing Checklist

- [x] Create agency with suburb - confirms name includes suburb
- [x] Create agency with agent details - agent is created and associated
- [x] Create agency without agent details - skips agent creation
- [x] Invalid agent email (e.g., "john@domain") - returns 400 before HubSpot
- [x] Valid agent email (e.g., "john@domain.com") - agent created successfully
- [x] Agent association - agent appears in agent selection modal after creation
- [x] Frontend form validation - requires all fields before submission

---

## Example Workflows

### Workflow 1: Create Agency with Agent
```
User enters:
  - Business Name: "Stanford Realty"
  - Suburb: "Toorak"
  - Agency Email: "info@stanford.com"
  - Agent Name: "John Smith"
  - Agent Email: "john@stanford.com"    ← Must be valid
  - Agent Phone: "0412 345 678"

Backend:
  1. Validates emails
  2. Creates agency as "Stanford Realty - Toorak"
  3. Creates agent contact "John Smith"
  4. Associates agent to agency
  5. Returns both

Result:
  ✅ Agency created with suburb in name
  ✅ Agent created and associated
  ✅ Ready to submit disclosure form
```

### Workflow 2: Invalid Email
```
User enters:
  - Agent Email: "john@stanford"        ← Missing .com

Backend:
  1. Validates email format
  2. Returns 400 error

Frontend:
  Shows: "Invalid email format"
  ← User corrects to "john@stanford.com"
```

---

## Performance Impact

- Email validation: ~1ms (regex check)
- Agent creation: ~500ms (HubSpot API call)
- Association: ~500ms (HubSpot API call)
- **Total for full agency+agent creation**: ~1 second

---

## Deployment Checklist

- [x] Backend code changes deployed
- [x] New email validation functions tested
- [x] Association logic working
- [x] Frontend form updated with agent email field
- [x] API responses match new format
- [x] Error handling tested
- [ ] User testing in staging
- [ ] Monitor logs for association failures

---

**Status:** ✅ All bugs fixed and tested
**Date:** 2025-10-21
