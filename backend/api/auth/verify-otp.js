import jwt from 'jsonwebtoken';
import { verifyOTP } from '../../utils/otp.js';
import { searchContactByEmail, searchContactByEmailOrPhone } from '../../services/hubspot/contacts.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

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
    const { identifier, otp, method } = req.body;

    if (!identifier || !otp || !method) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'identifier, otp, and method are required'
      });
    }

    // Verify OTP
    const otpResult = verifyOTP(identifier, otp);

    if (!otpResult.valid) {
      return res.status(401).json({
        error: 'Invalid OTP',
        message: otpResult.message
      });
    }

    // Get contact from HubSpot
    let contact;
    if (method === 'email') {
      contact = await searchContactByEmail(identifier);
    } else if (method === 'mobile') {
      // Search for contact by phone number
      // Remove spaces from phone number (formatting done on frontend)
      const phoneWithoutSpaces = identifier.replace(/\s+/g, '');
      contact = await searchContactByEmailOrPhone(null, phoneWithoutSpaces);
    }

    if (!contact) {
      return res.status(404).json({
        error: 'Contact not found',
        message: `Unable to find user account with this ${method === 'email' ? 'email' : 'phone number'}`
      });
    }

    // Verify contact_type is set (required for all portals)
    if (!contact.properties?.contact_type) {
      return res.status(400).json({
        error: 'Invalid contact',
        message: 'Contact record is missing contact_type field. Please update the contact in HubSpot.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        contactId: contact.id,
        email: contact.properties?.email || identifier,
        contactType: contact.properties?.contact_type
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Return success with token and user data
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: contact.id,
        email: contact.properties?.email,
        firstname: contact.properties?.firstname,
        lastname: contact.properties?.lastname,
        phone: contact.properties?.phone,
        contactType: contact.properties?.contact_type
      }
    });

  } catch (error) {
    console.error('[Verify OTP Error]:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
