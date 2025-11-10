/**
 * Agency Owner Domain Service
 * Business logic for agency owner/admin features
 * - Permission management (promote/demote agents)
 * - Agency-wide dashboard
 * - Deal reassignment
 */

import hubspotClient from '../../integrations/hubspot/client.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Get all agents in agency WITH permission levels
 * Uses batch query for performance
 * @param {string} agencyId - HubSpot company ID
 * @returns {Promise<Array>} Array of agents with permission levels
 */
export const getAgentsWithPermissions = async (agencyId) => {
  console.log(`[Agency Owner] Getting agents with permissions for agency ${agencyId}`);

  // Step 1: Get all contacts associated with company
  const contacts = await contactsIntegration.searchContactsByCompany(agencyId);

  // Step 2: Filter for agents only
  const agents = contacts.filter(c => {
    const contactTypes = c.properties.contact_type || '';
    return contactTypes.includes('Agent');
  });

  const agentIds = agents.map(a => a.id);

  if (agentIds.length === 0) {
    console.log('[Agency Owner] No agents found for this agency');
    return [];
  }

  console.log(`[Agency Owner] Found ${agentIds.length} agents, fetching permission levels...`);

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

    // Note: toObjectId is a number, but agencyId might be a string
    const companyAssoc = result.to?.find(t => String(t.toObjectId) === String(agencyId));
    const types = companyAssoc?.associationTypes || [];

    // Determine permission level (priority: admin > view_all > standard)
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

  console.log(`[Agency Owner] Retrieved ${agentsWithPermissions.length} agents with permissions`);
  return agentsWithPermissions;
};

/**
 * Batch get deals for multiple agents
 * Returns deals with agent attribution
 * @param {Array<string>} agentIds - Array of contact IDs
 * @returns {Promise<Object>} Object with deals array and dealToAgentMap
 */
export const batchGetDealsForAgents = async (agentIds) => {
  console.log(`[Agency Owner] Batch fetching deals for ${agentIds.length} agents`);

  if (agentIds.length === 0) {
    return { deals: [], dealToAgentMap: {} };
  }

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
      // Only include deals with agent association (type 6)
      const hasAgentAssoc = dealAssoc.associationTypes?.some(
        t => t.typeId === HUBSPOT.ASSOCIATION_TYPES.AGENT_TO_DEAL
      );

      if (hasAgentAssoc) {
        allDealIds.add(dealAssoc.toObjectId);
        dealToAgentMap[dealAssoc.toObjectId] = agentId;
      }
    });
  });

  const uniqueDealIds = Array.from(allDealIds);

  if (uniqueDealIds.length === 0) {
    console.log('[Agency Owner] No deals found for any agent');
    return { deals: [], dealToAgentMap: {} };
  }

  console.log(`[Agency Owner] Found ${uniqueDealIds.length} unique deals`);

  // Step 3: Batch fetch deal properties
  const dealProperties = [
    'dealname',
    'dealstage',
    'property_address',
    'number_of_owners',
    'is_draft',
    'createdate',
    'hs_lastmodifieddate',
    'closedate',
    'amount',
    'pipeline'
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

  console.log(`[Agency Owner] Retrieved ${deals.length} deals with properties`);

  return { deals, dealToAgentMap };
};

/**
 * Calculate agency metrics from deals and agents
 * @param {Array} deals - Array of deals
 * @param {Array} agents - Array of agents
 * @returns {Object} Metrics object
 */
const calculateAgencyMetrics = (deals, agents) => {
  const totalDeals = deals.length;
  const activeLeads = deals.filter(d =>
    d.dealstage &&
    d.dealstage !== HUBSPOT.DEAL_STAGES.CLOSED_WON &&
    d.dealstage !== HUBSPOT.DEAL_STAGES.CLOSED_LOST &&
    d.is_draft !== 'true'
  ).length;

  const closedWon = deals.filter(d => d.dealstage === HUBSPOT.DEAL_STAGES.CLOSED_WON).length;
  const conversionRate = totalDeals > 0 ? Math.round((closedWon / totalDeals) * 100) : 0;

  const totalAgents = agents.length;
  const adminAgents = agents.filter(a => a.permissionLevel === 'admin').length;

  return {
    totalAgents,
    adminAgents,
    totalDeals,
    activeLeads,
    closedWon,
    conversionRate
  };
};

/**
 * Get complete agency dashboard data
 * Returns agents, deals, and metrics
 * @param {string} adminId - ID of admin requesting data
 * @param {string} agencyId - Agency company ID
 * @returns {Promise<Object>} Dashboard data
 */
export const getAgencyDashboardData = async (adminId, agencyId) => {
  console.log(`[Agency Owner] Loading dashboard for agency ${agencyId} (requested by ${adminId})`);

  // Step 1: Get all agents with permissions (uses batch query internally)
  const agents = await getAgentsWithPermissions(agencyId);

  // Step 2: Get all deals for all agents (uses batch query)
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

  console.log(`[Agency Owner] Dashboard loaded: ${agents.length} agents, ${deals.length} deals`);

  return {
    agents,
    deals: dealsWithAgents,
    metrics
  };
};

/**
 * Promote agent to Admin (change association type → 7)
 * @param {string} adminId - ID of admin performing action
 * @param {string} agencyId - Agency ID
 * @param {string} targetAgentId - Agent to promote
 * @returns {Promise<Object>} Result object
 */
export const promoteAgentToAdmin = async (adminId, agencyId, targetAgentId) => {
  console.log(`[Agency Owner] Admin ${adminId} promoting agent ${targetAgentId} to Admin`);

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

  // Note: toObjectId is a number, but agencyId might be a string
  const companyAssoc = currentAssociationsResponse.data.results.find(
    r => String(r.toObjectId) === String(agencyId)
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
    console.log(`[Agency Owner] Deleted old association type ${oldType.typeId} (${oldType.category})`);
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

/**
 * Demote agent from Admin to View All or Standard
 * @param {string} adminId - ID of admin performing action
 * @param {string} agencyId - Agency ID
 * @param {string} targetAgentId - Agent to demote
 * @param {string} newPermissionLevel - 'view_all' or 'standard'
 * @returns {Promise<Object>} Result object
 */
export const demoteAgent = async (adminId, agencyId, targetAgentId, newPermissionLevel) => {
  console.log(`[Agency Owner] Admin ${adminId} demoting agent ${targetAgentId} to ${newPermissionLevel}`);

  // Step 1: Validate newPermissionLevel
  if (!['view_all', 'standard'].includes(newPermissionLevel)) {
    throw new Error('Invalid permission level. Must be "view_all" or "standard"');
  }

  // Step 2: Check if this is the last admin
  const agents = await getAgentsWithPermissions(agencyId);
  const adminCount = agents.filter(a => a.permissionLevel === 'admin').length;

  if (adminCount <= 1) {
    throw new Error('Cannot demote last admin - agency must have at least one admin');
  }

  // Step 3: Get current association types
  const currentAssociationsResponse = await hubspotClient.get(
    `/crm/v4/objects/contacts/${targetAgentId}/associations/companies`
  );

  // Note: toObjectId is a number, but agencyId might be a string
  const companyAssoc = currentAssociationsResponse.data.results.find(
    r => String(r.toObjectId) === String(agencyId)
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
  const oldType = currentTypes.find(
    t => t.typeId === HUBSPOT.PERMISSION_TYPES.ADMIN ||
         t.typeId === HUBSPOT.PERMISSION_TYPES.VIEW_ALL ||
         t.typeId === HUBSPOT.PERMISSION_TYPES.STANDARD
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

/**
 * Reassign deal to different agent
 * Changes association type 6 from old agent to new agent
 * @param {string} adminId - ID of admin performing action
 * @param {string} agencyId - Agency ID
 * @param {string} dealId - Deal ID
 * @param {string} newAgentId - New agent ID
 * @returns {Promise<Object>} Result object
 */
export const reassignDeal = async (adminId, agencyId, dealId, newAgentId) => {
  console.log(`[Agency Owner] Admin ${adminId} reassigning deal ${dealId} to agent ${newAgentId}`);

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
    assoc => assoc.associationTypes?.some(t => t.typeId === HUBSPOT.ASSOCIATION_TYPES.AGENT_TO_DEAL)
  );

  // Step 3: Delete old agent association (type 6)
  if (currentAgentAssoc) {
    await hubspotClient.delete(
      `/crm/v4/objects/deals/${dealId}/associations/contacts/${currentAgentAssoc.toObjectId}`,
      {
        data: [{
          associationCategory: HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED,
          associationTypeId: HUBSPOT.ASSOCIATION_TYPES.AGENT_TO_DEAL
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
      associationTypeId: HUBSPOT.ASSOCIATION_TYPES.AGENT_TO_DEAL
    }]
  );

  console.log(`[Agency Owner] ✅ Deal ${dealId} reassigned to agent ${newAgentId}`);

  return { success: true, previousAgentId: currentAgentAssoc?.toObjectId || null };
};

export default {
  getAgentsWithPermissions,
  batchGetDealsForAgents,
  getAgencyDashboardData,
  promoteAgentToAdmin,
  demoteAgent,
  reassignDeal
};
