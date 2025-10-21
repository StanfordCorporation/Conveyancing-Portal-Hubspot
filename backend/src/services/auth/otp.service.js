/**
 * OTP Authentication Service
 * Handles OTP generation, storage, verification, and delivery
 * Replaces utils/otp.js with service layer
 */

import { generateOTP, storeOTP, verifyOTP, sendOTPEmail, sendOTPSMS } from '../../utils/otp.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Initiate OTP login for client
 * Validates contact exists and sends OTP
 */
export const sendOTPForClient = async (identifier, method = 'email') => {
  // Find contact by email or phone
  const contact = await contactsIntegration.searchContactByEmail(identifier);

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
  // Find contact by email or phone
  const contact = await contactsIntegration.searchContactByEmail(identifier);

  if (!contact) {
    throw {
      status: 404,
      error: 'Agent Not Found',
      message: `No agent found with identifier: ${identifier}`
    };
  }

  // Validate contact is an agent
  if (contact.properties.contact_type !== HUBSPOT.CONTACT_TYPES.AGENT) {
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
export const verifyOTPForClient = async (identifier, otp) => {
  // Verify OTP
  const isValid = verifyOTP(identifier, otp);

  if (!isValid) {
    throw {
      status: 401,
      error: 'Invalid OTP',
      message: 'OTP is incorrect or expired'
    };
  }

  // Get contact details
  const contact = await contactsIntegration.searchContactByEmail(identifier);

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
 * Returns user data and JWT token on success
 */
export const verifyOTPForAgent = async (identifier, otp) => {
  // Verify OTP
  const isValid = verifyOTP(identifier, otp);

  if (!isValid) {
    throw {
      status: 401,
      error: 'Invalid OTP',
      message: 'OTP is incorrect or expired'
    };
  }

  // Get contact details
  const contact = await contactsIntegration.searchContactByEmail(identifier);

  if (!contact) {
    throw {
      status: 404,
      error: 'Agent Not Found',
      message: 'Agent no longer exists'
    };
  }

  // Validate agent role
  if (contact.properties.contact_type !== HUBSPOT.CONTACT_TYPES.AGENT) {
    throw {
      status: 403,
      error: 'Invalid Agent',
      message: 'Contact is not configured as an agent'
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
      role: 'agent'
    }
  };
};

export default {
  sendOTPForClient,
  sendOTPForAgent,
  verifyOTPForClient,
  verifyOTPForAgent
};
