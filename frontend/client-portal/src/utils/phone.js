/**
 * Phone Number Utilities for Frontend
 * Normalizes Australian phone numbers to +61 format
 */

/**
 * Convert Australian phone number to international format (+61)
 * Handles formats: 0412345678, +61412345678, 0412 345 678, etc.
 * 
 * @param {string} phone - Phone number in any format
 * @returns {string} Phone number in +61 format or empty string if invalid
 * 
 * @example
 * normalizePhoneToInternational('0412345678') => '+61412345678'
 * normalizePhoneToInternational('+61412345678') => '+61412345678'
 * normalizePhoneToInternational('0412 345 678') => '+61412345678'
 */
export const normalizePhoneToInternational = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If already in international format (+61...), return as-is
  if (cleaned.startsWith('+61')) {
    return cleaned;
  }

  // If starts with 61 (without +), add +
  if (cleaned.startsWith('61')) {
    return '+' + cleaned;
  }

  // If starts with 0 (Australian domestic format), remove 0 and add +61
  if (cleaned.startsWith('0')) {
    return '+61' + cleaned.substring(1);
  }

  // If it's digits without prefix and has 9+ digits, assume Australian and add +61
  if (cleaned && cleaned.length >= 9) {
    return '+61' + cleaned;
  }

  // Return empty string if we can't parse it (invalid format)
  return '';
};

/**
 * Format phone number for display (keeps user-friendly format while typing)
 * Converts to +61 format but allows partial input
 * 
 * @param {string} phone - Phone number input
 * @returns {string} Formatted phone number
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  
  // If user is typing and hasn't finished, return as-is
  // Only format when complete number is entered
  const normalized = normalizePhoneToInternational(phone);
  
  // If normalization succeeded, return normalized
  // Otherwise return original (user might still be typing)
  return normalized || phone;
};

/**
 * Normalize phone for comparison (removes spaces, converts to +61)
 * Used for duplicate checking
 * 
 * @param {string} phone - Phone number
 * @returns {string} Normalized phone number
 */
export const normalizePhoneForComparison = (phone) => {
  return normalizePhoneToInternational(phone);
};

export default {
  normalizePhoneToInternational,
  formatPhoneForDisplay,
  normalizePhoneForComparison
};

