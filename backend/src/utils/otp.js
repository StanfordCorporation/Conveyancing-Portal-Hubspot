import crypto from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Initialize Nodemailer transporter
let transporter;
const initializeTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Store OTP with expiry (5 minutes)
 */
export const storeOTP = (identifier, otp) => {
  const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(identifier, { otp, expiryTime });

  // Auto-cleanup after expiry
  setTimeout(() => {
    otpStore.delete(identifier);
  }, 5 * 60 * 1000);
};

/**
 * Verify OTP
 */
export const verifyOTP = (identifier, otp) => {
  const stored = otpStore.get(identifier);

  if (!stored) {
    return { valid: false, message: 'OTP not found or expired' };
  }

  if (Date.now() > stored.expiryTime) {
    otpStore.delete(identifier);
    return { valid: false, message: 'OTP expired' };
  }

  if (stored.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }

  // OTP is valid, remove it
  otpStore.delete(identifier);
  return { valid: true, message: 'OTP verified successfully' };
};

/**
 * Send OTP via email using Nodemailer
 */
export const sendOTPEmail = async (email, otp) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[OTP Email] Nodemailer SMTP configuration missing');
      throw new Error('SMTP not configured');
    }

    const mailTransporter = initializeTransporter();

    // Calculate OTP expiry time (15 minutes from now)
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
    const formattedTime = expiryTime.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Australia/Sydney'
    });

    console.log(`[OTP Email] 📧 Sending OTP ${otp} to ${email}`);

    // Send email using Nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Your OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your One-Time Password (OTP)</h2>
          <p>Your OTP code is:</p>
          <h1 style="color: #007bff; letter-spacing: 2px;">${otp}</h1>
          <p>This code will expire at <strong>${formattedTime}</strong> (Sydney time).</p>
          <p style="color: #666; font-size: 12px;">If you did not request this code, please ignore this email.</p>
        </div>
      `
    };

    const response = await mailTransporter.sendMail(mailOptions);

    console.log(`[OTP Email] ✅ Email sent successfully:`, {
      email,
      messageId: response.messageId
    });

    return {
      success: true,
      message: `OTP sent to ${email}`,
      messageId: response.messageId
    };
  } catch (error) {
    const errorMessage = error?.message || JSON.stringify(error);
    console.error('[OTP Email] ❌ Failed to send email:', errorMessage);
    console.error('[OTP Email] Full error:', error);

    // Fallback: log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP Email] DEVELOPMENT FALLBACK - OTP ${otp} for ${email}`);
      return {
        success: true,
        message: `OTP sent to ${email} (development mode)`,
        fallback: true
      };
    }

    throw error;
  }
};

/**
 * Send OTP via SMS using Aircall
 */
export const sendOTPSMS = async (mobile, otp) => {
  try {
    // Import Aircall service dynamically to avoid circular dependencies
    const { sendOTPSMS: aircallSendOTP } = await import('../integrations/aircall/client.js');

    console.log(`[OTP SMS] Sending OTP ${otp} to ${mobile} via Aircall`);

    const result = await aircallSendOTP(mobile, otp);

    return {
      success: true,
      message: `OTP sent to ${mobile} via Aircall`,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('[OTP SMS] Aircall send failed:', error.message);

    // Fallback: log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP SMS] DEVELOPMENT FALLBACK - OTP ${otp} for ${mobile}`);
      return {
        success: true,
        message: `OTP sent to ${mobile} (development mode)`,
        fallback: true
      };
    }

    throw error;
  }
};

export default {
  generateOTP,
  storeOTP,
  verifyOTP,
  sendOTPEmail,
  sendOTPSMS
};
