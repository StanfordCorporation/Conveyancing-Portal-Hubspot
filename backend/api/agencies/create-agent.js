import { createContact } from '../../services/hubspot/contacts.service.js';

/**
 * API Endpoint: Create Agent
 * POST /api/agencies/:agencyId/agents/create
 *
 * Creates a new agent contact and associates with agency
 * - Validates email format
 * - Creates contact with inline association to company
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
    const { agencyId } = req.params;
    const { firstname, lastname, email, phone } = req.body;

    console.log(`[Create Agent] ➕ Creating new agent:`);
    console.log(`[Create Agent]    - Name: ${firstname} ${lastname}`);
    console.log(`[Create Agent]    - Email: ${email}`);
    console.log(`[Create Agent]    - Agency: ${agencyId}`);

    // Validate input
    if (!firstname || !lastname || !email || !phone) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'First name, last name, email, and phone are required'
      });
    }

    if (!agencyId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Agency ID is required'
      });
    }

    // Validate email format before sending to HubSpot
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format',
        field: 'email',
        providedEmail: email
      });
    }

    // Create contact (agent) with inline association to agency
    const agentData = {
      email,
      firstname,
      lastname,
      phone,
      contact_type: 'Agent',
      associateToCompanyId: agencyId  // ← Inline association in same call!
    };

    const agentResult = await createContact(agentData);
    const agentId = agentResult.id;

    console.log(`[Create Agent] ✅ Agent created and associated: ${agentId}`);

    return res.status(200).json({
      success: true,
      id: agentId,
      firstname: agentResult.properties.firstname,
      lastname: agentResult.properties.lastname,
      email: agentResult.properties.email,
      phone: agentResult.properties.phone
    });
  } catch (error) {
    console.error(`[Create Agent] ❌ Error:`, error);
    return res.status(400).json({
      error: 'Server error',
      message: error.message
    });
  }
}
