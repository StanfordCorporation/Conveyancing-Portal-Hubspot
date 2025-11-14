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
 * - Type 5: Agent/Listing Salesperson
 */
export const getDealContacts = async (dealId) => {
  try {
    console.log(`[HubSpot Associations] 👥 Fetching all contacts for deal: ${dealId}`);

    // Step 1: Use v4 API to get association type IDs
    const v4Response = await hubspotClient.post(
      '/crm/v4/associations/deal/contact/batch/read',
      {
        inputs: [{ id: dealId }]
      }
    );

    const contactAssociations = v4Response.data.results[0]?.to || [];
    console.log(`[HubSpot Associations] ✅ Found ${contactAssociations.length} contacts for deal`);

    // Log association details for debugging
    contactAssociations.forEach((assoc, idx) => {
      console.log(`[HubSpot Associations]    ${idx + 1}. Contact ID: ${assoc.toObjectId}`);
      if (assoc.associationTypes && assoc.associationTypes.length > 0) {
        assoc.associationTypes.forEach(type => {
          console.log(`[HubSpot Associations]       - Type ID: ${type.typeId}, Category: ${type.category}, Label: ${type.label || 'N/A'}`);
        });
      } else {
        console.log(`[HubSpot Associations]       - No association types found`);
      }
    });

    // If no contacts found, return empty array
    if (contactAssociations.length === 0) {
      return [];
    }

    // Step 2: Batch fetch full contact properties for all contacts
    console.log(`[HubSpot Associations] 📦 Batch fetching properties for ${contactAssociations.length} contacts`);
    const contactIds = contactAssociations.map(assoc => assoc.toObjectId);

    const batchResponse = await hubspotClient.post('/crm/v3/objects/contacts/batch/read', {
      inputs: contactIds.map(id => ({ id: String(id) })),
      properties: ['firstname', 'lastname', 'email', 'phone', 'contact_type', 'address']
    });

    const contactDetails = batchResponse.data.results || [];
    console.log(`[HubSpot Associations] ✅ Batch fetch returned properties for ${contactDetails.length} contacts`);

    // Step 3: Merge association metadata with contact properties
    return contactAssociations.map(assoc => {
      // Find matching contact details
      const details = contactDetails.find(d => d.id === String(assoc.toObjectId));

      return {
        id: String(assoc.toObjectId),
        properties: details?.properties || {},
        type: 'contact', // Generic type
        associationTypes: assoc.associationTypes || []
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
