import express from 'express';
import { calculateQuote, getSearchDefinitions } from '../utils/dynamic-quotes-calculator.js';
import { getDeal } from '../integrations/hubspot/deals.js';
import { getContact } from '../integrations/hubspot/contacts.js';
import { getAllMappings, getAllHubSpotProperties } from '../utils/questionnaireHelper.js';

const router = express.Router();

/**
 * POST /api/quote/calculate
 * Calculate quote based on deal questionnaire data
 *
 * Body: { dealId: string }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { dealId } = req.body;

    if (!dealId) {
      return res.status(400).json({
        error: 'Missing dealId',
        message: 'dealId is required in request body'
      });
    }

    console.log(`[Quote] 🔍 Calculating quote for deal: ${dealId}`);

    // Build list of ALL HubSpot properties we need to fetch
    const propertiesToFetch = [
      'dealname',
      'property_address',
      'hs_contact_id',
      'contact_id',
      ...getAllHubSpotProperties() // All questionnaire properties
    ];

    console.log(`[Quote] 📋 Requesting ${propertiesToFetch.length} properties from HubSpot`);

    // Fetch deal data from HubSpot with ALL questionnaire properties
    const deal = await getDeal(dealId, propertiesToFetch);
    console.log(`[Quote] 📦 Fetched deal with ${Object.keys(deal.properties).length} properties from HubSpot`);

    if (!deal) {
      return res.status(404).json({
        error: 'Deal not found',
        message: `No deal found with ID: ${dealId}`
      });
    }

    // Get field mappings for extraction
    const mappings = getAllMappings();

    // Extract questionnaire data from deal properties
    const propertyData = {};
    let extractedCount = 0;
    Object.entries(mappings).forEach(([formField, config]) => {
      const hsPropertyName = config.hsPropertyName;
      const rawValue = deal.properties[hsPropertyName];

      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        // Normalize values: HubSpot returns capitalized values but calculator expects lowercase
        const normalizedValue = typeof rawValue === 'string' ? rawValue.toLowerCase() : rawValue;
        propertyData[formField] = normalizedValue;
        extractedCount++;
        console.log(`[Quote]   ✓ ${formField} = "${normalizedValue}" (from ${hsPropertyName})`);
      }
    });
    console.log(`[Quote] 📋 Extracted ${extractedCount} questionnaire fields from deal properties`);

    // Get client data (if contactId is associated with the deal)
    const clientData = {};
    const contactId = deal.properties.hs_contact_id || deal.properties.contact_id;

    if (contactId) {
      try {
        const contact = await getContact(contactId);
        if (contact && contact.properties.title_search_done) {
          // Normalize contact data values to lowercase for consistent comparison
          const value = contact.properties.title_search_done;
          clientData.title_search_done = typeof value === 'string' ? value.toLowerCase() : value;
        }
      } catch (err) {
        console.warn('[Quote] Could not fetch contact data:', err.message);
      }
    }

    // Calculate quote
    console.log(`[Quote] 📊 Property data for calculation:`, JSON.stringify(propertyData, null, 2));
    console.log(`[Quote] 👤 Client data for calculation:`, JSON.stringify(clientData, null, 2));

    const quote = calculateQuote(propertyData, clientData);

    console.log(`[Quote] ✅ Quote calculated: $${quote.grandTotal}`);

    res.json({
      success: true,
      dealId,
      quote,
      metadata: {
        dealName: deal.properties.dealname,
        propertyAddress: deal.properties.property_address,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Quote] ❌ Error calculating quote:', error);
    res.status(500).json({
      error: 'Failed to calculate quote',
      message: error.message
    });
  }
});

/**
 * GET /api/quote/search-definitions
 * Get all search definitions (base and conditional searches)
 */
router.get('/search-definitions', (req, res) => {
  try {
    const definitions = getSearchDefinitions();
    res.json({
      success: true,
      definitions
    });
  } catch (error) {
    console.error('[Quote] ❌ Error fetching search definitions:', error);
    res.status(500).json({
      error: 'Failed to fetch search definitions',
      message: error.message
    });
  }
});

export default router;
