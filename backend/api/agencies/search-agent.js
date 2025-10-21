import { searchContactByEmailOrPhone } from '../../services/hubspot/contacts.service.js';

/**
 * Search for existing agent by email and/or phone
 * POST /api/agencies/search-agent
 *
 * Request body:
 * {
 *   email: string (optional)
 *   phone: string (optional)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   agent: { id, firstname, lastname, email, phone } or null
 * }
 */
export default async (req, res) => {
  try {
    const { email, phone } = req.body;

    console.log(`\n📞 [Search Agent] Searching for existing agent:`);
    console.log(`   Email: ${email || 'not provided'}`);
    console.log(`   Phone: ${phone || 'not provided'}`);

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'At least email or phone must be provided'
      });
    }

    // Search for existing contact by email or phone
    const existingAgent = await searchContactByEmailOrPhone(email, phone);

    if (existingAgent) {
      console.log(`✅ [Search Agent] Found existing agent: ${existingAgent.properties.firstname} ${existingAgent.properties.lastname}`);

      return res.json({
        success: true,
        agent: {
          id: existingAgent.id,
          firstname: existingAgent.properties.firstname,
          lastname: existingAgent.properties.lastname,
          email: existingAgent.properties.email,
          phone: existingAgent.properties.phone
        }
      });
    }

    console.log(`ℹ️ [Search Agent] No existing agent found`);
    return res.json({
      success: true,
      agent: null
    });

  } catch (error) {
    console.error(`❌ [Search Agent] Error:`, error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search for agent'
    });
  }
};
