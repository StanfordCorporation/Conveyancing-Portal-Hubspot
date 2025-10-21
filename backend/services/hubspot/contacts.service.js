import hubspotClient from './client.js';

/**
 * Search for contact by email
 */
export const searchContactByEmail = async (email) => {
  try {
    console.log(`[HubSpot Contacts] 🔍 Searching for contact by email: ${email}`);
    // Try multiple variants of contact_type field names
    const propertiesRequested = ['firstname','lastname','email','phone','address','contact_type'];
    console.log(`[HubSpot Contacts] 📋 Requesting properties:`, propertiesRequested);
    const response = await hubspotClient.get(`/crm/v3/objects/contacts/${email}`, {
      params: {
        properties: propertiesRequested,
        idProperty: 'email'
      }
    });
    console.log(`[HubSpot Contacts] ✅ Contact found: ${response.data.id} (${response.data.properties.firstname} ${response.data.properties.lastname})`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`[HubSpot Contacts] ℹ️ Contact not found for email: ${email}`);
      return null; // Contact not found
    }
    console.error(`[HubSpot Contacts] ❌ Error searching contact:`, error.message);
    throw error;
  }
};

/**
 * Create a new contact with optional inline association to a company
 * @param {Object} contactData - Contact properties
 * @param {string} contactData.email - Contact email
 * @param {string} contactData.firstname - Contact first name
 * @param {string} contactData.lastname - Contact last name
 * @param {string} contactData.phone - Contact phone
 * @param {string} contactData.address - Contact address
 * @param {string} contactData.contact_type - Contact type (Agent, etc)
 * @param {string} contactData.associateToCompanyId - Optional: Company ID to associate with (inline)
 */
export const createContact = async (contactData) => {
  console.log(`[HubSpot Contacts] ➕ Creating new contact: ${contactData.email} (${contactData.firstname} ${contactData.lastname})`);
  console.log(`[HubSpot Contacts] 📋 Contact type: ${contactData.contact_type}`);
  if (contactData.associateToCompanyId) {
    console.log(`[HubSpot Contacts] 🔗 Associating to company: ${contactData.associateToCompanyId}`);
  }

  const payload = {
    properties: {
      email: contactData.email,
      firstname: contactData.firstname || '',
      lastname: contactData.lastname || '',
      phone: contactData.phone || null,
      address: contactData.address || null,
      contact_type: contactData.contact_type
    }
  };

  // Add inline association if companyId provided
  if (contactData.associateToCompanyId) {
    payload.associations = [
      {
        to: {
          id: contactData.associateToCompanyId
        },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 279  // Contact to Company association
          }
        ]
      }
    ];
  }

  const response = await hubspotClient.post('/crm/v3/objects/contacts', payload);

  console.log(`[HubSpot Contacts] ✅ Contact created successfully: ID ${response.data.id}`);
  if (contactData.associateToCompanyId) {
    console.log(`[HubSpot Contacts] 🔗 Association created inline`);
  }
  return response.data;
};

/**
 * Get contact by ID
 */
export const getContact = async (contactId) => {
  const response = await hubspotClient.get(`/crm/v3/objects/contacts/${contactId}`, {
    params: {
      properties: ['firstname','lastname','email','phone','address','contact_type']
    }
  });
  return response.data;
};

/**
 * Update contact
 */
export const updateContact = async (contactId, updates) => {
  const response = await hubspotClient.patch(`/crm/v3/objects/contacts/${contactId}`, {
    properties: updates
  });
  return response.data;
};

/**
 * Find or create contact by email
 */
export const findOrCreateContact = async (contactData) => {
  console.log(`[HubSpot Contacts] 🔄 Find or create contact: ${contactData.email}`);

  // First, try to find existing contact
  const existingContact = await searchContactByEmail(contactData.email);

  if (existingContact) {
    console.log(`[HubSpot Contacts] ♻️ Using existing contact: ${existingContact.id}`);
    return { contact: existingContact, created: false };
  }

  // Create new contact if not found
  console.log(`[HubSpot Contacts] 🆕 No existing contact found, creating new one...`);
  const newContact = await createContact(contactData);
  return { contact: newContact, created: true };
};

/**
 * Create a new agent contact (without email - always creates new)
 * Useful for creating agents where email may not be unique or provided
 */
export const createAgentContact = async (contactData) => {
  console.log(`[HubSpot Contacts] ➕ Creating new agent contact: ${contactData.firstname} ${contactData.lastname}`);
  console.log(`[HubSpot Contacts] 📋 Contact type: Agent`);

  const newContact = await createContact({
    email: contactData.email || null,
    firstname: contactData.firstname || '',
    lastname: contactData.lastname || '',
    phone: contactData.phone || null,
    address: contactData.address || null,
    contact_type: 'Agent'
  });

  console.log(`[HubSpot Contacts] ✅ Agent contact created successfully: ID ${newContact.id}`);
  return { contact: newContact, created: true };
};

/**
 * Search for contacts associated with a company (agency)
 * Uses the associations.company property to find contacts linked to a company
 */
export const searchContactsByCompany = async (companyId) => {
  try {
    console.log(`[HubSpot Contacts] 🔍 Searching for contacts associated with company: ${companyId}`);

    const response = await hubspotClient.post('/crm/v3/objects/contacts/search', {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'associations.company',
              operator: 'EQ',
              value: companyId
            }
          ]
        }
      ],
      properties: ['firstname', 'lastname', 'email', 'phone', 'contact_type'],
      limit: 100
    });

    const results = response.data.results || [];
    console.log(`[HubSpot Contacts] 📊 Found ${results.length} contacts associated with company`);

    if (results.length > 0) {
      results.forEach((contact, index) => {
        console.log(`[HubSpot Contacts]    ${index + 1}. ${contact.properties.firstname} ${contact.properties.lastname} (ID: ${contact.id})`);
      });
    }

    return results;
  } catch (error) {
    console.error(`[HubSpot Contacts] ❌ Error searching contacts by company:`, error.message);
    throw error;
  }
};

/**
 * Search for contact by email OR phone
 */
export const searchContactByEmailOrPhone = async (email, phone) => {
  try {
    console.log(`[HubSpot Contacts] 🔍 Searching for contact by email or phone:`);
    console.log(`[HubSpot Contacts]    - Email: ${email}`);
    console.log(`[HubSpot Contacts]    - Phone: ${phone}`);

    // Build filter groups only for provided values
    const filterGroups = [];

    if (email) {
      filterGroups.push({
        filters: [
          {
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }
        ]
      });
    }

    if (phone) {
      filterGroups.push({
        filters: [
          {
            propertyName: 'phone',
            operator: 'EQ',
            value: phone
          }
        ]
      });
    }

    if (filterGroups.length === 0) {
      console.log(`[HubSpot Contacts] ⚠️ No valid search criteria provided`);
      return null;
    }

    const response = await hubspotClient.post('/crm/v3/objects/contacts/search', {
      filterGroups,
      // Try multiple variants of contact_type field names
      properties: ['firstname','lastname','email','phone','address','contact_type', 'contact_type__c', 'contact_type_c'],
      limit: 10
    });

    const results = response.data.results || [];
    console.log(`[HubSpot Contacts] 📊 Found ${results.length} matching contacts`);

    if (results.length > 0) {
      results.forEach((contact, index) => {
        console.log(`[HubSpot Contacts]    ${index + 1}. ${contact.properties.firstname} ${contact.properties.lastname} (ID: ${contact.id})`);
      });

      // Prioritize exact email match if provided
      if (email) {
        const emailMatch = results.find(
          contact => contact.properties.email && contact.properties.email.toLowerCase() === email.toLowerCase()
        );
        if (emailMatch) {
          console.log(`[HubSpot Contacts] ✅ Returning exact email match: ${emailMatch.id}`);
          return emailMatch;
        }
      }

      // Otherwise return first match
      console.log(`[HubSpot Contacts] ℹ️ Returning first match: ${results[0].id}`);
      return results[0];
    }

    return null;
  } catch (error) {
    console.error(`[HubSpot Contacts] ❌ Error searching contact:`, error.message);
    throw error;
  }
};

export default {
  searchContactByEmail,
  searchContactByEmailOrPhone,
  searchContactsByCompany,
  createContact,
  createAgentContact,
  getContact,
  updateContact,
  findOrCreateContact
};
