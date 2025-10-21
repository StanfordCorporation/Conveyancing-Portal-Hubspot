/**
 * Workflows Routes
 * Business workflow endpoints (agent-client creation, client disclosure, property intake)
 */

import * as agentClientCreationWorkflow from '../services/workflows/agent-client-creation.js';
import * as clientDisclosureWorkflow from '../services/workflows/client-disclosure.js';

/**
 * POST /workflows/agent-client-creation
 * Agent initiates client and property intake workflow
 */
export const agentClientCreation = async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    if (!formData.client?.email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Client email is required'
      });
    }

    if (!formData.property?.address) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property address is required'
      });
    }

    if (!formData.agentId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Agent ID is required'
      });
    }

    if (!formData.agencyId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Agency ID is required'
      });
    }

    console.log(`[Workflows] 📋 Agent client creation workflow initiated`);

    const result = await agentClientCreationWorkflow.processAgentClientCreation(formData);

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
    console.error('[Workflows] ❌ Error in agent client creation:', error);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to create client'
    });
  }
};

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

/**
 * POST /workflows/property-intake
 * Update deal with property intake data (4-step wizard)
 */
export const propertyIntake = async (req, res) => {
  try {
    const { dealId, intakeData } = req.body;

    if (!dealId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'dealId is required'
      });
    }

    if (!intakeData) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'intakeData is required'
      });
    }

    console.log(`[Workflows] 📋 Property intake update for deal: ${dealId}`);

    const result = await agentClientCreationWorkflow.processPropertyIntake(dealId, intakeData);

    return res.json({
      success: true,
      message: 'Property intake updated successfully',
      deal: result
    });
  } catch (error) {
    console.error('[Workflows] ❌ Error in property intake:', error);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to update property intake'
    });
  }
};

export default {
  agentClientCreation,
  clientDisclosure,
  propertyIntake
};
