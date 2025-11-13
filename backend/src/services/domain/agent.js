/**
 * Agent Domain Service
 * Business logic for agents (HubSpot Contacts with type 'Agent')
 * Hides HubSpot implementation details from routes
 */

import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import hubspotClient from '../../integrations/hubspot/client.js';
import { HUBSPOT } from '../../config/constants.js';
import { format, subMonths, startOfMonth } from 'date-fns';
import { getAllHubSpotProperties } from '../../utils/questionnaireHelper.js';

/**
 * Find agent by email
 */
export const findByEmail = async (email) => {
  const contact = await contactsIntegration.searchContactByEmail(email);

  if (!contact) return null;

  // Verify it's an agent
  if (contact.properties.contact_type !== HUBSPOT.CONTACT_TYPES.AGENT) {
    throw new Error('Contact exists but is not an agent');
  }

  return {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone
  };
};

/**
 * Find agent by email or phone
 * Returns { agent, duplicateField } where duplicateField is 'email' or 'phone'
 */
export const findByEmailOrPhone = async (email, phone) => {
  const contact = await contactsIntegration.searchContactByEmailOrPhone(email, phone);

  if (!contact) return null;

  // Determine which field matched (email or phone)
  let duplicateField = null;
  if (email && contact.properties.email?.toLowerCase() === email.toLowerCase()) {
    duplicateField = 'email';
  } else if (phone && contact.properties.phone) {
    // Normalize phone for comparison (remove spaces and special chars)
    const normalizedSearchPhone = phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
    const normalizedContactPhone = contact.properties.phone.replace(/\s/g, '').replace(/[^\d+]/g, '');
    if (normalizedSearchPhone === normalizedContactPhone) {
      duplicateField = 'phone';
    }
  }

  return {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone,
    duplicateField
  };
};

/**
 * Create new agent (contact with type 'Agent')
 */
export const create = async (firstname, lastname, email, phone) => {
  const contact = await contactsIntegration.createContact({
    email,
    firstname,
    lastname,
    phone: phone || '',
    contact_type: HUBSPOT.CONTACT_TYPES.AGENT
  });

  return {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone
  };
};

/**
 * Create agent and associate to agency
 * First agent of an agency is automatically made Admin
 */
export const createForAgency = async (agencyId, firstname, lastname, email, phone) => {
  console.log(`[Agent Service] Creating agent for agency ${agencyId}`);

  // Check if this is the first agent for this agency
  // Use Associations API instead of property-based search for reliability
  let isFirstAgent = false;
  try {
    // Get all contacts associated with this company
    const associationsResponse = await hubspotClient.get(
      `/crm/v3/objects/companies/${agencyId}/associations/contacts`
    );

    const associatedContacts = associationsResponse.data.results || [];
    console.log(`[Agent Service] Found ${associatedContacts.length} associated contacts`);

    // If no contacts at all, this is definitely the first agent
    if (associatedContacts.length === 0) {
      isFirstAgent = true;
      console.log(`[Agent Service] No associated contacts - this is the first agent`);
    } else {
      // Batch fetch all contacts to check if any are agents
      const contactIds = associatedContacts.map(c => c.id);
      console.log(`[Agent Service] Checking ${contactIds.length} contacts to find existing agents...`);

      const contactsResponse = await hubspotClient.post(
        '/crm/v3/objects/contacts/batch/read',
        {
          inputs: contactIds.map(id => ({ id })),
          properties: ['contact_type']
        }
      );

      const contacts = contactsResponse.data.results || [];
      const existingAgents = contacts.filter(
        c => c.properties.contact_type === HUBSPOT.CONTACT_TYPES.AGENT
      );

      isFirstAgent = existingAgents.length === 0;
      console.log(`[Agent Service] Found ${existingAgents.length} existing agents, isFirstAgent: ${isFirstAgent}`);
    }
  } catch (error) {
    console.error(`[Agent Service] Error checking existing agents:`, error.message);
    // If we can't check, assume it's not the first agent (safer default)
    isFirstAgent = false;
  }

  // Determine association type based on whether this is the first agent
  let associationTypeId = HUBSPOT.PERMISSION_TYPES.STANDARD; // Default: 279
  let associationCategory = HUBSPOT.ASSOCIATION_CATEGORIES.HUBSPOT_DEFINED;

  if (isFirstAgent) {
    associationTypeId = HUBSPOT.PERMISSION_TYPES.ADMIN; // 7
    associationCategory = HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED;
    console.log(`[Agent Service] ⭐ First agent - creating with Admin privileges (type ${associationTypeId})`);
  } else {
    console.log(`[Agent Service] Creating with Standard privileges (type ${associationTypeId})`);
  }

  const contact = await contactsIntegration.createContact({
    email,
    firstname,
    lastname,
    phone: phone || '',
    contact_type: HUBSPOT.CONTACT_TYPES.AGENT,
    associateToCompanyId: agencyId,
    associationTypeId,
    associationCategory
  });

  console.log(`[Agent Service] ✅ Agent created successfully with ${isFirstAgent ? 'Admin' : 'Standard'} privileges`);

  // Wait for HubSpot's association index to update (2 second delay)
  // This ensures subsequent agent creations can see this agent in associations
  console.log(`[Agent Service] ⏱️  Waiting 2 seconds for HubSpot index to update...`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`[Agent Service] ✅ Index update wait complete`);

  return {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone,
    permissionLevel: isFirstAgent ? 'admin' : 'standard'
  };
};

/**
 * Get agent by ID
 */
export const getById = async (agentId) => {
  const contact = await contactsIntegration.getContact(agentId);

  if (!contact) return null;

  return {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone
  };
};

/**
 * Update agent
 */
export const update = async (agentId, updates) => {
  const contact = await contactsIntegration.updateContact(agentId, updates);

  return {
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone
  };
};

/**
 * Get agent with associated agency (for dashboard)
 */
export const getAgentWithAgency = async (agentId) => {
  console.log(`[Agent Service] Fetching agent ${agentId} with agency`);
  
  // Get agent contact
  const agentResponse = await hubspotClient.get(
    `/crm/v3/objects/contacts/${agentId}?properties=firstname,lastname,email,phone,contact_type`
  );
  const agent = agentResponse.data.properties;
  
  // Get agent's agency associations
  let agency = null;
  try {
    const agencyAssocResponse = await hubspotClient.get(
      `/crm/v3/objects/contacts/${agentId}/associations/company`
    );
    
    if (agencyAssocResponse.data.results.length > 0) {
      const agencyId = agencyAssocResponse.data.results[0].id;
      console.log(`[Agent Service] Found agency ${agencyId} for agent ${agentId}`);
      
      const agencyResponse = await hubspotClient.get(
        `/crm/v3/objects/companies/${agencyId}?properties=name,domain,phone,address,city,state,zip`
      );
      
      agency = {
        id: agencyId,
        ...agencyResponse.data.properties
      };
    } else {
      console.log(`[Agent Service] No agency found for agent ${agentId}`);
    }
  } catch (error) {
    console.error(`[Agent Service] Error fetching agency:`, error.message);
    // Continue without agency
  }
  
  return {
    id: agentId,
    ...agent,
    agency
  };
};

/**
 * Get all deals associated with agent
 */
export const getAgentDeals = async (agentId) => {
  console.log(`[Agent Service] Fetching deals for agent ${agentId}`);
  
  try {
    // Get all deals associated with agent (association type 6)
    const dealAssocResponse = await hubspotClient.post(
      '/crm/v4/associations/contact/deal/batch/read',
      {
        inputs: [{ id: agentId }]
      }
    );
    
    const dealIds = dealAssocResponse.data.results[0]?.to?.map(d => d.toObjectId) || [];
    
    if (dealIds.length === 0) {
      console.log(`[Agent Service] No deals found for agent ${agentId}`);
      return [];
    }
    
    console.log(`[Agent Service] Found ${dealIds.length} deals for agent ${agentId}`);
    
    // Define all properties to fetch (dynamically includes ALL questionnaire fields)
    const questionnaireProperties = getAllHubSpotProperties();
    const dealProperties = [
      'dealname', 'dealstage', 'property_address', 'number_of_owners',
      'createdate', 'hs_lastmodifieddate', 'closedate',
      'amount', 'pipeline', 'deal_currency_code',
      'is_draft', // Draft status indicator
      'agent_title_search', 'agent_title_search_file', // Title search fields
      ...questionnaireProperties // Dynamically include ALL questionnaire fields from schema
    ];
    
    console.log(`[Agent Service] Fetching ${dealProperties.length} properties per deal (base: 11, questionnaire: ${questionnaireProperties.length})`);
    
    // Batch fetch all deals
    const dealsResponse = await hubspotClient.post(
      '/crm/v3/objects/deals/batch/read',
      {
        inputs: dealIds.map(id => ({ id })),
        properties: dealProperties
      }
    );
    
    // For each deal, get associated contacts (sellers) using v4 API to get type IDs
    const dealsWithSellers = await Promise.all(
      dealsResponse.data.results.map(async (deal) => {
        try {
          // Use v4 associations API to get association type IDs
          const sellersResponse = await hubspotClient.post(
            '/crm/v4/associations/deal/contact/batch/read',
            {
              inputs: [{ id: deal.id }]
            }
          );

          const sellerAssocs = sellersResponse.data.results[0]?.to || [];

          // Find primary seller (association type ID 1)
          // Association Type ID 1 = Primary Seller to Deal (USER_DEFINED)
          const primarySellerAssoc = sellerAssocs.find(assoc =>
            assoc.associationTypes?.some(type =>
              type.typeId === 1 || type.label === 'Primary Seller'
            )
          );

          // Get primary seller details
          let primarySeller = null;
          if (primarySellerAssoc) {
            try {
              const primarySellerData = await hubspotClient.get(
                `/crm/v3/objects/contacts/${primarySellerAssoc.toObjectId}?properties=firstname,lastname,email,phone,contact_type`
              );

              // Double-check it's not an agent
              if (primarySellerData.data.properties.contact_type !== 'Agent') {
                primarySeller = {
                  id: primarySellerAssoc.toObjectId,
                  ...primarySellerData.data.properties
                };
              } else {
                console.warn(`[Agent Service] Association type 1 points to an Agent contact, skipping`);
              }
            } catch (error) {
              console.error(`[Agent Service] Error fetching primary seller ${primarySellerAssoc.toObjectId}:`, error.message);
            }
          }

          // If no primary seller found by type ID, fall back to finding first non-agent contact
          if (!primarySeller && sellerAssocs.length > 0) {
            console.log(`[Agent Service] No primary seller found by type ID for deal ${deal.id}, using fallback logic`);

            for (const assoc of sellerAssocs) {
              // Skip the agent (note: toObjectId is a number, agentId might be a string)
              if (String(assoc.toObjectId) === String(agentId)) continue;

              try {
                const contactData = await hubspotClient.get(
                  `/crm/v3/objects/contacts/${assoc.toObjectId}?properties=firstname,lastname,email,phone,contact_type`
                );

                // Use first non-agent contact as primary seller
                if (contactData.data.properties.contact_type !== 'Agent') {
                  primarySeller = {
                    id: assoc.toObjectId,
                    ...contactData.data.properties
                  };
                  break;
                }
              } catch (error) {
                console.error(`[Agent Service] Error fetching contact ${assoc.toObjectId}:`, error.message);
              }
            }
          }

          // Get additional sellers (filter out primary seller and agent)
          const additionalSellerIds = sellerAssocs
            .filter(assoc => {
              const contactId = assoc.toObjectId;
              return contactId !== primarySeller?.id && contactId !== agentId;
            })
            .map(assoc => assoc.toObjectId);

          return {
            id: deal.id,
            ...deal.properties,
            primarySeller,
            additionalSellers: additionalSellerIds
          };
        } catch (error) {
          console.error(`[Agent Service] Error fetching sellers for deal ${deal.id}:`, error.message);
          return {
            id: deal.id,
            ...deal.properties,
            primarySeller: null,
            additionalSellers: []
          };
        }
      })
    );

    // Filter to only show Form 2s pipeline deals
    const form2sDeals = dealsWithSellers.filter(deal => {
      const pipeline = deal.pipeline;
      const isForm2sPipeline = pipeline === HUBSPOT.PIPELINES.FORM_2S;

      if (!isForm2sPipeline) {
        console.log(`[Agent Service] 🚫 Filtering out non-Form 2s deal: ${deal.id} (pipeline: ${pipeline})`);
      }

      return isForm2sPipeline;
    });

    console.log(`[Agent Service] Successfully fetched ${form2sDeals.length} Form 2s deals (filtered out ${dealsWithSellers.length - form2sDeals.length} deals from other pipelines)`);
    return form2sDeals;
  } catch (error) {
    console.error(`[Agent Service] Error fetching deals:`, error.message);
    throw error;
  }
};

/**
 * Calculate performance metrics from deals data
 */
export const calculateMetrics = (deals) => {
  console.log(`[Agent Service] Calculating metrics for ${deals.length} deals`);
  
  const now = new Date();
  const currentMonth = startOfMonth(now);
  
  // Total leads
  const totalLeads = deals.length;
  
  // Active leads (not closed won or closed lost)
  const activeLeads = deals.filter(d => 
    !['closedwon', 'closedlost'].includes(d.dealstage?.toLowerCase())
  ).length;
  
  // Completed this month (closed won in current month)
  const completedThisMonth = deals.filter(d => {
    if (!d.dealstage || d.dealstage.toLowerCase() !== 'closedwon') return false;
    if (!d.hs_lastmodifieddate) return false;
    
    const closedDate = new Date(d.hs_lastmodifieddate);
    return closedDate >= currentMonth;
  }).length;
  
  // Conversion rate (closed won / total)
  const closedWonCount = deals.filter(d => 
    d.dealstage?.toLowerCase() === 'closedwon'
  ).length;
  const conversionRate = totalLeads > 0 ? (closedWonCount / totalLeads * 100).toFixed(1) : 0;
  
  // Monthly breakdown for last 6 months
  const monthlyBreakdown = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    
    const count = deals.filter(d => {
      if (!d.createdate) return false;
      const createdDate = new Date(d.createdate);
      return createdDate >= monthStart && createdDate < monthEnd;
    }).length;
    
    monthlyBreakdown.push({
      month: format(monthDate, 'yyyy-MM'),
      count
    });
  }
  
  const metrics = {
    totalLeads,
    activeLeads,
    completedThisMonth,
    conversionRate: parseFloat(conversionRate),
    monthlyBreakdown
  };
  
  console.log(`[Agent Service] Metrics calculated:`, metrics);
  return metrics;
};

export default {
  findByEmail,
  findByEmailOrPhone,
  create,
  createForAgency,
  getById,
  update,
  getAgentWithAgency,
  getAgentDeals,
  calculateMetrics
};
