/**
 * Agency Domain Service
 * Business logic for agencies (HubSpot Companies)
 * Hides HubSpot implementation details from routes
 */

import * as companiesIntegration from '../../integrations/hubspot/companies.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
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

  // Create company with inline association
  const company = await companiesIntegration.createCompany({
    name,
    address: agentData?.suburb || '',
    email,
    phone: phone || '',
    associateToContactId: contactIdToAssociate
  });

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
 */
export const getAgents = async (agencyId) => {
  const contacts = await contactsIntegration.searchContactsByCompany(agencyId);

  return contacts.map(contact => ({
    id: contact.id,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    email: contact.properties.email,
    phone: contact.properties.phone
  }));
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
