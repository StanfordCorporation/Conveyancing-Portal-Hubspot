/**
 * Smokeball Contact Operations
 * CRUD operations for Smokeball contacts
 */

import * as client from './client.js';
import { SMOKEBALL_API } from '../../config/smokeball.js';

/**
 * Create a contact in Smokeball
 *
 * @param {Object} contactData - Contact information
 * @param {string} contactData.firstName - First name
 * @param {string} contactData.lastName - Last name
 * @param {string} contactData.email - Email address
 * @param {string} contactData.phone - Phone number
 * @param {Object} contactData.address - Address object (optional)
 * @param {string} contactData.companyName - Company name (optional, for organizations)
 * @returns {Promise<Object>} Created contact with { id: UUID, ... }
 */
export async function createContact(contactData) {
  try {
    console.log('[Smokeball Contacts] 👤 Creating contact:', `${contactData.firstName} ${contactData.lastName}`);

    // Smokeball API requires contact data wrapped in 'person' object
    const payload = {
      person: {
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      }
    };

    // Add optional fields to person object
    if (contactData.email) {
      payload.person.email = contactData.email;
    }
    
    if (contactData.phone) {
      payload.person.phone = {
        number: contactData.phone
      };
    }

    if (contactData.address) {
      payload.person.residentialAddress = contactData.address;
    }

    if (contactData.companyName) {
      payload.person.companyName = contactData.companyName;
    }

    const response = await client.post(SMOKEBALL_API.endpoints.contacts, payload);

    console.log('[Smokeball Contacts] ✅ Contact created successfully');
    console.log(`[Smokeball Contacts] 🆔 Contact UUID: ${response.id}`);

    return response;

  } catch (error) {
    console.error('[Smokeball Contacts] ❌ Error creating contact:', error.message);
    if (error.response?.data) {
      console.error('[Smokeball Contacts] API Error:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Get contact by ID
 *
 * @param {string} contactId - Contact UUID
 * @returns {Promise<Object>} Contact details
 */
export async function getContact(contactId) {
  try {
    console.log(`[Smokeball Contacts] 🔍 Fetching contact: ${contactId}`);

    const response = await client.get(SMOKEBALL_API.endpoints.contact(contactId));

    console.log('[Smokeball Contacts] ✅ Contact retrieved');

    return response;

  } catch (error) {
    console.error('[Smokeball Contacts] ❌ Error fetching contact:', error.message);
    throw error;
  }
}

/**
 * Update contact details
 *
 * @param {string} contactId - Contact UUID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated contact
 */
export async function updateContact(contactId, updateData) {
  try {
    console.log(`[Smokeball Contacts] 🔄 Updating contact: ${contactId}`);

    // Smokeball uses PUT (not PATCH) for contact updates
    // Content-Type: application/json-patch+json is automatically added by client.put()
    const response = await client.put(
      SMOKEBALL_API.endpoints.contact(contactId),
      updateData
    );

    console.log('[Smokeball Contacts] ✅ Contact updated successfully');

    return response;

  } catch (error) {
    console.error('[Smokeball Contacts] ❌ Error updating contact:', error.message);
    throw error;
  }
}

/**
 * Search for contacts
 *
 * @param {Object} searchParams - Search criteria
 * @param {string} searchParams.email - Search by email (exact match)
 * @param {string} searchParams.name - Search by name (partial match)
 * @param {string} searchParams.phone - Search by phone (partial match)
 * @returns {Promise<Array>} Matching contacts
 */
export async function searchContacts(searchParams = {}) {
  try {
    console.log('[Smokeball Contacts] 🔍 Searching contacts:', searchParams);

    const response = await client.get(SMOKEBALL_API.endpoints.contacts, searchParams);

    // Smokeball API wraps responses in 'value' field (OData format)
    const results = Array.isArray(response) ? response : response.value || [];

    console.log(`[Smokeball Contacts] ✅ Found ${results.length} contacts`);

    return results;

  } catch (error) {
    console.error('[Smokeball Contacts] ❌ Error searching contacts:', error.message);
    throw error;
  }
}

/**
 * Find contact by email (exact match)
 *
 * @param {string} email - Email address to search
 * @returns {Promise<Object|null>} Contact if found, null otherwise
 */
export async function findContactByEmail(email) {
  try {
    if (!email) return null;

    const results = await searchContacts({ email });

    // Exact email match (case-insensitive)
    const match = results.find(
      (contact) => contact.email?.toLowerCase() === email.toLowerCase()
    );

    if (match) {
      console.log(`[Smokeball Contacts] ✅ Found existing contact by email: ${email}`);
    } else {
      console.log(`[Smokeball Contacts] ℹ️ No contact found with email: ${email}`);
    }

    return match || null;

  } catch (error) {
    console.error('[Smokeball Contacts] ❌ Error finding contact by email:', error.message);
    throw error;
  }
}

/**
 * Get or create contact (deduplication by email)
 *
 * @param {Object} contactData - Contact information (see createContact)
 * @returns {Promise<Object>} Existing or newly created contact
 */
export async function getOrCreateContact(contactData) {
  try {
    // Try to find existing contact by email
    if (contactData.email) {
      const existingContact = await findContactByEmail(contactData.email);

      if (existingContact) {
        console.log('[Smokeball Contacts] ♻️ Using existing contact');
        return existingContact;
      }
    }

    // Create new contact if not found
    console.log('[Smokeball Contacts] ➕ Creating new contact');
    return await createContact(contactData);

  } catch (error) {
    console.error('[Smokeball Contacts] ❌ Error in getOrCreateContact:', error.message);
    throw error;
  }
}

/**
 * Build contact from HubSpot contact data
 *
 * @param {Object} hubspotContact - HubSpot contact object
 * @returns {Object} Smokeball contact format
 */
export function buildContactFromHubSpot(hubspotContact) {
  const props = hubspotContact.properties || {};

  return {
    firstName: props.firstname || 'Unknown',
    lastName: props.lastname || 'Contact',
    email: props.email || null,
    phone: props.phone || props.mobilephone || null,
    address: buildAddressFromHubSpot(props),
  };
}

/**
 * Build address object from HubSpot properties
 *
 * @param {Object} properties - HubSpot contact properties
 * @returns {Object|null} Smokeball address format
 */
function buildAddressFromHubSpot(properties) {
  if (!properties.address && !properties.city && !properties.state) {
    return null;
  }

  return {
    street: properties.address || null,
    city: properties.city || null,
    state: properties.state || null,
    postcode: properties.zip || null,
    country: properties.country || 'Australia',
  };
}

/**
 * Create contact with role for matter
 * Convenience function that creates contact and returns formatted for matter.contacts[]
 *
 * @param {Object} contactData - Contact information
 * @param {string} role - Contact role (e.g., 'Purchaser', 'Vendor')
 * @returns {Promise<Object>} { contactId: UUID, role: string }
 */
export async function createContactWithRole(contactData, role) {
  const contact = await getOrCreateContact(contactData);

  return {
    contactId: contact.id,
    role: role,
  };
}

export default {
  createContact,
  getContact,
  updateContact,
  searchContacts,
  findContactByEmail,
  getOrCreateContact,
  buildContactFromHubSpot,
  createContactWithRole,
};
