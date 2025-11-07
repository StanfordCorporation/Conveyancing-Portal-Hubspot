# First Agent Auto-Admin Feature

## Overview
Updated the system to automatically grant Admin privileges to the first agent of every agency, ensuring each agency has at least one admin from the start.

## Changes Made

### 1. Updated Contacts Integration
**File:** [backend/src/integrations/hubspot/contacts.js](../backend/src/integrations/hubspot/contacts.js)

- Enhanced `createContact()` function to accept optional `associationTypeId` and `associationCategory` parameters
- Allows creating contacts with custom association types (Admin type 7, View All type 9, or Standard type 279)
- Defaults to type 279 (Standard) if not specified

**Key Changes:**
```javascript
// New optional parameters
@param {number} contactData.associationTypeId - Optional: Association type ID (default: 279 Standard, 7 Admin, 9 View All)
@param {string} contactData.associationCategory - Optional: Association category (default: HUBSPOT_DEFINED)

// Dynamic association type selection
const associationTypeId = contactData.associationTypeId || 279;
const associationCategory = contactData.associationCategory || 'HUBSPOT_DEFINED';
```

### 2. Updated Agent Service
**File:** [backend/src/services/domain/agent.js](../backend/src/services/domain/agent.js)

- Modified `createForAgency()` function to check if the agent being created is the first for the agency
- Uses HubSpot search API to count existing agents before creating the new one
- First agent receives Admin association (type 7), subsequent agents receive Standard (type 279)

**Logic Flow:**
1. Query HubSpot for existing agents associated with the agency
2. If count is 0, this is the first agent
3. Set association type to 7 (Admin) for first agent, 279 (Standard) for others
4. Create contact with appropriate association type
5. Return agent data with `permissionLevel` field

**Key Code:**
```javascript
// Check if this is the first agent
const existingAgentsResponse = await hubspotClient.post('/crm/v3/objects/contacts/search', {
  filterGroups: [{
    filters: [
      { propertyName: 'associations.company', operator: 'EQ', value: agencyId },
      { propertyName: 'contact_type', operator: 'EQ', value: HUBSPOT.CONTACT_TYPES.AGENT }
    ]
  }],
  limit: 1
});

const isFirstAgent = existingAgents.length === 0;

// Set appropriate association type
if (isFirstAgent) {
  associationTypeId = HUBSPOT.PERMISSION_TYPES.ADMIN; // 7
  associationCategory = HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED;
}
```

### 3. Updated Agency Service
**File:** [backend/src/services/domain/agency.js](../backend/src/services/domain/agency.js)

- Modified `createWithAgent()` function to create Admin association for the first agent
- When creating an agency with an agent, two associations are now created:
  1. Company → Contact (type 280) - standard HubSpot association
  2. Contact → Company (type 7) - Admin permission association
- Ensures the founding agent has Admin privileges

**Key Code:**
```javascript
// After creating the company, add Admin association for first agent
if (contactIdToAssociate) {
  await hubspotClient.put(
    `/crm/v4/objects/contacts/${contactIdToAssociate}/associations/companies/${company.id}`,
    [{
      associationCategory: HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED,
      associationTypeId: HUBSPOT.PERMISSION_TYPES.ADMIN // Type 7
    }]
  );
}
```

## Affected Endpoints

### Creating Agents
- **POST /api/agencies/:agencyId/agents/create**
  - First agent for the agency will automatically get Admin privileges
  - Subsequent agents get Standard privileges by default

### Creating Agencies with Agents
- **POST /api/agencies/create**
  - When creating an agency with an initial agent, that agent becomes Admin automatically

## Permission Types Reference

| Permission Level | Type ID | Association Category | Description |
|-----------------|---------|---------------------|-------------|
| Admin | 7 | USER_DEFINED | Full agency management: view all deals, reassign, manage team |
| View All | 9 | USER_DEFINED | View all agency deals and metrics |
| Standard | 279 | HUBSPOT_DEFINED | View and manage only assigned deals |

## Testing

### Test Scenario 1: Create New Agency with Agent
```bash
curl -X POST http://localhost:3001/api/agencies/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agency",
    "address": "Sydney NSW",
    "email": "agency@test.com",
    "phone": "+61400000000",
    "agentFirstName": "John",
    "agentLastName": "Doe",
    "agentEmail": "john@test.com",
    "agentPhone": "+61400000001"
  }'
```

**Expected Result:**
- Agency created successfully
- Agent created with Admin privileges (type 7 association)
- Agent can access Agency Dashboard and Team Management

### Test Scenario 2: Add Second Agent to Existing Agency
```bash
curl -X POST http://localhost:3001/api/agencies/:agencyId/agents/create \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Jane",
    "lastname": "Smith",
    "email": "jane@test.com",
    "phone": "+61400000002"
  }'
```

**Expected Result:**
- Agent created with Standard privileges (type 279 association)
- Agent can only see their assigned deals
- Agent cannot access Agency Dashboard or Team Management

## Impact

### Positive Changes
- ✅ Ensures every agency has at least one admin from creation
- ✅ Eliminates manual promotion step for first agent
- ✅ Maintains proper access control for subsequent agents
- ✅ Backwards compatible - existing agencies unaffected

### Breaking Changes
- ❌ None - this is an enhancement, not a breaking change

## Notes

1. **Existing Agents:** This change only affects newly created agents. Existing agents retain their current permission levels.

2. **Error Handling:** If the check for existing agents fails, the system defaults to Standard privileges as a safety measure.

3. **Logging:** Enhanced logging shows when first agents are created:
   ```
   [Agent Service] ⭐ First agent - creating with Admin privileges (type 7)
   ```

4. **Agency Creation:** When creating an agency with an agent through the workflow, the admin association is created via v4 API PUT endpoint.

## Related Documentation
- [AGENCY_OWNER_IMPLEMENTATION.md](./AGENCY_OWNER_IMPLEMENTATION.md) - Complete agency owner feature documentation
- [HUBSPOT_ASSOCIATION_TEST_RESULTS.md](./HUBSPOT_ASSOCIATION_TEST_RESULTS.md) - HubSpot API testing results
- [FRONTEND_IMPLEMENTATION_GUIDE.md](./FRONTEND_IMPLEMENTATION_GUIDE.md) - Frontend implementation guide

## Date
January 7, 2025
