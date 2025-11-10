/**
 * Australian Address Parser
 * Parses Australian property addresses into components
 * Based on old PHP implementation: smokeball_parse_property_address()
 */

import { extractStateFromAddress, extractStateCodeFromAddress } from './stateExtractor.js';

/**
 * Parse Australian property address into components
 * Format: "123 Main Street, Sydney NSW 2000"
 *
 * @param {string} address - Full property address
 * @returns {Object} Parsed address components
 */
export function parsePropertyAddress(address) {
  const parsed = {
    streetNumber: '',
    streetName: '',
    streetType: '',
    suburb: '',
    state: '',
    postcode: '',
    country: 'Australia',
  };

  if (!address || typeof address !== 'string') {
    return parsed;
  }

  // Extract state (full name)
  const stateFullName = extractStateFromAddress(address);
  if (stateFullName) {
    parsed.state = stateFullName;
  }

  // Extract state code
  const stateCode = extractStateCodeFromAddress(address);

  // Extract postcode (4 digits)
  const postcodeMatch = address.match(/\b(\d{4})\b/);
  if (postcodeMatch) {
    parsed.postcode = postcodeMatch[1];
  }

  // Try to parse street address
  // Pattern: "123 Main Street, Sydney NSW 2000"
  const streetPattern = /^(\d+[A-Za-z]?)\s+([^,]+),\s*([^,]+)/;
  const streetMatch = address.match(streetPattern);

  if (streetMatch) {
    parsed.streetNumber = streetMatch[1].trim();

    // Parse street name and type
    const streetPart = streetMatch[2].trim();
    const streetParts = streetPart.split(/\s+/);

    if (streetParts.length > 1) {
      // Last word is likely street type (Street, Road, Avenue, etc.)
      parsed.streetType = streetParts[streetParts.length - 1];
      parsed.streetName = streetParts.slice(0, -1).join(' ');
    } else {
      parsed.streetName = streetPart;
    }

    // Parse suburb - clean it up
    let suburbRaw = streetMatch[3].trim();

    // Remove state abbreviation if present
    if (stateCode) {
      suburbRaw = suburbRaw.replace(new RegExp(`\\b${stateCode}\\b`, 'gi'), '').trim();
    }

    // Remove state full name if present
    if (stateFullName) {
      suburbRaw = suburbRaw.replace(new RegExp(stateFullName, 'gi'), '').trim();
    }

    // Remove postcode if present
    if (parsed.postcode) {
      suburbRaw = suburbRaw.replace(new RegExp(`\\b${parsed.postcode}\\b`, 'g'), '').trim();
    }

    // Remove trailing commas or extra spaces
    parsed.suburb = suburbRaw.replace(/[,\s]+$/, '').trim();
  } else {
    // Fallback: try simpler patterns
    // Just try to extract suburb and basic info
    const simpleParts = address.split(',');
    
    if (simpleParts.length >= 2) {
      // Last part usually has suburb, state, postcode
      let lastPart = simpleParts[simpleParts.length - 1].trim();
      
      // Remove state
      if (stateCode) {
        lastPart = lastPart.replace(new RegExp(`\\b${stateCode}\\b`, 'gi'), '').trim();
      }
      if (stateFullName) {
        lastPart = lastPart.replace(new RegExp(stateFullName, 'gi'), '').trim();
      }
      
      // Remove postcode
      if (parsed.postcode) {
        lastPart = lastPart.replace(new RegExp(`\\b${parsed.postcode}\\b`, 'g'), '').trim();
      }
      
      parsed.suburb = lastPart.replace(/[,\s]+$/, '').trim();
    }
  }

  return parsed;
}

/**
 * Parse Australian address specifically for Smokeball's residentialAddress format
 *
 * @param {string} address - Full address string
 * @returns {Object} Smokeball residentialAddress structure
 */
export function parseResidentialAddress(address) {
  const parsed = parsePropertyAddress(address);

  return {
    streetNumber: parsed.streetNumber || '',
    streetName: parsed.streetName || '',
    streetType: parsed.streetType || '',
    city: parsed.suburb || '', // Smokeball uses 'city' field for suburb
    state: parsed.state || '',
    zipCode: parsed.postcode || '', // Smokeball uses 'zipCode' for postcode
    country: 'Australia',
  };
}

/**
 * Format phone number for Smokeball API
 * Based on old PHP: smokeball_format_phone_number()
 *
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Handle Australian mobile numbers (04xx xxx xxx)
  if (cleaned.length === 10 && cleaned.startsWith('04')) {
    return cleaned;
  }

  // Handle numbers with country code (+614xx xxx xxx → 04xx xxx xxx)
  if (cleaned.length === 11 && cleaned.startsWith('614')) {
    return '0' + cleaned.substring(2);
  }

  // Handle numbers with country code including + (614xx xxx xxx)
  if (cleaned.length === 12 && cleaned.startsWith('61')) {
    return '0' + cleaned.substring(2);
  }

  // Return cleaned number for other formats
  return cleaned;
}

/**
 * Validate email address
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse seller name from comma-separated list
 * Based on old PHP: smokeball_parse_seller_name()
 * 
 * Extracts the first seller and splits into first/last name
 *
 * @param {string} sellerNames - Comma-separated list of seller names
 * @returns {Object} { firstName: string, lastName: string }
 */
export function parseSellerName(sellerNames) {
  const result = {
    firstName: '',
    lastName: '',
  };

  if (!sellerNames || typeof sellerNames !== 'string') {
    return result;
  }

  // Trim whitespace
  const trimmed = sellerNames.trim();

  // Split by comma to get individual sellers
  const sellers = trimmed.split(',').map(s => s.trim());

  // Get the first seller
  const firstSeller = sellers[0];

  if (!firstSeller) {
    return result;
  }

  // Remove multiple spaces and normalize
  const normalized = firstSeller.replace(/\s+/g, ' ');

  // Common titles to remove
  const titles = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Professor', 'Sir', 'Dame'];

  // Split into parts
  let nameParts = normalized.split(' ');

  // Remove title if present at the start
  const firstPartUpper = nameParts[0].replace('.', '').toUpperCase();
  const isTitle = titles.some(title => title.toUpperCase() === firstPartUpper);

  if (isTitle && nameParts.length > 1) {
    nameParts = nameParts.slice(1);
  }

  // Handle different name formats
  if (nameParts.length === 1) {
    // Single name - use as last name (common for businesses)
    result.lastName = nameParts[0];
  } else if (nameParts.length === 2) {
    // Standard first and last name
    result.firstName = nameParts[0];
    result.lastName = nameParts[1];
  } else {
    // Multiple parts - first as first name, rest as last name
    result.firstName = nameParts[0];
    result.lastName = nameParts.slice(1).join(' ');
  }

  return result;
}

/**
 * Parse all seller names from comma-separated list
 * Based on old PHP: smokeball_parse_all_seller_names()
 *
 * @param {string} sellerNames - Comma-separated list of sellers
 * @returns {Array<Object>} Array of { firstName, lastName } objects
 */
export function parseAllSellerNames(sellerNames) {
  if (!sellerNames || typeof sellerNames !== 'string') {
    return [];
  }

  // Split by comma
  const sellers = sellerNames.split(',').map(s => s.trim()).filter(s => s.length > 0);

  // Parse each seller
  return sellers.map(seller => parseSellerName(seller));
}

export default {
  parsePropertyAddress,
  parseResidentialAddress,
  formatPhoneNumber,
  validateEmail,
  parseSellerName,
  parseAllSellerNames,
};

