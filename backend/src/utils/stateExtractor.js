/**
 * Australian State Extractor
 * Extracts state information from property addresses
 */

import { STATE_MAPPING, STATE_CODE_MAPPING } from '../config/smokeball.js';

/**
 * Extract Australian state from address string
 * Looks for state codes (NSW, VIC, etc.) or full names (New South Wales, etc.)
 *
 * @param {string} address - Property address
 * @returns {string|null} Full state name (e.g., "New South Wales") or null if not found
 */
export function extractStateFromAddress(address) {
  if (!address || typeof address !== 'string') {
    return null;
  }

  const normalizedAddress = address.toUpperCase();

  // Try to find state code (NSW, VIC, QLD, etc.)
  for (const [code, fullName] of Object.entries(STATE_MAPPING)) {
    // Look for state code as standalone word
    const codePattern = new RegExp(`\\b${code}\\b`);
    if (codePattern.test(normalizedAddress)) {
      return fullName;
    }
  }

  // Try to find full state name
  for (const [code, fullName] of Object.entries(STATE_MAPPING)) {
    if (normalizedAddress.includes(fullName.toUpperCase())) {
      return fullName;
    }
  }

  // Not found
  return null;
}

/**
 * Extract state code from address (returns NSW, VIC, etc.)
 *
 * @param {string} address - Property address
 * @returns {string|null} State code or null
 */
export function extractStateCodeFromAddress(address) {
  const fullStateName = extractStateFromAddress(address);

  if (!fullStateName) {
    return null;
  }

  return STATE_CODE_MAPPING[fullStateName] || null;
}

/**
 * Validate if a string is a valid Australian state
 *
 * @param {string} state - State name or code
 * @returns {boolean} True if valid state
 */
export function isValidAustralianState(state) {
  if (!state || typeof state !== 'string') {
    return false;
  }

  const normalized = state.toUpperCase();

  // Check if it's a valid code
  if (STATE_MAPPING[normalized]) {
    return true;
  }

  // Check if it's a valid full name
  return Object.values(STATE_MAPPING).some(
    fullName => fullName.toUpperCase() === normalized
  );
}

/**
 * Normalize state to full name
 * Accepts either code (NSW) or full name (New South Wales)
 * Returns full name
 *
 * @param {string} state - State code or full name
 * @returns {string|null} Full state name or null
 */
export function normalizeState(state) {
  if (!state || typeof state !== 'string') {
    return null;
  }

  const normalized = state.toUpperCase();

  // If it's a code, return full name
  if (STATE_MAPPING[normalized]) {
    return STATE_MAPPING[normalized];
  }

  // If it's already a full name, return it
  const isFullName = Object.values(STATE_MAPPING).some(
    fullName => fullName.toUpperCase() === normalized
  );

  if (isFullName) {
    // Return properly capitalized version
    return Object.values(STATE_MAPPING).find(
      fullName => fullName.toUpperCase() === normalized
    );
  }

  return null;
}

export default {
  extractStateFromAddress,
  extractStateCodeFromAddress,
  isValidAustralianState,
  normalizeState,
};
