import { processClientDisclosure } from '../../services/workflows/client-disclosure.service.js';

/**
 * API Endpoint: Process Client Disclosure Form
 * POST /api/workflows/client-disclosure
 *
 * Handles the complete client-initiated disclosure workflow:
 * - Creates/finds seller contacts
 * - Finds/creates agency with fuzzy matching
 * - Creates/finds agent contact
 * - Creates deal with all associations
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
    const formData = req.body;

    // Validate required fields
    if (!formData.seller?.email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Seller email is required'
      });
    }

    if (!formData.agency?.name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Agency name is required'
      });
    }

    if (!formData.property?.address) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Property address is required'
      });
    }

    // Process the workflow
    const result = await processClientDisclosure(formData);

    // If multiple agency matches found, return them for user confirmation
    if (result.agencyMatches) {
      return res.status(200).json({
        success: true,
        requiresConfirmation: true,
        message: 'Multiple agency matches found',
        agencyMatches: result.agencyMatches,
        partialResult: {
          primarySeller: result.primarySeller,
          agent: result.agent
        }
      });
    }

    // Success - deal created
    return res.status(201).json({
      success: true,
      message: 'Client disclosure processed successfully',
      data: {
        dealId: result.deal.id,
        deal: result.deal,
        primarySeller: result.primarySeller,
        agency: result.agency,
        agent: result.agent
      }
    });

  } catch (error) {
    console.error('[Client Disclosure API] Error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
