# Agency Owner Feature - Association-Based Implementation Plan
**Senior Solutions Architect: Dave**
**Date:** 2025-01-06 (REVISED)
**Status:** Architecture Design Phase

---

## 🎯 EXECUTIVE SUMMARY

### Problem Statement (Unchanged)
Current system treats all agents equally - there's NO distinction between agency owners and regular agents. Agency owners cannot:
- View leads from their entire team
- Manage their agent roster (add/remove/promote)
- Reassign leads between agents
- Access agency-wide analytics

### Solution Overview (REVISED)
The HubSpot developer proposed using **CUSTOM ASSOCIATION TYPES** instead of custom properties. This is a **superior approach** that leverages HubSpot's native association system.

### Key Innovation
Instead of `contact.properties.agent_role = "Owner"`, we use:
- **Contact → Company (Type 7)** = Admin User
- **Contact → Company (Type 9)** = View All User
- **Contact → Company (Type 279)** = Standard User

---

## 🏗️ ASSOCIATION-BASED PERMISSION SYSTEM

### Three Permission Levels

| Association Type | Label | Category | Permission Level |
|-----------------|-------|----------|------------------|
| **7** | "Admin User" | USER_DEFINED | Full agency owner (CRUD on agents, deals) |
| **9** | "View All User" | USER_DEFINED | Read-only agency-wide view |
| **279** | (Standard) | HUBSPOT_DEFINED | Regular agent (own leads only) |

### Permission Matrix

| Action | Standard (279) | View All (9) | Admin (7) |
|--------|---------------|-------------|-----------|
| View own leads | ✅ | ✅ | ✅ |
| View all agency leads | ❌ | ✅ | ✅ |
| Create own leads | ✅ | ✅ | ✅ |
| Edit own leads | ✅ | ✅ | ✅ |
| Edit any agency lead | ❌ | ❌ | ✅ |
| Reassign deals | ❌ | ❌ | ✅ |
| Add agents | ❌ | ❌ | ✅ |
| Remove agents | ❌ | ❌ | ✅ |
| Promote agents | ❌ | ❌ | ✅ |
| Demote agents | ❌ | ❌ | ✅ |
| View team metrics | ❌ | ✅ | ✅ |

---

## 🔧 HUBSPOT CONFIGURATION

> **⚠️ FOR HUBSPOT DEVELOPER:** These association types need to be configured

### Assumption: Association Types Already Created

Based on your message, I'm assuming the HubSpot developer has **already created** these custom association types:

```json
{
  "label": "Admin User",
  "name": "admin_user",
  "maxToObjectIds": 100000,
  "category": "USER_DEFINED",
  "id": 7
}

{
  "label": "View All User",
  "name": "view_all_user",
  "maxToObjectIds": 100000,
  "category": "USER_DEFINED",
  "id": 9
}
```

### Verification Needed

**QUESTIONS FOR HUBSPOT DEVELOPER:**

1. ✅ Are association types 7 and 9 **already created** in HubSpot?
2. ✅ What is the API endpoint to query association types?
   - Is it `/crm/v4/objects/contacts/{contactId}/associations/companies`?
3. ✅ Can we use v4 batch API to get associations with type info?
4. ✅ How do we filter contacts by association type?
   - Can we query: "All contacts with type 7 association to company X"?
5. ✅ What happens when we delete an agent's association - do their deals remain?

---

## 📊 API REFERENCE FOR ASSOCIATION TYPES

### 1. Get Contact's Permission Level

**Endpoint:** `GET /crm/v4/objects/contacts/{contactId}/associations/companies`

**Purpose:** Determine if contact is Admin (7), View All (9), or Standard (279)

**Response:**
```json
{
  "results": [
    {
      "toObjectId": "company_id_123",
      "associationTypes": [
        {
          "category": "USER_DEFINED",
          "typeId": 7,
          "label": "Admin User"
        }
      ]
    }
  ]
}
```

**Backend Logic:**
```javascript
const getAgentPermissionLevel = (associations) => {
  const types = associations[0]?.associationTypes || [];

  // Check for Admin (highest privilege)
  if (types.some(t => t.typeId === 7)) {
    return 'admin';
  }

  // Check for View All
  if (types.some(t => t.typeId === 9)) {
    return 'view_all';
  }

  // Default to Standard
  return 'standard';
}
```

---

### 2. Get All Agents by Permission Level

**Challenge:** How do we query "all contacts with type 7 association to company X"?

**Option A: Get all agents, then filter** (Safer)
```javascript
// Step 1: Get ALL agents associated with company
GET /crm/v3/objects/companies/{companyId}/associations/contacts

// Step 2: For each contact, check association type
GET /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}

// Step 3: Filter by typeId
```

**Option B: Use v4 batch API** (Faster)
```javascript
// Can we batch query association types?
POST /crm/v4/associations/contacts/companies/batch/read
{
  "inputs": [
    { "id": "contact_1" },
    { "id": "contact_2" }
  ]
}
```

**QUESTION FOR HUBSPOT DEV:** Which approach is correct?

---

### 3. Promote Agent (Change Association Type)

**Scenario:** Promote regular agent (279) to Admin (7)

**Steps:**
```javascript
// Step 1: Delete old association
DELETE /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
Body: [
  {
    "associationCategory": "HUBSPOT_DEFINED",
    "associationTypeId": 279
  }
]

// Step 2: Create new association with Admin type
PUT /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
Body: [
  {
    "associationCategory": "USER_DEFINED",
    "associationTypeId": 7
  }
]
```

**QUESTION FOR HUBSPOT DEV:**
- Can a contact have MULTIPLE association types to same company?
- Or do we need to delete old association first?

---

### 4. Add Agent with Specific Permission

**Scenario:** Agency owner invites new agent with "View All" permission

**Steps:**
```javascript
// Step 1: Create contact
POST /crm/v3/objects/contacts
{
  "properties": {
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "contact_type": "Agent"
  },
  "associations": [
    {
      "to": { "id": "{companyId}" },
      "types": [
        {
          "associationCategory": "USER_DEFINED",
          "associationTypeId": 9  // View All User
        }
      ]
    }
  ]
}
```

**Note:** Inline association creation with custom type!

---

### 5. Remove Agent from Agency

**Scenario:** Admin removes agent from agency

**Option A: Delete association** (Agent loses access)
```javascript
DELETE /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
```

**Option B: Downgrade to unaffiliated contact**
```javascript
// Remove association but keep contact record
// Contact can no longer access agency portal
```

**CRITICAL QUESTION:**
> What happens to the agent's deals (association type 6) when we remove their company association?

**Expected Behavior:**
- Deals remain in HubSpot (deal records NOT deleted)
- Deals still associated with company (type 341)
- Deals NO LONGER associated with agent (type 6 removed? or kept?)

**BUSINESS DECISION NEEDED:**
Should we auto-remove deal associations (type 6) or keep them for historical record?

---

## 🔄 DATA MIGRATION STRATEGY

### Challenge: Existing Agents Have Type 279 (Standard)

All current agents in HubSpot have the **default association type 279** (Contact → Company).

### Migration Script Required

```javascript
/**
 * Migrate existing agents to Admin role
 *
 * Strategy:
 * 1. Get all companies (agencies)
 * 2. For each company, get associated contacts with contact_type = "Agent"
 * 3. For each agent, check current association type
 * 4. If type is 279 (standard), upgrade to type 7 (admin)
 */

const migrateExistingAgentsToAdmin = async () => {
  // Get all companies
  const companies = await getAllCompanies();

  for (const company of companies) {
    console.log(`Migrating agents for company: ${company.id}`);

    // Get all contacts associated with company
    const contacts = await hubspotClient.get(
      `/crm/v3/objects/companies/${company.id}/associations/contacts`
    );

    for (const contact of contacts.results) {
      // Check if contact is an agent
      const contactDetails = await hubspotClient.get(
        `/crm/v3/objects/contacts/${contact.id}?properties=contact_type`
      );

      if (!contactDetails.properties.contact_type?.includes('Agent')) {
        continue; // Skip non-agents
      }

      // Get current association types
      const associations = await hubspotClient.get(
        `/crm/v4/objects/contacts/${contact.id}/associations/companies/${company.id}`
      );

      const hasAdminType = associations.results[0]?.associationTypes?.some(
        t => t.typeId === 7
      );

      if (hasAdminType) {
        console.log(`Agent ${contact.id} already has Admin type`);
        continue;
      }

      // Upgrade to Admin
      console.log(`Upgrading agent ${contact.id} to Admin...`);

      // Delete standard association
      await hubspotClient.delete(
        `/crm/v4/objects/contacts/${contact.id}/associations/companies/${company.id}`,
        {
          data: [{
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 279
          }]
        }
      );

      // Create admin association
      await hubspotClient.put(
        `/crm/v4/objects/contacts/${contact.id}/associations/companies/${company.id}`,
        [{
          associationCategory: "USER_DEFINED",
          associationTypeId: 7
        }]
      );

      console.log(`✅ Agent ${contact.id} upgraded to Admin`);
    }
  }
};
```

### Migration Decision

**OPTION A (Recommended):** Make all existing agents Admins
- Pro: No disruption, agents retain full access
- Con: Agencies need to manually demote some agents

**OPTION B:** Make oldest agent Admin, rest Standard
- Pro: Clear hierarchy from day one
- Con: May break existing workflows if wrong agent promoted

**BUSINESS DECISION:** Which option?

---

## 🔐 BACKEND IMPLEMENTATION

### Phase 1: Update Authentication Service

**File:** `backend/src/services/auth/otp.service.js`

**Changes:**
```javascript
// Line 220-227: REMOVE agent_role property lookup
// Line 220-227: Keep role as "agent" (association type checked later)

return {
  success: true,
  user: {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone,
    role: 'agent',
    // NOTE: Permission level determined by association type, not property!
  }
};
```

**Why:** Association types are checked per-request, not stored in JWT

---

### Phase 2: Update Agent Auth Middleware

**File:** `backend/src/middleware/agentAuth.js`

**Changes:**
```javascript
export const agentAuth = async (req, res, next) => {
  try {
    // ... existing JWT verification ...

    const agentId = decoded.userId;

    // Verify agent exists and is type 'Agent'
    const agentResponse = await hubspotClient.get(
      `/crm/v3/objects/contacts/${agentId}?properties=contact_type,email,firstname,lastname`
    );

    const contactTypes = agentResponse.data.properties.contact_type || '';
    const isAgent = contactTypes.includes('Agent');

    if (!isAgent) {
      return res.status(403).json({ error: 'Not an agent' });
    }

    // Get agent's company association
    const companyAssocResponse = await hubspotClient.get(
      `/crm/v3/objects/contacts/${agentId}/associations/companies`
    );

    const companyId = companyAssocResponse.data.results[0]?.id || null;

    // NEW: Get association TYPE to determine permission level
    let permissionLevel = 'standard';
    if (companyId) {
      try {
        const associationTypes = await hubspotClient.get(
          `/crm/v4/objects/contacts/${agentId}/associations/companies/${companyId}`
        );

        const types = associationTypes.data.results[0]?.associationTypes || [];

        if (types.some(t => t.typeId === 7)) {
          permissionLevel = 'admin';
        } else if (types.some(t => t.typeId === 9)) {
          permissionLevel = 'view_all';
        }
      } catch (error) {
        console.warn('[Agent Auth] Could not fetch association types:', error.message);
        // Default to 'standard' if fetch fails
      }
    }

    // Attach user info to request
    req.user = {
      id: agentId,
      email: agentResponse.data.properties.email,
      role: 'agent',
      permissionLevel: permissionLevel,  // NEW: 'admin' | 'view_all' | 'standard'
      agencyId: companyId
    };

    next();
  } catch (error) {
    console.error('[Agent Auth] Authentication failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

### Phase 3: Create Permission Middleware

**NEW FILE:** `backend/src/middleware/permissions.js`

```javascript
/**
 * Permission Middleware
 * Checks association type for specific permission levels
 */

/**
 * Require Admin permission (association type 7)
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

export default {
  requireAdmin,
  requireViewAll
};
```

**Usage:**
```javascript
// In routes/agency-owner.js
import { agentAuth } from '../middleware/agentAuth.js';
import { requireAdmin, requireViewAll } from '../middleware/permissions.js';

// Admin-only endpoint
router.delete('/agents/:agentId', agentAuth, requireAdmin, async (req, res) => {
  // Only admins can remove agents
});

// View All or Admin endpoint
router.get('/dashboard', agentAuth, requireViewAll, async (req, res) => {
  // Admins and View All users can see agency dashboard
});
```

---

### Phase 4: Create Agency Owner Service

**NEW FILE:** `backend/src/services/domain/agency-owner.js`

```javascript
import hubspotClient from '../../integrations/hubspot/client.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';

/**
 * Get all agents in agency WITH permission levels
 */
export const getAgentsWithPermissions = async (agencyId) => {
  // Step 1: Get all contacts associated with company
  const contacts = await contactsIntegration.searchContactsByCompany(agencyId);

  // Step 2: Filter for agents only
  const agents = contacts.filter(c =>
    c.properties.contact_type?.includes('Agent')
  );

  // Step 3: Batch get association types for all agents
  const agentsWithPermissions = await Promise.all(
    agents.map(async (agent) => {
      try {
        const associationTypes = await hubspotClient.get(
          `/crm/v4/objects/contacts/${agent.id}/associations/companies/${agencyId}`
        );

        const types = associationTypes.data.results[0]?.associationTypes || [];

        let permissionLevel = 'standard';
        if (types.some(t => t.typeId === 7)) {
          permissionLevel = 'admin';
        } else if (types.some(t => t.typeId === 9)) {
          permissionLevel = 'view_all';
        }

        return {
          id: agent.id,
          firstname: agent.properties.firstname,
          lastname: agent.properties.lastname,
          email: agent.properties.email,
          phone: agent.properties.phone,
          permissionLevel: permissionLevel
        };
      } catch (error) {
        console.error(`Error fetching permissions for agent ${agent.id}:`, error);
        return {
          id: agent.id,
          firstname: agent.properties.firstname,
          lastname: agent.properties.lastname,
          email: agent.properties.email,
          phone: agent.properties.phone,
          permissionLevel: 'standard'  // Default on error
        };
      }
    })
  );

  return agentsWithPermissions;
};

/**
 * Get agency dashboard data
 * Returns all agents, all deals, and agency metrics
 */
export const getAgencyDashboardData = async (adminId, agencyId) => {
  // Step 1: Get all agents with permissions
  const agents = await getAgentsWithPermissions(agencyId);

  // Step 2: Get all deals for all agents (reuse batch logic)
  const agentIds = agents.map(a => a.id);
  const { deals, dealToAgentMap } = await batchGetDealsForAgents(agentIds);

  // Step 3: Enhance deals with agent info
  const dealsWithAgents = deals.map(deal => {
    const assignedAgentId = dealToAgentMap[deal.id];
    const assignedAgent = agents.find(a => a.id === assignedAgentId);

    return {
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

/**
 * Batch get deals for multiple agents (REUSE EXISTING PATTERN)
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
    'is_draft', 'createdate', 'hs_lastmodifieddate', 'closedate'
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

/**
 * Promote agent to Admin (change association type 279/9 → 7)
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

  // Step 2: Get current association type
  const currentAssociations = await hubspotClient.get(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`
  );

  const currentTypes = currentAssociations.data.results[0]?.associationTypes || [];

  // Step 3: Delete old association (if not already admin)
  if (!currentTypes.some(t => t.typeId === 7)) {
    // Delete current association
    const typeToDelete = currentTypes[0];  // Assume single association type

    await hubspotClient.delete(
      `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`,
      {
        data: [{
          associationCategory: typeToDelete.category,
          associationTypeId: typeToDelete.typeId
        }]
      }
    );

    // Step 4: Create Admin association
    await hubspotClient.put(
      `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`,
      [{
        associationCategory: "USER_DEFINED",
        associationTypeId: 7
      }]
    );

    console.log(`[Agency Owner] ✅ Agent ${targetAgentId} promoted to Admin`);
  } else {
    console.log(`[Agency Owner] ℹ️ Agent ${targetAgentId} already has Admin privileges`);
  }

  return { success: true };
};

/**
 * Demote admin to View All or Standard
 */
export const demoteAgent = async (adminId, agencyId, targetAgentId, newPermissionLevel) => {
  // Similar logic to promote, but change to type 9 or 279

  // Step 1: Verify at least one admin will remain
  const agents = await getAgentsWithPermissions(agencyId);
  const adminCount = agents.filter(a => a.permissionLevel === 'admin').length;

  if (adminCount <= 1) {
    throw new Error('Cannot demote last admin - agency must have at least one admin');
  }

  // Step 2: Delete current association
  // Step 3: Create new association with appropriate type (9 or 279)

  const newTypeId = newPermissionLevel === 'view_all' ? 9 : 279;
  const newCategory = newPermissionLevel === 'view_all' ? 'USER_DEFINED' : 'HUBSPOT_DEFINED';

  // Implementation similar to promote...

  return { success: true };
};

/**
 * Remove agent from agency
 */
export const removeAgentFromAgency = async (adminId, agencyId, targetAgentId, reassignToAgentId = null) => {
  console.log(`[Agency Owner] Removing agent ${targetAgentId} from agency`);

  // Step 1: Get all deals assigned to targetAgent
  const dealAssocResponse = await hubspotClient.post(
    '/crm/v4/associations/contact/deal/batch/read',
    {
      inputs: [{ id: targetAgentId }]
    }
  );

  const dealIds = dealAssocResponse.data.results[0]?.to?.map(d => d.toObjectId) || [];

  console.log(`[Agency Owner] Agent has ${dealIds.length} assigned deals`);

  // Step 2: Handle deals based on business decision
  if (reassignToAgentId) {
    // Reassign all deals to another agent
    for (const dealId of dealIds) {
      await reassignDeal(adminId, agencyId, dealId, reassignToAgentId);
    }
  } else {
    // BUSINESS DECISION: What to do with orphaned deals?
    // Option A: Unassign (remove association type 6)
    // Option B: Auto-assign to admin performing removal
    // Option C: Block removal if deals exist

    console.warn(`[Agency Owner] ⚠️ Agent has ${dealIds.length} deals - business logic needed`);
  }

  // Step 3: Remove agent's association to company
  await hubspotClient.delete(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies/${agencyId}`
  );

  console.log(`[Agency Owner] ✅ Agent ${targetAgentId} removed from agency`);

  return { success: true, dealsReassigned: dealIds.length };
};

/**
 * Reassign deal to different agent
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

  // Step 2: Get current agent association for deal
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
          associationCategory: "USER_DEFINED",
          associationTypeId: 6
        }]
      }
    );
  }

  // Step 4: Create new agent association (type 6)
  await hubspotClient.put(
    `/crm/v4/objects/deals/${dealId}/associations/contacts/${newAgentId}`,
    [{
      associationCategory: "USER_DEFINED",
      associationTypeId: 6
    }]
  );

  console.log(`[Agency Owner] ✅ Deal ${dealId} reassigned to agent ${newAgentId}`);

  return { success: true };
};

export default {
  getAgentsWithPermissions,
  getAgencyDashboardData,
  batchGetDealsForAgents,
  promoteAgentToAdmin,
  demoteAgent,
  removeAgentFromAgency,
  reassignDeal
};
```

---

## 🛣️ BACKEND ROUTES

**NEW FILE:** `backend/src/routes/agency-owner.js`

```javascript
import express from 'express';
import { agentAuth } from '../middleware/agentAuth.js';
import { requireAdmin, requireViewAll } from '../middleware/permissions.js';
import * as agencyOwnerService from '../services/domain/agency-owner.js';

const router = express.Router();

// All routes require agent authentication
router.use(agentAuth);

/**
 * GET /api/agency-owner/dashboard
 * Get complete agency dashboard (Admins and View All users)
 */
router.get('/dashboard', requireViewAll, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;

    if (!agencyId) {
      return res.status(400).json({
        error: 'No Agency',
        message: 'User is not associated with an agency'
      });
    }

    const data = await agencyOwnerService.getAgencyDashboardData(adminId, agencyId);

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
 * Get all agents with their permission levels (Admins and View All users)
 */
router.get('/agents', requireViewAll, async (req, res) => {
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
 * Promote agent to Admin (Admins only)
 */
router.post('/agents/:agentId/promote', requireAdmin, async (req, res) => {
  try {
    const { id: adminId, agencyId } = req.user;
    const { agentId } = req.params;

    await agencyOwnerService.promoteAgentToAdmin(adminId, agencyId, agentId);

    return res.json({
      success: true,
      message: 'Agent promoted to Admin successfully'
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
 * Demote admin to View All or Standard (Admins only)
 * Body: { permissionLevel: "view_all" | "standard" }
 */
router.post('/agents/:agentId/demote', requireAdmin, async (req, res) => {
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

    await agencyOwnerService.demoteAgent(adminId, agencyId, agentId, permissionLevel);

    return res.json({
      success: true,
      message: `Agent demoted to ${permissionLevel} successfully`
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
 * Remove agent from agency (Admins only)
 * Query param: reassignTo (optional agent ID for deal reassignment)
 */
router.delete('/agents/:agentId', requireAdmin, async (req, res) => {
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
 * Reassign deal to different agent (Admins only)
 * Body: { newAgentId: "contact_id" }
 */
router.patch('/deals/:dealId/reassign', requireAdmin, async (req, res) => {
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

    await agencyOwnerService.reassignDeal(adminId, agencyId, dealId, newAgentId);

    return res.json({
      success: true,
      message: 'Deal reassigned successfully'
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

---

## 🎨 FRONTEND IMPLEMENTATION

### Phase 1: Update Auth Context

**File:** `frontend/agent-portal/src/context/AuthContext.jsx`

**Changes:**
```jsx
// Store permissionLevel from middleware
const [user, setUser] = useState({
  id: null,
  email: null,
  role: null,
  permissionLevel: null,  // NEW: 'admin' | 'view_all' | 'standard'
  agencyId: null
});

// Helper functions
const isAdmin = () => user.permissionLevel === 'admin';
const canViewAll = () => ['admin', 'view_all'].includes(user.permissionLevel);
const isStandard = () => user.permissionLevel === 'standard';
```

### Phase 2: Conditional Navigation

**File:** `frontend/agent-portal/src/components/dashboard/AgentSidebar.jsx`

```jsx
{/* Show agency dashboard for Admins and View All users */}
{canViewAll() && (
  <NavLink to="/dashboard/agency">
    <Icon name="building" />
    Agency Dashboard
  </NavLink>
)}

{/* Show team management only for Admins */}
{isAdmin() && (
  <NavLink to="/dashboard/team">
    <Icon name="users" />
    Manage Team
  </NavLink>
)}

{/* Always show personal leads */}
<NavLink to="/dashboard/my-leads">
  <Icon name="briefcase" />
  My Leads
</NavLink>
```

### Phase 3: Agency Dashboard Component

**NEW FILE:** `frontend/agent-portal/src/components/dashboard/AgencyDashboard.jsx`

**Features:**
- Display all agents with permission level badges
- Show all leads across agency with assigned agent column
- Filter by agent dropdown
- Performance metrics by agent
- (Admins only) Reassign deal buttons

### Phase 4: Team Management Component

**NEW FILE:** `frontend/agent-portal/src/components/dashboard/TeamManagement.jsx`

**Features:**
- List all agents with permission badges
  - 🛡️ Admin
  - 👁️ View All
  - 👤 Standard
- Promote/Demote buttons (admins only)
- Remove agent button with deal reassignment modal
- Add new agent form with permission level selector

---

## 🧪 TESTING PLAN

### Test Case 1: Permission Level Verification

**Steps:**
1. Create agency with 3 agents:
   - Agent A: Admin (type 7)
   - Agent B: View All (type 9)
   - Agent C: Standard (type 279)
2. Login as each agent
3. Verify navigation items:
   - Agent A: See "Agency Dashboard" + "Manage Team" + "My Leads"
   - Agent B: See "Agency Dashboard" + "My Leads" (no team management)
   - Agent C: See only "My Leads"
4. Verify API access:
   - Agent A: Can access `/api/agency-owner/dashboard` and `/api/agency-owner/agents/:id/promote`
   - Agent B: Can access `/api/agency-owner/dashboard` but NOT promotion endpoints
   - Agent C: Cannot access any agency-owner endpoints (403 Forbidden)

### Test Case 2: Agent Promotion

**Steps:**
1. Admin promotes Agent C to Admin
2. Verify HubSpot association:
   - Old: Contact C → Company (type 279)
   - New: Contact C → Company (type 7)
3. Agent C logs out and logs back in
4. Verify Agent C now sees admin navigation
5. Verify Agent C can now promote other agents

### Test Case 3: Last Admin Protection

**Steps:**
1. Agency with 2 admins (Agent A, Agent B)
2. Agent A demotes Agent B to Standard (should succeed)
3. Agent B tries to demote Agent A (should fail - last admin)
4. Verify error: "Cannot demote last admin"

### Test Case 4: Deal Reassignment

**Steps:**
1. Agent C has 10 deals assigned (association type 6)
2. Admin reassigns 5 deals to Agent B
3. Verify HubSpot:
   - Deals 1-5: Association type 6 changed from Agent C → Agent B
   - Deals 6-10: Still assigned to Agent C
4. Login as Agent B: See 5 new deals
5. Login as Agent C: See only 5 remaining deals

### Test Case 5: Agent Removal with Reassignment

**Steps:**
1. Agent C has 10 deals
2. Admin removes Agent C, reassigns all deals to Agent B
3. Verify HubSpot:
   - Agent C no longer has association to Company (type 279 deleted)
   - All 10 deals now have association type 6 to Agent B
4. Agent C tries to login: Should fail or show "no agency" error

---

## 🚨 CRITICAL QUESTIONS FOR HUBSPOT DEVELOPER

### 1. Association Type API Endpoints

**Question:** Are these the correct v4 API endpoints?

```
GET /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
PUT /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
DELETE /crm/v4/objects/contacts/{contactId}/associations/companies/{companyId}
```

**Or should we use:**
```
GET /crm/v4/associations/contacts/{contactId}/companies/{companyId}
```

### 2. Batch Query for Association Types

**Question:** Can we batch query association types?

```javascript
POST /crm/v4/associations/contacts/companies/batch/read
{
  "inputs": [
    { "id": "contact1" },
    { "id": "contact2" }
  ]
}
```

**Does this return associationType information for each contact?**

### 3. Association Replacement

**Question:** When changing association type, do we:

**Option A:** Delete old + Create new (2 API calls)
```javascript
DELETE /crm/v4/... (type 279)
PUT /crm/v4/... (type 7)
```

**Option B:** Update existing (1 API call)
```javascript
PATCH /crm/v4/... (change type 279 → 7)
```

### 4. Multiple Association Types

**Question:** Can a contact have MULTIPLE association types to the same company?

Example:
- Contact → Company (type 279 + type 7 simultaneously)

Or is it **mutually exclusive** (only one type at a time)?

### 5. Default Association Type

**Question:** When we create a new agent with inline association, what's the default type?

```javascript
POST /crm/v3/objects/contacts
{
  "associations": [
    {
      "to": { "id": "company_id" },
      "types": [
        {
          "associationCategory": "HUBSPOT_DEFINED",
          "associationTypeId": 279  // Do we need to specify this?
        }
      ]
    }
  ]
}
```

**Or does it default to 279 if we omit the types array?**

---

## 📅 IMPLEMENTATION TIMELINE

| Phase | Task | Duration | Assignee | Depends On |
|-------|------|----------|----------|------------|
| 0 | **HubSpot Developer** confirms API endpoints | 1 day | HubSpot Dev | None |
| 1 | Data migration script (upgrade existing agents) | 1 day | Backend Dev | Phase 0 |
| 2 | Update agentAuth middleware (check association types) | 1 day | Backend Dev | Phase 0 |
| 3 | Create permissions middleware | 0.5 day | Backend Dev | Phase 2 |
| 4 | Implement agency-owner service | 3 days | Backend Dev | Phase 3 |
| 5 | Create agency-owner routes | 1 day | Backend Dev | Phase 4 |
| 6 | Update frontend auth context | 0.5 day | Frontend Dev | Phase 5 |
| 7 | Create agency dashboard UI | 2 days | Frontend Dev | Phase 6 |
| 8 | Create team management UI | 2 days | Frontend Dev | Phase 6 |
| 9 | End-to-end testing | 3 days | QA Team | Phase 8 |

**Total Duration:** ~15 days (~3 weeks)

---

## 🎯 NEXT STEPS

### IMMEDIATE (Before Development Starts)

1. **HubSpot Developer** answers 5 critical questions above
2. **Business Analyst** confirms:
   - Migration strategy (make all existing agents admins?)
   - Agent removal behavior (what happens to deals?)
   - Last admin protection (require at least one admin?)

### AFTER CONFIRMATION

1. **Backend Dev** implements Phase 1 (data migration)
2. **Backend Dev** implements Phase 2-5 (auth + service + routes)
3. **Frontend Dev** implements Phase 6-8 (UI components)
4. **QA Team** performs Phase 9 (testing)

---

## ✅ ADVANTAGES OF ASSOCIATION-BASED APPROACH

1. ✅ **No custom properties needed** - Uses native HubSpot associations
2. ✅ **More flexible** - 3 permission levels instead of 2 (Admin, View All, Standard)
3. ✅ **Faster queries** - Association type included in association endpoint response
4. ✅ **Auditable in HubSpot UI** - Association labels visible in contact records
5. ✅ **Scalable** - Can add more permission levels (e.g., "Billing Admin") without schema changes

---

## 📝 BUSINESS DECISIONS STILL NEEDED

1. **Migration:** Make all existing agents Admins, or oldest agent only?
2. **Agent Removal:** Auto-reassign deals to admin? Orphan deals? Block removal?
3. **Last Admin:** Prevent last admin from being demoted? Auto-promote next oldest?
4. **Deal History:** Keep deleted agent's name in deal history, or update to new agent?

---

**Document Status:** ✅ Ready for HubSpot Developer Review
**Last Updated:** 2025-01-06 (REVISED)
**Author:** Dave (Senior Solutions Architect)
