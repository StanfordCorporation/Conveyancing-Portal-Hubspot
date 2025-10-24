import hubspotClient from './client.js';

/**
 * Get associations between two objects
 * Fetches related objects (e.g., contacts associated with a company)
 */
export const getAssociations = async (objectId, associationType) => {
  try {
    console.log(`[HubSpot Associations] 🔗 Fetching associations:`);
    console.log(`[HubSpot Associations]    - Object ID: ${objectId}`);
    console.log(`[HubSpot Associations]    - Association Type: ${associationType}`);

    // For company_to_contact associations, use the correct API endpoint
    const response = await hubspotClient.get(`/crm/v3/objects/companies/${objectId}/associations/contacts`, {
      params: {
        limit: 100
      }
    });

    const associations = response.data.results || [];
    console.log(`[HubSpot Associations] ✅ Found ${associations.length} associated contacts`);

    // Extract and format the associated objects
    return {
      associations: associations.map((result) => ({
        id: result.id,
        properties: result.properties
      }))
    };
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`[HubSpot Associations] ℹ️ No associations found`);
      return { associations: [] };
    }
    console.error(`[HubSpot Associations] ❌ Error fetching associations:`, error.message);
    throw error;
  }
};

/**
 * Create an association between two objects
 */
export const createAssociation = async (fromObjectId, toObjectId, associationType) => {
  try {
    console.log(`[HubSpot Associations] 🔗 Creating association:`);
    console.log(`[HubSpot Associations]    - From: ${fromObjectId}`);
    console.log(`[HubSpot Associations]    - To: ${toObjectId}`);
    console.log(`[HubSpot Associations]    - Type: ${associationType}`);

    const response = await hubspotClient.put(
      `/crm/v3/objects/companies/${fromObjectId}/associations/contacts/${toObjectId}`,
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationType: associationType
      }
    );

    console.log(`[HubSpot Associations] ✅ Association created successfully`);
    return response.data;
  } catch (error) {
    console.error(`[HubSpot Associations] ❌ Error creating association:`, error.message);
    throw error;
  }
};

/**
 * Get deals associated with a contact (association type 4 = contact_to_deal)
 * Returns array of deal IDs
 */
export const getContactDeals = async (contactId) => {
  try {
    console.log(`[HubSpot Associations] 🔗 Fetching deals for contact: ${contactId}`);

    const response = await hubspotClient.get(
      `/crm/v3/objects/contacts/${contactId}/associations/deals`,
      {
        params: { limit: 100 }
      }
    );

    const dealIds = response.data.results?.map(result => result.id) || [];
    console.log(`[HubSpot Associations] ✅ Found ${dealIds.length} associated deals`);
    return dealIds;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`[HubSpot Associations] ℹ️ No deals found for contact`);
      return [];
    }
    console.error(`[HubSpot Associations] ❌ Error fetching deals:`, error.message);
    throw error;
  }
};

/**
 * Batch fetch properties for multiple deals
 * Fetches all properties for up to 100 deals in a single API call
 */
export const batchGetDealProperties = async (dealIds, properties = []) => {
  try {
    if (!dealIds || dealIds.length === 0) {
      console.log(`[HubSpot Associations] ℹ️ No deal IDs provided for batch fetch`);
      return [];
    }

    console.log(`[HubSpot Associations] 📦 Batch fetching ${dealIds.length} deals`);

    const requestBody = {
      inputs: dealIds.map(id => ({ id })),
      properties: properties.length > 0 ? properties : [
        'dealname',
        'property_address',
        'dealstage',
        'number_of_owners'
      ]
    };

    const response = await hubspotClient.post(
      `/crm/v3/objects/deals/batch/read`,
      requestBody
    );

    const deals = response.data.results || [];
    console.log(`[HubSpot Associations] ✅ Batch fetch returned ${deals.length} deals`);
    return deals;
  } catch (error) {
    console.error(`[HubSpot Associations] ❌ Batch fetch error:`, error.message);
    throw error;
  }
};

/**
 * Get all contacts associated with a deal WITH association type information
 * Returns array of contact objects with ID, properties, and association type
 *
 * Association Types (USER_DEFINED):
 * - Type 1: Primary Seller
 * - Type 4: Additional Seller
 * - Type 6: Agent/Listing Salesperson
 */
export const getDealContacts = async (dealId) => {
  try {
    console.log(`[HubSpot Associations] 👥 Fetching all contacts for deal: ${dealId}`);

    const response = await hubspotClient.get(
      `/crm/v3/objects/deals/${dealId}/associations/contacts`,
      {
        params: {
          limit: 100
        }
      }
    );

    const contactsFromDeal = response.data.results || [];
    console.log(`[HubSpot Associations] ✅ Found ${contactsFromDeal.length} contacts for deal`);

    // Log association details for debugging
    contactsFromDeal.forEach((contact, idx) => {
      console.log(`[HubSpot Associations]    ${idx + 1}. Contact ID: ${contact.id}`);
      if (contact.type) {
        console.log(`[HubSpot Associations]       - Type: ${contact.type}`);
      }
      if (contact.associationTypes) {
        console.log(`[HubSpot Associations]       - AssociationTypes: ${JSON.stringify(contact.associationTypes)}`);
      }
    });

    // If no contacts found, return empty array
    if (contactsFromDeal.length === 0) {
      return [];
    }

    // Batch fetch full contact properties for all contacts
    console.log(`[HubSpot Associations] 📦 Batch fetching properties for ${contactsFromDeal.length} contacts`);
    const contactIds = contactsFromDeal.map(c => c.id);

    const batchResponse = await hubspotClient.post('/crm/v3/objects/contacts/batch/read', {
      inputs: contactIds.map(id => ({ id })),
      properties: ['firstname', 'lastname', 'email', 'phone', 'contact_type', 'address']
    });

    const contactDetails = batchResponse.data.results || [];
    console.log(`[HubSpot Associations] ✅ Batch fetch returned properties for ${contactDetails.length} contacts`);

    // Merge association metadata with contact properties
    return contactsFromDeal.map(contactFromDeal => {
      // Find matching contact details
      const details = contactDetails.find(d => d.id === contactFromDeal.id);

      return {
        id: contactFromDeal.id,
        properties: details?.properties || {},
        type: contactFromDeal.type,
        associationTypes: contactFromDeal.associationTypes || []
      };
    });
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`[HubSpot Associations] ℹ️ No contacts found for deal`);
      return [];
    }
    console.error(`[HubSpot Associations] ❌ Error fetching deal contacts:`, error.message);
    throw error;
  }
};

/**
 * Get all companies (agencies) associated with a deal
 * Returns array of company objects with ID and properties
 */
export const getDealCompanies = async (dealId) => {
  try {
    console.log(`[HubSpot Associations] 🏢 Fetching all companies for deal: ${dealId}`);

    const response = await hubspotClient.get(
      `/crm/v3/objects/deals/${dealId}/associations/companies`,
      {
        params: { limit: 100 }
      }
    );

    const companiesFromDeal = response.data.results || [];
    console.log(`[HubSpot Associations] ✅ Found ${companiesFromDeal.length} companies for deal`);

    // If no companies found, return empty array
    if (companiesFromDeal.length === 0) {
      return [];
    }

    // Batch fetch full company properties
    console.log(`[HubSpot Associations] 📦 Batch fetching properties for ${companiesFromDeal.length} companies`);
    const companyIds = companiesFromDeal.map(c => c.id);

    const batchResponse = await hubspotClient.post('/crm/v3/objects/companies/batch/read', {
      inputs: companyIds.map(id => ({ id })),
      properties: ['name', 'address', 'email', 'phone']
    });

    const companyDetails = batchResponse.data.results || [];
    console.log(`[HubSpot Associations] ✅ Batch fetch returned properties for ${companyDetails.length} companies`);

    // Return formatted company details with full properties
    return companiesFromDeal.map(companyFromDeal => {
      // Find matching company details
      const details = companyDetails.find(d => d.id === companyFromDeal.id);

      return {
        id: companyFromDeal.id,
        properties: details?.properties || {}
      };
    });
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`[HubSpot Associations] ℹ️ No companies found for deal`);
      return [];
    }
    console.error(`[HubSpot Associations] ❌ Error fetching deal companies:`, error.message);
    throw error;
  }
};

export default {
  getAssociations,
  createAssociation,
  getContactDeals,
  batchGetDealProperties,
  getDealContacts,
  getDealCompanies
};
