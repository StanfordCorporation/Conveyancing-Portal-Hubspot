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

export default {
  getAssociations,
  createAssociation,
  getContactDeals,
  batchGetDealProperties
};
