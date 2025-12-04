import hubspotClient from './client.js';
import { normalizePhoneToInternational } from '../../utils/phone.js';
import { extractTokens, scoreAgentWithAgency } from '../../utils/scoring.js';

/**
 * Search for contact by email
 */
export const searchContactByEmail = async (email) => {
  try {
    console.log(`[HubSpot Contacts] 🔍 Searching for contact by email: ${email}`);
    // Properties must be passed as comma-separated string in query parameters
    const propertiesRequested = ['firstname','lastname','email','phone','address','contact_type'];
    console.log(`[HubSpot Contacts] 📋 Requesting properties:`, propertiesRequested);
    const response = await hubspotClient.get(`/crm/v3/objects/contacts/${email}`, {
      params: {
        properties: propertiesRequested.join(','),
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
 * @param {number} contactData.associationTypeId - Optional: Association type ID (default: 279 Standard, 7 Admin, 9 View All)
 * @param {string} contactData.associationCategory - Optional: Association category (default: HUBSPOT_DEFINED)
 */
export const createContact = async (contactData) => {
  console.log(`[HubSpot Contacts] ➕ Creating new contact: ${contactData.email} (${contactData.firstname} ${contactData.lastname})`);
  console.log(`[HubSpot Contacts] 📋 Contact type: ${contactData.contact_type}`);
  if (contactData.associateToCompanyId) {
    console.log(`[HubSpot Contacts] 🔗 Associating to company: ${contactData.associateToCompanyId}`);
    if (contactData.associationTypeId) {
      console.log(`[HubSpot Contacts] 🔑 Association type ID: ${contactData.associationTypeId} (${contactData.associationCategory || 'HUBSPOT_DEFINED'})`);
    }
  }

  const payload = {
    properties: {
      email: contactData.email,
      firstname: contactData.firstname || '',
      lastname: contactData.lastname || '',
      phone: normalizePhoneToInternational(contactData.phone) || null,
      address: contactData.address || null,
      contact_type: contactData.contact_type
    }
  };

  // Add inline association if companyId provided
  if (contactData.associateToCompanyId) {
    // Use custom association type if provided, otherwise default to 279 (Standard)
    const associationTypeId = contactData.associationTypeId || 279;
    const associationCategory = contactData.associationCategory || 'HUBSPOT_DEFINED';

    payload.associations = [
      {
        to: {
          id: contactData.associateToCompanyId
        },
        types: [
          {
            associationCategory: associationCategory,
            associationTypeId: associationTypeId
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
 * @param {string} contactId - Contact ID
 * @param {Array<string>} properties - Optional: Specific properties to fetch
 */
export const getContact = async (contactId, properties = null) => {
  const params = {};
  
  if (properties && properties.length > 0) {
    // Fetch specific properties
    params.properties = properties.join(',');
  } else {
    // Default properties
    params.properties = ['firstname','lastname','middle_name','email','phone','address','contact_type','smokeball_contact_id'].join(',');
  }

  const response = await hubspotClient.get(`/crm/v3/objects/contacts/${contactId}`, {
    params
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
      limit: 100,
      properties: ['firstname', 'lastname', 'email', 'phone', 'contact_type']
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
 * Search for contacts by email OR phone using POST request with filters
 *
 * Uses HubSpot's POST search endpoint with filterGroups for flexible multi-criteria searching.
 * This method searches using multiple filter groups (OR logic) - returns contacts matching
 * either email OR phone. Properties are passed in the request BODY, not query parameters.
 * Use this when you need flexible filtering or want to search by multiple criteria at once.
 *
 * @param {string} email - Optional: Contact email to search for
 * @param {string} phone - Optional: Contact phone to search for
 * @returns {Object|null} First matching contact object with all requested properties or null
 * @throws {Error} If API request fails
 */
export const searchContactByEmailOrPhone = async (email, phone, options = {}) => {
  try {
    console.log(`[HubSpot Contacts] 🔍 Searching for contact by email or phone (POST):`);
    console.log(`[HubSpot Contacts]    - Email: ${email}`);
    console.log(`[HubSpot Contacts]    - Phone: ${phone}`);
    if (options.preferredContactType) {
      console.log(`[HubSpot Contacts]    - Preferred Type: ${options.preferredContactType}`);
    }

    // Build filter groups for flexible OR-based searching
    const filterGroups = [];

    // Filter group 1: Search by email if provided
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

    // Filter group 2: Search by phone if provided (normalize by removing spaces)
    if (phone) {
      const normalizedPhone = phone.replace(/\s/g, '');
      filterGroups.push({
        filters: [
          {
            propertyName: 'phone',
            operator: 'EQ',
            value: normalizedPhone
          }
        ]
      });
    }

    if (filterGroups.length === 0) {
      console.log(`[HubSpot Contacts] ⚠️ No valid search criteria provided (email and phone both missing)`);
      return null;
    }

    // POST request: properties go in request BODY, not query parameters
    const response = await hubspotClient.post('/crm/v3/objects/contacts/search', {
      filterGroups,       // Filter groups implement OR logic: match any filter group
      limit: 10,
      properties: ['firstname','lastname','email','phone','address','contact_type']  // BODY
    });

    const results = response.data.results || [];
    console.log(`[HubSpot Contacts] 📊 Found ${results.length} matching contacts`);

    if (results.length > 0) {
      results.forEach((contact, index) => {
        console.log(`[HubSpot Contacts]    ${index + 1}. ${contact.properties.firstname} ${contact.properties.lastname} (ID: ${contact.id}, Type: ${contact.properties.contact_type || 'N/A'})`);
      });

      // Prioritize exact email match if email was provided
      if (email) {
        const emailMatch = results.find(
          contact => contact.properties.email && contact.properties.email.toLowerCase() === email.toLowerCase()
        );
        if (emailMatch) {
          console.log(`[HubSpot Contacts] ✅ Returning exact email match: ${emailMatch.id}`);
          return emailMatch;
        }
      }

      // If preferredContactType is specified, filter and prioritize by contact_type
      if (options.preferredContactType) {
        console.log(`[HubSpot Contacts] 🔍 Filtering by preferred contact type: ${options.preferredContactType}`);
        
        // For client portal: prefer pure clients, then dual-role, exclude pure agents
        if (options.preferredContactType === 'Client') {
          // Priority 1: Pure clients (contact_type = "Client" only)
          const pureClients = results.filter(contact => {
            const type = contact.properties.contact_type || '';
            return type === 'Client';
          });
          
          if (pureClients.length > 0) {
            console.log(`[HubSpot Contacts] ✅ Found ${pureClients.length} pure client(s), returning first: ${pureClients[0].id}`);
            return pureClients[0];
          }

          // Priority 2: Dual-role contacts (contains "Client")
          const dualRoleClients = results.filter(contact => {
            const type = contact.properties.contact_type || '';
            return type.includes('Client') && type !== 'Client';
          });
          
          if (dualRoleClients.length > 0) {
            console.log(`[HubSpot Contacts] ✅ Found ${dualRoleClients.length} dual-role client(s), returning first: ${dualRoleClients[0].id}`);
            return dualRoleClients[0];
          }

          // No clients found at all - return null (will be caught by calling function)
          console.log(`[HubSpot Contacts] ⚠️ No clients found (only agents), returning null`);
          return null;
        }
        
        // For agent portal: prefer contacts with "Agent" in contact_type
        if (options.preferredContactType === 'Agent') {
          const agents = results.filter(contact => {
            const type = contact.properties.contact_type || '';
            return type.includes('Agent');
          });
          
          if (agents.length > 0) {
            console.log(`[HubSpot Contacts] ✅ Found ${agents.length} agent(s), returning first: ${agents[0].id}`);
            return agents[0];
          }
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

/**
 * Generate filter groups for agent name search
 * Creates OR filter groups for firstname and lastname with tokens
 * Each filter group requires contact_type='Agent' AND (name match)
 * Filter groups use OR logic between them
 * @param {Array<string>} tokens - Search tokens extracted from agent name
 * @returns {Array} Filter groups for HubSpot search
 */
const generateAgentNameFilterGroups = (tokens) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return [];
  }

  const filterGroups = [];
  
  // For each token, create separate filter groups for firstname and lastname
  // Each group requires contact_type='Agent' AND the name match
  // Filter groups use OR logic between them (matches if ANY group matches)
  for (const token of tokens) {
    // Filter group 1: contact_type='Agent' AND firstname contains token
    filterGroups.push({
      filters: [
        {
          propertyName: 'contact_type',
          operator: 'CONTAINS_TOKEN',
          value: 'Agent'
        },
        {
          propertyName: 'firstname',
          operator: 'CONTAINS_TOKEN',
          value: token.trim()
        }
      ]
    });
    
    // Filter group 2: contact_type='Agent' AND lastname contains token
    filterGroups.push({
      filters: [
        {
          propertyName: 'contact_type',
          operator: 'CONTAINS_TOKEN',
          value: 'Agent'
        },
        {
          propertyName: 'lastname',
          operator: 'CONTAINS_TOKEN',
          value: token.trim()
        }
      ]
    });
  }
  
  return filterGroups;
};

/**
 * Search agents by name with optional agency name, phone, and suburb filtering
 * Uses fuzzy matching (Sneesby algorithm) to find agents
 * @param {string} agentName - Agent name to search (e.g., "Steve Athanates")
 * @param {string} agencyName - Optional: Agency name to filter by
 * @param {string} agentPhone - Optional: Agent phone number for exact matching bonus
 * @param {string} suburb - Optional: Suburb to filter by
 * @returns {Promise<Array>} Array of agents with agency info, sorted by relevance score
 */
export const searchAgentsByTokens = async (agentName, agencyName = null, agentPhone = null, suburb = null) => {
  console.log(`[HubSpot Contacts] 🔍 Dynamic token search for agents:`);
  console.log(`[HubSpot Contacts]    - Agent Name: "${agentName}"`);
  if (agencyName) console.log(`[HubSpot Contacts]    - Agency Name: "${agencyName}"`);
  if (agentPhone) console.log(`[HubSpot Contacts]    - Agent Phone: "${agentPhone}"`);
  if (suburb) console.log(`[HubSpot Contacts]    - Suburb: "${suburb}"`);

  // Extract tokens from agent name
  const agentTokens = extractTokens(agentName);
  
  if (agentTokens.length === 0) {
    console.log(`[HubSpot Contacts] ⚠️ No valid search tokens provided for agent name`);
    return [];
  }

  console.log(`[HubSpot Contacts] 📋 Agent name tokens: ${agentTokens.join(', ')}`);

  // Build filter groups
  // Each group requires contact_type='Agent' AND name match
  // Groups use OR logic (matches if ANY group matches)
  const filterGroups = generateAgentNameFilterGroups(agentTokens);
  
  // If no tokens, still need to filter by contact_type
  if (filterGroups.length === 0) {
    filterGroups.push({
      filters: [
        {
          propertyName: 'contact_type',
          operator: 'CONTAINS_TOKEN',
          value: 'Agent'
        }
      ]
    });
  }

  try {
    // Search contacts
    const response = await hubspotClient.post('/crm/v3/objects/contacts/search', {
      filterGroups,
      properties: ['firstname', 'lastname', 'email', 'phone', 'contact_type'],
      limit: 50 // Get more results for scoring and filtering
    });

    const agents = response.data.results || [];
    console.log(`[HubSpot Contacts] 📊 Found ${agents.length} initial agent matches`);

    if (agents.length === 0) {
      return [];
    }

    // Get agency associations for all agents
    const agentsWithAgencies = [];
    
    for (const agent of agents) {
      try {
        // Get agent's associated company
        const assocResponse = await hubspotClient.get(
          `/crm/v3/objects/contacts/${agent.id}/associations/companies`
        );
        
        const companies = assocResponse.data.results || [];
        
        if (companies.length > 0) {
          // Get company details for each associated company
          for (const company of companies) {
            try {
              const companyResponse = await hubspotClient.get(
                `/crm/v3/objects/companies/${company.id}?properties=name,address,email,phone`
              );
              
              const agency = {
                id: company.id,
                name: companyResponse.data.properties.name || '',
                address: companyResponse.data.properties.address || '',
                email: companyResponse.data.properties.email || '',
                phone: companyResponse.data.properties.phone || ''
              };
              
              // Filter by agency name if provided
              if (agencyName) {
                const agencyTokens = extractTokens(agencyName);
                const agencyNameLower = (agency.name || '').toLowerCase();
                const agencySearchLower = agencyName.toLowerCase();
                
                // Check if any agency token appears in agency name
                const matchesAgency = agencyTokens.some(token => 
                  agencyNameLower.includes(token)
                ) || agencyNameLower.includes(agencySearchLower);
                
                if (!matchesAgency) {
                  continue; // Skip this agency if it doesn't match
                }
              }
              
              // Don't filter by suburb - suburb is only used for scoring enhancement
              // Include all agents that match agency name, suburb will boost their score
              
              agentsWithAgencies.push({
                id: agent.id,
                firstname: agent.properties.firstname || '',
                lastname: agent.properties.lastname || '',
                email: agent.properties.email || '',
                phone: agent.properties.phone || '',
                agency: agency
              });
              
              // Only use first agency if multiple exist
              break;
            } catch (error) {
              console.error(`[HubSpot Contacts] ⚠️ Error fetching company ${company.id}:`, error.message);
              // Continue with next company
            }
          }
        } else {
          // Agent has no agency association - include if no agency filter specified
          if (!agencyName && !suburb) {
            agentsWithAgencies.push({
              id: agent.id,
              firstname: agent.properties.firstname || '',
              lastname: agent.properties.lastname || '',
              email: agent.properties.email || '',
              phone: agent.properties.phone || '',
              agency: null
            });
          }
        }
      } catch (error) {
        console.error(`[HubSpot Contacts] ⚠️ Error fetching associations for agent ${agent.id}:`, error.message);
        // Continue with next agent
      }
    }

    console.log(`[HubSpot Contacts] 📊 Found ${agentsWithAgencies.length} agents with matching agencies`);

    // Score and sort results
    const scoredResults = agentsWithAgencies
      .map((agent) => ({
        ...agent,
        score: scoreAgentWithAgency(
          agent,
          agent.agency,
          agentName,
          agencyName,
          agentPhone,
          suburb
        )
      }))
      .sort((a, b) => b.score - a.score)
      .filter((item) => item.score > 0.3); // Only return matches above threshold

    console.log(`[HubSpot Contacts] ✅ Scored and filtered to ${scoredResults.length} relevant matches`);
    scoredResults.slice(0, 5).forEach((agent, index) => {
      const agentName = `${agent.firstname} ${agent.lastname}`.trim();
      const agencyName = agent.agency?.name || 'No Agency';
      console.log(`[HubSpot Contacts]    ${index + 1}. ${agentName} @ ${agencyName} (Score: ${(agent.score * 100).toFixed(1)}%)`);
    });

    return scoredResults;
  } catch (error) {
    console.error(`[HubSpot Contacts] ❌ Error searching agents:`, error.message);
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
  findOrCreateContact,
  searchAgentsByTokens
};
