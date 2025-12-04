/**
 * Quote Service
 * Shared service for calculating quotes that can be used by multiple routes
 */

import { calculateQuote } from '../utils/dynamic-quotes-calculator.js';
import { getDeal, updateDeal } from '../integrations/hubspot/deals.js';
import { getContact } from '../integrations/hubspot/contacts.js';
import { getAllMappings, getAllHubSpotProperties } from '../utils/questionnaireHelper.js';
import { HUBSPOT } from '../config/constants.js';

/**
 * Calculate quote for a deal
 * @param {string} dealId - HubSpot deal ID
 * @param {boolean} saveToHubSpot - Whether to save quote amounts to HubSpot (default: true)
 * @returns {Promise<Object>} Quote calculation result with quote and conveyancing data
 */
export async function calculateQuoteForDeal(dealId, saveToHubSpot = true) {
  if (!dealId) {
    throw new Error('dealId is required');
  }

  console.log(`[Quote Service] 🔍 Calculating quote for deal: ${dealId}`);

  // Build list of ALL HubSpot properties we need to fetch
  const propertiesToFetch = [
    'dealname',
    'property_address',
    'pipeline', // Verify deal is in Form 2s pipeline
    'hs_contact_id',
    'contact_id',
    'agent_title_search', // Check if agent already did title search
    ...getAllHubSpotProperties() // All questionnaire properties
  ];

  console.log(`[Quote Service] 📋 Requesting ${propertiesToFetch.length} properties from HubSpot`);

  // Fetch deal data from HubSpot with ALL questionnaire properties
  const deal = await getDeal(dealId, propertiesToFetch);
  console.log(`[Quote Service] 📦 Fetched deal with ${Object.keys(deal.properties).length} properties from HubSpot`);

  if (!deal) {
    throw new Error(`No deal found with ID: ${dealId}`);
  }

  // Verify deal is in Form 2s pipeline
  const pipeline = deal.properties?.pipeline;
  if (pipeline !== HUBSPOT.PIPELINES.FORM_2S) {
    console.log(`[Quote Service] 🚫 Deal ${dealId} not in Form 2s pipeline (pipeline: ${pipeline})`);
    throw new Error('This property is not eligible for quote calculation');
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
      console.log(`[Quote Service]   ✓ ${formField} = "${normalizedValue}" (from ${hsPropertyName})`);
    }
  });
  console.log(`[Quote Service] 📋 Extracted ${extractedCount} questionnaire fields from deal properties`);

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
      console.warn('[Quote Service] Could not fetch contact data:', err.message);
    }
  }

  // Get deal-specific data (e.g., agent_title_search)
  const dealData = {};
  if (deal.properties.agent_title_search) {
    dealData.agent_title_search = deal.properties.agent_title_search; // Keep original case (HubSpot returns "Yes"/"No")
  }

  // Calculate quote
  console.log(`[Quote Service] 📊 Property data for calculation:`, JSON.stringify(propertyData, null, 2));
  console.log(`[Quote Service] 👤 Client data for calculation:`, JSON.stringify(clientData, null, 2));
  console.log(`[Quote Service] 📋 Deal data for calculation:`, JSON.stringify(dealData, null, 2));

  const quote = calculateQuote(propertyData, clientData, dealData);

  console.log(`[Quote Service] ✅ Quote calculated: $${quote.grandTotal}`);

  // Add End-to-End Conveyancing pricing
  const bodyCorporate = propertyData.body_corporate; // 'yes' or 'no'
  const conveyancing = {
    totalFee: bodyCorporate === 'yes' ? 968 : 847,
    depositNow: 110,
    settlementAmount: bodyCorporate === 'yes' ? 858 : 737,
    bodyCorporateStatus: bodyCorporate || 'unknown'
  };

  console.log(`[Quote Service] 🏢 Conveyancing: Total $${conveyancing.totalFee}, Deposit $${conveyancing.depositNow}, Settlement $${conveyancing.settlementAmount} (Body Corporate: ${conveyancing.bodyCorporateStatus})`);

  // Save quote amounts to HubSpot if requested
  if (saveToHubSpot) {
    const totalDueNow = quote.grandTotal + conveyancing.depositNow;

    console.log(`[Quote Service] 💾 Saving quote amounts to HubSpot...`);
    console.log(`[Quote Service]   - searches_quote_amount: $${quote.grandTotal}`);
    console.log(`[Quote Service]   - quote_amount: $${totalDueNow} (searches + deposit)`);

    await updateDeal(dealId, {
      searches_quote_amount: quote.grandTotal.toString(),
      quote_amount: totalDueNow.toString(),
    });

    console.log(`[Quote Service] ✅ Quote amounts saved to HubSpot`);
  }

  return {
    success: true,
    dealId,
    quote,
    conveyancing,
    metadata: {
      dealName: deal.properties.dealname,
      propertyAddress: deal.properties.property_address,
      calculatedAt: new Date().toISOString()
    }
  };
}

