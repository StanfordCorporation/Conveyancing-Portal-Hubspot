import { processPropertyIntake } from '../../services/workflows/agent-client-creation.service.js';

/**
 * API Endpoint: Process Property Intake (5-step wizard)
 * POST /api/workflows/property-intake
 *
 * Updates a deal with property disclosure data from the 5-step intake wizard
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
    const { dealId, intakeData } = req.body;

    // Validate required fields
    if (!dealId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Deal ID is required'
      });
    }

    if (!intakeData) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Intake data is required'
      });
    }

    // Process the property intake
    const result = await processPropertyIntake(dealId, intakeData);

    return res.status(200).json({
      success: true,
      message: 'Property intake processed successfully',
      data: {
        dealId: result.deal.id,
        deal: result.deal
      }
    });

  } catch (error) {
    console.error('[Property Intake API] Error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
