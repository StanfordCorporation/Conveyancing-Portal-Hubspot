import { generateOTP, storeOTP, sendOTPEmail, sendOTPSMS } from '../../utils/otp.js';
import { searchContactByEmail, searchContactByEmailOrPhone } from '../../services/hubspot/contacts.service.js';

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

    // Check if contact exists in HubSpot
    let contact;
    if (method === 'email') {
      contact = await searchContactByEmail(identifier);
      if (!contact) {
        return res.status(404).json({
          error: 'Contact not found',
          message: 'No account found with this email address'
        });
      }
    } else if (method === 'mobile') {
      // Search for contact by phone number
      // Remove spaces from phone number (formatting done on frontend)
      const phoneWithoutSpaces = identifier.replace(/\s+/g, '');
      contact = await searchContactByEmailOrPhone(null, phoneWithoutSpaces);
      if (!contact) {
        return res.status(404).json({
          error: 'Contact not found',
          message: 'No account found with this phone number'
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP
    storeOTP(identifier, otp);

    // Send OTP
    let result;
    if (method === 'email') {
      result = await sendOTPEmail(identifier, otp);
    } else {
      result = await sendOTPSMS(identifier, otp);
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${identifier}`,
      // In development, include OTP in response (REMOVE IN PRODUCTION)
      ...(process.env.NODE_ENV === 'development' && { otp })
    });

  } catch (error) {
    console.error('[Send OTP Error]:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
