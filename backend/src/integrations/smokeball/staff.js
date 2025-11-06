/**
 * Smokeball Staff Operations
 * Retrieve staff members and find specific staff by name
 */

import * as client from './client.js';
import { SMOKEBALL_API } from '../../config/smokeball.js';

/**
 * In-memory cache for staff members
 * Reduces API calls since staff list doesn't change frequently
 */
let staffCache = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all staff members
 *
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Staff members
 */
export async function getAllStaff(forceRefresh = false) {
  try {
    // Check cache validity
    const isCacheValid = staffCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION_MS);

    if (!forceRefresh && isCacheValid) {
      console.log('[Smokeball Staff] ♻️ Using cached staff list');
      return staffCache;
    }

    console.log('[Smokeball Staff] 🔄 Fetching staff members from API');

    const response = await client.get(SMOKEBALL_API.endpoints.staff);

    const results = Array.isArray(response) ? response : response.items || [];

    // Update cache
    staffCache = results;
    cacheTimestamp = Date.now();

    console.log(`[Smokeball Staff] ✅ Retrieved ${results.length} staff members`);

    return results;

  } catch (error) {
    console.error('[Smokeball Staff] ❌ Error fetching staff:', error.message);
    throw error;
  }
}

/**
 * Get staff member by ID
 *
 * @param {string} staffId - Staff UUID
 * @returns {Promise<Object>} Staff member details
 */
export async function getStaffMember(staffId) {
  try {
    const response = await client.get(SMOKEBALL_API.endpoints.staffMember(staffId));
    return response;
  } catch (error) {
    console.error('[Smokeball Staff] ❌ Error fetching staff member:', error.message);
    throw error;
  }
}

/**
 * Find staff member by name (case-insensitive)
 *
 * @param {string} firstName - First name to search
 * @param {string} lastName - Last name to search (optional)
 * @returns {Promise<Object|null>} Staff member if found, null otherwise
 */
export async function findStaffByName(firstName, lastName = null) {
  try {
    const allStaff = await getAllStaff();

    const match = allStaff.find(staff => {
      const firstNameMatch = staff.firstName?.toLowerCase() === firstName?.toLowerCase();

      if (lastName) {
        const lastNameMatch = staff.lastName?.toLowerCase() === lastName?.toLowerCase();
        return firstNameMatch && lastNameMatch;
      }

      return firstNameMatch;
    });

    if (match) {
      console.log(`[Smokeball Staff] ✅ Found staff: ${match.firstName} ${match.lastName} (${match.id})`);
    } else {
      console.log(`[Smokeball Staff] ℹ️ No staff found with name: ${firstName} ${lastName || ''}`);
    }

    return match || null;

  } catch (error) {
    console.error('[Smokeball Staff] ❌ Error finding staff by name:', error.message);
    throw error;
  }
}

/**
 * Find Laura (specific staff member for welcome tasks)
 *
 * @returns {Promise<Object|null>} Laura's staff object
 */
export async function findLaura() {
  // Try to find Laura by first name
  // Adjust this based on actual staff member's name in Smokeball
  return await findStaffByName('Laura');
}

/**
 * Get default staff assignments for new matters
 * Returns staff IDs for responsible and assistant solicitors
 *
 * @returns {Promise<Object>} { responsibleSolicitor: UUID, assistantSolicitor: UUID }
 */
export async function getDefaultStaffAssignments() {
  try {
    const allStaff = await getAllStaff();

    if (allStaff.length === 0) {
      throw new Error('No staff members found in Smokeball');
    }

    // For now, assign first available staff member as responsible solicitor
    // TODO: Implement logic to determine appropriate staff based on matter type, workload, etc.
    const responsibleSolicitor = allStaff[0];

    console.log(`[Smokeball Staff] 👨‍💼 Default staff assignment: ${responsibleSolicitor.firstName} ${responsibleSolicitor.lastName}`);

    return {
      responsibleSolicitor: responsibleSolicitor.id,
      assistantSolicitor: null, // Optional
    };

  } catch (error) {
    console.error('[Smokeball Staff] ❌ Error getting default staff assignments:', error.message);
    throw error;
  }
}

/**
 * Clear staff cache (useful when staff members change)
 */
export function clearStaffCache() {
  staffCache = null;
  cacheTimestamp = null;
  console.log('[Smokeball Staff] 🗑️ Staff cache cleared');
}

export default {
  getAllStaff,
  getStaffMember,
  findStaffByName,
  findLaura,
  getDefaultStaffAssignments,
  clearStaffCache,
};
