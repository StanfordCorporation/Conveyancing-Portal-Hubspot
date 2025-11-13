import hubspotClient from './client.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Create a new deal in the Form 2s pipeline
 * Valid stage IDs from your HubSpot pipeline: 1923713518, 1923713520, 1923682791, 1923682792, 1924069846, 1904359900, 1904359901, 1904359902, closedwon, closedlost
 * Using 1923713518 (first stage) as default for new deals
 */
export const createDeal = async (dealData, associations = []) => {
  console.log(`[HubSpot Deals] ➕ Creating new deal: ${dealData.dealname}`);
  console.log(`[HubSpot Deals] 🏠 Property: ${dealData.property_address || 'N/A'}`);
  console.log(`[HubSpot Deals] 📊 Stage: ${dealData.dealstage || '1923713518'}`);
  console.log(`[HubSpot Deals] 🔗 Associations: ${associations.length} object(s)`);

  const payload = {
    properties: {
      dealname: dealData.dealname,
      dealstage: dealData.dealstage || '1923713518', // Use valid stage ID instead of custom name
      pipeline: HUBSPOT.PIPELINES.FORM_2S, // ALWAYS use Form 2s pipeline
      property_address: dealData.property_address || '',
      number_of_owners: dealData.number_of_owners || 1,
      
      // Draft status (Yes or null)
      is_draft: dealData.is_draft === 'Yes' ? 'Yes' : null,
      
      // Agent title search
      agent_title_search: dealData.agent_title_search || null,
      agent_title_search_file: dealData.agent_title_search_file || null,

      // Section 1: Title Details & Encumbrances
      body_corporate: dealData.body_corporate || '',
      registered_encumbrances: dealData.registered_encumbrances || '',
      registered_encumbrance_details: dealData.registered_encumbrance_details || '',
      unregistered_encumbrances: dealData.unregistered_encumbrances || '',
      unregistered_encumbrance_details: dealData.unregistered_encumbrance_details || '',

      // Section 2: Rental Agreement/Tenancy
      tenancy_agreement: dealData.tenancy_agreement || '',
      informal_rental: dealData.informal_rental || '',
      tenancy_agreement_last_rental_increase: dealData.tenancy_agreement_last_rental_increase || '',
      tenancy_agreement_lease_start_date: dealData.tenancy_agreement_lease_start_date || '',
      tenancy_agreement_lease_end_date: dealData.tenancy_agreement_lease_end_date || '',
      tenancy_agreement_rent_and_bond_payable: dealData.tenancy_agreement_rent_and_bond_payable || '',
      tenancy_agreement_upload: dealData.tenancy_agreement_upload || '',

      // Section 3: Land Use, Planning & Environment
      resume_notice: dealData.resume_notice || '',
      environmental_register: dealData.environmental_register || '',
      environmental_register_details: dealData.environmental_register_details || '',
      government_notice: dealData.government_notice || '',
      government_notice_details: dealData.government_notice_details || '',
      tree_order: dealData.tree_order || '',
      tree_order_details: dealData.tree_order_details || '',
      heritage_act: dealData.heritage_act || '',
      heritage_act_details: dealData.heritage_act_details || '',

      // Section 4: Buildings & Structures
      swimming_pool: dealData.swimming_pool || '',
      owner_builder: dealData.owner_builder || '',
      owner_builder_uploads: dealData.owner_builder_uploads || '',
      enforcement_notice: dealData.enforcement_notice || '',
      enforcement_notice_details: dealData.enforcement_notice_details || '',
      enforcement_notice_uploads: dealData.enforcement_notice_uploads || ''
    }
  };

  // Add associations if provided
  if (associations.length > 0) {
    payload.associations = associations;
    console.log(`[HubSpot Deals] 🔗 Association details:`);
    associations.forEach((assoc, index) => {
      console.log(`[HubSpot Deals]    ${index + 1}. To Object ID: ${assoc.to.id}, Type: ${assoc.types[0].associationTypeId}`);
    });
  }

  const response = await hubspotClient.post('/crm/v3/objects/deals', payload);
  console.log(`[HubSpot Deals] ✅ Deal created successfully: ID ${response.data.id}`);
  return response.data;
};

/**
 * Get deal by ID
 * @param {string} dealId - HubSpot deal ID
 * @param {string[]} properties - Optional array of specific properties to fetch. If not provided, fetches all properties.
 */
export const getDeal = async (dealId, properties = null) => {
  const params = {};

  if (properties && properties.length > 0) {
    // Fetch specific properties
    params.properties = properties.join(',');
  }
  // If no properties specified, HubSpot returns all properties by default

  const response = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}`, {
    params
  });
  return response.data;
};

/**
 * Get deal by custom ID property (e.g., smokeball_lead_uid)
 * Uses HubSpot's idProperty parameter for direct lookup without search filters
 * 
 * @param {string} idValue - The value of the custom property
 * @param {string} idProperty - The custom property name to use as ID (e.g., 'smokeball_lead_uid')
 * @param {Array} properties - Optional array of properties to fetch
 * @returns {Promise<Object>} Deal data
 */
export const getDealByCustomId = async (idValue, idProperty, properties = []) => {
  const params = {
    idProperty: idProperty
  };

  if (properties && properties.length > 0) {
    params.properties = properties.join(',');
  }

  const response = await hubspotClient.get(`/crm/v3/objects/deals/${idValue}`, {
    params
  });
  return response.data;
};

/**
 * Update deal
 */
export const updateDeal = async (dealId, updates) => {
  const response = await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
    properties: updates
  });
  return response.data;
};

/**
 * Search for deals
 * @param {Object} searchParams - HubSpot search parameters
 * @param {Array} searchParams.filterGroups - Filter groups
 * @param {Array} searchParams.properties - Properties to fetch
 * @param {number} searchParams.limit - Limit results
 * @returns {Promise<Object>} Search results
 */
export const searchDeals = async (searchParams) => {
  const response = await hubspotClient.post('/crm/v3/objects/deals/search', searchParams);
  return response.data;
};

/**
 * Update deal stage
 */
export const updateDealStage = async (dealId, stage) => {
  return updateDeal(dealId, { dealstage: stage });
};

/**
 * Create deal with associations (flexible - accepts associations array or individual IDs)
 */
export const createDealWithAssociations = async (dealData, contactIdOrAssociations, agencyId = null) => {
  console.log(`[HubSpot Deals] 🔄 Creating deal with flexible associations...`);

  let associations;

  // Check if first parameter is an array of associations
  if (Array.isArray(contactIdOrAssociations)) {
    console.log(`[HubSpot Deals] 📦 Using provided associations array (${contactIdOrAssociations.length} associations)`);
    associations = contactIdOrAssociations;
  } else {
    console.log(`[HubSpot Deals] 🔧 Building associations from individual IDs (legacy mode)`);
    // Legacy support: build associations from contact ID and agency ID
    associations = [
      {
        to: { id: contactIdOrAssociations },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 3 // Contact to Deal
          }
        ]
      }
    ];

    // Add agency association if provided
    if (agencyId) {
      console.log(`[HubSpot Deals] 🏢 Adding agency association: ${agencyId}`);
      associations.push({
        to: { id: agencyId },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 341 // Deal to Company
          }
        ]
      });
    }
  }

  return createDeal(dealData, associations);
};

export default {
  createDeal,
  getDeal,
  getDealByCustomId,
  updateDeal,
  updateDealStage,
  searchDeals,
  createDealWithAssociations
};
