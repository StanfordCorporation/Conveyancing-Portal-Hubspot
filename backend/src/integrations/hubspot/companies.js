import hubspotClient from './client.js';
import { generateTokenFilterGroups, searchAndScore, extractTokens } from '../../utils/scoring.js';
import { normalizePhoneToInternational } from '../../utils/phone.js';

/**
 * Create a new company (agency)
 * @param {Object} companyData - Company properties
 * @param {string} companyData.name - Company name
 * @param {string} companyData.address - Company address
 * @param {string} companyData.email - Company email
 * @param {string} companyData.phone - Company phone
 * @param {string} companyData.associateToContactId - Optional: Contact ID to associate with (inline, using association type 280)
 */
export const createCompany = async (companyData) => {
  console.log(`[HubSpot Companies] ➕ Creating new company: ${companyData.name}`);
  console.log(`[HubSpot Companies] 📧 Company email: ${companyData.email || 'N/A'}`);
  if (companyData.associateToContactId) {
    console.log(`[HubSpot Companies] 🔗 Will associate to contact: ${companyData.associateToContactId}`);
  }

  const payload = {
    properties: {
      name: companyData.name,
      address: companyData.address || '',
      email: companyData.email || '',
      phone: normalizePhoneToInternational(companyData.phone) || ''
    }
  };

  // Add inline association to contact if provided (association type 280 = Company to Contact)
  if (companyData.associateToContactId) {
    payload.associations = [
      {
        to: {
          id: companyData.associateToContactId
        },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 280  // Company to Contact association
          }
        ]
      }
    ];
  }

  const response = await hubspotClient.post('/crm/v3/objects/companies', payload);

  console.log(`[HubSpot Companies] ✅ Company created successfully: ID ${response.data.id}`);
  if (companyData.associateToContactId) {
    console.log(`[HubSpot Companies] 🔗 Association created inline with contact`);
  }
  return response.data;
};

/**
 * Get company by ID
 */
export const getCompany = async (companyId) => {
  const response = await hubspotClient.get(`/crm/v3/objects/companies/${companyId}`, {
    params: {
      properties: 'name,address,email,phone'
    }
  });
  return response.data;
};

/**
 * Search companies by name (fuzzy matching)
 */
export const searchCompaniesByName = async (name) => {
  const response = await hubspotClient.post('/crm/v3/objects/companies/search', {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: name
          }
        ]
      }
    ],
    properties: ['name', 'address', 'email', 'phone'],
    limit: 10
  });
  return response.data.results || [];
};

/**
 * Search companies by name AND email (fuzzy matching with multiple criteria)
 * Uses OR logic between filter groups
 */
export const searchCompaniesByNameAndEmail = async (name, email) => {
  console.log(`[HubSpot Companies] 🔍 Fuzzy search for company:`);
  console.log(`[HubSpot Companies]    - Name contains: "${name}"`);
  console.log(`[HubSpot Companies]    - OR Email equals: "${email}"`);

  const response = await hubspotClient.post('/crm/v3/objects/companies/search', {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: name
          }
        ]
      },
      {
        filters: [
          {
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }
        ]
      }
    ],
    properties: ['name', 'address', 'email', 'phone'],
    limit: 10
  });

  const results = response.data.results || [];
  console.log(`[HubSpot Companies] 📊 Found ${results.length} matching companies`);

  if (results.length > 0) {
    results.forEach((company, index) => {
      console.log(`[HubSpot Companies]    ${index + 1}. ${company.properties.name} (ID: ${company.id})`);
    });
  }

  return results;
};

/**
 * Dynamic search companies by tokens (Business Name + Suburb)
 * Splits input into tokens and creates OR filter groups
 * Results are scored and sorted by relevance
 */
export const searchCompaniesByTokens = async (businessName, suburb) => {
  console.log(`[HubSpot Companies] 🔍 Dynamic token search for agency:`);
  console.log(`[HubSpot Companies]    - Business Name: "${businessName}"`);
  console.log(`[HubSpot Companies]    - Suburb: "${suburb}"`);

  // Extract tokens from both inputs
  const businessTokens = extractTokens(businessName);
  const suburbTokens = extractTokens(suburb);
  const allTokens = [...businessTokens, ...suburbTokens];

  if (allTokens.length === 0) {
    console.log(`[HubSpot Companies] ⚠️ No valid search tokens provided`);
    return [];
  }

  console.log(`[HubSpot Companies] 📋 Search tokens: ${allTokens.join(', ')}`);

  // Generate filter groups for each token (OR logic)
  const filterGroups = generateTokenFilterGroups(allTokens);

  try {
    const response = await hubspotClient.post('/crm/v3/objects/companies/search', {
      filterGroups,
      properties: ['name', 'address', 'email', 'phone'],
      limit: 50 // Get more results for scoring
    });

    const results = response.data.results || [];
    console.log(`[HubSpot Companies] 📊 Found ${results.length} initial matches`);

    // Score and sort results
    const combinedSearchTerm = `${businessName} ${suburb}`;
    const scoredResults = searchAndScore(results, combinedSearchTerm);

    console.log(`[HubSpot Companies] ✅ Scored and filtered to ${scoredResults.length} relevant matches`);
    scoredResults.slice(0, 5).forEach((company, index) => {
      console.log(`[HubSpot Companies]    ${index + 1}. ${company.name} (Score: ${(company.score * 100).toFixed(1)}%)`);
    });

    return scoredResults;
  } catch (error) {
    console.error(`[HubSpot Companies] ❌ Error searching companies:`, error.message);
    throw error;
  }
};

/**
 * Search company by email
 */
export const searchCompanyByEmail = async (email) => {
  try {
    console.log(`[HubSpot Companies] 🔍 Searching for company by email: ${email}`);

    const response = await hubspotClient.post('/crm/v3/objects/companies/search', {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }
          ]
        }
      ],
      properties: ['name', 'address', 'email', 'phone'],
      limit: 1
    });

    const results = response.data.results || [];
    if (results.length > 0) {
      console.log(`[HubSpot Companies] ✅ Found company with email: ${results[0].id} (${results[0].properties.name})`);
      return results[0];
    }

    console.log(`[HubSpot Companies] ℹ️ No company found with email: ${email}`);
    return null;
  } catch (error) {
    console.error(`[HubSpot Companies] ❌ Error searching company by email:`, error.message);
    throw error;
  }
};

/**
 * Update company
 */
export const updateCompany = async (companyId, updates) => {
  const response = await hubspotClient.patch(`/crm/v3/objects/companies/${companyId}`, {
    properties: updates
  });
  return response.data;
};

export default {
  createCompany,
  getCompany,
  searchCompaniesByName,
  searchCompaniesByNameAndEmail,
  searchCompaniesByTokens,
  updateCompany
};
