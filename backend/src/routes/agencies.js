/**
 * Agencies Routes
 * All agency-related endpoints
 */

import * as agencyService from '../services/domain/agency.js';
import * as agentService from '../services/domain/agent.js';

/**
 * POST /agencies/search
 * Search for agencies by business name and suburb
 */
export const searchAgencies = async (req, res) => {
  try {
    const { businessName, suburb } = req.body;

    if (!businessName || !suburb) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'businessName and suburb are required'
      });
    }

    console.log(`[Agencies] 🔍 Searching for agencies: "${businessName}" in "${suburb}"`);

    const results = await agencyService.search(businessName, suburb);

    return res.json({
      success: true,
      count: results.length,
      agencies: results
    });
  } catch (error) {
    console.error('[Agencies] ❌ Error searching agencies:', error);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to search agencies'
    });
  }
};

/**
 * POST /agencies/create
 * Create new agency with optional agent
 */
export const createAgency = async (req, res) => {
  try {
    const { name, address, email, phone, agentFirstName, agentLastName, agentEmail, agentPhone } = req.body;

    // Validate required fields
    if (!name || !address || !email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'name, address, and email are required'
      });
    }

    console.log(`[Agencies] ➕ Creating agency: "${name}" in "${address}"`);

    // Prepare agent data if provided
    let agentData = null;
    if (agentFirstName && agentLastName && agentEmail) {
      agentData = {
        firstname: agentFirstName,
        lastname: agentLastName,
        email: agentEmail,
        phone: agentPhone,
        suburb: address
      };
    }

    const agency = await agencyService.createWithAgent(name, email, phone, agentData);

    return res.status(201).json({
      success: true,
      agency
    });
  } catch (error) {
    console.error('[Agencies] ❌ Error creating agency:', error);

    // Handle specific error types
    if (error.status === 409) {
      return res.status(409).json({
        success: false,
        error: error.error,
        message: error.message,
        duplicateField: error.duplicateField,
        existingCompany: error.existingCompany
      });
    }

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to create agency'
    });
  }
};

/**
 * GET /agencies/:agencyId/agents
 * Get all agents for an agency
 */
export const getAgents = async (req, res) => {
  try {
    const { agencyId } = req.params;

    if (!agencyId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'agencyId is required'
      });
    }

    console.log(`[Agencies] 🔍 Fetching agents for agency: ${agencyId}`);

    const agents = await agencyService.getAgents(agencyId);

    return res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    console.error('[Agencies] ❌ Error fetching agents:', error);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch agents'
    });
  }
};

/**
 * POST /agencies/:agencyId/agents/create
 * Create new agent for an agency
 */
export const createAgent = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { firstname, lastname, email, phone } = req.body;

    if (!agencyId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'agencyId is required'
      });
    }

    if (!firstname || !lastname || !email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'firstname, lastname, and email are required'
      });
    }

    console.log(`[Agencies] ➕ Creating agent for agency: ${agencyId}`);

    // Check if agent already exists before attempting to create
    const existingAgent = await agentService.findByEmailOrPhone(email, phone);
    if (existingAgent) {
      console.log(`[Agencies] ⚠️ Agent already exists - Field: ${existingAgent.duplicateField}`);
      return res.status(409).json({
        error: 'Duplicate Agent',
        message: 'Please enter a unique value',
        duplicateField: existingAgent.duplicateField || 'email',
        agent: existingAgent
      });
    }

    const agent = await agentService.createForAgency(agencyId, firstname, lastname, email, phone);

    return res.status(201).json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('[Agencies] ❌ Error creating agent:', error);

    // Handle HubSpot 409 conflicts (duplicate)
    if (error.response?.status === 409) {
      return res.status(409).json({
        error: 'Duplicate Agent',
        message: 'Please enter a unique value',
        duplicateField: 'email'
      });
    }

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to create agent'
    });
  }
};

/**
 * POST /agencies/search-agent
 * Search for existing agent by email and/or phone
 */
export const searchAgent = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least email or phone must be provided'
      });
    }

    console.log(`[Agencies] 🔍 Searching for existing agent...`);

    const agent = await agentService.findByEmailOrPhone(email, phone);

    return res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('[Agencies] ❌ Error searching agent:', error);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to search for agent'
    });
  }
};

export default {
  searchAgencies,
  createAgency,
  getAgents,
  createAgent,
  searchAgent
};
