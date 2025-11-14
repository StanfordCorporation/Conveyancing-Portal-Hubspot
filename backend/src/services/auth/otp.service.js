/**
 * OTP Authentication Service
 * Handles OTP generation, storage, verification, and delivery
 * Replaces utils/otp.js with service layer
 */

import { generateOTP, storeOTP, verifyOTP, sendOTPEmail, sendOTPSMS } from '../../utils/otp.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import { normalizePhoneForSearch } from '../../utils/phone.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Initiate OTP login for client
 * Validates contact exists and sends OTP
 */
export const sendOTPForClient = async (identifier, method = 'email') => {
  // Find contact by email or phone based on method
  let contact;
  if (method === 'mobile') {
    // Normalize phone number to international format for HubSpot search
    const normalizedPhone = normalizePhoneForSearch(identifier);
    // Use POST search method for phone (GET method doesn't support phone as idProperty in HubSpot)
    // Prefer Client contact_type when multiple contacts share the same phone
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone, { preferredContactType: 'Client' });
  } else {
    contact = await contactsIntegration.searchContactByEmail(identifier);
  }

  if (!contact) {
    throw {
      status: 404,
      error: 'Contact Not Found',
      message: `No contact found with identifier: ${identifier}`
    };
  }

  // Validate contact has contact_type set (required for clients)
  if (!contact.properties.contact_type) {
    throw {
      status: 400,
      error: 'Invalid Contact',
      message: 'Contact is not configured as a client or agent'
    };
  }

  // Validate contact is NOT a pure agent (agents should use agent portal)
  // However, allow dual-role contacts like "Client;Agent" to access client portal
  const contactTypes = contact.properties.contact_type || '';
  const hasClientType = contactTypes.includes('Client');
  const hasAgentType = contactTypes.includes('Agent');
  
  // Reject if contact is ONLY an agent (not also a client)
  if (hasAgentType && !hasClientType) {
    console.log(`[Auth] ❌ Contact ${contact.id} is a pure agent, cannot send OTP for client portal`);
    throw {
      status: 403,
      error: 'Invalid Access',
      message: 'Agents should use the agent portal. Please visit the agent login page.'
    };
  }

  console.log(`[Auth] ✅ Contact ${contact.id} validated for client portal OTP (contact_type: ${contactTypes})`);

  // Generate and send OTP
  const otp = generateOTP();
  storeOTP(identifier, otp);

  console.log(`[Auth] 📧 Sending OTP to ${method}: ${identifier}`);

  if (method === 'email') {
    await sendOTPEmail(identifier, otp);
  } else if (method === 'mobile') {
    await sendOTPSMS(identifier, otp);
  } else {
    throw new Error(`Unsupported OTP method: ${method}`);
  }

  return {
    success: true,
    message: `OTP sent to ${method}`,
    identifier
  };
};

/**
 * Initiate OTP login for agent
 * Validates contact is an agent and sends OTP
 */
export const sendOTPForAgent = async (identifier, method = 'email') => {
  // Find contact by email or phone based on method
  let contact;
  if (method === 'mobile') {
    // Normalize phone number to international format for HubSpot search
    const normalizedPhone = normalizePhoneForSearch(identifier);
    // Use POST search method for phone (GET method doesn't support phone as idProperty in HubSpot)
    // Prefer Agent contact_type when multiple contacts share the same phone
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone, { preferredContactType: 'Agent' });
  } else {
    contact = await contactsIntegration.searchContactByEmail(identifier);
  }

  if (!contact) {
    throw {
      status: 404,
      error: 'Agent Not Found',
      message: `No agent found with identifier: ${identifier}`
    };
  }

  // Validate contact is an agent (handle multiple contact types separated by semicolon)
  const contactTypes = contact.properties.contact_type || '';
  const isAgent = contactTypes.includes(HUBSPOT.CONTACT_TYPES.AGENT);

  if (!isAgent) {
    throw {
      status: 403,
      error: 'Invalid Agent',
      message: 'Contact is not configured as an agent'
    };
  }

  // Generate and send OTP
  const otp = generateOTP();
  storeOTP(identifier, otp);

  console.log(`[Auth] 📧 Sending OTP to agent ${method}: ${identifier}`);

  if (method === 'email') {
    await sendOTPEmail(identifier, otp);
  } else if (method === 'mobile') {
    await sendOTPSMS(identifier, otp);
  } else {
    throw new Error(`Unsupported OTP method: ${method}`);
  }

  return {
    success: true,
    message: `OTP sent to agent ${method}`,
    identifier
  };
};

/**
 * Verify OTP for client
 * Returns user data and JWT token on success
 */
export const verifyOTPForClient = async (identifier, otp, method = 'email') => {
  // Verify OTP
  const isValid = verifyOTP(identifier, otp);

  if (!isValid) {
    throw {
      status: 401,
      error: 'Invalid OTP',
      message: 'OTP is incorrect or expired'
    };
  }

  // Get contact details by email or phone based on method
  let contact;
  if (method === 'mobile') {
    // Normalize phone number to international format for HubSpot search
    const normalizedPhone = normalizePhoneForSearch(identifier);
    // Use POST search method for phone (GET method doesn't support phone as idProperty in HubSpot)
    // Prefer Client contact_type when multiple contacts share the same phone
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone, { preferredContactType: 'Client' });
  } else {
    contact = await contactsIntegration.searchContactByEmail(identifier);
  }

  if (!contact) {
    throw {
      status: 404,
      error: 'Contact Not Found',
      message: 'Contact no longer exists'
    };
  }

  // Validate contact is NOT a pure agent (agents should use agent portal)
  // However, allow dual-role contacts like "Client;Agent" to access client portal
  const contactTypes = contact.properties.contact_type || '';
  const hasClientType = contactTypes.includes('Client');
  const hasAgentType = contactTypes.includes('Agent');
  
  // Reject if contact is ONLY an agent (not also a client)
  if (hasAgentType && !hasClientType) {
    console.log(`[Auth] ❌ Contact ${contact.id} is a pure agent, rejecting client portal access`);
    throw {
      status: 403,
      error: 'Invalid Access',
      message: 'Agents should use the agent portal. Please visit the agent login page.'
    };
  }

  console.log(`[Auth] ✅ Contact ${contact.id} validated for client portal (contact_type: ${contactTypes})`);

  // Determine seller type by checking deal associations
  let sellerType = 'primary'; // Default to primary
  try {
    const hubspotClient = (await import('../../integrations/hubspot/client.js')).default;
    
    // Get all deals associated with this contact using v4 batch API
    const dealsResponse = await hubspotClient.post(
      '/crm/v4/associations/contact/deal/batch/read',
      {
        inputs: [{ id: contact.id }]
      }
    );
    
    const dealAssociations = dealsResponse.data.results[0]?.to || [];
    console.log(`[Auth] 🔍 Found ${dealAssociations.length} deal associations for contact ${contact.id}`);
    
    if (dealAssociations.length > 0) {
      // Log all associations for debugging
      dealAssociations.forEach((assoc, idx) => {
        console.log(`[Auth]    Deal ${idx + 1}: ID ${assoc.toObjectId}`);
        assoc.associationTypes?.forEach(type => {
          console.log(`[Auth]       - Type ID: ${type.typeId}, Category: ${type.category}, Label: ${type.label || 'N/A'}`);
        });
      });
      
      // HubSpot association types are DIRECTIONAL:
      // Contact → Deal perspective (what we're querying):
      //   - Type 2 (USER_DEFINED) = Primary Seller (reverse of Type 1)
      //   - Type 4 (USER_DEFINED) = Additional Seller
      //   - Type 4 (HUBSPOT_DEFINED) = Standard deal association (ignore)
      //   - Type 5 (USER_DEFINED) = Agent
      
      // Check if they're a Primary Seller (Type 1 or Type 2 with USER_DEFINED)
      const hasPrimarySellerAssociation = dealAssociations.some(dealAssoc => {
        const types = dealAssoc.associationTypes || [];
        return types.some(t => {
          const id = t.typeId;
          const category = t.category;
          // Type 1 (deal→contact view) or Type 2 (contact→deal view), both USER_DEFINED
          return ((id === 1 || id === '1' || id === 2 || id === '2') && category === 'USER_DEFINED');
        });
      });
      
      // Check if they're an Additional Seller (Type 4 with USER_DEFINED only)
      const hasAdditionalSellerAssociation = dealAssociations.some(dealAssoc => {
        const types = dealAssoc.associationTypes || [];
        return types.some(t => {
          const id = t.typeId;
          const category = t.category;
          // Type 4 with USER_DEFINED means Additional Seller
          // Type 4 with HUBSPOT_DEFINED is just a standard association (ignore)
          return ((id === 4 || id === '4') && category === 'USER_DEFINED');
        });
      });
      
      // Priority: Primary > Additional > Default to Primary
      // If user is a primary seller on ANY deal, give them primary access
      if (hasPrimarySellerAssociation) {
        sellerType = 'primary';
        console.log(`[Auth] ✅ Contact ${contact.id} is PRIMARY SELLER on at least one deal`);
      } else if (hasAdditionalSellerAssociation) {
        sellerType = 'additional';
        console.log(`[Auth] ℹ️ Contact ${contact.id} is ADDITIONAL SELLER only`);
      } else {
        // No explicit seller type found - default to primary (most permissive)
        sellerType = 'primary';
        console.log(`[Auth] ℹ️ Contact ${contact.id} has no explicit seller type, defaulting to PRIMARY`);
      }
    }
  } catch (error) {
    console.warn('[Auth] Could not determine seller type, defaulting to primary:', error.message);
    // Default to 'primary' if fetch fails - more permissive
  }

  return {
    success: true,
    user: {
      id: contact.id,
      firstname: contact.properties.firstname,
      lastname: contact.properties.lastname,
      email: contact.properties.email,
      phone: contact.properties.phone,
      role: 'client',
      sellerType: sellerType  // Add seller type: 'primary' or 'additional'
    }
  };
};

/**
 * Verify OTP for agent
 * Returns user data with permission level and agency info
 */
export const verifyOTPForAgent = async (identifier, otp, method = 'email') => {
  // Verify OTP
  const isValid = verifyOTP(identifier, otp);

  if (!isValid) {
    throw {
      status: 401,
      error: 'Invalid OTP',
      message: 'OTP is incorrect or expired'
    };
  }

  // Get contact details by email or phone based on method
  let contact;
  if (method === 'mobile') {
    // Normalize phone number to international format for HubSpot search
    const normalizedPhone = normalizePhoneForSearch(identifier);
    // Use POST search method for phone (GET method doesn't support phone as idProperty in HubSpot)
    // Prefer Agent contact_type when multiple contacts share the same phone
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone, { preferredContactType: 'Agent' });
  } else {
    contact = await contactsIntegration.searchContactByEmail(identifier);
  }

  if (!contact) {
    throw {
      status: 404,
      error: 'Agent Not Found',
      message: 'Agent no longer exists'
    };
  }

  // Validate agent role (handle multiple contact types separated by semicolon)
  const contactTypes = contact.properties.contact_type || '';
  const isAgent = contactTypes.includes(HUBSPOT.CONTACT_TYPES.AGENT);

  if (!isAgent) {
    throw {
      status: 403,
      error: 'Invalid Agent',
      message: 'Contact is not configured as an agent'
    };
  }

  // Get agent's company association to determine agency and permission level
  let agencyId = null;
  let permissionLevel = 'standard'; // Default to standard

  try {
    const hubspotClient = (await import('../../integrations/hubspot/client.js')).default;

    // Step 1: Get company associations (v3 endpoint for basic company association)
    const companyAssocResponse = await hubspotClient.get(
      `/crm/v3/objects/contacts/${contact.id}/associations/companies`
    );

    agencyId = companyAssocResponse.data.results[0]?.id || null;

    // Step 2: Get association types (v4 endpoint for permission level)
    if (agencyId) {
      const associationTypesResponse = await hubspotClient.get(
        `/crm/v4/objects/contacts/${contact.id}/associations/companies`
      );

      // Find the association for this specific company
      // Note: toObjectId is a number, but agencyId might be a string from v3 API
      const companyAssoc = associationTypesResponse.data.results.find(
        r => String(r.toObjectId) === String(agencyId)
      );
      const types = companyAssoc?.associationTypes || [];

      // Determine permission level based on association type
      // Priority: Admin (7) > View All (9) > Standard (279)
      if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.ADMIN)) {
        permissionLevel = 'admin';
      } else if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.VIEW_ALL)) {
        permissionLevel = 'view_all';
      } else {
        permissionLevel = 'standard';
      }

      console.log(`[Auth] Permission level: ${permissionLevel} for agency ${agencyId}`);
    } else {
      console.log('[Auth] ⚠️ Agent has no agency association');
    }
  } catch (error) {
    console.warn('[Auth] Could not fetch permission level:', error.message);
    // Default to 'standard' if fetch fails - don't block authentication
  }

  return {
    success: true,
    user: {
      id: contact.id,
      firstname: contact.properties.firstname,
      lastname: contact.properties.lastname,
      email: contact.properties.email,
      phone: contact.properties.phone,
      role: 'agent',
      permissionLevel: permissionLevel,  // admin | view_all | standard
      agencyId: agencyId                  // agency company ID
    }
  };
};

export default {
  sendOTPForClient,
  sendOTPForAgent,
  verifyOTPForClient,
  verifyOTPForAgent
};
