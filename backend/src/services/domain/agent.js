/**
 * Agent Domain Service
 * Business logic for agents (HubSpot Contacts with type 'Agent')
 * Hides HubSpot implementation details from routes
 */

import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import { HUBSPOT } from '../../config/constants.js';

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

export default {
  findByEmail,
  findByEmailOrPhone,
  create,
  createForAgency,
  getById,
  update
};
