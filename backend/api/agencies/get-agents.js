import { searchContactsByCompany } from '../../services/hubspot/contacts.service.js';

/**
 * API Endpoint: Get Agents for Agency
 * GET /api/agencies/:agencyId/agents
 *
 * Fetches all agents (contacts) associated with an agency
 * Uses associations.company filter to find linked contacts
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agencyId } = req.params;

    console.log(`[Get Agents] 🔍 Fetching agents for agency: ${agencyId}`);

    if (!agencyId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Agency ID is required'
      });
    }

    // Search for contacts associated with this company using associations.company filter
    const results = await searchContactsByCompany(agencyId);

    // Map results to agent data with full contact information
    const agents = results.map((result) => ({
      id: result.id,
      firstname: result.properties?.firstname || '',
      lastname: result.properties?.lastname || '',
      email: result.properties?.email || '',
      phone: result.properties?.phone || '',
      contact_type: result.properties?.contact_type || 'Agent'
    }));

    console.log(`[Get Agents] ✅ Found ${agents.length} agents for agency ${agencyId}`);

    return res.status(200).json({
      success: true,
      agents
    });
  } catch (error) {
    console.error(`[Get Agents] ❌ Error:`, error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
