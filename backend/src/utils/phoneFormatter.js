/**
 * Phone Number Formatter
 * Format phone numbers to Australian standard format
 */

/**
 * Format Australian phone number
 * Handles various input formats and converts to E.164 format
 *
 * Input examples:
 * - "0412345678" → "+61412345678"
 * - "04 1234 5678" → "+61412345678"
 * - "02 9876 5432" → "+61298765432"
 * - "+61412345678" → "+61412345678" (already formatted)
 * - "61412345678" → "+61412345678"
 *
 * @param {string} phone - Phone number in any format
 * @returns {string|null} Formatted phone number in E.164 format or null if invalid
 */
export function formatAustralianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove + if not at the start
  if (cleaned.indexOf('+') > 0) {
    cleaned = cleaned.replace(/\+/g, '');
  }

  // Handle different cases
  if (cleaned.startsWith('+61')) {
    // Already in E.164 format
    return cleaned;
  }

  if (cleaned.startsWith('61')) {
    // Missing + prefix
    return '+' + cleaned;
  }

  if (cleaned.startsWith('0')) {
    // Australian format starting with 0
    // Remove leading 0 and add +61
    return '+61' + cleaned.substring(1);
  }

  // If we get here, number format is unclear
  // Assume it's an Australian number without prefix
  return '+61' + cleaned;
}

/**
 * Validate Australian phone number
 * Checks if number matches Australian phone number patterns
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid Australian number
 */
export function isValidAustralianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const formatted = formatAustralianPhone(phone);

  if (!formatted) {
    return false;
  }

  // Australian numbers in E.164 format:
  // +61 followed by:
  // - Mobile: 4XX XXX XXX (9 digits total after 61)
  // - Landline: 2/3/7/8 XXXX XXXX (9 digits total after 61)
  const australianPattern = /^\+61[234578]\d{8}$/;

  return australianPattern.test(formatted);
}

/**
 * Format phone for display (Australian format with spaces)
 * "+61412345678" → "0412 345 678"
 * "+61298765432" → "02 9876 5432"
 *
 * @param {string} phone - Phone number in E.164 format
 * @returns {string|null} Display format or null
 */
export function formatPhoneForDisplay(phone) {
  const formatted = formatAustralianPhone(phone);

  if (!formatted || !isValidAustralianPhone(formatted)) {
    return phone; // Return original if invalid
  }

  // Remove +61 prefix
  const withoutPrefix = formatted.substring(3);

  // Check if mobile (starts with 4)
  if (withoutPrefix.startsWith('4')) {
    // Mobile: 0412 345 678
    return `0${withoutPrefix.substring(0, 3)} ${withoutPrefix.substring(3, 6)} ${withoutPrefix.substring(6)}`;
  } else {
    // Landline: 02 9876 5432
    return `0${withoutPrefix.substring(0, 1)} ${withoutPrefix.substring(1, 5)} ${withoutPrefix.substring(5)}`;
  }
}

/**
 * Detect if phone number is mobile or landline
 *
 * @param {string} phone - Phone number
 * @returns {string} 'mobile', 'landline', or 'unknown'
 */
export function detectPhoneType(phone) {
  const formatted = formatAustralianPhone(phone);

  if (!formatted || !isValidAustralianPhone(formatted)) {
    return 'unknown';
  }

  // Remove +61 prefix and check first digit
  const withoutPrefix = formatted.substring(3);

  if (withoutPrefix.startsWith('4')) {
    return 'mobile';
  } else if (['2', '3', '7', '8'].includes(withoutPrefix[0])) {
    return 'landline';
  }

  return 'unknown';
}

export default {
  formatAustralianPhone,
  isValidAustralianPhone,
  formatPhoneForDisplay,
  detectPhoneType,
};
