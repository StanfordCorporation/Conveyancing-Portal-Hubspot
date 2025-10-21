import { createCompany, searchCompanyByEmail } from '../../services/hubspot/companies.service.js';
import { createContact, searchContactByEmailOrPhone } from '../../services/hubspot/contacts.service.js';

/**
 * API Endpoint: Create Agency
 * POST /api/agencies/create
 *
 * Creates a new agency with optional agent
 * - Creates agency company in HubSpot
 * - Optionally creates and associates agent contact
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
    const { name, address, email, phone, agentFirstName, agentLastName, agentEmail, agentPhone } = req.body;

    console.log(`[Create Agency] ➕ Create agency request:`);
    console.log(`[Create Agency]    - Name: "${name}"`);
    console.log(`[Create Agency]    - Suburb: "${address}"`);
    console.log(`[Create Agency]    - Email: "${email}"`);
    if (agentFirstName) {
      console.log(`[Create Agency]    - Agent: ${agentFirstName} ${agentLastName}`);
    }

    // Validate input
    if (!name || !address || !email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name, suburb, and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid agency email format'
      });
    }

    // Append suburb to name for better identification
    const agencyNameWithSuburb = `${name.trim()} - ${address.trim()}`;

    // Check if company with this email already exists
    console.log(`[Create Agency] 🔍 Checking if company with email "${email}" already exists...`);
    const existingCompany = await searchCompanyByEmail(email);

    if (existingCompany) {
      console.log(`[Create Agency] ⚠️ Company with email already exists: ${existingCompany.id}`);
      return res.status(409).json({
        success: false,
        error: 'Duplicate Agency Email',
        message: 'An agency with this email already exists',
        duplicateField: 'email',
        existingCompany: {
          id: existingCompany.id,
          name: existingCompany.properties.name,
          email: existingCompany.properties.email
        }
      });
    }

    let agentData = null;
    let contactIdToAssociate = null;

    // If agent details provided, search for existing contact first
    if (agentFirstName && agentLastName && agentEmail) {
      console.log(`[Create Agency] 👤 Processing agent...`);

      // Validate agent email format
      if (!emailRegex.test(agentEmail)) {
        console.log(`[Create Agency] ⚠️ Invalid agent email format: ${agentEmail}, skipping agent`);
      } else {
        try {
          // First, try to find existing contact by email or phone
          const existingContact = await searchContactByEmailOrPhone(agentEmail, agentPhone);

          if (existingContact) {
            // Contact exists - we'll associate it to the company during creation
            console.log(`[Create Agency] 🔗 Found existing contact: ${existingContact.id}`);
            contactIdToAssociate = existingContact.id;

            agentData = {
              id: existingContact.id,
              firstname: existingContact.properties.firstname,
              lastname: existingContact.properties.lastname,
              email: existingContact.properties.email,
              phone: existingContact.properties.phone
            };
          } else {
            // Contact doesn't exist - create new one
            console.log(`[Create Agency] ➕ Creating new agent contact...`);

            const agentResult = await createContact({
              email: agentEmail,
              firstname: agentFirstName,
              lastname: agentLastName,
              phone: agentPhone || '',
              contact_type: 'Agent'
            });

            contactIdToAssociate = agentResult.id;
            agentData = {
              id: agentResult.id,
              firstname: agentResult.properties.firstname,
              lastname: agentResult.properties.lastname,
              email: agentResult.properties.email,
              phone: agentResult.properties.phone
            };

            console.log(`[Create Agency] ✅ New contact created: ${agentResult.id}`);
          }
        } catch (agentError) {
          console.warn(`[Create Agency] ⚠️ Failed to process agent:`, agentError.message);
          // Don't fail the whole request if agent processing fails
        }
      }
    }

    // Create agency with inline association to contact if we have one
    console.log(`[Create Agency] 🏢 Creating company with agent association...`);
    const result = await createCompany({
      name: agencyNameWithSuburb,
      address,
      email,
      phone: phone || '',
      associateToContactId: contactIdToAssociate  // ← Inline association during creation!
    });

    const agencyId = result.id;
    console.log(`[Create Agency] ✅ Agency created: ${agencyId} - ${agencyNameWithSuburb}`);

    return res.status(200).json({
      success: true,
      id: agencyId,
      name: agencyNameWithSuburb,
      address,
      email,
      phone: result.properties.phone,
      score: 1.0, // New agencies have perfect score
      agent: agentData // Include agent if created
    });
  } catch (error) {
    console.error(`[Create Agency] ❌ Error:`, error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
