/**
 * Client Portal Routes
 * Routes for client dashboard and related features
 */

import express from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middleware/auth.js';
import * as associationsIntegration from '../integrations/hubspot/associations.js';
import * as contactsIntegration from '../integrations/hubspot/contacts.js';
import * as companiesIntegration from '../integrations/hubspot/companies.js';
import * as dealsIntegration from '../integrations/hubspot/deals.js';
import * as filesIntegration from '../integrations/hubspot/files.js';
import { getAllHubSpotProperties, getAllMappings, getFieldMapping } from '../utils/questionnaireHelper.js';
import { shouldShowToClient } from '../config/stageHelpers.js';
import { calculateQuote } from '../utils/dynamic-quotes-calculator.js';
import * as smokeballMatters from '../integrations/smokeball/matters.js';
import * as smokeballMatterTypes from '../integrations/smokeball/matter-types.js';

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max file size
  }
});

/**
 * GET /api/client/dashboard-data
 * Returns all deals associated with the authenticated client
 * Client ID comes from auth token (JWT)
 *
 * Response:
 * {
 *   deals: [
 *     {
 *       id: "168359414202",
 *       index: 0,
 *       title: "143 Sinnathamby",
 *       subtitle: "South Brisbane, QLD 4101",
 *       status: "1923713518",
 *       questionsAnswered: 0,
 *       totalQuestions: 13,
 *       progressPercentage: 0
 *     }
 *   ]
 * }
 */
router.get('/dashboard-data', authenticateJWT, async (req, res) => {
  try {
    const contactId = req.user.contactId;

    if (!contactId) {
      console.log(`[Client Dashboard] ⚠️ No contactId found in auth token`);
      return res.status(400).json({ error: 'Contact ID not found in session' });
    }

    console.log(`[Client Dashboard] 📊 Fetching deals for contact: ${contactId}`);

    // Step 1: Get associated deal IDs
    const dealIds = await associationsIntegration.getContactDeals(contactId);

    if (dealIds.length === 0) {
      console.log(`[Client Dashboard] ℹ️ No deals found, returning empty array`);
      return res.json({ deals: [] });
    }

    // Step 2: Batch fetch deal properties (including ALL questionnaire fields)
    const questionnaireProperties = getAllHubSpotProperties();
    const allProperties = [
      'dealname',
      'property_address',
      'dealstage',
      'number_of_owners',
      'is_draft', // Include is_draft to filter out draft deals
      ...questionnaireProperties
    ];

    console.log(`[Client Dashboard] 📦 Batch fetching ${dealIds.length} deals with ${allProperties.length} properties each`);

    const deals = await associationsIntegration.batchGetDealProperties(
      dealIds,
      allProperties
    );

    // Step 3: Transform deals for frontend (with questionnaire data)
    const propertyMapping = getAllMappings();
    const transformedDeals = deals
      .filter(deal => {
        // Filter out draft deals
        const isDraft = deal.properties?.is_draft === 'Yes' || deal.properties?.is_draft === 'yes';
        return !isDraft;
      })
      .map((deal, index) => {
        // Extract questionnaire data for this deal
        const questionnaireData = {};
        Object.entries(propertyMapping).forEach(([fieldName, config]) => {
          const hsValue = deal.properties[config.hsPropertyName];
          if (hsValue !== undefined && hsValue !== null && hsValue !== '') {
            questionnaireData[fieldName] = hsValue;
          }
        });

        return {
          id: deal.id,
          index: index,
          title: extractTitle(deal.properties.property_address || deal.properties.dealname || 'Untitled'),
          subtitle: extractSubtitle(deal.properties.property_address),
          status: deal.properties.dealstage || 'Unknown',
          questionsAnswered: Object.keys(questionnaireData).length,
          totalQuestions: Object.keys(propertyMapping).length,
          progressPercentage: Math.round((Object.keys(questionnaireData).length / Object.keys(propertyMapping).length) * 100),
          questionnaire: questionnaireData  // Include questionnaire data here!
        };
      });

    console.log(`[Client Dashboard] ✅ Returning ${transformedDeals.length} deals (drafts filtered out)`);
    res.json({ deals: transformedDeals });

  } catch (error) {
    console.error(`[Client Dashboard] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/client/dashboard-complete
 * Returns ALL data needed for entire client session in ONE API call:
 * - All deals with questionnaire data
 * - All property details (seller, agent, agency) for each deal
 * - Optimized for immediate display with zero additional API calls
 *
 * Response:
 * {
 *   deals: [
 *     {
 *       id: "168359414202",
 *       title: "143 Sinnathamby",
 *       subtitle: "South Brisbane, QLD 4101",
 *       status: "1923713518",
 *       questionnaire: { body_corporate: "Yes", ... },
 *       propertyDetails: {
 *         primarySeller: { fullName: "...", email: "...", phone: "..." },
 *         additionalSeller: { ... },
 *         agency: { name: "...", phone: "..." },
 *         agent: { fullName: "...", phone: "...", email: "..." }
 *       }
 *     }
 *   ]
 * }
 */
router.get('/dashboard-complete', authenticateJWT, async (req, res) => {
  try {
    const contactId = req.user.contactId;

    if (!contactId) {
      console.log(`[Dashboard Complete] ⚠️ No contactId found in auth token`);
      return res.status(400).json({ error: 'Contact ID not found in session' });
    }

    console.log(`[Dashboard Complete] 🚀 Fetching complete dashboard data for contact: ${contactId}`);

    // Step 1: Get associated deal IDs
    const dealIds = await associationsIntegration.getContactDeals(contactId);

    if (dealIds.length === 0) {
      console.log(`[Dashboard Complete] ℹ️ No deals found, returning empty array`);
      return res.json({ deals: [] });
    }

    // Step 2: Batch fetch ALL deal properties (including questionnaire)
    const questionnaireProperties = getAllHubSpotProperties();
    const allDealProperties = [
      'dealname',
      'property_address',
      'dealstage',
      'number_of_owners',
      'is_draft', // Include is_draft to filter out draft deals
      'agent_title_search', // Did agent complete title search?
      'agent_title_search_file', // Agent's title search file ID
      ...questionnaireProperties
    ];

    console.log(`[Dashboard Complete] 📦 Batch fetching ${dealIds.length} deals with ${allDealProperties.length} properties each`);

    const deals = await associationsIntegration.batchGetDealProperties(
      dealIds,
      allDealProperties
    );

    // Step 3: For each deal, fetch associations (contacts, companies)
    const propertyMapping = getAllMappings();
    const completeDeals = await Promise.all(deals.map(async (deal, index) => {
      console.log(`[Dashboard Complete] 🔄 Processing deal ${index + 1}/${deals.length}: ${deal.id}`);

      // Extract questionnaire data
      const questionnaireData = {};
      Object.entries(propertyMapping).forEach(([fieldName, config]) => {
        const hsValue = deal.properties[config.hsPropertyName];
        if (hsValue !== undefined && hsValue !== null && hsValue !== '') {
          questionnaireData[fieldName] = hsValue;
        }
      });

      // Fetch associations for this deal
      let propertyDetails = {
        primarySeller: { id: null, fullName: 'N/A', email: 'N/A', phone: 'N/A', residentialAddress: 'N/A' },
        additionalSeller: { id: null, fullName: 'N/A', email: 'N/A', phone: 'N/A' },
        agency: { name: 'N/A', phone: 'N/A' },
        agent: { fullName: 'N/A', phone: 'N/A', email: 'N/A' }
      };

      try {
        // Fetch contacts and companies for this deal
        const dealContacts = await associationsIntegration.getDealContacts(deal.id);
        const dealCompanies = await associationsIntegration.getDealCompanies(deal.id);

        // Process contacts (primary seller, additional seller, agent)
        let primarySeller = null;
        let additionalSellers = [];
        let agent = null;

        for (const contact of dealContacts) {
          const props = contact.properties;
          if (!props.firstname || !props.lastname) continue;

          const contactData = {
            id: contact.id,
            firstname: props.firstname || '',
            lastname: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            address: props.address || ''
          };

          // Check if agent by contact_type
          const contactType = props.contact_type || '';
          const isAgentType = contactType.toLowerCase() === 'agent';

          if (isAgentType && !agent) {
            agent = contactData;
          } else {
            // Check if this is the authenticated user
            if (contact.id === contactId) {
              primarySeller = contactData;
            } else {
              additionalSellers.push(contactData);
            }
          }
        }

        // If authenticated user is not in the contacts, fallback to first non-agent contact
        if (!primarySeller && additionalSellers.length > 0) {
          primarySeller = additionalSellers.shift();
        }

        // If no primary seller found, use authenticated contact
        if (!primarySeller) {
          const primarySellerContact = await contactsIntegration.getContact(contactId);
          if (primarySellerContact) {
            primarySeller = {
              id: primarySellerContact.id,
              firstname: primarySellerContact.properties.firstname || '',
              lastname: primarySellerContact.properties.lastname || '',
              email: primarySellerContact.properties.email || '',
              phone: primarySellerContact.properties.phone || '',
              address: primarySellerContact.properties.address || ''
            };
          }
        }

        // Process companies (agency)
        let agencyData = null;
        if (dealCompanies.length > 0) {
          const firstCompany = dealCompanies[0];
          agencyData = {
            id: firstCompany.id,
            name: firstCompany.properties.name || 'N/A',
            email: firstCompany.properties.email || '',
            phone: firstCompany.properties.phone || 'N/A'
          };
        }

        // Build property details
        propertyDetails = {
          primarySeller: {
            id: primarySeller?.id || null,
            fullName: `${primarySeller?.firstname || ''} ${primarySeller?.lastname || ''}`.trim() || 'N/A',
            email: primarySeller?.email || 'N/A',
            phone: primarySeller?.phone || 'N/A',
            residentialAddress: primarySeller?.address || 'N/A'
          },
          additionalSeller: {
            id: additionalSellers.length > 0 ? additionalSellers[0].id : null,
            fullName: additionalSellers.length > 0
              ? `${additionalSellers[0].firstname} ${additionalSellers[0].lastname}`.trim()
              : 'N/A',
            email: additionalSellers.length > 0 ? additionalSellers[0].email : 'N/A',
            phone: additionalSellers.length > 0 ? additionalSellers[0].phone : 'N/A'
          },
          agency: {
            name: agencyData?.name || 'N/A',
            phone: agencyData?.phone || 'N/A'
          },
          agent: {
            fullName: agent ? `${agent.firstname} ${agent.lastname}`.trim() : 'N/A',
            phone: agent?.phone || 'N/A',
            email: agent?.email || 'N/A'
          }
        };

        console.log(`[Dashboard Complete] ✅ Deal ${deal.id} processed - ${Object.keys(questionnaireData).length} questionnaire fields`);
      } catch (err) {
        console.error(`[Dashboard Complete] ⚠️ Error processing deal ${deal.id} associations:`, err.message);
        // Continue with default N/A values
      }

      // Fetch file uploads
      let files = {};
      try {
        files = await filesIntegration.getQuestionnaireFiles(deal.id, deal.properties);
        console.log(`[Dashboard Complete] 📎 Deal ${deal.id} - Fetched files for ${Object.keys(files).length} fields`);
      } catch (fileErr) {
        console.error(`[Dashboard Complete] ⚠️ Error fetching files for deal ${deal.id}:`, fileErr.message);
        // Continue with empty files object
      }

      // Fetch agent title search file if it exists
      let agentTitleSearchFileData = null;
      const agentTitleSearchFileId = deal.properties.agent_title_search_file;

      if (agentTitleSearchFileId && agentTitleSearchFileId !== 'null' && agentTitleSearchFileId !== '') {
        try {
          agentTitleSearchFileData = await filesIntegration.getFileSignedUrl(agentTitleSearchFileId);
          console.log(`[Dashboard Complete] 📄 Deal ${deal.id} - Fetched agent title search file: ${agentTitleSearchFileData?.name}`);
        } catch (agentFileErr) {
          console.error(`[Dashboard Complete] ⚠️ Error fetching agent title search file ${agentTitleSearchFileId}:`, agentFileErr.message);
          // Continue without file data
        }
      }

      const dealstage = deal.properties.dealstage || 'Unknown';
      console.log(`[Dashboard Complete] 📊 Deal ${deal.id} - Stage: ${dealstage}`);

      return {
        id: deal.id,
        index: index,
        title: extractTitle(deal.properties.property_address || deal.properties.dealname || 'Untitled'),
        subtitle: extractSubtitle(deal.properties.property_address),
        status: dealstage,
        questionsAnswered: Object.keys(questionnaireData).length,
        totalQuestions: Object.keys(propertyMapping).length,
        progressPercentage: Math.round((Object.keys(questionnaireData).length / Object.keys(propertyMapping).length) * 100),
        questionnaire: questionnaireData,
        propertyDetails: propertyDetails,
        files: files,
        agentTitleSearch: deal.properties.agent_title_search || null,
        agentTitleSearchFile: agentTitleSearchFileData
      };
    }));

    // Filter out draft deals - clients should NOT see drafts
    const clientVisibleDeals = completeDeals.filter(deal => {
      // Check if deal is a draft using is_draft property
      const isDraft = deal.properties?.is_draft === 'Yes' || deal.properties?.is_draft === 'yes';
      
      if (isDraft) {
        console.log(`[Dashboard Complete] 🚫 Filtering out draft deal: ${deal.id}`);
        return false;
      }
      
      return true;
    });

    console.log(`[Dashboard Complete] 🎉 Returning ${clientVisibleDeals.length} client-visible deals (filtered out ${completeDeals.length - clientVisibleDeals.length} drafts)`);
    res.json({ deals: clientVisibleDeals });

  } catch (error) {
    console.error(`[Dashboard Complete] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch complete dashboard data' });
  }
});

/**
 * Extract title from full address
 * "143 Sinnathamby, South Brisbane, QLD 4101" → "143 Sinnathamby"
 */
function extractTitle(fullAddress) {
  if (!fullAddress) return 'Untitled Property';
  const parts = fullAddress.split(',');
  return parts[0].trim();
}

/**
 * Extract subtitle from full address
 * "143 Sinnathamby, South Brisbane, QLD 4101" → "South Brisbane, QLD 4101"
 */
function extractSubtitle(fullAddress) {
  if (!fullAddress) return 'Location TBD';

  const parts = fullAddress.split(',');
  if (parts.length > 1) {
    return parts.slice(1).map(p => p.trim()).join(', ');
  }
  return fullAddress;
}

/**
 * GET /api/client/property/:dealId
 * Returns complete property information including seller, agency, and agent details
 * Requires authentication
 */
router.get('/property/:dealId', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.params;
    const contactId = req.user.contactId;

    console.log(`[Client Dashboard] 📋 Fetching property details for deal: ${dealId}`);

    // Step 1: Fetch deal details (including all questionnaire properties)
    const questionnaireProperties = getAllHubSpotProperties();
    const allProperties = [
      'dealname',
      'property_address',
      'dealstage',
      'number_of_owners',
      ...questionnaireProperties
    ];

    console.log(`[Client Dashboard] 📦 Fetching ${allProperties.length} properties (base: 4, questionnaire: ${questionnaireProperties.length})`);

    const dealResponse = await associationsIntegration.batchGetDealProperties(
      [dealId],
      allProperties
    );

    if (!dealResponse || dealResponse.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = dealResponse[0];

    // Step 2: Get deal associations (primary seller, agency, agent, additional seller)
    let associations = {
      primary_seller: null,
      agency: null,
      agent: null,
      additional_seller: null
    };

    try {
      // Fetch all contacts associated with this deal
      const dealContacts = await associationsIntegration.getDealContacts(dealId);
      console.log(`[Client Dashboard] 👥 Found ${dealContacts.length} contacts for deal`);

      // Fetch all companies (agencies) associated with this deal
      const dealCompanies = await associationsIntegration.getDealCompanies(dealId);
      console.log(`[Client Dashboard] 🏢 Found ${dealCompanies.length} companies for deal`);

      // Process contacts with intelligent role assignment based on association types
      let primarySeller = null;
      let additionalSellers = [];
      let agent = null;

      // HubSpot association types (USER_DEFINED):
      // - Type 1: Primary Seller
      // - Type 4: Additional Seller
      // - Type 6: Agent/Listing Salesperson

      // First pass: assign roles based on association types if available
      for (const contact of dealContacts) {
        const props = contact.properties;
        const associationTypes = contact.associationTypes || [];
        const contactType = contact.type; // May be "deal_to_contact" label

        if (!props.firstname || !props.lastname) continue;

        const contactData = {
          id: contact.id,
          firstname: props.firstname || '',
          lastname: props.lastname || '',
          email: props.email || '',
          phone: props.phone || ''
        };

        // Check association type metadata
        let isAgent = false;
        let isAdditionalSeller = false;
        let isPrimarySeller = false;

        console.log(`[Client Dashboard] 🔍 Contact ${contact.id} - Type field: ${contactType}`);

        // Try to extract type from associationTypes array first
        if (Array.isArray(associationTypes) && associationTypes.length > 0) {
          for (const assocType of associationTypes) {
            const typeId = assocType.associationTypeId || assocType.type || assocType.id;
            const typeLabel = assocType.label;

            console.log(`[Client Dashboard] 🔍    AssociationType - ID: ${typeId}, Label: ${typeLabel}`);

            // Match by numeric ID
            if (typeId === 6 || typeId === '6') {
              isAgent = true;
            } else if (typeId === 4 || typeId === '4') {
              isAdditionalSeller = true;
            } else if (typeId === 1 || typeId === '1') {
              isPrimarySeller = true;
            }
            // Match by label if numeric ID not found
            else if (typeLabel) {
              if (typeLabel.includes('agent') || typeLabel.includes('6')) {
                isAgent = true;
              } else if (typeLabel.includes('additional') || typeLabel.includes('4')) {
                isAdditionalSeller = true;
              } else if (typeLabel.includes('primary') || typeLabel.includes('1')) {
                isPrimarySeller = true;
              }
            }
          }
        }

        // If no type found in associationTypes, we'll use heuristic in pass 2
        // But log that we couldn't determine the type
        if (!isAgent && !isAdditionalSeller && !isPrimarySeller) {
          console.log(`[Client Dashboard] ℹ️ Contact ${contact.id} - No association type detected, will use heuristic`);
        }

        // Assign based on type metadata
        if (isAgent) {
          agent = contactData;
          console.log(`[Client Dashboard] 👤 Agent assigned: ${contactData.firstname} ${contactData.lastname}`);
        } else if (isAdditionalSeller) {
          additionalSellers.push(contactData);
          console.log(`[Client Dashboard] 👥 Additional seller assigned: ${contactData.firstname} ${contactData.lastname}`);
        } else if (isPrimarySeller) {
          primarySeller = contactData;
          console.log(`[Client Dashboard] 👤 Primary seller assigned: ${contactData.firstname} ${contactData.lastname}`);
        }
      }

      // IMPORTANT: Override with authenticated user if they're marked as additional seller
      // The authenticated user should ALWAYS be the primary seller in the client portal
      if (primarySeller && primarySeller.id !== contactId) {
        // Check if authenticated user is in additional sellers
        const authUserIndex = additionalSellers.findIndex(s => s.id === contactId);
        if (authUserIndex !== -1) {
          console.log(`[Client Dashboard] 🔄 Swapping authenticated user to primary seller`);
          // Move current primary to additional sellers
          additionalSellers.push(primarySeller);
          // Make authenticated user the primary seller
          primarySeller = additionalSellers[authUserIndex];
          // Remove authenticated user from additional sellers
          additionalSellers.splice(authUserIndex, 1);
          console.log(`[Client Dashboard] ✅ Authenticated user is now primary seller: ${primarySeller.firstname} ${primarySeller.lastname}`);
        }
      }

      // Fallback: if no roles assigned by type, use heuristic based on contact properties
      if (!primarySeller && dealContacts.length > 0) {
        console.log(`[Client Dashboard] ℹ️ No type metadata found, using heuristic assignment`);

        let tempAdditionalSellers = [];
        
        for (let i = 0; i < dealContacts.length; i++) {
          const contact = dealContacts[i];
          const props = contact.properties;

          if (!props.firstname || !props.lastname) continue;

          const contactData = {
            id: contact.id,
            firstname: props.firstname || '',
            lastname: props.lastname || '',
            email: props.email || '',
            phone: props.phone || ''
          };

          // Check contact properties for hints about their role
          const contactType = props.contact_type || '';
          const isAgentType = contactType.toLowerCase() === 'agent';

          if (isAgentType && !agent) {
            // Contact marked as Agent type
            agent = contactData;
            console.log(`[Client Dashboard] 👤 Agent identified by contact_type: ${contactData.firstname} ${contactData.lastname}`);
          } else if (!isAgentType) {
            // Check if this is the authenticated user - they should be primary seller
            if (contact.id === contactId) {
              primarySeller = contactData;
              console.log(`[Client Dashboard] 👤 Primary seller (authenticated user): ${contactData.firstname} ${contactData.lastname}`);
            } else {
              // All other non-agent contacts are additional sellers
              tempAdditionalSellers.push(contactData);
              console.log(`[Client Dashboard] 👥 Additional seller (heuristic): ${contactData.firstname} ${contactData.lastname}`);
            }
          }
        }
        
        // If authenticated user is not in contacts, use first non-agent as primary seller
        if (!primarySeller && tempAdditionalSellers.length > 0) {
          primarySeller = tempAdditionalSellers.shift();
          console.log(`[Client Dashboard] 👤 Primary seller (fallback to first): ${primarySeller.firstname} ${primarySeller.lastname}`);
        }
        
        // Add remaining contacts to additionalSellers
        additionalSellers.push(...tempAdditionalSellers);
      }

      // If we have no primary seller, use authenticated contact
      if (!primarySeller) {
        const primarySellerContact = await contactsIntegration.getContact(contactId);
        if (primarySellerContact) {
          primarySeller = {
            id: primarySellerContact.id,
            firstname: primarySellerContact.properties.firstname || '',
            lastname: primarySellerContact.properties.lastname || '',
            email: primarySellerContact.properties.email || '',
            phone: primarySellerContact.properties.phone || ''
          };
        }
      }

      // Process companies (agencies)
      let agencyData = null;
      if (dealCompanies.length > 0) {
        const firstCompany = dealCompanies[0];
        agencyData = {
          id: firstCompany.id,
          name: firstCompany.properties.name || 'N/A',
          email: firstCompany.properties.email || '',
          phone: firstCompany.properties.phone || 'N/A'
        };
        console.log(`[Client Dashboard] 🏢 Agency found: ${agencyData.name}`);
      }

      // Set associations
      associations.primary_seller = primarySeller;
      associations.agency = agencyData;
      associations.agent = agent;
      associations.additional_seller = additionalSellers.length > 0 ? additionalSellers[0] : null;

      console.log(`[Client Dashboard] ✅ Deal associations processed`);
    } catch (error) {
      console.error(`[Client Dashboard] ⚠️ Error fetching associations:`, error.message);
      // Fallback: use authenticated contact as primary seller
      try {
        const primarySellerContact = await contactsIntegration.getContact(contactId);
        if (primarySellerContact) {
          associations.primary_seller = {
            id: primarySellerContact.id,
            firstname: primarySellerContact.properties.firstname || '',
            lastname: primarySellerContact.properties.lastname || '',
            email: primarySellerContact.properties.email || '',
            phone: primarySellerContact.properties.phone || ''
          };
        }
      } catch (fallbackErr) {
        console.error(`[Client Dashboard] ❌ Fallback contact fetch failed`);
      }
    }

    // Step 3: Transform response
    // Extract questionnaire data from deal properties
    const propertyMapping = getAllMappings();
    const questionnaireData = {};
    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      const hsValue = deal.properties[config.hsPropertyName];
      if (hsValue !== undefined && hsValue !== null && hsValue !== '') {
        questionnaireData[fieldName] = hsValue;
      }
    });

    console.log(`[Client Dashboard] 📋 Questionnaire data extracted: ${Object.keys(questionnaireData).length} fields with values`);
    if (Object.keys(questionnaireData).length > 0) {
      console.log(`[Client Dashboard] 📝 Sample fields:`, Object.keys(questionnaireData).slice(0, 5));
    }

    const propertyInfo = {
      dealId: deal.id,
      dealName: deal.properties.dealname || 'Untitled Deal',
      propertyAddress: deal.properties.property_address || 'N/A',
      dealStage: deal.properties.dealstage || 'Unknown',
      numberOfOwners: deal.properties.number_of_owners || 1,

      // Seller Information
      primarySeller: {
        fullName: `${associations.primary_seller?.firstname || ''} ${associations.primary_seller?.lastname || ''}`.trim() || 'N/A',
        email: associations.primary_seller?.email || 'N/A',
        phone: associations.primary_seller?.phone || 'N/A',
        residentialAddress: associations.primary_seller?.address || 'N/A'
      },
      additionalSeller: {
        fullName: `${associations.additional_seller?.firstname || ''} ${associations.additional_seller?.lastname || ''}`.trim() || 'N/A',
        email: associations.additional_seller?.email || 'N/A',
        phone: associations.additional_seller?.phone || 'N/A'
      },

      // Agency Information
      agency: {
        name: associations.agency?.name || 'N/A',
        phone: associations.agency?.phone || 'N/A'
      },

      // Agent Information
      agent: {
        fullName: associations.agent ? `${associations.agent.firstname} ${associations.agent.lastname}`.trim() : 'N/A',
        phone: associations.agent?.phone || 'N/A',
        email: associations.agent?.email || 'N/A'
      },

      // Next steps (placeholder)
      nextStep: 'Complete property questionnaire',

      // Questionnaire data (all fields pre-loaded)
      questionnaire: questionnaireData
    };

    console.log(`[Client Dashboard] ✅ Property details fetched successfully`);
    res.json(propertyInfo);

  } catch (error) {
    console.error(`[Client Dashboard] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch property details' });
  }
});

/**
 * REMOVED: GET /api/client/property/:dealId/questionnaire
 * This endpoint has been removed as part of Phase 2 optimization.
 * Questionnaire data is now included in GET /api/client/dashboard-complete
 * to reduce API calls from 3+ to 1 per session.
 */

/**
 * POST /api/client/property/:dealId/questionnaire
 * Save questionnaire data (partial or complete)
 */
router.post('/property/:dealId/questionnaire', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.params;
    const formData = req.body;

    console.log(`[Questionnaire] 💾 Saving questionnaire data for deal: ${dealId}`);
    console.log(`[Questionnaire] 📝 Received ${Object.keys(formData).length} fields`);

    // Transform form field names to HubSpot property names
    const propertyMapping = getAllMappings();
    const properties = {};

    Object.entries(formData).forEach(([fieldName, value]) => {
      const config = propertyMapping[fieldName];
      if (config) {
        // Capitalize yes/no/unsure for HubSpot enumeration fields
        let hubspotValue = value;
        if (config.hsPropertyType === 'enumeration' && typeof value === 'string') {
          // Capitalize first letter: 'yes' -> 'Yes', 'no' -> 'No', 'unsure' -> 'Unsure'
          hubspotValue = value.charAt(0).toUpperCase() + value.slice(1);
        }
        properties[config.hsPropertyName] = hubspotValue;
      }
    });

    // Clear all hidden conditional fields (Bug Fix: Q2.1 and Q2.2 sub-questions)
    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.conditional && config.conditionalOn) {
        const { field, value } = config.conditionalOn;
        
        // If parent field doesn't match required value, nullify this field
        if (formData[field] !== value) {
          properties[config.hsPropertyName] = '';
          console.log(`[Questionnaire] 🧹 Clearing hidden field: ${fieldName} (parent: ${field})`);
        }
      }
    });

    // Update deal in HubSpot
    await dealsIntegration.updateDeal(dealId, properties);

    console.log(`[Questionnaire] ✅ Questionnaire saved - ${Object.keys(properties).length} properties updated`);
    res.json({ success: true, message: 'Questionnaire saved successfully' });

  } catch (error) {
    console.error(`[Questionnaire] ❌ Error saving questionnaire:`, error.message);
    res.status(500).json({ error: 'Failed to save questionnaire data' });
  }
});

/**
 * POST /api/client/property/:dealId/questionnaire/submit
 * Submit complete questionnaire (with validation)
 */
router.post('/property/:dealId/questionnaire/submit', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.params;
    const formData = req.body;

    console.log(`[Questionnaire] ✅ Submitting complete questionnaire for deal: ${dealId}`);

    // Check if user opted to skip rates notice (HubSpot enumeration: 'Yes' or null)
    const skipRatesNotice = formData.skip_rates_notice === 'yes' || formData.skip_rates_notice === 'Yes';
    if (skipRatesNotice) {
      console.log(`[Questionnaire] ⏭️ User opted to send rates notice separately`);
    }

    // Validate all required fields
    const propertyMapping = getAllMappings();
    const missingFields = [];

    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.required && (!formData[fieldName] || formData[fieldName] === '')) {
        // Skip rates notice fields if user opted to send separately
        if (skipRatesNotice && (fieldName === 'rates_notice_upload' || fieldName === 'water_notice_upload')) {
          console.log(`[Questionnaire] ⏭️ Skipping validation for ${fieldName} (will send separately)`);
          return;
        }

        // Skip conditional fields that are not visible
        if (config.conditional && config.conditionalOn) {
          const { field, value } = config.conditionalOn;
          if (formData[field] !== value) {
            return; // Skip this field
          }
        }
        missingFields.push(fieldName);
      }
    });

    if (missingFields.length > 0) {
      console.log(`[Questionnaire] ⚠️ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    // Transform and save
    const properties = {};
    Object.entries(formData).forEach(([fieldName, value]) => {
      const config = propertyMapping[fieldName];
      if (config) {
        // Capitalize yes/no/unsure for HubSpot enumeration fields
        let hubspotValue = value;
        if (config.hsPropertyType === 'enumeration' && typeof value === 'string') {
          // Capitalize first letter: 'yes' -> 'Yes', 'no' -> 'No', 'unsure' -> 'Unsure'
          hubspotValue = value.charAt(0).toUpperCase() + value.slice(1);
        }
        properties[config.hsPropertyName] = hubspotValue;
      }
    });

    // Clear all hidden conditional fields (Bug Fix: Q2.1 and Q2.2 sub-questions)
    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.conditional && config.conditionalOn) {
        const { field, value } = config.conditionalOn;
        
        // If parent field doesn't match required value, nullify this field
        if (formData[field] !== value) {
          properties[config.hsPropertyName] = '';
          console.log(`[Questionnaire] 🧹 Clearing hidden field: ${fieldName} (parent: ${field})`);
        }
      }
    });

    await dealsIntegration.updateDeal(dealId, properties);

    console.log(`[Questionnaire] ✅ Questionnaire submitted successfully`);
    res.json({ success: true, message: 'Questionnaire submitted successfully' });

  } catch (error) {
    console.error(`[Questionnaire] ❌ Error submitting questionnaire:`, error.message);
    res.status(500).json({ error: 'Failed to submit questionnaire' });
  }
});

/**
 * PATCH /api/client/contact/:contactId
 * Update contact information (for Step 1 editing)
 */
router.patch('/contact/:contactId', authenticateJWT, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { firstname, lastname, email, phone, address } = req.body;

    // Verify user has permission to update this contact
    // User can update themselves or additional sellers on their deals
    const userContactId = req.user.contactId;

    console.log(`[Update Contact] 📝 Updating contact ${contactId} (requested by ${userContactId})`);

    // Get user's deals to verify they have access to this contact
    const userDeals = await associationsIntegration.getContactDeals(userContactId);
    let hasAccess = false;

    if (contactId === userContactId) {
      hasAccess = true; // User updating themselves
    } else {
      // Check if this contact is on any of the user's deals
      for (const dealId of userDeals) {
        const dealContacts = await associationsIntegration.getDealContacts(dealId);
        if (dealContacts.some(c => c.id === contactId)) {
          hasAccess = true;
          break;
        }
      }
    }

    if (!hasAccess) {
      console.log(`[Update Contact] ❌ Access denied for contact ${contactId}`);
      return res.status(403).json({ error: 'You do not have permission to update this contact' });
    }

    // Update contact in HubSpot
    const updates = {};
    if (firstname !== undefined) updates.firstname = firstname;
    if (lastname !== undefined) updates.lastname = lastname;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;

    await contactsIntegration.updateContact(contactId, updates);

    console.log(`[Update Contact] ✅ Contact ${contactId} updated successfully`);
    res.json({ success: true, message: 'Contact updated successfully' });

  } catch (error) {
    console.error(`[Update Contact] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to update contact information' });
  }
});

/**
 * PATCH /api/client/property/:dealId/info
 * Update deal property information (property address, agent title search status)
 */
router.patch('/property/:dealId/info', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { property_address, agent_title_search } = req.body;

    console.log(`[Update Deal Info] 📝 Updating deal ${dealId}`);

    // Verify user has access to this deal
    const userContactId = req.user.contactId;
    const userDeals = await associationsIntegration.getContactDeals(userContactId);

    if (!userDeals.includes(dealId)) {
      console.log(`[Update Deal Info] ❌ Access denied for deal ${dealId}`);
      return res.status(403).json({ error: 'You do not have permission to update this deal' });
    }

    // Build update payload
    const updates = {};
    if (property_address !== undefined) {
      updates.property_address = property_address;
      console.log(`[Update Deal Info] 🏠 Updating property address: ${property_address}`);
    }
    if (agent_title_search !== undefined) {
      updates.agent_title_search = agent_title_search;
      console.log(`[Update Deal Info] 📋 Updating agent title search: ${agent_title_search}`);

      // If setting to "No", clear the file
      if (agent_title_search === 'No') {
        updates.agent_title_search_file = '';
        console.log(`[Update Deal Info] 🗑️  Clearing agent title search file`);
      }
    }

    await dealsIntegration.updateDeal(dealId, updates);

    console.log(`[Update Deal Info] ✅ Deal ${dealId} updated successfully`);
    res.json({ success: true, message: 'Property information updated successfully' });

  } catch (error) {
    console.error(`[Update Deal Info] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to update property information' });
  }
});

/**
 * POST /api/client/property/:dealId/agent-title-search-file
 * Upload agent title search file (when client has it)
 */
router.post('/property/:dealId/agent-title-search-file', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    const { dealId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[Agent Title Search Upload] 📤 Uploading file for deal ${dealId}: ${file.originalname}`);

    // Verify user has access to this deal
    const userContactId = req.user.contactId;
    const userDeals = await associationsIntegration.getContactDeals(userContactId);

    if (!userDeals.includes(dealId)) {
      console.log(`[Agent Title Search Upload] ❌ Access denied for deal ${dealId}`);
      return res.status(403).json({ error: 'You do not have permission to upload files for this deal' });
    }

    // Upload file to HubSpot
    const uploadedFiles = await filesIntegration.uploadMultipleFiles([file], {
      folderPath: `/agent-title-search/${dealId}`,
      access: 'PRIVATE'
    });

    const fileId = uploadedFiles[0];
    console.log(`[Agent Title Search Upload] ✅ File uploaded to HubSpot: ${fileId}`);

    // Update deal with file ID
    await dealsIntegration.updateDeal(dealId, {
      agent_title_search: 'Yes',
      agent_title_search_file: fileId
    });

    console.log(`[Agent Title Search Upload] ✅ Deal ${dealId} updated with file ID`);

    // Get signed URL for immediate display
    const fileData = await filesIntegration.getFileSignedUrl(fileId);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileData
    });

  } catch (error) {
    console.error(`[Agent Title Search Upload] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * PATCH /api/client/property/:dealId/stage
 * Update deal stage (step progression)
 * Valid stages: 1923713518 (Step 1), 1923713520 (Step 2), 1923682791 (Step 3), 1923682792 (Step 4), 1924069846 (Step 5)
 */
router.patch('/property/:dealId/stage', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.params;
    const { stage, stepNumber } = req.body;

    // Validate stage ID
    const validStages = {
      1: '1923713518',
      2: '1923713520',
      3: '1923682791',
      4: '1923682792',
      5: '1924069846'
    };

    if (!stepNumber || !validStages[stepNumber]) {
      return res.status(400).json({
        error: 'Invalid step number. Must be 1-5.'
      });
    }

    const dealstage = validStages[stepNumber];

    console.log(`[Deal Stage] 📊 Updating deal ${dealId} to step ${stepNumber} (stage: ${dealstage})`);

    // Prepare update payload
    const updatePayload = { dealstage };

    // If moving to Step 4 (Quote Accepted - Awaiting Retainer), determine which searches to order
    if (stepNumber === 4) {
      console.log(`[Deal Stage] 🔍 Quote accepted - determining which searches to order`);

      try {
        // Fetch deal data with all questionnaire properties
        const propertiesToFetch = [
          'dealname',
          'property_address',
          'hs_contact_id',
          'contact_id',
          'agent_title_search', // Check if agent already did title search
          ...getAllHubSpotProperties()
        ];

        const deal = await dealsIntegration.getDeal(dealId, propertiesToFetch);
        const mappings = getAllMappings();

        // Extract questionnaire data from deal properties
        const propertyData = {};
        Object.entries(mappings).forEach(([formField, config]) => {
          const hsPropertyName = config.hsPropertyName;
          const rawValue = deal.properties[hsPropertyName];

          if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            const normalizedValue = typeof rawValue === 'string' ? rawValue.toLowerCase() : rawValue;
            propertyData[formField] = normalizedValue;
          }
        });

        // Get client data (for title_search_done exclusion from contact)
        const clientData = {};
        const contactId = deal.properties.hs_contact_id || deal.properties.contact_id;

        if (contactId) {
          try {
            const contact = await contactsIntegration.getContact(contactId);
            if (contact && contact.properties.title_search_done) {
              const value = contact.properties.title_search_done;
              clientData.title_search_done = typeof value === 'string' ? value.toLowerCase() : value;
            }
          } catch (err) {
            console.warn('[Deal Stage] Could not fetch contact data:', err.message);
          }
        }

        // Get deal-specific data (for agent_title_search exclusion from deal)
        const dealData = {};
        if (deal.properties.agent_title_search) {
          dealData.agent_title_search = deal.properties.agent_title_search; // Keep original case
        }

        // Calculate quote to determine which searches are included
        const quote = calculateQuote(propertyData, clientData, dealData);

        console.log(`[Deal Stage] 📋 Quote breakdown:`, JSON.stringify(quote.breakdown, null, 2));

        // Map search names to HubSpot property names
        const searchNameToPropertyMap = {
          'Title Search': 'title_search',
          'Plan Image Search': 'plan_image_search',
          'Information Certificate': 'information_certificate',
          'CMS + Dealing Certificate': 'cms_and_dealing_certificate',
          'TMR Search': 'tmr_search',
          'DES: Contaminated Land Search': 'des_contaminated_land_search',
          'DES: Heritage Search': 'des_heritage_search'
        };

        // Initialize all search properties to "No" / "Not Required"
        const searchProperties = {
          cms_and_dealing_certificate: "No",
          cms_and_dealing_certificate_status: "Not Required",
          des_contaminated_land_search: "No",
          des_contaminated_land_search_status: "Not Required",
          des_heritage_search: "No",
          des_heritage_search_status: "Not Required",
          tmr_search: "No",
          tmr_search_status: "Not Required",
          information_certificate: "No",
          information_certificate_status: "Not Required",
          plan_image_search: "No",
          plan_image_search_status: "Not Required",
          title_search: "No",
          title_search_status: "Not Required"
        };

        // Update only the searches that are included in the quote
        quote.breakdown.forEach(search => {
          if (search.included) {
            const propertyName = searchNameToPropertyMap[search.name];
            if (propertyName) {
              searchProperties[propertyName] = "Yes";
              searchProperties[`${propertyName}_status`] = "Ordered";
              console.log(`[Deal Stage]   ✓ ${search.name} → ${propertyName} = Yes/Ordered`);
            }
          } else {
            const propertyName = searchNameToPropertyMap[search.name];
            if (propertyName) {
              console.log(`[Deal Stage]   ✗ ${search.name} → ${propertyName} = No/Not Required (${search.reason})`);
            }
          }
        });

        // Add search properties to update payload
        Object.assign(updatePayload, searchProperties);

        console.log(`[Deal Stage] ✅ Property search fields determined based on quote`);

      } catch (error) {
        console.error(`[Deal Stage] ⚠️  Error calculating searches, skipping search updates:`, error.message);
        // Continue with stage update even if search calculation fails
      }

      // ==================================================================
      // CONVERT SMOKEBALL LEAD TO MATTER (Quote Accepted)
      // ==================================================================
      try {
        console.log(`[Deal Stage] 🎯 Quote accepted - converting Smokeball lead to matter`);

        // Get lead_uid and property address from deal
        const leadDeal = await dealsIntegration.getDeal(dealId, ['lead_uid', 'property_address']);
        const leadUid = leadDeal.properties.lead_uid;
        const propertyAddress = leadDeal.properties.property_address;

        if (!leadUid) {
          console.warn(`[Deal Stage] ⚠️  No lead_uid found - skipping Smokeball conversion`);
        } else {
          console.log(`[Deal Stage] 📋 Lead UID: ${leadUid}`);

          // Extract state from property address
          const stateMatch = propertyAddress?.match(/(NSW|QLD|VIC|SA|WA|TAS|NT|ACT)/i);
          if (!stateMatch) {
            throw new Error(`Could not extract state from address: ${propertyAddress}`);
          }

          const stateCode = stateMatch[1].toUpperCase();
          const stateMap = {
            'NSW': 'New South Wales',
            'QLD': 'Queensland',
            'VIC': 'Victoria',
            'SA': 'South Australia',
            'WA': 'Western Australia',
            'TAS': 'Tasmania',
            'NT': 'Northern Territory',
            'ACT': 'Australian Capital Territory'
          };
          const stateName = stateMap[stateCode];

          console.log(`[Deal Stage] 🗺️  State: ${stateName} (${stateCode})`);

          // Get matter type dynamically (type:1 for Sale)
          const matterType = await smokeballMatterTypes.findMatterType(stateName, 'Conveyancing', 'Sale');
          
          if (!matterType) {
            throw new Error(`Could not find matter type for Conveyancing > Sale in ${stateName}`);
          }

          console.log(`[Deal Stage] ✅ Matter Type ID: ${matterType.id}`);
          console.log(`[Deal Stage] ✅ Client Role: ${matterType.clientRole}`);

          // Convert lead to matter
          await smokeballMatters.convertLeadToMatter(leadUid, matterType.id, matterType.clientRole);

          console.log(`[Deal Stage] ✅ Lead conversion initiated in Smokeball`);
          console.log(`[Deal Stage] 📨 Awaiting matter.converted webhook for matter number`);

          // Update HubSpot to flag conversion initiated
          updatePayload.smokeball_conversion_initiated = new Date().toISOString();
        }

      } catch (smokeballError) {
        console.error(`[Deal Stage] ⚠️  Smokeball conversion error:`, smokeballError.message);
        // Don't fail the whole stage update if Smokeball conversion fails
      }
    }

    // Update deal stage (and searches if applicable) in HubSpot
    await dealsIntegration.updateDeal(dealId, updatePayload);

    console.log(`[Deal Stage] ✅ Deal stage updated successfully`);
    res.json({
      success: true,
      message: `Deal stage updated to step ${stepNumber}`,
      dealstage,
      stepNumber
    });

  } catch (error) {
    console.error(`[Deal Stage] ❌ Error updating deal stage:`, error.message);
    res.status(500).json({ error: 'Failed to update deal stage' });
  }
});

/**
 * POST /api/client/property/:dealId/upload
 * Upload files for questionnaire (stores in HubSpot Files)
 */
router.post('/property/:dealId/upload', authenticateJWT, upload.array('files', 10), async (req, res) => {
  try {
    const { dealId } = req.params;
    const { fieldName } = req.body; // Which questionnaire field this file is for
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`[Upload] 📤 Uploading ${files.length} files for deal ${dealId}, field: ${fieldName}`);

    // Upload files to HubSpot
    const fileIds = await filesIntegration.uploadMultipleFiles(files, {
      folderPath: `/questionnaire-uploads/${dealId}`,
      access: 'PRIVATE'
    });

    console.log(`[Upload] ✅ Files uploaded to HubSpot: ${fileIds.join(', ')}`);

    // Update deal property with file ID(s)
    if (fieldName) {
      const fieldConfig = getFieldMapping(fieldName);

      if (fieldConfig && fieldConfig.hsPropertyName) {
        const hsPropertyName = fieldConfig.hsPropertyName;

        // Store file IDs as comma-separated string
        const fileIdString = fileIds.join(',');

        await filesIntegration.updateDealFileProperty(dealId, hsPropertyName, fileIdString);
        console.log(`[Upload] ✅ Deal ${dealId} updated with file IDs for ${hsPropertyName}`);
      }
    }

    res.json({
      success: true,
      fileIds,
      message: `${files.length} file(s) uploaded successfully`
    });

  } catch (error) {
    console.error(`[Upload] ❌ Error uploading files:`, error.message);
    console.error(error.stack);
    res.status(500).json({
      error: 'Failed to upload files',
      details: error.message
    });
  }
});

/**
 * GET /property/:dealId/file/:fileId/metadata
 * Get file metadata with signed download URL
 */
router.get('/property/:dealId/file/:fileId/metadata', authenticateJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log(`[File Metadata] 📎 Fetching metadata for file ${fileId}`);

    // Get file with signed URL
    const fileMetadata = await filesIntegration.getFileSignedUrl(fileId);

    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(fileMetadata);

  } catch (error) {
    console.error(`[File Metadata] ❌ Error fetching file metadata:`, error.message);
    res.status(500).json({
      error: 'Failed to fetch file metadata',
      details: error.message
    });
  }
});

/**
 * DELETE /property/:dealId/file/:fileId
 * Delete a file from HubSpot and remove from deal property
 */
router.delete('/property/:dealId/file/:fileId', authenticateJWT, async (req, res) => {
  try {
    const { dealId, fileId } = req.params;
    const { fieldName } = req.query; // Which questionnaire field this file belongs to

    console.log(`[Delete File] 🗑️  Deleting file ${fileId} for deal ${dealId}, field: ${fieldName}`);

    if (!fieldName) {
      return res.status(400).json({ error: 'fieldName query parameter is required' });
    }

    // Get the HubSpot property name from questionnaireHelper
    const fieldConfig = getFieldMapping(fieldName);

    if (!fieldConfig || !fieldConfig.hsPropertyName) {
      return res.status(400).json({ error: `Invalid fieldName: ${fieldName}` });
    }

    const hsPropertyName = fieldConfig.hsPropertyName;

    // Delete the file from HubSpot
    await filesIntegration.deleteFile(fileId);
    console.log(`[Delete File] ✅ File ${fileId} deleted from HubSpot`);

    // Remove file ID from deal property
    await filesIntegration.removeFileFromDealProperty(dealId, hsPropertyName, fileId);
    console.log(`[Delete File] ✅ File ID removed from deal property ${hsPropertyName}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error(`[Delete File] ❌ Error deleting file:`, error.message);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

export default router;
