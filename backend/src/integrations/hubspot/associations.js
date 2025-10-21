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

export default {
  getAssociations,
  createAssociation
};
