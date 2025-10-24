/**
 * Client Portal Routes
 * Routes for client dashboard and related features
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import * as associationsIntegration from '../integrations/hubspot/associations.js';
import * as contactsIntegration from '../integrations/hubspot/contacts.js';
import * as companiesIntegration from '../integrations/hubspot/companies.js';

const router = express.Router();

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

    // Step 2: Batch fetch deal properties
    const deals = await associationsIntegration.batchGetDealProperties(
      dealIds,
      ['dealname', 'property_address', 'dealstage', 'number_of_owners']
    );

    // Step 3: Transform deals for frontend
    const transformedDeals = deals.map((deal, index) => ({
      id: deal.id,
      index: index,
      title: extractTitle(deal.properties.property_address || deal.properties.dealname || 'Untitled'),
      subtitle: extractSubtitle(deal.properties.property_address),
      status: deal.properties.dealstage || 'Unknown',
      questionsAnswered: 0,  // TODO: implement questionnaire tracking
      totalQuestions: 13,
      progressPercentage: 0
    }));

    console.log(`[Client Dashboard] ✅ Returning ${transformedDeals.length} deals`);
    res.json({ deals: transformedDeals });

  } catch (error) {
    console.error(`[Client Dashboard] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
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

    // Step 1: Fetch deal details
    const dealResponse = await associationsIntegration.batchGetDealProperties(
      [dealId],
      ['dealname', 'property_address', 'dealstage', 'number_of_owners']
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
        phone: associations.primary_seller?.phone || 'N/A'
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
      nextStep: 'Complete property questionnaire'
    };

    console.log(`[Client Dashboard] ✅ Property details fetched successfully`);
    res.json(propertyInfo);

  } catch (error) {
    console.error(`[Client Dashboard] ❌ Error:`, error.message);
    res.status(500).json({ error: 'Failed to fetch property details' });
  }
});

export default router;
