/**
 * Agent Domain Service
 * Business logic for agents (HubSpot Contacts with type 'Agent')
 * Hides HubSpot implementation details from routes
 */

import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import hubspotClient from '../../integrations/hubspot/client.js';
import { HUBSPOT } from '../../config/constants.js';
import { format, subMonths, startOfMonth } from 'date-fns';

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
 */
export const createForAgency = async (agencyId, firstname, lastname, email, phone) => {
  const contact = await contactsIntegration.createContact({
    email,
    firstname,
    lastname,
    phone: phone || '',
    contact_type: HUBSPOT.CONTACT_TYPES.AGENT,
    associateToCompanyId: agencyId
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
    
    // Define all properties to fetch
    const dealProperties = [
      'dealname', 'dealstage', 'property_address', 'number_of_owners',
      'body_corporate', 'registered_encumbrances', 'tenancy_agreement',
      'rental_agreement_post_settlement', 'resume_notice', 'swimming_pool',
      'owner_builder', 'createdate', 'hs_lastmodifieddate', 'closedate',
      'amount', 'pipeline', 'deal_currency_code',
      'is_draft', // Draft status indicator
      'agent_title_search', 'agent_title_search_file', // Title search fields
      // Questionnaire fields
      'body_corporate_details', 'non_statutory_encumbrances',
      'formal_tenancy_agreement', 'tenancy_end_date', 'weekly_rent',
      'owner_name', 'contaminated_land', 'tree_disputes',
      'environmental_management', 'unauthorised_works'
    ];
    
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
              // Skip the agent
              if (assoc.toObjectId === agentId) continue;

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
    
    console.log(`[Agent Service] Successfully fetched ${dealsWithSellers.length} deals with sellers`);
    return dealsWithSellers;
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
