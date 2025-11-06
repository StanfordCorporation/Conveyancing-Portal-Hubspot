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
          } else if (!primarySeller) {
            primarySeller = contactData;
          } else {
            additionalSellers.push(contactData);
          }
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
        files: files
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

      // Fallback: if no roles assigned by type, use heuristic based on contact properties
      if (!primarySeller && dealContacts.length > 0) {
        console.log(`[Client Dashboard] ℹ️ No type metadata found, using heuristic assignment`);

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
          } else if (!primarySeller) {
            // First non-agent contact is primary seller
            primarySeller = contactData;
            console.log(`[Client Dashboard] 👤 Primary seller (heuristic): ${contactData.firstname} ${contactData.lastname}`);
          } else if (isAgentType) {
            // Agent type contact
            agent = contactData;
            console.log(`[Client Dashboard] 👤 Agent (heuristic): ${contactData.firstname} ${contactData.lastname}`);
          } else {
            // Additional seller
            additionalSellers.push(contactData);
            console.log(`[Client Dashboard] 👥 Additional seller (heuristic): ${contactData.firstname} ${contactData.lastname}`);
          }
        }
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

    // Validate all required fields
    const propertyMapping = getAllMappings();
    const missingFields = [];

    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.required && (!formData[fieldName] || formData[fieldName] === '')) {
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

    await dealsIntegration.updateDeal(dealId, properties);

    console.log(`[Questionnaire] ✅ Questionnaire submitted successfully`);
    res.json({ success: true, message: 'Questionnaire submitted successfully' });

  } catch (error) {
    console.error(`[Questionnaire] ❌ Error submitting questionnaire:`, error.message);
    res.status(500).json({ error: 'Failed to submit questionnaire' });
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

    // Update deal stage in HubSpot
    await dealsIntegration.updateDeal(dealId, { dealstage });

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
