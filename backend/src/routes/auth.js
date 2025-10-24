/**
 * Authentication Routes
 * Unified OTP endpoints for both client and agent portals
 */

import * as otpService from '../services/auth/otp.service.js';
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
        role: result.user.role
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
        role: result.user.role
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

export default {
  sendOTP,
  verifyOTP
};
