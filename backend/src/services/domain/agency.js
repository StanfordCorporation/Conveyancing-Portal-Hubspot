/**
 * Agency Domain Service
 * Business logic for agencies (HubSpot Companies)
 * Hides HubSpot implementation details from routes
 */

import * as companiesIntegration from '../../integrations/hubspot/companies.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import hubspotClient from '../../integrations/hubspot/client.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Search for agency by email
 */
export const findByEmail = async (email) => {
  return companiesIntegration.searchCompanyByEmail(email);
};

/**
 * Search agencies by name and suburb with scoring
 */
export const search = async (businessName, suburb) => {
  return companiesIntegration.searchCompaniesByTokens(businessName, suburb);
};

/**
 * Create agency with optional agent
 * - Creates company (HubSpot concept)
 * - Searches for or creates agent contact
 * - Associates agent to company inline
 */
export const createWithAgent = async (name, email, phone, agentData) => {
  // Check duplicate email
  const existing = await findByEmail(email);
  if (existing) {
    throw {
      status: 409,
      error: 'Duplicate Agency Email',
      message: 'An agency with this email already exists',
      duplicateField: 'email',
      existingCompany: {
        id: existing.id,
        name: existing.properties.name,
        email: existing.properties.email
      }
    };
  }

  // Prepare agent association
  let contactIdToAssociate = null;
  let agentInfo = null;

  if (agentData?.email) {
    // Search for existing agent
    const existingAgent = await contactsIntegration.searchContactByEmailOrPhone(
      agentData.email,
      agentData.phone
    );

    if (existingAgent) {
      contactIdToAssociate = existingAgent.id;
      agentInfo = {
        id: existingAgent.id,
        firstname: existingAgent.properties.firstname,
        lastname: existingAgent.properties.lastname,
        email: existingAgent.properties.email,
        phone: existingAgent.properties.phone
      };
    } else {
      // Create new agent
      const newAgent = await contactsIntegration.createContact({
        email: agentData.email,
        firstname: agentData.firstname || '',
        lastname: agentData.lastname || '',
        phone: agentData.phone || '',
        contact_type: 'Agent'
      });

      contactIdToAssociate = newAgent.id;
      agentInfo = {
        id: newAgent.id,
        firstname: newAgent.properties.firstname,
        lastname: newAgent.properties.lastname,
        email: newAgent.properties.email,
        phone: newAgent.properties.phone
      };
    }
  }

  // Create company with inline association (Company to Contact - type 280)
  const company = await companiesIntegration.createCompany({
    name,
    address: agentData?.suburb || '',
    email,
    phone: phone || '',
    associateToContactId: contactIdToAssociate
  });

  // If an agent was created/associated, also create Contact to Company association with Admin privileges
  // Since this is the first agent of the agency, they should be Admin
  if (contactIdToAssociate) {
    console.log(`[Agency Service] Creating Admin association (type 7) for first agent ${contactIdToAssociate}`);

    try {
      await hubspotClient.put(
        `/crm/v4/objects/contacts/${contactIdToAssociate}/associations/companies/${company.id}`,
        [
          {
            associationCategory: HUBSPOT.ASSOCIATION_CATEGORIES.USER_DEFINED,
            associationTypeId: HUBSPOT.PERMISSION_TYPES.ADMIN // Type 7
          }
        ]
      );
      console.log(`[Agency Service] ✅ Admin association created successfully`);

      // Wait for HubSpot's association index to update (2 second delay)
      console.log(`[Agency Service] ⏱️  Waiting 2 seconds for HubSpot index to update...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`[Agency Service] ✅ Index update wait complete`);
    } catch (error) {
      console.error(`[Agency Service] ⚠️ Failed to create Admin association:`, error.message);
      // Don't fail the whole operation if association fails
    }
  }

  return {
    id: company.id,
    name: company.properties.name,
    address: company.properties.address,
    email: company.properties.email,
    phone: company.properties.phone,
    agent: agentInfo
  };
};

/**
 * Get all agents for an agency
 * Uses Associations API for reliability
 */
export const getAgents = async (agencyId) => {
  console.log(`[Agency Service] Fetching agents for agency ${agencyId}`);

  try {
    // Get all contacts associated with this company using Associations API
    const associationsResponse = await hubspotClient.get(
      `/crm/v3/objects/companies/${agencyId}/associations/contacts`
    );

    const associatedContacts = associationsResponse.data.results || [];
    console.log(`[Agency Service] Found ${associatedContacts.length} associated contacts`);

    if (associatedContacts.length === 0) {
      return [];
    }

    // Batch fetch all contact details
    const contactIds = associatedContacts.map(c => c.id);
    const contactsResponse = await hubspotClient.post(
      '/crm/v3/objects/contacts/batch/read',
      {
        inputs: contactIds.map(id => ({ id })),
        properties: ['firstname', 'lastname', 'email', 'phone', 'contact_type']
      }
    );

    const contacts = contactsResponse.data.results || [];

    // Filter for agents only
    const agents = contacts
      .filter(c => c.properties.contact_type === 'Agent')
      .map(contact => ({
        id: contact.id,
        firstname: contact.properties.firstname,
        lastname: contact.properties.lastname,
        email: contact.properties.email,
        phone: contact.properties.phone
      }));

    console.log(`[Agency Service] Returning ${agents.length} agents`);
    return agents;
  } catch (error) {
    console.error(`[Agency Service] Error fetching agents:`, error.message);
    throw error;
  }
};

/**
 * Get agency by ID
 */
export const getById = async (agencyId) => {
  return companiesIntegration.getCompany(agencyId);
};

export default {
  findByEmail,
  search,
  createWithAgent,
  getAgents,
  getById
};
