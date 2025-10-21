import axios from 'axios';
import { aircallConfig } from '../../config/aircall.config.js';

/**
 * Format phone number to E.164 international format
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    return null;
  }

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Handle different Australian formats
  if (cleaned.length === 10 && cleaned.startsWith('04')) {
    // Australian mobile: 0412345678 -> +61412345678
    return '+61' + cleaned.substring(1);
  } else if (cleaned.length === 11 && cleaned.startsWith('614')) {
    // With country code, no +: 61412345678 -> +61412345678
    return '+' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('61')) {
    // International with + removed: 61412345678 -> +61412345678
    return '+' + cleaned;
  } else if (phoneNumber.startsWith('+')) {
    // Already in international format
    return phoneNumber;
  }

  console.error('[Aircall] Unable to format phone number:', phoneNumber);
  return null;
};

/**
 * Make Aircall API call
 */
export const aircallApiCall = async (endpoint, method = 'GET', data = null) => {
  const { apiId, token, apiBase } = aircallConfig;

  if (!apiId || !token) {
    throw new Error('Aircall API credentials not configured');
  }

  const url = `${apiBase}${endpoint}`;
  const auth = Buffer.from(`${apiId}:${token}`).toString('base64');

  const config = {
    method,
    url,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    config.data = data;
  }

  if (aircallConfig.logEnabled) {
    console.log('[Aircall] API Request:', {
      url,
      method,
      hasData: !!data
    });
  }

  try {
    const response = await axios(config);

    if (aircallConfig.logEnabled) {
      console.log('[Aircall] API Success:', {
        endpoint,
        status: response.status
      });
    }

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error('[Aircall] API Error:', {
      endpoint,
      status: error.response?.status,
      message: errorMessage,
      fullError: error.response?.data
    });
    throw new Error(`Aircall API error: ${errorMessage}`);
  }
};

/**
 * Send SMS via Aircall Native Agent Conversation endpoint
 */
export const sendSMS = async (toNumber, content) => {
  const { lineId } = aircallConfig;

  if (!lineId) {
    throw new Error('Aircall Line ID not configured');
  }

  // Format phone number to E.164
  const toFormatted = formatPhoneNumber(toNumber);
  if (!toFormatted) {
    throw new Error(`Invalid phone number format: ${toNumber}`);
  }

  if (!content || content.trim() === '') {
    throw new Error('Message content cannot be empty');
  }

  // Agent Conversation endpoint payload (no 'from' field needed)
  const messageData = {
    to: toFormatted,
    body: content
  };

  if (aircallConfig.logEnabled) {
    console.log('[Aircall] Sending SMS via Native Agent Conversation:', {
      lineId,
      to: toFormatted,
      contentLength: content.length
    });
  }

  try {
    // Use correct Native Agent Conversation endpoint
    const result = await aircallApiCall(
      `/numbers/${lineId}/messages/native/send`,
      'POST',
      messageData
    );

    const messageId = result.id || 'unknown';

    console.log('[Aircall] SMS sent successfully:', {
      messageId,
      to: toFormatted,
      endpoint: 'native-agent-conversation'
    });

    return {
      success: true,
      messageId,
      to: toFormatted
    };
  } catch (error) {
    console.error('[Aircall] SMS send failed:', {
      to: toFormatted,
      error: error.message
    });
    throw error;
  }
};

/**
 * Send OTP via Aircall SMS
 */
export const sendOTPSMS = async (mobile, otp) => {
  const message = `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nStanford Legal - Conveyancing Portal`;

  try {
    const result = await sendSMS(mobile, message);

    console.log('[Aircall] OTP SMS sent successfully:', {
      mobile: result.to,
      messageId: result.messageId
    });

    return {
      success: true,
      message: `OTP sent to ${mobile}`,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('[Aircall] OTP SMS failed:', {
      mobile,
      error: error.message
    });
    throw error;
  }
};

export default {
  formatPhoneNumber,
  aircallApiCall,
  sendSMS,
  sendOTPSMS
};
