import { searchCompaniesByTokens } from '../../services/hubspot/companies.service.js';

/**
 * API Endpoint: Search Agencies
 * POST /api/agencies/search
 *
 * Searches for existing agencies by business name and suburb
 * Uses dynamic token-based search with relevance scoring
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessName, suburb } = req.body;

    console.log(`[Search Agencies] 🔍 Search request:`);
    console.log(`[Search Agencies]    - Business Name: "${businessName}"`);
    console.log(`[Search Agencies]    - Suburb: "${suburb}"`);

    // Validate input
    if (!businessName || !suburb) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Business name and suburb are required'
      });
    }

    // Search agencies using token-based scoring
    const results = await searchCompaniesByTokens(businessName, suburb);

    console.log(`[Search Agencies] ✅ Found ${results.length} agencies`);

    return res.status(200).json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error(`[Search Agencies] ❌ Error:`, error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
