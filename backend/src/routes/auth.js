/**
 * Authentication Routes
 * Unified OTP endpoints for both client and agent portals
 */

import * as otpService from '../services/auth/otp.service.js';
import * as contactsIntegration from '../integrations/hubspot/contacts.js';
import hubspotClient from '../integrations/hubspot/client.js';
import { HUBSPOT } from '../config/constants.js';
import jwt from 'jsonwebtoken';

/**
 * POST /auth/send-otp
 * Send OTP to client or agent
 * Query param: type=client|agent (default: client)
 */
export const sendOTP = async (req, res) => {
  try {
    const { identifier, method } = req.body;
    const type = req.query.type || 'client'; // client or agent

    // Validate input
    if (!identifier) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'identifier is required'
      });
    }

    if (!method || !['email', 'mobile'].includes(method)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'method must be email or mobile'
      });
    }

    console.log(`[Auth] 📱 OTP request: ${type} portal, ${method} to ${identifier}`);

    // Send OTP based on type
    if (type === 'agent') {
      const result = await otpService.sendOTPForAgent(identifier, method);
      return res.json(result);
    } else {
      const result = await otpService.sendOTPForClient(identifier, method);
      return res.json(result);
    }
  } catch (error) {
    console.error('[Auth] ❌ Error sending OTP:', error);

    if (error.status) {
      return res.status(error.status).json({
        error: error.error,
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * POST /auth/verify-otp
 * Verify OTP and return JWT token
 * Query param: type=client|agent (default: client)
 */
export const verifyOTP = async (req, res) => {
  try {
    const { identifier, otp, method } = req.body;
    const type = req.query.type || 'client'; // client or agent

    // Validate input
    if (!identifier || !otp) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'identifier and otp are required'
      });
    }

    console.log(`[Auth] ✅ OTP verification: ${type} portal, ${method || 'email'} to ${identifier}`);

    // Verify OTP based on type
    let result;
    if (type === 'agent') {
      result = await otpService.verifyOTPForAgent(identifier, otp, method);
    } else {
      result = await otpService.verifyOTPForClient(identifier, otp, method);
    }

    // Generate JWT token with contactId for dashboard access
    const token = jwt.sign(
      {
        userId: result.user.id,
        contactId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        sellerType: result.user.sellerType  // 'primary' or 'additional' (clients only)
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: result.user.id,
        contactId: result.user.id,
        firstname: result.user.firstname,
        lastname: result.user.lastname,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
        sellerType: result.user.sellerType,             // 'primary' or 'additional' (clients only)
        permissionLevel: result.user.permissionLevel,  // admin | view_all | standard (agents only)
        agencyId: result.user.agencyId                  // agency company ID (agents only)
      }
    });
  } catch (error) {
    console.error('[Auth] ❌ Error verifying OTP:', error);

    if (error.status) {
      return res.status(error.status).json({
        error: error.error,
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to verify OTP'
    });
  }
};

/**
 * POST /auth/staff-login-as-agent
 * Staff backdoor to login as an agent (bypasses OTP)
 * Requires staff password authentication via middleware
 * Query/Body param: contactId (HubSpot contact ID)
 */
export const staffLoginAsAgent = async (req, res) => {
  try {
    const contactId = req.query.contactId || req.body.contactId;

    // Validate contactId is provided
    if (!contactId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contactId is required (query param or body)'
      });
    }

    console.log(`[Staff Auth] 🔑 Staff login attempt for contact: ${contactId}`);

    // Fetch contact from HubSpot
    let contact;
    try {
      contact = await contactsIntegration.getContact(contactId);
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          error: 'Contact Not Found',
          message: `No contact found with ID: ${contactId}`
        });
      }
      throw error;
    }

    // Validate contact is an agent
    const contactTypes = contact.properties.contact_type || '';
    const isAgent = contactTypes.includes('Agent');

    if (!isAgent) {
      console.log(`[Staff Auth] ❌ Contact ${contactId} is not an agent (type: ${contactTypes})`);
      return res.status(403).json({
        error: 'Invalid Contact',
        message: 'Contact is not configured as an agent'
      });
    }

    console.log(`[Staff Auth] ✅ Contact ${contactId} validated as agent`);

    // Get agent's company association to determine agency and permission level
    let agencyId = null;
    let permissionLevel = 'standard';

    try {
      // Get company associations
      const companyAssocResponse = await hubspotClient.get(
        `/crm/v3/objects/contacts/${contactId}/associations/companies`
      );

      agencyId = companyAssocResponse.data.results[0]?.id || null;

      // Get association types for permission level
      if (agencyId) {
        const associationTypesResponse = await hubspotClient.get(
          `/crm/v4/objects/contacts/${contactId}/associations/companies`
        );

        const companyAssoc = associationTypesResponse.data.results.find(
          r => String(r.toObjectId) === String(agencyId)
        );
        const types = companyAssoc?.associationTypes || [];

        // Determine permission level
        if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.ADMIN)) {
          permissionLevel = 'admin';
        } else if (types.some(t => t.typeId === HUBSPOT.PERMISSION_TYPES.VIEW_ALL)) {
          permissionLevel = 'view_all';
        } else {
          permissionLevel = 'standard';
        }

        console.log(`[Staff Auth] 🏢 Agent agency: ${agencyId}, permission: ${permissionLevel}`);
      }
    } catch (error) {
      console.warn('[Staff Auth] ⚠️ Could not fetch permission level:', error.message);
    }

    // Generate JWT token (24 hour expiration for staff access)
    const token = jwt.sign(
      {
        userId: contact.id,
        contactId: contact.id,
        email: contact.properties.email,
        role: 'agent',
        permissionLevel: permissionLevel,
        agencyId: agencyId,
        staffAccess: true // Mark as staff-initiated login
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const agentPortalUrl = process.env.AGENT_PORTAL_URL || 'https://portal.stanfordlegal.com.au';
    const loginUrl = `${agentPortalUrl}/agent/dashboard?token=${token}`;

    console.log(`[Staff Auth] ✅ Staff login successful for agent: ${contact.properties.email}`);

    return res.json({
      success: true,
      token,
      agent: {
        id: contact.id,
        email: contact.properties.email,
        firstname: contact.properties.firstname,
        lastname: contact.properties.lastname,
        permissionLevel: permissionLevel,
        agencyId: agencyId
      },
      loginUrl
    });
  } catch (error) {
    console.error('[Staff Auth] ❌ Error during staff login:', error);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to login as agent'
    });
  }
};

export default {
  sendOTP,
  verifyOTP,
  staffLoginAsAgent
};
