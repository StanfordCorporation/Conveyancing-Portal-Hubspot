import { processAgentClientCreation, processPropertyIntake } from '../../services/workflows/agent-client-creation.service.js';

/**
 * API Endpoint: Agent Creates Client
 * POST /api/workflows/agent-client-creation
 *
 * Handles agent-initiated client creation workflow
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
    if (!formData.client?.email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Client email is required'
      });
    }

    if (!formData.property?.address) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Property address is required'
      });
    }

    if (!formData.agentId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Agent ID is required'
      });
    }

    if (!formData.agencyId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Agency ID is required'
      });
    }

    // Process the workflow
    const result = await processAgentClientCreation(formData);

    return res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: {
        dealId: result.deal.id,
        clientId: result.client.id,
        deal: result.deal,
        client: result.client,
        nextStep: result.nextStep
      }
    });

  } catch (error) {
    console.error('[Agent Client Creation API] Error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
