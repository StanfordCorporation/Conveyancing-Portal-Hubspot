/**
 * Client Portal Routes
 * Routes for client dashboard and related features
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as associationsIntegration from '../integrations/hubspot/associations.js';

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
router.get('/dashboard-data', authMiddleware, async (req, res) => {
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

export default router;
