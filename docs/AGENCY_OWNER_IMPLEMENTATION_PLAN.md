# Agency Owner Feature - Complete Implementation Plan
**Senior Solutions Architect: Dave**
**Date:** 2025-01-06
**Status:** Requirements & Design Phase

---

## 📋 EXECUTIVE SUMMARY

### Problem Statement
Current system treats all agents equally - there's NO distinction between agency owners and regular agents. Agency owners cannot:
- View leads from their entire team
- Manage their agent roster (add/remove/promote)
- Reassign leads between agents
- Access agency-wide analytics

### Solution Overview
Implement a **role-based permission system** with two agent types:
1. **Agency Owner** (multiple per agency) - full administrative access
2. **Regular Agent** - can only manage their own leads

---

## 🎯 BUSINESS REQUIREMENTS

### 1. Multi-Owner Support
- ✅ An agency can have **1 or more owners** (not just one)
- ✅ Owners have equal administrative privileges
- ✅ At least one owner must exist per agency

### 2. Agency Owner Dashboard
- ✅ View **ALL leads from ALL agents** in their agency
- ✅ Filter/search leads by assigned agent
- ✅ See agency-wide performance metrics
- ✅ Compare agent performance side-by-side

### 3. Agent Management
- ✅ **Add new agents** to the agency
- ✅ **Remove agents** from the agency (what happens to their leads?)
- ✅ **Promote agents to owners** (grant admin rights)
- ✅ **Demote owners to regular agents** (revoke admin rights)

### 4. Deal Management
- ✅ **Reassign deals** from one agent to another
- ✅ Take over orphaned deals (when agent is removed)
- ✅ Bulk reassignment capabilities

### 5. Authorization & Security
- ✅ Regular agents can ONLY see their own leads
- ✅ Owners can see/edit ALL leads in their agency
- ✅ Prevent agents from accessing other agencies' data

---

## 🏗️ CURRENT ARCHITECTURE ANALYSIS

### Current HubSpot Data Model

#### Contacts Object
```javascript
{
  id: "123456789",
  properties: {
    firstname: "John",
    lastname: "Smith",
    email: "john@agency.com",
    phone: "+61412345678",
    contact_type: "Agent"  // ← NO ROLE DISTINCTION!
  }
}
```

#### Companies Object (Agency)
```javascript
{
  id: "987654321",
  properties: {
    name: "ABC Real Estate",
    email: "info@abcrealestate.com",
    address: "123 Main St, Sydney NSW",
    phone: "02 1234 5678"
  }
}
```

#### Deals Object (Lead/Property)
```javascript
{
  id: "555555555",
  properties: {
    dealname: "123 Smith St - John Doe",
    dealstage: "1923713518",
    property_address: "123 Smith St, Melbourne VIC",
    is_draft: "Yes"  // or null
  }
}
```

### Current Associations

| From | To | Association Type ID | Purpose |
|------|-----|-------------------|---------|
| Contact (Agent) | Company (Agency) | 279 | Agent works at Agency |
| Company (Agency) | Deal | 341 | Agency managing this deal |
| Contact (Agent) | Deal | 6 | **Agent assigned to deal** |
| Contact (Seller) | Deal | 1 | Primary property owner |
| Contact (Seller) | Deal | 4 | Additional co-owners |

### Current API Endpoints

**Agent Dashboard:**
```
GET /api/agent/dashboard-complete
→ Returns ONLY deals where req.user.id is associated (type 6)
```

**Agency Routes:**
```
GET /api/agencies/:agencyId/agents
→ Returns all agents in agency (already works!)

POST /api/agencies/:agencyId/agents/create
→ Creates new agent and associates to agency (already works!)
```

### Current Authentication Flow

1. User logs in via OTP (email or mobile)
2. `verifyOTPForAgent()` returns:
```javascript
{
  user: {
    id: "contact_id",
    email: "agent@example.com",
    role: "agent"  // ← NO OWNER/AGENT DISTINCTION
  }
}
```
3. JWT token generated with `userId` and `role`
4. All subsequent requests use `agentAuth` middleware

---

## 🔧 HUBSPOT CONFIGURATION REQUIREMENTS

> **⚠️ FOR HUBSPOT DEVELOPER:** These custom properties need to be created in HubSpot

### 1. New Contact Property: `agent_role`

**Purpose:** Distinguish between agency owners and regular agents

**Configuration:**
- **Object:** Contacts
- **Internal Name:** `agent_role`
- **Display Name:** "Agent Role"
- **Type:** Enumeration (Dropdown select)
- **Options:**
  - `Owner` - Agency owner with admin privileges
  - `Agent` - Regular agent (default)
- **Default Value:** `Agent`
- **Required:** No (only applies to contacts with `contact_type` = "Agent")
- **Field Help Text:** "Determines if this agent has agency owner/admin privileges"

**API Access:**
```javascript
// Reading
GET /crm/v3/objects/contacts/:contactId?properties=agent_role

// Writing
PATCH /crm/v3/objects/contacts/:contactId
{
  "properties": {
    "agent_role": "Owner"
  }
}
```

### 2. New Company Property: `primary_owner_id` (OPTIONAL)

**Purpose:** Track who created the agency (for audit purposes)

**Configuration:**
- **Object:** Companies
- **Internal Name:** `primary_owner_id`
- **Display Name:** "Primary Owner"
- **Type:** Contact Reference (single contact)
- **Required:** No
- **Field Help Text:** "Original agency creator/primary contact"

---

## 📊 TECHNICAL IMPLEMENTATION PLAN

### Phase 1: HubSpot Configuration (HUBSPOT DEVELOPER)

**Duration:** 1 day
**Assignee:** HubSpot Developer

**Tasks:**
1. ✅ Create `agent_role` enumeration property on Contacts
2. ✅ (Optional) Create `primary_owner_id` reference property on Companies
3. ✅ Test property creation in HubSpot sandbox
4. ✅ Document property internal names and IDs
5. ✅ Verify API access to new properties

**Deliverable:** Screenshot + API test showing properties are accessible

---

### Phase 2: Data Migration Script

**Duration:** 2 days
**Assignee:** Backend Developer

**Requirement:** Identify existing agency owners and set `agent_role: "Owner"`

**Migration Strategy:**
```javascript
// backend/scripts/migrate-agency-owners.js

/**
 * Migration logic:
 * 1. Get all companies (agencies)
 * 2. For each agency, get all associated contacts
 * 3. If agency has 1 agent → make them Owner
 * 4. If agency has multiple agents → ???
 *    Option A: Make all agents Owners (let them sort it out)
 *    Option B: Make first agent Owner, rest remain Agents
 *    Option C: Manual selection via admin interface
 */
```

**BUSINESS DECISION NEEDED:**
> How do we identify the initial owner for agencies with multiple agents?

**Options:**
- A) Oldest agent by `createdate` becomes owner
- B) Agent with most deals becomes owner
- C) Manual selection via CSV import
- D) Make ALL existing agents owners initially

---

### Phase 3: Backend Authentication Updates

**Duration:** 2 days
**Assignee:** Backend Developer

#### 3.1: Update OTP Service

**File:** `backend/src/services/auth/otp.service.js`

**Changes:**
```javascript
// Line 90-100: Add agent_role to contact search
contact = await contactsIntegration.searchContactByEmail(identifier);

// NEW: Fetch agent_role property
const agentRole = contact.properties.agent_role || 'Agent';  // Default to Agent

// Line 220-227: Return agent_role in user object
return {
  success: true,
  user: {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone,
    role: 'agent',
    agentRole: agentRole  // NEW: Add role distinction
  }
};
```

#### 3.2: Update JWT Token Generation

**File:** `backend/src/routes/auth.js`

**Changes:**
```javascript
// Line 89-99: Include agentRole in JWT payload
const token = jwt.sign(
  {
    userId: result.user.id,
    contactId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    agentRole: result.user.agentRole  // NEW
  },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '7d' }
);
```

#### 3.3: Update Agent Auth Middleware

**File:** `backend/src/middleware/agentAuth.js`

**Changes:**
```javascript
// Line 27-29: Fetch agent_role property
const agentResponse = await hubspotClient.get(
  `/crm/v3/objects/contacts/${agentId}?properties=contact_type,email,firstname,lastname,agent_role`
);

// Line 40-47: Add agentRole to req.user
req.user = {
  id: agentId,
  email: agentResponse.data.properties.email,
  role: 'agent',
  agentRole: agentResponse.data.properties.agent_role || 'Agent'  // NEW
};
```

#### 3.4: Create Agency Owner Auth Middleware

**NEW FILE:** `backend/src/middleware/agencyOwnerAuth.js`

```javascript
/**
 * Agency Owner Authentication Middleware
 * Verifies user is an authenticated agent WITH owner role
 * Blocks regular agents from accessing owner-only endpoints
 */

import jwt from 'jsonwebtoken';
import hubspotClient from '../integrations/hubspot/client.js';

export const agencyOwnerAuth = async (req, res, next) => {
  try {
    // Extract and verify JWT (reuse agentAuth logic)
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const agentId = decoded.userId;

    // Fetch agent details including agent_role
    const agentResponse = await hubspotClient.get(
      `/crm/v3/objects/contacts/${agentId}?properties=contact_type,agent_role,email`
    );

    const contactType = agentResponse.data.properties.contact_type || '';
    const agentRole = agentResponse.data.properties.agent_role || 'Agent';

    // Verify user is an agent
    if (!contactType.includes('Agent')) {
      return res.status(403).json({ error: 'Not an agent' });
    }

    // Verify user is an OWNER
    if (agentRole !== 'Owner') {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'This action requires agency owner privileges'
      });
    }

    // Get agent's agency
    const agencyAssocResponse = await hubspotClient.get(
      `/crm/v3/objects/contacts/${agentId}/associations/company`
    );

    const agencyId = agencyAssocResponse.data.results[0]?.id || null;

    // Attach user info to request
    req.user = {
      id: agentId,
      email: agentResponse.data.properties.email,
      role: 'agent',
      agentRole: 'Owner',
      agencyId: agencyId
    };

    next();
  } catch (error) {
    console.error('[Agency Owner Auth] Authentication failed:', error.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export default agencyOwnerAuth;
```

---

### Phase 4: Backend Agency Owner Service

**Duration:** 3 days
**Assignee:** Backend Developer

#### 4.1: Create Agency Owner Service

**NEW FILE:** `backend/src/services/domain/agency-owner.js`

**Functions to implement:**

```javascript
/**
 * Get complete agency dashboard data
 * Returns all agents, all deals, and agency metrics
 */
export const getAgencyDashboardData = async (ownerId) => {
  // 1. Verify owner has access
  // 2. Get owner's agency
  // 3. Get all agents in agency
  // 4. Batch get all deals for all agents
  // 5. Calculate agency-wide metrics
  // 6. Return comprehensive dashboard data
}

/**
 * Batch get deals for multiple agents
 * Core function for agency-wide lead visibility
 */
export const batchGetDealsForAgents = async (agentIds) => {
  // STEP 1: Batch read deal associations for all agents
  const dealAssocResponse = await hubspotClient.post(
    '/crm/v4/associations/contact/deal/batch/read',
    {
      inputs: agentIds.map(id => ({ id }))  // ← Multiple agents!
    }
  );

  // STEP 2: Extract UNIQUE deal IDs and track agent attribution
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

  // STEP 3: Batch fetch deal properties
  const dealsResponse = await hubspotClient.post(
    '/crm/v3/objects/deals/batch/read',
    {
      inputs: uniqueDealIds.map(id => ({ id })),
      properties: ['dealname', 'dealstage', 'property_address', 'is_draft', ...]
    }
  );

  // STEP 4: Enhance deals with agent attribution
  const deals = dealsResponse.data.results.map(deal => ({
    id: deal.id,
    ...deal.properties,
    assignedAgentId: dealToAgentMap[deal.id]
  }));

  return { deals, dealToAgentMap };
}

/**
 * Get performance metrics for individual agent
 */
export const getAgentPerformance = async (agentId, agencyId) => {
  // Verify agent belongs to this agency
  // Get agent's deals
  // Calculate metrics
}

/**
 * Calculate agency-wide metrics
 */
export const calculateAgencyMetrics = async (deals) => {
  // Total leads across all agents
  // Active vs closed deals
  // Conversion rates
  // Top performing agents
  // Monthly trends
}

/**
 * Promote agent to owner
 */
export const promoteAgentToOwner = async (ownerId, targetAgentId) => {
  // 1. Verify ownerId has owner privileges
  // 2. Verify both agents in same agency
  // 3. Update targetAgent's agent_role to "Owner"
}

/**
 * Demote owner to regular agent
 */
export const demoteOwnerToAgent = async (ownerId, targetOwnerId) => {
  // 1. Verify ownerId has owner privileges
  // 2. Verify at least 2 owners exist (can't remove last owner)
  // 3. Update targetOwner's agent_role to "Agent"
}

/**
 * Remove agent from agency
 */
export const removeAgentFromAgency = async (ownerId, targetAgentId) => {
  // 1. Verify ownerId has owner privileges
  // 2. Get all deals assigned to targetAgent
  // 3. BUSINESS DECISION: What happens to agent's deals?
  //    Option A: Reassign to the owner performing the removal
  //    Option B: Unassign (orphan) the deals
  //    Option C: Prompt owner to select new agent
  // 4. Remove association between agent and company
}

/**
 * Reassign deal to different agent
 */
export const reassignDeal = async (ownerId, dealId, newAgentId) => {
  // 1. Verify ownerId has owner privileges
  // 2. Verify deal belongs to this agency
  // 3. Verify newAgent belongs to this agency
  // 4. Delete old association (type 6)
  // 5. Create new association (type 6) to newAgent
}
```

**BUSINESS DECISIONS NEEDED:**
1. **When removing an agent, what happens to their deals?**
   - Auto-reassign to the owner removing them?
   - Leave unassigned (orphaned)?
   - Require manual reassignment first?

2. **Can we have zero owners?**
   - Must have at least 1 owner per agency?
   - What if last owner removes themselves?

---

### Phase 5: Backend Routes

**Duration:** 2 days
**Assignee:** Backend Developer

#### 5.1: Create Agency Owner Routes

**NEW FILE:** `backend/src/routes/agency-owner.js`

```javascript
import express from 'express';
import { agencyOwnerAuth } from '../middleware/agencyOwnerAuth.js';
import * as agencyOwnerService from '../services/domain/agency-owner.js';

const router = express.Router();

// All routes require agency owner authentication
router.use(agencyOwnerAuth);

/**
 * GET /api/agency-owner/dashboard
 * Get complete agency dashboard with all agents' leads
 */
router.get('/dashboard', async (req, res) => {
  const ownerId = req.user.id;
  const data = await agencyOwnerService.getAgencyDashboardData(ownerId);
  res.json(data);
});

/**
 * GET /api/agency-owner/agents
 * Get all agents in agency with their performance metrics
 */
router.get('/agents', async (req, res) => {
  // Implementation
});

/**
 * GET /api/agency-owner/agents/:agentId/deals
 * Get all deals for a specific agent (filtered view)
 */
router.get('/agents/:agentId/deals', async (req, res) => {
  // Implementation
});

/**
 * POST /api/agency-owner/agents/:agentId/promote
 * Promote agent to owner
 */
router.post('/agents/:agentId/promote', async (req, res) => {
  // Implementation
});

/**
 * POST /api/agency-owner/agents/:agentId/demote
 * Demote owner to regular agent
 */
router.post('/agents/:agentId/demote', async (req, res) => {
  // Implementation
});

/**
 * DELETE /api/agency-owner/agents/:agentId
 * Remove agent from agency
 * Query param: reassignTo (optional agent ID)
 */
router.delete('/agents/:agentId', async (req, res) => {
  // Implementation
});

/**
 * PATCH /api/agency-owner/deals/:dealId/reassign
 * Reassign deal to different agent
 * Body: { newAgentId: "contact_id" }
 */
router.patch('/deals/:dealId/reassign', async (req, res) => {
  // Implementation
});

export default router;
```

#### 5.2: Update Server to Include New Routes

**File:** `backend/src/server.js` or `backend/index.js`

```javascript
import agencyOwnerRoutes from './routes/agency-owner.js';

// Add route
app.use('/api/agency-owner', agencyOwnerRoutes);
```

---

### Phase 6: Frontend Implementation

**Duration:** 4 days
**Assignee:** Frontend Developer

#### 6.1: Update Authentication Context

**File:** `frontend/agent-portal/src/context/AuthContext.jsx`

**Changes:**
- Store `agentRole` from login response
- Expose `isOwner` helper: `user.agentRole === 'Owner'`

#### 6.2: Create Agency Owner Dashboard Component

**NEW FILE:** `frontend/agent-portal/src/components/dashboard/AgencyOwnerDashboard.jsx`

**Features:**
- Agency-wide metrics (total leads, conversion rate, team performance)
- Agent filter dropdown (show all or filter by specific agent)
- All leads table with "Assigned Agent" column
- Deal reassignment UI (drag-and-drop or dropdown)
- Agent management panel (add/remove/promote agents)

#### 6.3: Update Navigation

**File:** `frontend/agent-portal/src/components/dashboard/AgentSidebar.jsx`

**Changes:**
```jsx
{user.agentRole === 'Owner' && (
  <>
    <NavLink to="/dashboard/agency">Agency Dashboard</NavLink>
    <NavLink to="/dashboard/team">Manage Team</NavLink>
  </>
)}
<NavLink to="/dashboard/my-leads">My Leads</NavLink>
```

#### 6.4: Create Team Management Component

**NEW FILE:** `frontend/agent-portal/src/components/dashboard/TeamManagement.jsx`

**Features:**
- List all agents in agency
- Show agent role (Owner/Agent)
- Promote/demote buttons
- Remove agent button
- Add new agent form

---

## 🧪 TESTING PLAN

### Test Scenarios

#### Scenario 1: New Agency Creation
1. Create agency with 1 agent
2. Verify agent has `agent_role: "Owner"`
3. Login as owner
4. Verify owner dashboard is accessible

#### Scenario 2: Multi-Agent Agency
1. Create agency with owner
2. Add 3 regular agents
3. Each agent creates 5 leads
4. Login as owner
5. Verify owner sees all 15 leads (3 agents × 5 leads)
6. Verify regular agent only sees their 5 leads

#### Scenario 3: Agent Promotion
1. Owner promotes regular agent to owner
2. Verify promoted agent can now access owner dashboard
3. Verify promoted agent can see all leads

#### Scenario 4: Deal Reassignment
1. Owner reassigns deal from Agent A to Agent B
2. Verify Agent A no longer sees the deal
3. Verify Agent B now sees the deal
4. Verify HubSpot association type 6 updated correctly

#### Scenario 5: Agent Removal
1. Owner removes agent with 10 active deals
2. Verify removal behavior (based on business decision)
3. Verify removed agent cannot login to portal
4. Verify deals are handled correctly

#### Scenario 6: Last Owner Protection
1. Agency with 2 owners
2. Owner A demotes Owner B to agent (should succeed)
3. Owner B tries to demote Owner A (should fail - can't remove last owner)

---

## 📊 API CALL PERFORMANCE ANALYSIS

### Current System (Per Agent)
```
GET /api/agent/dashboard-complete
→ 1 API call: Get agent's deals
→ N API calls: Get contacts for each deal (N = number of deals)

For 10 deals: ~11 API calls
```

### New System (Agency Owner)
```
GET /api/agency-owner/dashboard
→ 1 API call: Get all agents in agency (up to 100)
→ 1 API call: Batch get deal associations (up to 100 agents)
→ X API calls: Batch get deal properties (100 deals per call)
→ Y API calls: Batch get contacts for deals (100 contacts per call)

For 20 agents with 200 total deals:
→ 1 + 1 + 2 + 2 = 6 API calls (vs 220+ if done serially!)
```

**Performance Improvement:** ~97% reduction in API calls!

---

## 🚨 EDGE CASES & BUSINESS DECISIONS

### 1. What happens when removing an agent?

**Options:**
- **A) Auto-reassign to owner** - All deals automatically assigned to the owner performing removal
- **B) Orphan deals** - Deals remain unassigned (association type 6 removed)
- **C) Mandatory reassignment** - Owner must choose new agent before removal
- **D) Distribute evenly** - Deals split among remaining agents

**RECOMMENDATION:** Option C (mandatory reassignment) - safest for data integrity

### 2. Can an agency have zero owners?

**Options:**
- **A) Allow zero owners** - Agency continues to exist but no admin access
- **B) Require at least one owner** - Block last owner from being demoted/removed
- **C) Auto-promote oldest agent** - System automatically promotes next agent

**RECOMMENDATION:** Option B (require at least one owner) - prevents locked agency

### 3. What if owner removes themselves?

**Options:**
- **A) Allow if other owners exist** - Transfer deals to remaining owner
- **B) Block self-removal** - Owner cannot remove themselves
- **C) Require delegation** - Must promote another agent first

**RECOMMENDATION:** Option A (allow if other owners exist) - flexibility

### 4. Can regular agents see who the owners are?

**UI Decision:**
- Show "Owner" badge next to owner names in agent list?
- Or keep role information private?

### 5. Pagination for large agencies

**For agencies with 100+ agents or 1000+ deals:**
- Implement pagination in frontend
- Add query params: `?page=1&limit=50`
- Cache results for 5 minutes

---

## 📅 IMPLEMENTATION TIMELINE

| Phase | Duration | Dependencies | Assignee |
|-------|----------|--------------|----------|
| 1. HubSpot Config | 1 day | None | HubSpot Dev |
| 2. Data Migration | 2 days | Phase 1 | Backend Dev |
| 3. Auth Updates | 2 days | Phase 1 | Backend Dev |
| 4. Owner Service | 3 days | Phase 3 | Backend Dev |
| 5. Backend Routes | 2 days | Phase 4 | Backend Dev |
| 6. Frontend UI | 4 days | Phase 5 | Frontend Dev |
| 7. Testing | 3 days | Phase 6 | QA Team |

**Total Duration:** ~17 days (~3.5 weeks)

---

## 🔐 SECURITY CONSIDERATIONS

### Authorization Checks
- ✅ All owner endpoints protected by `agencyOwnerAuth` middleware
- ✅ Verify agent belongs to same agency before any action
- ✅ Prevent cross-agency data access
- ✅ JWT tokens include `agentRole` claim

### Data Validation
- ✅ Validate agent IDs exist before reassignment
- ✅ Validate deal belongs to agency before reassignment
- ✅ Prevent circular permission loops

### Audit Trail
- ✅ Log all owner actions (promote/demote/reassign) to console
- ✅ Consider adding HubSpot deal notes for reassignments

---

## 📞 QUESTIONS FOR HUBSPOT DEVELOPER

### Critical Questions:
1. **Can you create the `agent_role` enumeration property?**
   - Object: Contacts
   - Type: Enumeration
   - Values: "Owner", "Agent"

2. **Do we need workflows for automatic notifications?**
   - Example: Email agent when promoted to owner
   - Example: Notify team when deal is reassigned

3. **Is there a HubSpot API rate limit concern?**
   - Batch reads (100 per call) should be safe
   - Any special considerations for our HubSpot tier?

4. **Can we use HubSpot Activity Timeline?**
   - To log owner actions (promote/demote/reassign)
   - To create audit trail visible in HubSpot UI

### Nice-to-Have:
1. Custom report for "Deals by Agent" in HubSpot
2. Workflow to prevent last owner from being demoted
3. Email template for agent promotion notification

---

## 📝 NEXT STEPS

### Immediate Actions:
1. **Business Analyst:** Review this document and answer business decisions
2. **Business Analyst:** Present to HubSpot developer for property creation
3. **Backend Lead:** Review technical approach and API design
4. **Frontend Lead:** Review UI mockups and component structure

### Business Decisions Needed:
1. ❓ When removing agent, what happens to their deals? (Section: Edge Cases #1)
2. ❓ How to identify initial owner during migration? (Section: Phase 2)
3. ❓ Can regular agents see who the owners are? (Section: Edge Cases #4)

---

## 📚 APPENDIX

### A. HubSpot API References

**Batch Read Associations:**
```
POST /crm/v4/associations/{fromObjectType}/{toObjectType}/batch/read
Documentation: https://developers.hubspot.com/docs/api/crm/associations
```

**Batch Read Objects:**
```
POST /crm/v3/objects/{objectType}/batch/read
Documentation: https://developers.hubspot.com/docs/api/crm/understanding-the-crm
```

**Update Object Properties:**
```
PATCH /crm/v3/objects/{objectType}/{objectId}
Documentation: https://developers.hubspot.com/docs/api/crm/properties
```

### B. Related Documentation
- [Database Overview](./Database%20Overview.md)
- [Backend API Reference](./BACKEND_API_REFERENCE.md)
- [Architecture Guide](./ARCHITECTURE.md)

---

**Document Status:** ✅ Ready for Review
**Last Updated:** 2025-01-06
**Author:** Dave (Senior Solutions Architect)
