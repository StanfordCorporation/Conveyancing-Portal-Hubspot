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
    let associations = { primary_seller: null, agency: null, agent: null, additional_seller: null };

    try {
      // Get associations for this deal
      const dealAssociationsResponse = await associationsIntegration.getContactDeals(contactId);

      // For now, we'll use the authenticated contact as primary seller
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

      // Try to get agency and agent associations from the deal
      // This would require querying deal associations, which needs additional implementation
      // For now, we'll set defaults
      associations.agency = { name: 'N/A', phone: 'N/A', agent_name: 'N/A', agent_phone: 'N/A', agent_email: 'N/A' };
      associations.additional_seller = { firstname: 'N/A', lastname: 'N/A', email: 'N/A', phone: 'N/A' };

    } catch (error) {
      console.error(`[Client Dashboard] ⚠️ Error fetching associations:`, error.message);
      // Continue with what we have
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
        fullName: associations.agency?.agent_name || 'N/A',
        phone: associations.agency?.agent_phone || 'N/A',
        email: associations.agency?.agent_email || 'N/A'
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
