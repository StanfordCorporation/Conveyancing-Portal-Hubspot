/**
 * Client Domain Service
 * Business logic for clients (HubSpot Contacts with type 'Client')
 * Hides HubSpot implementation details from routes
 */

import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Find client by email
 */
export const findByEmail = async (email) => {
  const contact = await contactsIntegration.searchContactByEmail(email);

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
 * Find or create client by email
 */
export const findOrCreate = async (firstname, lastname, email, phone) => {
  const existing = await findByEmail(email);

  if (existing) {
    return { contact: existing, created: false };
  }

  const newContact = await create(firstname, lastname, email, phone);
  return { contact: newContact, created: true };
};

/**
 * Create new client (contact with type 'Client')
 */
export const create = async (firstname, lastname, email, phone) => {
  const contact = await contactsIntegration.createContact({
    email,
    firstname,
    lastname,
    phone: phone || '',
    contact_type: HUBSPOT.CONTACT_TYPES.CLIENT
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
 * Get client by ID
 */
export const getById = async (clientId) => {
  const contact = await contactsIntegration.getContact(clientId);

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
 * Update client
 */
export const update = async (clientId, updates) => {
  const contact = await contactsIntegration.updateContact(clientId, updates);

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
  findOrCreate,
  create,
  getById,
  update
};
