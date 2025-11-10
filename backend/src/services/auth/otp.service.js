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
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone);
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
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone);
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
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone);
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

  return {
    success: true,
    user: {
      id: contact.id,
      firstname: contact.properties.firstname,
      lastname: contact.properties.lastname,
      email: contact.properties.email,
      phone: contact.properties.phone,
      role: 'client'
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
    contact = await contactsIntegration.searchContactByEmailOrPhone(null, normalizedPhone);
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
