/**
 * Phone Number Utilities
 * Handles phone number formatting and normalization for Australia
 */

/**
 * Convert Australian phone number to international format
 * Handles both domestic (0412345678) and international (+61412345678) formats
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} Phone number in +61 format or original if unrecognizable
 *
 * @example
 * normalizePhoneToInternational('0434681036') => '+61434681036'
 * normalizePhoneToInternational('+61434681036') => '+61434681036'
 * normalizePhoneToInternational('0412345678') => '+61412345678'
 */
export const normalizePhoneToInternational = (phone) => {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If already in international format with +61, return cleaned (spaces removed)
  if (cleaned.startsWith('+61')) {
    return cleaned;
  }

  // If starts with 61 (without +), add +
  if (cleaned.startsWith('61')) {
    return '+' + cleaned;
  }

  // If starts with 0 (Australian domestic), convert to international
  if (cleaned.startsWith('0')) {
    // Remove leading 0 and add +61
    return '+61' + cleaned.slice(1);
  }

  // If it's already the digits without +, add +
  if (cleaned && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }

  // Return cleaned version (spaces removed) if we can't parse it better
  return cleaned || phone;
};

/**
 * Convert international phone number to Australian domestic format
 * Handles both international (+61412345678) and domestic (0412345678) formats
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} Phone number in 04xx format or original if unrecognizable
 *
 * @example
 * normalizePhoneToDomestic('+61434681036') => '0434681036'
 * normalizePhoneToDomestic('0434681036') => '0434681036'
 */
export const normalizePhoneToDomestic = (phone) => {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 61 (country code), convert to 0
  if (cleaned.startsWith('61')) {
    return '0' + cleaned.slice(2);
  }

  // If already starts with 0, return as-is
  if (cleaned.startsWith('0')) {
    return cleaned;
  }

  // Return original if we can't parse it
  return phone;
};

/**
 * Normalize phone number for HubSpot search
 * HubSpot stores Australian numbers in +61 format
 * Users might enter domestic format (0412345678)
 * This function handles both formats
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} Phone number normalized for HubSpot search
 */
export const normalizePhoneForSearch = (phone) => {
  if (!phone) return null;

  // Try international format first (what HubSpot uses)
  const international = normalizePhoneToInternational(phone);

  return international;
};

export default {
  normalizePhoneToInternational,
  normalizePhoneToDomestic,
  normalizePhoneForSearch
};
