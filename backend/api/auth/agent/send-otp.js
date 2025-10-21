import { generateOTP, storeOTP, sendOTPEmail, sendOTPSMS } from '../../../utils/otp.js';
import { searchContactByEmail, searchContactByEmailOrPhone } from '../../../services/hubspot/contacts.service.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier, method } = req.body;

    if (!identifier || !method) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both identifier and method are required'
      });
    }

    // Validate method
    if (!['email', 'mobile'].includes(method)) {
      return res.status(400).json({
        error: 'Invalid method',
        message: 'Method must be either "email" or "mobile"'
      });
    }

    // Check if agent (contact) exists in HubSpot
    let contact;
    if (method === 'email') {
      contact = await searchContactByEmail(identifier);
      if (!contact) {
        return res.status(404).json({
          error: 'Agent not found',
          message: 'No agent account found with this email address'
        });
      }
      // Verify this contact is an agent
      if (contact.properties?.contact_type !== 'Agent') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This account is not registered as an agent'
        });
      }
    } else if (method === 'mobile') {
      // Search for contact by phone number
      // Remove spaces from phone number (formatting done on frontend)
      const phoneWithoutSpaces = identifier.replace(/\s+/g, '');
      contact = await searchContactByEmailOrPhone(null, phoneWithoutSpaces);
      if (!contact) {
        return res.status(404).json({
          error: 'Agent not found',
          message: 'No agent account found with this phone number'
        });
      }
      // Verify this contact is an agent
      if (contact.properties?.contact_type !== 'Agent') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This account is not registered as an agent'
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP
    storeOTP(identifier, otp);

    // Send OTP
    if (method === 'email') {
      await sendOTPEmail(identifier, otp);
    } else {
      await sendOTPSMS(identifier, otp);
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${identifier}`,
      // In development, include OTP in response (REMOVE IN PRODUCTION)
      ...(process.env.NODE_ENV === 'development' && { otp })
    });

  } catch (error) {
    console.error('[Agent Send OTP Error]:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
