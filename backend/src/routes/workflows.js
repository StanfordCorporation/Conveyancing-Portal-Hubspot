/**
 * Workflows Routes
 * Business workflow endpoints (client disclosure)
 */

import * as clientDisclosureWorkflow from '../services/workflows/client-disclosure.js';

/**
 * POST /workflows/client-disclosure
 * Client submits disclosure form with agency, agent, and property info
 */
export const clientDisclosure = async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    if (!formData.seller?.email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Seller email is required'
      });
    }

    if (!formData.agency?.name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Agency name is required'
      });
    }

    if (!formData.property?.address) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property address is required'
      });
    }

    console.log(`[Workflows] 📋 Client disclosure workflow initiated`);

    const result = await clientDisclosureWorkflow.processClientDisclosure(formData);

    // Check if multiple agencies matched
    if (result.multipleMatches) {
      return res.status(300).json({
        success: false,
        message: 'Multiple agencies found - please confirm',
        multipleMatches: result.multipleMatches,
        options: result.options
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Disclosure submitted successfully',
      data: {
        dealId: result.deal.id,
        primarySellerId: result.primarySeller.id,
        agencyId: result.agency.id,
        agentId: result.agent?.id,
        deal: result.deal,
        primarySeller: result.primarySeller,
        agency: result.agency,
        agent: result.agent
      }
    });
  } catch (error) {
    console.error('[Workflows] ❌ Error in client disclosure:', error);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to process disclosure'
    });
  }
};

export default {
  clientDisclosure
};
