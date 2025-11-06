/**
 * Name Parser Utility
 * Parse full names into first and last names
 */

/**
 * Parse full name into first and last name
 * Handles various formats:
 * - "John Smith" → { firstName: "John", lastName: "Smith" }
 * - "John" → { firstName: "John", lastName: "" }
 * - "John Paul Smith" → { firstName: "John Paul", lastName: "Smith" }
 * - "Mr. John Smith" → { firstName: "John", lastName: "Smith" }
 *
 * @param {string} fullName - Full name string
 * @returns {Object} { firstName: string, lastName: string }
 */
export function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: 'Unknown', lastName: 'Contact' };
  }

  // Remove extra whitespace
  const cleaned = fullName.trim().replace(/\s+/g, ' ');

  // Remove common titles
  const withoutTitles = cleaned.replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+/i, '');

  // Split into parts
  const parts = withoutTitles.split(' ');

  if (parts.length === 0) {
    return { firstName: 'Unknown', lastName: 'Contact' };
  }

  if (parts.length === 1) {
    // Single name - use as first name
    return { firstName: parts[0], lastName: '' };
  }

  // Multiple parts - last part is surname, rest is first name
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');

  return { firstName, lastName };
}

/**
 * Validate name components
 *
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {boolean} True if both are non-empty
 */
export function isValidName(firstName, lastName) {
  return !!(firstName && lastName && firstName.trim() && lastName.trim());
}

/**
 * Format name for display
 *
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Formatted name
 */
export function formatName(firstName, lastName) {
  if (!firstName && !lastName) {
    return 'Unknown Contact';
  }

  if (!lastName) {
    return firstName;
  }

  return `${firstName} ${lastName}`.trim();
}

/**
 * Capitalize name (proper case)
 * "john smith" → "John Smith"
 * "JOHN SMITH" → "John Smith"
 *
 * @param {string} name - Name to capitalize
 * @returns {string} Capitalized name
 */
export function capitalizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default {
  parseFullName,
  isValidName,
  formatName,
  capitalizeName,
};
