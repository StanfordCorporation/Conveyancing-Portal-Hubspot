# Agency Owner Feature - Detailed Task Breakdown
**Created By:** Dave (Senior Solutions Architect)
**Date:** 2025-01-06
**Status:** Ready for Implementation

---

## 📚 REFERENCE DOCUMENTS

Before starting, read these documents:
1. **API Test Results:** [HUBSPOT_ASSOCIATION_TEST_RESULTS.md](./HUBSPOT_ASSOCIATION_TEST_RESULTS.md)
   - Confirmed API endpoints and patterns
   - Code examples for all operations
2. **Implementation Plan:** [AGENCY_OWNER_ASSOCIATION_BASED_PLAN.md](./AGENCY_OWNER_ASSOCIATION_BASED_PLAN.md)
   - Overall architecture
   - Permission matrix
   - Business decisions needed

---

## ✅ CONFIRMED API PATTERNS (TESTED 2025-01-06)

All API patterns below have been **tested and confirmed working** in production HubSpot environment.

### 1. Getting Association Types (Single Contact)
```javascript
// ✅ WORKS - Use this endpoint
GET /crm/v4/objects/contacts/{contactId}/associations/companies

// Returns ALL companies for this contact with association types
{
  "results": [{
    "toObjectId": "174919744979",
    "associationTypes": [{
      "category": "USER_DEFINED",
      "typeId": 7,
      "label": "Admin User"
    }]
  }]
}

// ❌ DOES NOT WORK - Do not use
GET /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
// Returns: 405 Method Not Allowed
```

**Implementation Note:** You must fetch ALL companies then filter by your agencyId.

---

### 2. Batch Getting Association Types (Multiple Contacts)
```javascript
// ✅ WORKS - Highly performant for agency dashboard
POST /crm/v4/associations/contacts/companies/batch/read
{
  "inputs": [
    { "id": "contact1" },
    { "id": "contact2" }
  ]
}

// Response includes association types for each contact
{
  "results": [{
    "from": { "id": "contact1" },
    "to": [{
      "toObjectId": "company1",
      "associationTypes": [{ "typeId": 7, "label": "Admin User" }]
    }]
  }]
}
```

**Performance:** One API call for 100+ agents - use this for all multi-agent queries!

---

### 3. Changing Association Type (Promote/Demote)
```javascript
// ✅ REQUIRED PATTERN - Two API calls needed
// Step 1: DELETE old association
DELETE /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
{
  "data": [{
    "associationCategory": "HUBSPOT_DEFINED",
    "associationTypeId": 279
  }]
}

// Step 2: CREATE new association
PUT /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
[{
  "associationCategory": "USER_DEFINED",
  "associationTypeId": 7
}]

// ❌ PATCH NOT SUPPORTED - Don't try to use PATCH
PATCH /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
// Returns: 405 Method Not Allowed
```

**Critical:** Must specify correct `associationCategory` (USER_DEFINED vs HUBSPOT_DEFINED).

---

### 4. Association Type Rules
```javascript
// ✅ CONFIRMED: Types are MUTUALLY EXCLUSIVE
// An agent can only have ONE permission level at a time:
// - Type 7 (Admin) OR
// - Type 9 (View All) OR
// - Type 279 (Standard)

// When you create a new association type, the old one is REPLACED automatically
// You do NOT need to worry about agents having multiple permission levels

// Permission checking priority:
if (types.some(t => t.typeId === 7)) return 'admin';         // Highest
else if (types.some(t => t.typeId === 9)) return 'view_all'; // Medium
else return 'standard';                                        // Default
```

---

### 5. Default Association Type
```javascript
// ✅ CONFIRMED: Type 279 is the default
// When creating contacts WITH company association but WITHOUT explicit type:
POST /crm/v3/objects/contacts
{
  "associations": [{
    "to": { "id": "companyId" },
    "types": []  // Empty = defaults to type 279
  }]
}

// To create Admin agents, must EXPLICITLY specify type 7:
POST /crm/v3/objects/contacts
{
  "associations": [{
    "to": { "id": "companyId" },
    "types": [{
      "associationCategory": "USER_DEFINED",
      "associationTypeId": 7
    }]
  }]
}
```

---

## 🎯 BUSINESS DECISIONS (MUST ANSWER FIRST)

Before coding, answer these 4 questions:

### Decision 1: Data Migration Strategy
**Question:** How do we identify initial owners for existing agencies?

**Options:**
- [ ] A) Make ALL existing agents Admins (let them sort it out)
- [ ] B) Oldest agent (by `createdate`) becomes Admin, rest remain Standard
- [ ] C) Agent with most deals becomes Admin
- [ ] D) Manual CSV import

**YOUR DECISION:** _______________

**Impact:** Determines migration script logic (Task B.1)

---

### Decision 2: Agent Removal - Deal Handling
**Question:** When an owner removes an agent with active deals, what happens to those deals?

**Options:**
- [ ] A) Auto-reassign to the owner performing removal
- [ ] B) Leave unassigned (orphaned) - deals remain but no agent association
- [ ] C) Owner must manually reassign before removal (UI blocks removal)
- [ ] D) Distribute deals evenly among remaining agents

**YOUR DECISION:** _______________

**Impact:** Determines `removeAgentFromAgency()` logic (Task B.4.5)

---

### Decision 3: Last Admin Protection
**Question:** Can an agency have zero owners?

**Options:**
- [ ] A) Allow zero owners (agency locked, no one can manage)
- [ ] B) Require at least one owner (block last owner from demotion/removal)
- [ ] C) Auto-promote oldest remaining agent when last owner removed

**YOUR DECISION:** _______________

**Impact:** Determines `demoteAgent()` validation (Task B.4.3)

---

### Decision 4: Role Visibility
**Question:** Can regular agents see who the agency owners are?

**Options:**
- [ ] A) Yes - show "Owner" badge on all agent lists
- [ ] B) No - only owners can see permission levels
- [ ] C) Owners decide (agency setting)

**YOUR DECISION:** _______________

**Impact:** Determines frontend UI visibility (Task F.4)

---

## 📋 TASK BREAKDOWN

### PHASE A: HUBSPOT VERIFICATION (1 hour)

#### Task A.1: Verify Custom Association Types Exist
**Assignee:** Business Analyst
**Depends On:** None
**Estimated Time:** 30 minutes

**Steps:**
1. Log into HubSpot portal
2. Navigate to Settings → Objects → Contacts
3. Check "Associations" tab
4. Verify these association types exist:
   - Type 7: "Admin User" (USER_DEFINED)
   - Type 9: "View All User" (USER_DEFINED)
5. If missing, ask HubSpot developer to create them

**Acceptance Criteria:**
- [ ] Type 7 exists with label "Admin User"
- [ ] Type 9 exists with label "View All User"
- [ ] Screenshot saved showing both types

**Deliverable:** Screenshot of HubSpot association types

---

#### Task A.2: Test Association Types in Production
**Assignee:** Backend Developer
**Depends On:** A.1
**Estimated Time:** 30 minutes

**✅ STATUS: COMPLETED (2025-01-06)**

Test script has been created and verified. All 5 critical questions have been answered and documented in [HUBSPOT_ASSOCIATION_TEST_RESULTS.md](./HUBSPOT_ASSOCIATION_TEST_RESULTS.md).

**Steps:**
1. Run test script against production HubSpot:
   ```bash
   cd backend
   node test-association-types.js
   ```
2. Verify all 5 questions pass
3. Save test results output

**Acceptance Criteria:**
- [x] Question 1: Endpoint works ✅ (Use `/crm/v4/objects/contacts/{id}/associations/companies`)
- [x] Question 2: Batch queries work ✅ (Performance win!)
- [x] Question 3: DELETE + CREATE works ✅ (PATCH not supported)
- [x] Question 4: Types are mutually exclusive ✅ (One permission level per agent)
- [x] Question 5: Default is type 279 ✅

**Deliverable:** Test results documented in `HUBSPOT_ASSOCIATION_TEST_RESULTS.md`

---

### PHASE B: BACKEND IMPLEMENTATION (5 days)

#### Task B.1: Data Migration Script
**Assignee:** Backend Developer
**Depends On:** Business Decision 1
**Estimated Time:** 1 day

**Reference:** [AGENCY_OWNER_ASSOCIATION_BASED_PLAN.md - Page 19-22](./AGENCY_OWNER_ASSOCIATION_BASED_PLAN.md)

**File to Create:** `backend/scripts/migrate-agency-owners.js`

**Steps:**
1. Get all companies (agencies) from HubSpot
2. For each agency:
   - Get all associated contacts with `contact_type = "Agent"`
   - Determine who should be owner(s) based on Business Decision 1
   - Delete standard association (type 279)
   - Create admin association (type 7)
3. Log all changes
4. Dry-run mode before actual migration

**Code Pattern:**
```javascript
// Delete type 279
await hubspotClient.delete(
  `/crm/v4/objects/contacts/${agentId}/associations/companies/${agencyId}`,
  {
    data: [{
      associationCategory: "HUBSPOT_DEFINED",
      associationTypeId: 279
    }]
  }
);

// Create type 7
await hubspotClient.put(
  `/crm/v4/objects/contacts/${agentId}/associations/companies/${agencyId}`,
  [{
    associationCategory: "USER_DEFINED",
    associationTypeId: 7
  }]
);
```

**Acceptance Criteria:**
- [ ] Script runs in dry-run mode without errors
- [ ] Script logs all agencies and agents to be updated
- [ ] Script has rollback capability
- [ ] Script tested on staging environment
- [ ] All existing agents have either type 7 or remain type 279

**Deliverable:** Working migration script

---

#### Task B.2: Update Constants
**Assignee:** Backend Developer
**Depends On:** None
**Estimated Time:** 15 minutes

**File to Edit:** `backend/src/config/constants.js`

**Changes:**
```javascript
export const HUBSPOT = {
  // ... existing code ...

  // NEW: Association Types for Permissions
  PERMISSION_TYPES: {
    ADMIN: 7,           // Admin User (USER_DEFINED)
    VIEW_ALL: 9,        // View All User (USER_DEFINED)
    STANDARD: 279,      // Standard (HUBSPOT_DEFINED)
  },

  // Association Categories
  ASSOCIATION_CATEGORIES: {
    USER_DEFINED: 'USER_DEFINED',
    HUBSPOT_DEFINED: 'HUBSPOT_DEFINED'
  }
};
```

**Acceptance Criteria:**
- [ ] Constants added
- [ ] No syntax errors
- [ ] Constants exported properly

**Deliverable:** Updated constants file

---

#### Task B.3: Update Agent Auth Middleware
**Assignee:** Backend Developer
**Depends On:** B.2
**Estimated Time:** 2 hours

**Reference:** [HUBSPOT_ASSOCIATION_TEST_RESULTS.md - Implementation Guidance #1](./HUBSPOT_ASSOCIATION_TEST_RESULTS.md)

**File to Edit:** `backend/src/middleware/agentAuth.js`

**Changes:**
1. After verifying agent exists, fetch association types
2. Determine permission level (admin/view_all/standard)
3. Add `permissionLevel` and `agencyId` to `req.user`

**⚠️ IMPORTANT:** Use `/crm/v4/objects/contacts/{id}/associations/companies` (without companyId) to get association types. This endpoint returns ALL companies with their association types - you must filter by your agencyId.

**Code to Add (after line 40):**
```javascript
// Get agent's company association
const companyAssocResponse = await hubspotClient.get(
  `/crm/v3/objects/contacts/${agentId}/associations/companies`
);

const companyId = companyAssocResponse.data.results[0]?.id || null;

// Get association types to determine permission level
let permissionLevel = 'standard';
if (companyId) {
  try {
    const associationTypesResponse = await hubspotClient.get(
      `/crm/v4/objects/contacts/${agentId}/associations/companies`
    );

    const companyAssoc = associationTypesResponse.data.results.find(
      r => r.toObjectId === companyId
    );
    const types = companyAssoc?.associationTypes || [];

    if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.ADMIN)) {
      permissionLevel = 'admin';
    } else if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.VIEW_ALL)) {
      permissionLevel = 'view_all';
    }
  } catch (error) {
    console.warn('[Agent Auth] Could not fetch association types:', error.message);
    // Default to 'standard' if fetch fails
  }
}

// Add to req.user
req.user = {
  id: agentId,
  email: agentResponse.data.properties.email,
  role: 'agent',
  permissionLevel: permissionLevel,  // NEW
  agencyId: companyId                // NEW
};
```

**Acceptance Criteria:**
- [ ] Middleware fetches association types
- [ ] Permission level correctly identified (admin/view_all/standard)
- [ ] `req.user.permissionLevel` available in all agent routes
- [ ] `req.user.agencyId` available in all agent routes
- [ ] No breaking changes to existing agent routes
- [ ] Error handling for missing associations

**Testing:**
```bash
# Login as agent with type 7
# Verify req.user.permissionLevel === 'admin'

# Login as agent with type 279
# Verify req.user.permissionLevel === 'standard'
```

**Deliverable:** Updated agentAuth middleware

---

#### Task B.4: Create Permission Middleware
**Assignee:** Backend Developer
**Depends On:** B.3
**Estimated Time:** 1 hour

**File to Create:** `backend/src/middleware/permissions.js`

**Code:**
```javascript
/**
 * Permission Middleware
 * Checks req.user.permissionLevel for specific privileges
 */

/**
 * Require Admin permission (association type 7)
 * Blocks View All and Standard users
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.permissionLevel !== 'admin') {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This action requires Admin privileges'
    });
  }
  next();
};

/**
 * Require View All or Admin permission (association type 9 or 7)
 * Blocks Standard users
 */
export const requireViewAll = (req, res, next) => {
  if (!['admin', 'view_all'].includes(req.user.permissionLevel)) {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This action requires View All or Admin privileges'
    });
  }
  next();
};

/**
 * Verify user has agency
 * Some routes require agencyId
 */
export const requireAgency = (req, res, next) => {
  if (!req.user.agencyId) {
    return res.status(400).json({
      error: 'No Agency',
      message: 'User is not associated with an agency'
    });
  }
  next();
};

export default {
  requireAdmin,
  requireViewAll,
  requireAgency
};
```

**Acceptance Criteria:**
- [ ] `requireAdmin` blocks non-admin users (403)
- [ ] `requireViewAll` allows admin and view_all users
- [ ] `requireAgency` blocks users without agencyId
- [ ] All middleware functions call `next()` on success

**Testing:**
```bash
# Test with admin user: should pass all middleware
# Test with view_all user: should pass requireViewAll, fail requireAdmin
# Test with standard user: should fail both
```

**Deliverable:** Permission middleware file

---

#### Task B.4.1: Create Agency Owner Service - Base Functions
**Assignee:** Backend Developer
**Depends On:** B.4
**Estimated Time:** 3 hours

**Reference:** [HUBSPOT_ASSOCIATION_TEST_RESULTS.md - Implementation Guidance #2](./HUBSPOT_ASSOCIATION_TEST_RESULTS.md)

**File to Create:** `backend/src/services/domain/agency-owner.js`

**Functions to Implement:**

##### 1. `getAgentsWithPermissions(agencyId)`
```javascript
/**
 * Get all agents in agency WITH permission levels
 * Uses batch query for performance
 */
export const getAgentsWithPermissions = async (agencyId) => {
  // Step 1: Get all contacts associated with company
  const contacts = await contactsIntegration.searchContactsByCompany(agencyId);

  // Step 2: Filter for agents only
  const agents = contacts.filter(c =>
    c.properties.contact_type?.includes('Agent')
  );

  const agentIds = agents.map(a => a.id);

  if (agentIds.length === 0) {
    return [];
  }

  // Step 3: Batch get association types for all agents
  const batchResponse = await hubspotClient.post(
    '/crm/v4/associations/contacts/companies/batch/read',
    {
      inputs: agentIds.map(id => ({ id }))
    }
  );

  // Step 4: Map permission levels
  const agentsWithPermissions = batchResponse.data.results.map(result => {
    const agentId = result.from.id;
    const agent = agents.find(a => a.id === agentId);

    const companyAssoc = result.to?.find(t => t.toObjectId === agencyId);
    const types = companyAssoc?.associationTypes || [];

    let permissionLevel = 'standard';
    if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.ADMIN)) {
      permissionLevel = 'admin';
    } else if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.VIEW_ALL)) {
      permissionLevel = 'view_all';
    }

    return {
      id: agentId,
      firstname: agent.properties.firstname,
      lastname: agent.properties.lastname,
      email: agent.properties.email,
      phone: agent.properties.phone,
      permissionLevel: permissionLevel
    };
  });

  return agentsWithPermissions;
};
```

**Acceptance Criteria:**
- [ ] Returns array of agents with permission levels
- [ ] Uses batch query (ONE API call for all agents)
- [ ] Handles agencies with no agents
- [ ] Filters out non-agent contacts
- [ ] Permission level correctly identified

**Testing:**
```javascript
// Test with agency having 3 agents (1 admin, 1 view_all, 1 standard)
const agents = await getAgentsWithPermissions('agency_id');
// Expect: 3 agents with correct permission levels
```

---

##### 2. `batchGetDealsForAgents(agentIds)`
```javascript
/**
 * Batch get deals for multiple agents
 * Returns deals with agent attribution
 */
export const batchGetDealsForAgents = async (agentIds) => {
  // Step 1: Batch read deal associations for all agents
  const dealAssocResponse = await hubspotClient.post(
    '/crm/v4/associations/contact/deal/batch/read',
    {
      inputs: agentIds.map(id => ({ id }))
    }
  );

  // Step 2: Extract unique deal IDs and track agent attribution
  const dealToAgentMap = {};
  const allDealIds = new Set();

  dealAssocResponse.data.results.forEach(result => {
    const agentId = result.from.id;
    const dealAssocs = result.to || [];
    dealAssocs.forEach(dealAssoc => {
      allDealIds.add(dealAssoc.toObjectId);
      dealToAgentMap[dealAssoc.toObjectId] = agentId;
    });
  });

  const uniqueDealIds = Array.from(allDealIds);

  if (uniqueDealIds.length === 0) {
    return { deals: [], dealToAgentMap: {} };
  }

  // Step 3: Batch fetch deal properties
  const dealProperties = [
    'dealname', 'dealstage', 'property_address', 'number_of_owners',
    'is_draft', 'createdate', 'hs_lastmodifieddate', 'closedate',
    'amount', 'pipeline'
  ];

  const dealsResponse = await hubspotClient.post(
    '/crm/v3/objects/deals/batch/read',
    {
      inputs: uniqueDealIds.map(id => ({ id })),
      properties: dealProperties
    }
  );

  const deals = dealsResponse.data.results.map(deal => ({
    id: deal.id,
    ...deal.properties
  }));

  return { deals, dealToAgentMap };
};
```

**Acceptance Criteria:**
- [ ] Returns unique deals across all agents
- [ ] Tracks which agent owns which deal
- [ ] Uses batch query (minimal API calls)
- [ ] Handles agents with no deals
- [ ] No duplicate deals

**Testing:**
```javascript
// Test with 3 agents having 5 deals each (some overlap)
const { deals, dealToAgentMap } = await batchGetDealsForAgents(['agent1', 'agent2', 'agent3']);
// Expect: 15 unique deals, dealToAgentMap has 15 entries
```

---

##### 3. `getAgencyDashboardData(adminId, agencyId)`
```javascript
/**
 * Get complete agency dashboard data
 * Returns agents, deals, and metrics
 */
export const getAgencyDashboardData = async (adminId, agencyId) => {
  console.log(`[Agency Owner] Loading dashboard for agency ${agencyId}`);

  // Step 1: Get all agents with permissions
  const agents = await getAgentsWithPermissions(agencyId);

  // Step 2: Get all deals for all agents
  const agentIds = agents.map(a => a.id);
  const { deals, dealToAgentMap } = await batchGetDealsForAgents(agentIds);

  // Step 3: Enhance deals with agent info
  const dealsWithAgents = deals.map(deal => {
    const assignedAgentId = dealToAgentMap[deal.id];
    const assignedAgent = agents.find(a => a.id === assignedAgentId);

    return {
      id: deal.id,
      ...deal,
      assignedAgentId,
      assignedAgent: assignedAgent ? {
        id: assignedAgent.id,
        name: `${assignedAgent.firstname} ${assignedAgent.lastname}`,
        email: assignedAgent.email,
        permissionLevel: assignedAgent.permissionLevel
      } : null
    };
  });

  // Step 4: Calculate agency metrics
  const metrics = calculateAgencyMetrics(dealsWithAgents, agents);

  return {
    agents,
    deals: dealsWithAgents,
    metrics
  };
};
```

**Acceptance Criteria:**
- [ ] Returns complete dashboard data
- [ ] Deals include assigned agent info
- [ ] Metrics calculated correctly
- [ ] Performant (uses batch queries)

---

**Deliverable:** `agency-owner.js` service with base functions

---

#### Task B.4.2: Agency Owner Service - Promote Agent
**Assignee:** Backend Developer
**Depends On:** B.4.1
**Estimated Time:** 2 hours

**Reference:** [HUBSPOT_ASSOCIATION_TEST_RESULTS.md - Implementation Guidance #3](./HUBSPOT_ASSOCIATION_TEST_RESULTS.md)

**⚠️ CRITICAL:** Changing association types requires DELETE + CREATE (2 API calls). PATCH is NOT supported. You MUST specify the correct `associationCategory` for each type:
- Type 279: `HUBSPOT_DEFINED`
- Type 7: `USER_DEFINED`
- Type 9: `USER_DEFINED`

**Function to Add to `backend/src/services/domain/agency-owner.js`:**

```javascript
/**
 * Promote agent to Admin (change association type → 7)
 * @param {string} adminId - ID of admin performing action
 * @param {string} agencyId - Agency ID
 * @param {string} targetAgentId - Agent to promote
 */
export const promoteAgentToAdmin = async (adminId, agencyId, targetAgentId) => {
  console.log(`[Agency Owner] Promoting agent ${targetAgentId} to Admin`);

  // Step 1: Verify targetAgent is in same agency
  const agentCompanyAssoc = await hubspotClient.get(
    `/crm/v3/objects/contacts/${targetAgentId}/associations/companies`
  );

  const agentCompanyId = agentCompanyAssoc.data.results[0]?.id;
  if (agentCompanyId !== agencyId) {
    throw new Error('Agent does not belong to this agency');
  }

  // Step 2: Get current association types
  const currentAssociationsResponse = await hubspotClient.get(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies`
  );

  const companyAssoc = currentAssociationsResponse.data.results.find(
    r => r.toObjectId === agencyId
  );
  const currentTypes = companyAssoc?.associationTypes || [];

  // Check if already admin
  if (currentTypes.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.ADMIN)) {
    console.log(`[Agency Owner] Agent ${targetAgentId} already has Admin privileges`);
    return { success: true, alreadyAdmin: true };
  }

  // Step 3: Delete old association (type 279 or type 9)
  const oldType = currentTypes.find(
    t => t.typeId === HUBSPOT.PERMISSION_TYPES.STANDARD ||
         t.typeId === HUBSPOT.PERMISSION_TYPES.VIEW_ALL
  );

  if (oldType) {
    await hubspotClient.delete(
      `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`,
      {
        data: [{
          associationCategory: oldType.category,
          associationTypeId: oldType.typeId
        }]
      }
    );
    console.log(`[Agency Owner] Deleted old association type ${oldType.typeId}`);
  }

  // Step 4: Create Admin association (type 7)
  await hubspotClient.put(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`,
    [{
      associationCategory: HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED,
      associationTypeId: HUBSPOT.PERMISSION_TYPES.ADMIN
    }]
  );

  console.log(`[Agency Owner] ✅ Agent ${targetAgentId} promoted to Admin`);

  return { success: true };
};
```

**Acceptance Criteria:**
- [ ] Verifies agent belongs to agency
- [ ] Checks if already admin (idempotent)
- [ ] Deletes old association (279 or 9)
- [ ] Creates admin association (7)
- [ ] Returns success status
- [ ] Handles errors gracefully

**Testing:**
```javascript
// Test promote standard agent (279 → 7)
await promoteAgentToAdmin(adminId, agencyId, standardAgentId);
// Verify: Agent now has type 7

// Test promote view_all agent (9 → 7)
await promoteAgentToAdmin(adminId, agencyId, viewAllAgentId);
// Verify: Agent now has type 7

// Test promote already-admin agent (should be idempotent)
await promoteAgentToAdmin(adminId, agencyId, adminAgentId);
// Verify: No error, returns alreadyAdmin: true
```

**Deliverable:** `promoteAgentToAdmin()` function

---

#### Task B.4.3: Agency Owner Service - Demote Agent
**Assignee:** Backend Developer
**Depends On:** B.4.2, Business Decision 3
**Estimated Time:** 2 hours

**⚠️ CRITICAL:** Must use DELETE + CREATE pattern. Remember to specify the correct category when demoting to Standard (HUBSPOT_DEFINED) vs View All (USER_DEFINED).

**Function to Add:**

```javascript
/**
 * Demote agent from Admin to View All or Standard
 * @param {string} adminId - ID of admin performing action
 * @param {string} agencyId - Agency ID
 * @param {string} targetAgentId - Agent to demote
 * @param {string} newPermissionLevel - 'view_all' or 'standard'
 */
export const demoteAgent = async (adminId, agencyId, targetAgentId, newPermissionLevel) => {
  console.log(`[Agency Owner] Demoting agent ${targetAgentId} to ${newPermissionLevel}`);

  // Step 1: Validate newPermissionLevel
  if (!['view_all', 'standard'].includes(newPermissionLevel)) {
    throw new Error('Invalid permission level. Must be "view_all" or "standard"');
  }

  // Step 2: Check if this is the last admin (BUSINESS DECISION 3)
  const agents = await getAgentsWithPermissions(agencyId);
  const adminCount = agents.filter(a => a.permissionLevel === 'admin').length;

  if (adminCount <= 1) {
    throw new Error('Cannot demote last admin - agency must have at least one admin');
  }

  // Step 3: Get current association types
  const currentAssociationsResponse = await hubspotClient.get(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies`
  );

  const companyAssoc = currentAssociationsResponse.data.results.find(
    r => r.toObjectId === agencyId
  );
  const currentTypes = companyAssoc?.associationTypes || [];

  // Check if already at target permission level
  const targetTypeId = newPermissionLevel === 'view_all'
    ? HUBSPOT.PERMISSION_TYPES.VIEW_ALL
    : HUBSPOT.PERMISSION_TYPES.STANDARD;

  if (currentTypes.some(t => t.typeId === targetTypeId)) {
    console.log(`[Agency Owner] Agent ${targetAgentId} already has ${newPermissionLevel} permission`);
    return { success: true, alreadyAtLevel: true };
  }

  // Step 4: Delete current association
  const oldType = currentTypes[0];  // Should only have one USER_DEFINED type
  if (oldType) {
    await hubspotClient.delete(
      `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`,
      {
        data: [{
          associationCategory: oldType.category,
          associationTypeId: oldType.typeId
        }]
      }
    );
  }

  // Step 5: Create new association
  const newCategory = newPermissionLevel === 'view_all'
    ? HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED
    : HUBSPOT.ASSOCIATION_CATEGORIES.HUBSPOT_DEFINED;

  await hubspotClient.put(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`,
    [{
      associationCategory: newCategory,
      associationTypeId: targetTypeId
    }]
  );

  console.log(`[Agency Owner] ✅ Agent ${targetAgentId} demoted to ${newPermissionLevel}`);

  return { success: true };
};
```

**Acceptance Criteria:**
- [ ] Validates new permission level
- [ ] Prevents demoting last admin
- [ ] Checks if already at target level (idempotent)
- [ ] Deletes old association
- [ ] Creates new association with correct category
- [ ] Returns success status

**Testing:**
```javascript
// Test demote admin to standard (should succeed if >1 admins)
await demoteAgent(adminId, agencyId, admin2Id, 'standard');
// Verify: Agent now has type 279

// Test demote last admin (should fail)
await demoteAgent(adminId, agencyId, lastAdminId, 'standard');
// Expect: Error "Cannot demote last admin"

// Test demote admin to view_all
await demoteAgent(adminId, agencyId, admin3Id, 'view_all');
// Verify: Agent now has type 9
```

**Deliverable:** `demoteAgent()` function

---

#### Task B.4.4: Agency Owner Service - Reassign Deal
**Assignee:** Backend Developer
**Depends On:** B.4.1
**Estimated Time:** 2 hours

**Function to Add:**

```javascript
/**
 * Reassign deal to different agent
 * Changes association type 6 from old agent to new agent
 */
export const reassignDeal = async (adminId, agencyId, dealId, newAgentId) => {
  console.log(`[Agency Owner] Reassigning deal ${dealId} to agent ${newAgentId}`);

  // Step 1: Verify newAgent belongs to this agency
  const agentCompanyAssoc = await hubspotClient.get(
    `/crm/v3/objects/contacts/${newAgentId}/associations/companies`
  );

  const agentCompanyId = agentCompanyAssoc.data.results[0]?.id;
  if (agentCompanyId !== agencyId) {
    throw new Error('Target agent does not belong to this agency');
  }

  // Step 2: Get current agent association for deal (type 6)
  const dealContactAssoc = await hubspotClient.post(
    '/crm/v4/associations/deal/contact/batch/read',
    {
      inputs: [{ id: dealId }]
    }
  );

  const currentAgentAssoc = dealContactAssoc.data.results[0]?.to?.find(
    assoc => assoc.associationTypes?.some(t => t.typeId === 6)
  );

  // Step 3: Delete old agent association (type 6)
  if (currentAgentAssoc) {
    await hubspotClient.delete(
      `/crm/v4/objects/deals/${dealId}/associations/contacts/${currentAgentAssoc.toObjectId}`,
      {
        data: [{
          associationCategory: HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED,
          associationTypeId: 6
        }]
      }
    );
    console.log(`[Agency Owner] Removed old agent association: ${currentAgentAssoc.toObjectId}`);
  }

  // Step 4: Create new agent association (type 6)
  await hubspotClient.put(
    `/crm/v4/objects/deals/${dealId}/associations/contacts/${newAgentId}`,
    [{
      associationCategory: HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED,
      associationTypeId: 6
    }]
  );

  console.log(`[Agency Owner] ✅ Deal ${dealId} reassigned to agent ${newAgentId}`);

  return { success: true, previousAgentId: currentAgentAssoc?.toObjectId || null };
};
```

**Acceptance Criteria:**
- [ ] Verifies new agent belongs to agency
- [ ] Finds current agent association (type 6)
- [ ] Deletes old association
- [ ] Creates new association
- [ ] Returns previous agent ID
- [ ] Handles deals with no current agent

**Testing:**
```javascript
// Test reassign deal from agent1 to agent2
await reassignDeal(adminId, agencyId, dealId, agent2Id);
// Verify: Deal now associated with agent2 (type 6)

// Test reassign orphaned deal (no current agent)
await reassignDeal(adminId, agencyId, orphanedDealId, agent3Id);
// Verify: Deal now associated with agent3
```

**Deliverable:** `reassignDeal()` function

---

#### Task B.4.5: Agency Owner Service - Remove Agent
**Assignee:** Backend Developer
**Depends On:** B.4.4, Business Decision 2
**Estimated Time:** 3 hours

**Function to Add:**

```javascript
/**
 * Remove agent from agency
 * Handles deal reassignment based on business decision
 */
export const removeAgentFromAgency = async (adminId, agencyId, targetAgentId, reassignToAgentId = null) => {
  console.log(`[Agency Owner] Removing agent ${targetAgentId} from agency`);

  // Step 1: Verify agent belongs to agency
  const agentCompanyAssoc = await hubspotClient.get(
    `/crm/v3/objects/contacts/${targetAgentId}/associations/companies`
  );

  const agentCompanyId = agentCompanyAssoc.data.results[0]?.id;
  if (agentCompanyId !== agencyId) {
    throw new Error('Agent does not belong to this agency');
  }

  // Step 2: Get all deals assigned to this agent
  const dealAssocResponse = await hubspotClient.post(
    '/crm/v4/associations/contact/deal/batch/read',
    {
      inputs: [{ id: targetAgentId }]
    }
  );

  const dealIds = dealAssocResponse.data.results[0]?.to?.map(d => d.toObjectId) || [];
  console.log(`[Agency Owner] Agent has ${dealIds.length} assigned deals`);

  // Step 3: Handle deals based on BUSINESS DECISION 2
  if (dealIds.length > 0) {
    if (reassignToAgentId) {
      // Option: Reassign to specified agent
      console.log(`[Agency Owner] Reassigning ${dealIds.length} deals to agent ${reassignToAgentId}`);
      for (const dealId of dealIds) {
        await reassignDeal(adminId, agencyId, dealId, reassignToAgentId);
      }
    } else {
      // IMPLEMENT BUSINESS DECISION 2 HERE
      // Option A: Auto-reassign to admin
      // Option B: Leave orphaned
      // Option C: Block removal
      // Option D: Distribute evenly

      console.warn(`[Agency Owner] ⚠️ Agent has ${dealIds.length} deals - implement business logic`);
      throw new Error('Cannot remove agent with active deals. Please reassign deals first.');
    }
  }

  // Step 4: Remove agent's association to company
  await hubspotClient.delete(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`
  );

  console.log(`[Agency Owner] ✅ Agent ${targetAgentId} removed from agency`);

  return { success: true, dealsReassigned: dealIds.length };
};
```

**Acceptance Criteria:**
- [ ] Verifies agent belongs to agency
- [ ] Gets all deals for agent
- [ ] Handles deal reassignment per Business Decision 2
- [ ] Removes agency association
- [ ] Returns count of deals reassigned

**Testing:**
```javascript
// Test remove agent with no deals
await removeAgentFromAgency(adminId, agencyId, agentWithNoDeals);
// Verify: Agent association removed

// Test remove agent with deals (reassign specified)
await removeAgentFromAgency(adminId, agencyId, agentWithDeals, newAgentId);
// Verify: All deals reassigned, agent removed

// Test remove agent with deals (no reassignment target)
// Should throw error or handle per Business Decision 2
```

**Deliverable:** `removeAgentFromAgency()` function

---

#### Task B.5: Create Agency Owner Routes
**Assignee:** Backend Developer
**Depends On:** B.4.5
**Estimated Time:** 3 hours

**File to Create:** `backend/src/routes/agency-owner.js`

**Routes to Implement:**

```javascript
import express from 'express';
import { agentAuth } from '../middleware/agentAuth.js';
import { requireAdmin, requireViewAll, requireAgency } from '../middleware/permissions.js';
import * as agencyOwnerService from '../services/domain/agency-owner.js';

const router = express.Router();

// All routes require agent authentication
router.use(agentAuth);

/**
 * GET /api/agency-owner/dashboard
 * Get complete agency dashboard
 * Permission: View All or Admin
 */
router.get('/dashboard', requireViewAll, requireAgency, async (req, res) => {
  try {
    const { id: userId, agencyId } = req.user;

    const data = await agencyOwnerService.getAgencyDashboardData(userId, agencyId);

    return res.json({
      success: true,
      ...data
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Dashboard error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/agency-owner/agents
 * Get all agents with permission levels
 * Permission: View All or Admin
 */
router.get('/agents', requireViewAll, requireAgency, async (req, res) => {
  try {
    const { agencyId } = req.user;

    const agents = await agencyOwnerService.getAgentsWithPermissions(agencyId);

    return res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Get agents error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/agency-owner/agents/:agentId/promote
 * Promote agent to Admin
 * Permission: Admin only
 */
router.post('/agents/:agentId/promote', requireAdmin, requireAgency, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { agentId } = req.params;

    const result = await agencyOwnerService.promoteAgentToAdmin(adminId, agencyId, agentId);

    return res.json({
      success: true,
      message: result.alreadyAdmin
        ? 'Agent already has Admin privileges'
        : 'Agent promoted to Admin successfully'
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Promote error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/agency-owner/agents/:agentId/demote
 * Demote agent to View All or Standard
 * Permission: Admin only
 * Body: { permissionLevel: "view_all" | "standard" }
 */
router.post('/agents/:agentId/demote', requireAdmin, requireAgency, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { agentId } = req.params;
    const { permissionLevel } = req.body;

    if (!['view_all', 'standard'].includes(permissionLevel)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'permissionLevel must be "view_all" or "standard"'
      });
    }

    const result = await agencyOwnerService.demoteAgent(adminId, agencyId, agentId, permissionLevel);

    return res.json({
      success: true,
      message: result.alreadyAtLevel
        ? `Agent already has ${permissionLevel} permission`
        : `Agent demoted to ${permissionLevel} successfully`
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Demote error:', error);

    if (error.message.includes('last admin')) {
      return res.status(400).json({
        error: 'Business Rule Violation',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/agency-owner/agents/:agentId
 * Remove agent from agency
 * Permission: Admin only
 * Query param: reassignTo (optional agent ID)
 */
router.delete('/agents/:agentId', requireAdmin, requireAgency, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { agentId } = req.params;
    const { reassignTo } = req.query;

    const result = await agencyOwnerService.removeAgentFromAgency(
      adminId,
      agencyId,
      agentId,
      reassignTo || null
    );

    return res.json({
      success: true,
      message: 'Agent removed successfully',
      dealsReassigned: result.dealsReassigned
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Remove agent error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

/**
 * PATCH /api/agency-owner/deals/:dealId/reassign
 * Reassign deal to different agent
 * Permission: Admin only
 * Body: { newAgentId: "contact_id" }
 */
router.patch('/deals/:dealId/reassign', requireAdmin, requireAgency, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { dealId } = req.params;
    const { newAgentId } = req.body;

    if (!newAgentId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'newAgentId is required'
      });
    }

    const result = await agencyOwnerService.reassignDeal(adminId, agencyId, dealId, newAgentId);

    return res.json({
      success: true,
      message: 'Deal reassigned successfully',
      previousAgentId: result.previousAgentId
    });
  } catch (error) {
    console.error('[Agency Owner Routes] Reassign deal error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

export default router;
```

**Acceptance Criteria:**
- [ ] All routes protected by `agentAuth`
- [ ] Admin-only routes protected by `requireAdmin`
- [ ] View-all routes protected by `requireViewAll`
- [ ] All routes require agency
- [ ] Input validation on all POST/PATCH routes
- [ ] Error handling returns appropriate status codes
- [ ] Success responses include meaningful messages

**Testing:**
```bash
# Test as admin user
curl -H "Authorization: Bearer admin_token" http://localhost:3001/api/agency-owner/dashboard
# Expect: 200 OK, dashboard data

# Test as view_all user
curl -H "Authorization: Bearer view_all_token" http://localhost:3001/api/agency-owner/dashboard
# Expect: 200 OK, dashboard data

curl -X POST -H "Authorization: Bearer view_all_token" http://localhost:3001/api/agency-owner/agents/123/promote
# Expect: 403 Forbidden (no admin privileges)

# Test as standard user
curl -H "Authorization: Bearer standard_token" http://localhost:3001/api/agency-owner/dashboard
# Expect: 403 Forbidden
```

**Deliverable:** Agency owner routes file

---

#### Task B.6: Register Routes in Server
**Assignee:** Backend Developer
**Depends On:** B.5
**Estimated Time:** 15 minutes

**File to Edit:** `backend/src/server.js` or `backend/index.js`

**Changes:**
```javascript
// Add import
import agencyOwnerRoutes from './routes/agency-owner.js';

// Register route
app.use('/api/agency-owner', agencyOwnerRoutes);
```

**Acceptance Criteria:**
- [ ] Route imported
- [ ] Route registered with correct path
- [ ] Server starts without errors
- [ ] Routes accessible at `/api/agency-owner/*`

**Testing:**
```bash
# Start server
npm run dev

# Test endpoint exists
curl http://localhost:3001/api/agency-owner/agents
# Expect: 401 Unauthorized (no token) or 403 Forbidden (token but no permission)
```

**Deliverable:** Server with agency owner routes registered

---

### PHASE F: FRONTEND IMPLEMENTATION (3 days)

#### Task F.1: Update Auth Context
**Assignee:** Frontend Developer
**Depends On:** B.6
**Estimated Time:** 1 hour

**File to Edit:** `frontend/agent-portal/src/context/AuthContext.jsx`

**Changes:**
```jsx
const [user, setUser] = useState({
  id: null,
  email: null,
  role: null,
  permissionLevel: null,  // NEW: 'admin' | 'view_all' | 'standard'
  agencyId: null          // NEW
});

// Helper functions
const isAdmin = () => user.permissionLevel === 'admin';
const canViewAll = () => ['admin', 'view_all'].includes(user.permissionLevel);
const isStandard = () => user.permissionLevel === 'standard';

// Add to context value
return (
  <AuthContext.Provider value={{
    user,
    setUser,
    isAdmin,          // NEW
    canViewAll,       // NEW
    isStandard,       // NEW
    // ... existing functions
  }}>
    {children}
  </AuthContext.Provider>
);
```

**Acceptance Criteria:**
- [ ] `permissionLevel` stored in user state
- [ ] `agencyId` stored in user state
- [ ] Helper functions work correctly
- [ ] Context exports helper functions
- [ ] No breaking changes to existing code

**Testing:**
```jsx
// In any component
const { isAdmin, canViewAll } = useAuth();

// Admin user
console.log(isAdmin());      // true
console.log(canViewAll());   // true

// View All user
console.log(isAdmin());      // false
console.log(canViewAll());   // true

// Standard user
console.log(isAdmin());      // false
console.log(canViewAll());   // false
```

**Deliverable:** Updated auth context

---

#### Task F.2: Update Login to Store Permission Level
**Assignee:** Frontend Developer
**Depends On:** F.1
**Estimated Time:** 30 minutes

**File to Edit:** `frontend/agent-portal/src/components/auth/Login.jsx`

**Changes:**
```jsx
// After successful OTP verification
const response = await api.post('/auth/verify-otp?type=agent', {
  identifier,
  otp,
  method
});

// Store user data including permission level
setUser({
  id: response.data.user.id,
  email: response.data.user.email,
  role: response.data.user.role,
  permissionLevel: response.data.user.permissionLevel,  // NEW
  agencyId: response.data.user.agencyId                 // NEW
});
```

**Note:** Backend JWT response needs to include `permissionLevel` and `agencyId`. This should already be added by Task B.3.

**Acceptance Criteria:**
- [ ] Permission level stored on login
- [ ] Agency ID stored on login
- [ ] localStorage updated with new fields
- [ ] No breaking changes

**Deliverable:** Updated login component

---

#### Task F.3: Update Navigation - Conditional Menu Items
**Assignee:** Frontend Developer
**Depends On:** F.2
**Estimated Time:** 1 hour

**File to Edit:** `frontend/agent-portal/src/components/dashboard/AgentSidebar.jsx`

**Changes:**
```jsx
import { useAuth } from '../../context/AuthContext';

function AgentSidebar() {
  const { canViewAll, isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      {/* Show agency dashboard for admins and view_all users */}
      {canViewAll() && (
        <NavLink to="/dashboard/agency" className="nav-item">
          <BuildingIcon />
          <span>Agency Dashboard</span>
        </NavLink>
      )}

      {/* Show team management only for admins */}
      {isAdmin() && (
        <NavLink to="/dashboard/team" className="nav-item">
          <UsersIcon />
          <span>Manage Team</span>
        </NavLink>
      )}

      {/* Always show personal leads */}
      <NavLink to="/dashboard/my-leads" className="nav-item">
        <BriefcaseIcon />
        <span>My Leads</span>
      </NavLink>

      {/* ... other menu items */}
    </aside>
  );
}
```

**Acceptance Criteria:**
- [ ] Admin users see: Agency Dashboard + Manage Team + My Leads
- [ ] View All users see: Agency Dashboard + My Leads
- [ ] Standard users see: My Leads only
- [ ] Active state works for new routes

**Testing:**
```
Login as admin → See 3 menu items
Login as view_all → See 2 menu items
Login as standard → See 1 menu item
```

**Deliverable:** Updated sidebar component

---

#### Task F.4: Create Agency Dashboard Component
**Assignee:** Frontend Developer
**Depends On:** F.3, Business Decision 4
**Estimated Time:** 1 day

**File to Create:** `frontend/agent-portal/src/components/dashboard/AgencyDashboard.jsx`

**Features to Implement:**

1. **Agency Overview Section**
   - Total agents count
   - Total leads count
   - Active leads count
   - Conversion rate

2. **Agent Filter Dropdown**
   - "All Agents" option
   - List of all agents with permission level badges
   - Filter deals by selected agent

3. **Leads Table**
   - Columns: Deal Name, Property Address, Stage, Assigned Agent, Created Date
   - "Assigned Agent" column shows agent name with permission badge (if Business Decision 4 allows)
   - Sortable columns
   - Search functionality

4. **Reassign Deal Button (Admins Only)**
   - Show "Reassign" button in each row (if user is admin)
   - Modal to select new agent
   - Confirmation dialog

**Component Structure:**
```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function AgencyDashboard() {
  const { isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/agency-owner/dashboard');
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLoading(false);
    }
  };

  const handleReassignDeal = async (dealId, newAgentId) => {
    try {
      await api.patch(`/agency-owner/deals/${dealId}/reassign`, {
        newAgentId
      });

      // Reload dashboard
      loadDashboardData();

      // Show success message
      toast.success('Deal reassigned successfully');
    } catch (error) {
      console.error('Failed to reassign deal:', error);
      toast.error('Failed to reassign deal');
    }
  };

  // Filter deals by selected agent
  const filteredDeals = selectedAgent === 'all'
    ? dashboardData?.deals
    : dashboardData?.deals.filter(d => d.assignedAgentId === selectedAgent);

  // Search deals
  const searchedDeals = filteredDeals?.filter(deal =>
    deal.dealname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.property_address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div>Loading agency dashboard...</div>;
  }

  return (
    <div className="agency-dashboard">
      <h1>Agency Dashboard</h1>

      {/* Metrics Section */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Agents"
          value={dashboardData.agents.length}
          icon={<UsersIcon />}
        />
        <MetricCard
          title="Total Leads"
          value={dashboardData.deals.length}
          icon={<BriefcaseIcon />}
        />
        <MetricCard
          title="Active Leads"
          value={dashboardData.metrics.activeLeads}
          icon={<ActivityIcon />}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${dashboardData.metrics.conversionRate}%`}
          icon={<TrendingUpIcon />}
        />
      </div>

      {/* Filters Section */}
      <div className="filters">
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
        >
          <option value="all">All Agents</option>
          {dashboardData.agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.firstname} {agent.lastname}
              {agent.permissionLevel === 'admin' && ' (Admin)'}
              {agent.permissionLevel === 'view_all' && ' (View All)'}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search deals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Deals Table */}
      <table className="deals-table">
        <thead>
          <tr>
            <th>Deal Name</th>
            <th>Property Address</th>
            <th>Stage</th>
            <th>Assigned Agent</th>
            <th>Created Date</th>
            {isAdmin() && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {searchedDeals?.map(deal => (
            <tr key={deal.id}>
              <td>{deal.dealname}</td>
              <td>{deal.property_address}</td>
              <td>{deal.dealstage}</td>
              <td>
                {deal.assignedAgent?.name}
                {/* Show permission badge if Business Decision 4 allows */}
                {deal.assignedAgent?.permissionLevel === 'admin' && (
                  <span className="badge badge-admin">Admin</span>
                )}
              </td>
              <td>{new Date(deal.createdate).toLocaleDateString()}</td>
              {isAdmin() && (
                <td>
                  <button
                    onClick={() => openReassignModal(deal)}
                    className="btn-sm btn-secondary"
                  >
                    Reassign
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Reassign Modal (Admins Only) */}
      {isAdmin() && (
        <ReassignDealModal
          isOpen={reassignModalOpen}
          deal={selectedDeal}
          agents={dashboardData.agents}
          onReassign={handleReassignDeal}
          onClose={() => setReassignModalOpen(false)}
        />
      )}
    </div>
  );
}

export default AgencyDashboard;
```

**Acceptance Criteria:**
- [ ] Loads dashboard data on mount
- [ ] Shows agency metrics
- [ ] Agent filter works
- [ ] Search works
- [ ] Table displays all deals with assigned agents
- [ ] Reassign button visible only to admins
- [ ] Reassign modal works
- [ ] Data refreshes after reassignment
- [ ] Loading states handled
- [ ] Error states handled

**Deliverable:** Agency dashboard component

---

#### Task F.5: Create Team Management Component
**Assignee:** Frontend Developer
**Depends On:** F.4
**Estimated Time:** 1 day

**File to Create:** `frontend/agent-portal/src/components/dashboard/TeamManagement.jsx`

**Features to Implement:**

1. **Agents List**
   - Table with columns: Name, Email, Phone, Permission Level
   - Permission level badges (Admin 🛡️, View All 👁️, Standard 👤)

2. **Permission Actions (Admins Only)**
   - Promote to Admin button
   - Demote dropdown (to View All or Standard)
   - Remove agent button

3. **Add Agent Form**
   - Fields: First Name, Last Name, Email, Phone
   - Permission level selector (radio buttons)
   - Submit button

**Component Structure:**
```jsx
function TeamManagement() {
  const { isAdmin } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await api.get('/agency-owner/agents');
      setAgents(response.data.agents);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load agents:', error);
      setLoading(false);
    }
  };

  const handlePromote = async (agentId) => {
    try {
      await api.post(`/agency-owner/agents/${agentId}/promote`);
      toast.success('Agent promoted to Admin');
      loadAgents();  // Reload
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to promote agent');
    }
  };

  const handleDemote = async (agentId, newLevel) => {
    try {
      await api.post(`/agency-owner/agents/${agentId}/demote`, {
        permissionLevel: newLevel
      });
      toast.success(`Agent demoted to ${newLevel}`);
      loadAgents();  // Reload
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to demote agent');
    }
  };

  const handleRemove = async (agentId) => {
    if (!confirm('Are you sure you want to remove this agent?')) {
      return;
    }

    try {
      await api.delete(`/agency-owner/agents/${agentId}`);
      toast.success('Agent removed successfully');
      loadAgents();  // Reload
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove agent');
    }
  };

  return (
    <div className="team-management">
      <h1>Team Management</h1>

      {/* Agents Table */}
      <table className="agents-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Permission Level</th>
            {isAdmin() && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {agents.map(agent => (
            <tr key={agent.id}>
              <td>{agent.firstname} {agent.lastname}</td>
              <td>{agent.email}</td>
              <td>{agent.phone}</td>
              <td>
                {agent.permissionLevel === 'admin' && (
                  <span className="badge badge-admin">🛡️ Admin</span>
                )}
                {agent.permissionLevel === 'view_all' && (
                  <span className="badge badge-view-all">👁️ View All</span>
                )}
                {agent.permissionLevel === 'standard' && (
                  <span className="badge badge-standard">👤 Standard</span>
                )}
              </td>
              {isAdmin() && (
                <td>
                  <div className="action-buttons">
                    {/* Promote to Admin */}
                    {agent.permissionLevel !== 'admin' && (
                      <button
                        onClick={() => handlePromote(agent.id)}
                        className="btn-sm btn-primary"
                      >
                        Promote to Admin
                      </button>
                    )}

                    {/* Demote Dropdown */}
                    {agent.permissionLevel === 'admin' && (
                      <select
                        onChange={(e) => handleDemote(agent.id, e.target.value)}
                        className="demote-select"
                        defaultValue=""
                      >
                        <option value="" disabled>Demote to...</option>
                        <option value="view_all">View All</option>
                        <option value="standard">Standard</option>
                      </select>
                    )}

                    {/* Remove Agent */}
                    <button
                      onClick={() => handleRemove(agent.id)}
                      className="btn-sm btn-danger"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Agent Form (optional - may reuse existing agency creation form) */}
      {isAdmin() && (
        <div className="add-agent-section">
          <h2>Add New Agent</h2>
          {/* Form implementation */}
        </div>
      )}
    </div>
  );
}

export default TeamManagement;
```

**Acceptance Criteria:**
- [ ] Loads agents list
- [ ] Shows permission level badges
- [ ] Promote button works
- [ ] Demote dropdown works
- [ ] Remove button shows confirmation
- [ ] All actions refresh data
- [ ] Error messages displayed
- [ ] Success messages displayed
- [ ] Loading states handled

**Deliverable:** Team management component

---

#### Task F.6: Create Routes for New Components
**Assignee:** Frontend Developer
**Depends On:** F.5
**Estimated Time:** 30 minutes

**File to Edit:** `frontend/agent-portal/src/App.jsx` or router file

**Changes:**
```jsx
import AgencyDashboard from './components/dashboard/AgencyDashboard';
import TeamManagement from './components/dashboard/TeamManagement';

// Add routes
<Route path="/dashboard/agency" element={<AgencyDashboard />} />
<Route path="/dashboard/team" element={<TeamManagement />} />
```

**Acceptance Criteria:**
- [ ] Routes registered
- [ ] Protected by authentication
- [ ] Navigation works
- [ ] URLs correct

**Testing:**
```
Navigate to /dashboard/agency → See agency dashboard
Navigate to /dashboard/team → See team management
```

**Deliverable:** Updated routes

---

### PHASE T: TESTING (2 days)

#### Task T.1: Backend API Testing
**Assignee:** QA / Backend Developer
**Depends On:** B.6
**Estimated Time:** 1 day

**Test Scenarios:**

1. **Test Permission Level Detection**
   - Create 3 test agents (admin, view_all, standard)
   - Login as each
   - Verify `req.user.permissionLevel` correct

2. **Test Agency Dashboard API**
   - Login as admin
   - Call `GET /api/agency-owner/dashboard`
   - Verify returns all agents and all deals

3. **Test Promote Agent**
   - Login as admin
   - Call `POST /api/agency-owner/agents/{id}/promote`
   - Verify agent now has type 7 in HubSpot

4. **Test Demote Agent**
   - Login as admin
   - Call `POST /api/agency-owner/agents/{id}/demote` with `{ permissionLevel: "standard" }`
   - Verify agent now has type 279

5. **Test Last Admin Protection**
   - Agency with 1 admin
   - Try to demote admin
   - Expect: 400 error "Cannot demote last admin"

6. **Test Reassign Deal**
   - Login as admin
   - Call `PATCH /api/agency-owner/deals/{dealId}/reassign`
   - Verify deal now has association type 6 to new agent

7. **Test Authorization**
   - Login as view_all user
   - Try to promote agent
   - Expect: 403 Forbidden

**Deliverable:** Test results document

---

#### Task T.2: Frontend E2E Testing
**Assignee:** QA / Frontend Developer
**Depends On:** F.6
**Estimated Time:** 1 day

**Test Scenarios:**

1. **Test Navigation Visibility**
   - Login as admin → See 3 menu items
   - Login as view_all → See 2 menu items
   - Login as standard → See 1 menu item

2. **Test Agency Dashboard**
   - Login as admin
   - Navigate to Agency Dashboard
   - Verify metrics display
   - Test agent filter
   - Test search

3. **Test Team Management**
   - Login as admin
   - Navigate to Team Management
   - Promote an agent → Verify badge changes
   - Demote an agent → Verify badge changes
   - Remove an agent → Verify removed from list

4. **Test Deal Reassignment**
   - Login as admin
   - Open Agency Dashboard
   - Click "Reassign" on a deal
   - Select new agent
   - Verify deal now shows new agent

5. **Test Permission Restrictions**
   - Login as view_all user
   - Verify cannot access Team Management
   - Verify cannot see Reassign buttons

**Deliverable:** E2E test results document

---

### PHASE D: DEPLOYMENT (1 day)

#### Task D.1: Run Data Migration
**Assignee:** Backend Developer
**Depends On:** T.2, Business Decision 1
**Estimated Time:** 2 hours

**Steps:**
1. Backup HubSpot data (export contacts/companies)
2. Run migration script in DRY-RUN mode
3. Review output
4. Run migration script in LIVE mode
5. Verify all agents have correct association types
6. Test login with migrated agents

**Acceptance Criteria:**
- [ ] All existing agents migrated to Admin or remain Standard
- [ ] No agents broken (can still login)
- [ ] Migration logged
- [ ] Backup saved

**Deliverable:** Migration complete

---

#### Task D.2: Deploy Backend
**Assignee:** Backend Developer / DevOps
**Depends On:** D.1
**Estimated Time:** 1 hour

**Steps:**
1. Merge backend changes to main branch
2. Run tests in CI/CD
3. Deploy to production (Vercel)
4. Verify health check endpoint
5. Smoke test agency owner endpoints

**Acceptance Criteria:**
- [ ] Backend deployed
- [ ] All endpoints accessible
- [ ] No errors in logs

**Deliverable:** Backend in production

---

#### Task D.3: Deploy Frontend
**Assignee:** Frontend Developer / DevOps
**Depends On:** D.2
**Estimated Time:** 1 hour

**Steps:**
1. Merge frontend changes to main branch
2. Build production bundle
3. Deploy to Cloudflare Pages
4. Verify all routes work
5. Test login → dashboard flow

**Acceptance Criteria:**
- [ ] Frontend deployed
- [ ] Agency dashboard accessible
- [ ] Team management accessible
- [ ] No console errors

**Deliverable:** Frontend in production

---

#### Task D.4: Production Testing
**Assignee:** QA / Business Analyst
**Depends On:** D.3
**Estimated Time:** 2 hours

**Steps:**
1. Login as agency owner
2. View agency dashboard
3. Promote an agent
4. Demote an agent
5. Reassign a deal
6. Verify everything works

**Acceptance Criteria:**
- [ ] All features work in production
- [ ] No errors
- [ ] Performance acceptable

**Deliverable:** Production sign-off

---

## ✅ CHECKLIST SUMMARY

### Business Decisions (Before Starting)
- [ ] Decision 1: Data migration strategy
- [ ] Decision 2: Agent removal - deal handling
- [ ] Decision 3: Last admin protection
- [ ] Decision 4: Role visibility

### Backend Tasks (5 days)
- [ ] A.1: Verify association types exist in HubSpot
- [ ] A.2: Test association types in production
- [ ] B.1: Data migration script
- [ ] B.2: Update constants
- [ ] B.3: Update agent auth middleware
- [ ] B.4: Create permission middleware
- [ ] B.4.1: Agency owner service - base functions
- [ ] B.4.2: Agency owner service - promote
- [ ] B.4.3: Agency owner service - demote
- [ ] B.4.4: Agency owner service - reassign deal
- [ ] B.4.5: Agency owner service - remove agent
- [ ] B.5: Create agency owner routes
- [ ] B.6: Register routes in server

### Frontend Tasks (3 days)
- [ ] F.1: Update auth context
- [ ] F.2: Update login
- [ ] F.3: Update navigation
- [ ] F.4: Create agency dashboard
- [ ] F.5: Create team management
- [ ] F.6: Create routes

### Testing Tasks (2 days)
- [ ] T.1: Backend API testing
- [ ] T.2: Frontend E2E testing

### Deployment Tasks (1 day)
- [ ] D.1: Run data migration
- [ ] D.2: Deploy backend
- [ ] D.3: Deploy frontend
- [ ] D.4: Production testing

---

## 📊 ESTIMATED TIMELINE

| Phase | Days | Dependencies |
|-------|------|--------------|
| Business Decisions | 0.5 | None |
| Backend Implementation | 5 | Business Decisions |
| Frontend Implementation | 3 | Backend complete |
| Testing | 2 | Frontend complete |
| Deployment | 1 | Testing complete |
| **TOTAL** | **11.5 days** (~2.5 weeks) | |

---

## 🎯 SUCCESS CRITERIA

### Feature is complete when:
- [ ] All tasks checked off
- [ ] Agency owners can view all leads from all agents
- [ ] Agency owners can promote/demote agents
- [ ] Agency owners can reassign deals
- [ ] Agency owners can remove agents
- [ ] View All users can view agency dashboard (read-only)
- [ ] Standard agents see only their own leads
- [ ] All endpoints performant (batch queries working)
- [ ] No breaking changes to existing features
- [ ] Production deployment successful

---

**Last Updated:** 2025-01-06 (API Patterns Confirmed)
**Status:** Ready for Implementation
**API Testing:** ✅ Complete - All endpoints verified working
**Total Tasks:** 30
**Estimated Completion:** 11.5 days
