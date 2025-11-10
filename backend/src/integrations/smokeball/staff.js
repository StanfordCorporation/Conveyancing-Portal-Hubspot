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

    // Smokeball API wraps responses in 'value' field (OData format)
    const results = Array.isArray(response) ? response : response.value || [];

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
 * Based on old PHP: smokeball_get_staff_id('Laura', 'Stuart')
 *
 * @returns {Promise<Object|null>} Laura's staff object
 */
export async function findLaura() {
  return await findStaffByName('Laura', 'Stuart');
}

/**
 * Find Sean (default responsible solicitor)
 * Based on old PHP: smokeball_get_staff_id('Sean', 'Kerswill')
 *
 * @returns {Promise<Object|null>} Sean's staff object
 */
export async function findSean() {
  return await findStaffByName('Sean', 'Kerswill');
}

/**
 * Get default staff assignments for new matters
 * Returns staff IDs for responsible and assistant solicitors
 * Based on old PHP implementation
 *
 * @returns {Promise<Object>} { personResponsibleStaffId: UUID, personAssistingStaffId: UUID }
 */
export async function getDefaultStaffAssignments() {
  try {
    console.log('[Smokeball Staff] 👨‍💼 Getting default staff assignments...');

    // Find Sean Kerswill as responsible solicitor
    const sean = await findSean();
    if (!sean) {
      throw new Error('Could not find Sean Kerswill in staff list');
    }

    // Find Laura Stuart as assistant (optional)
    const laura = await findLaura();
    if (!laura) {
      console.warn('[Smokeball Staff] ⚠️ Could not find Laura Stuart - proceeding without assistant');
    }

    console.log(`[Smokeball Staff] ✅ Responsible: ${sean.firstName} ${sean.lastName} (${sean.id})`);
    if (laura) {
      console.log(`[Smokeball Staff] ✅ Assistant: ${laura.firstName} ${laura.lastName} (${laura.id})`);
    }

    return {
      personResponsibleStaffId: sean.id,
      personAssistingStaffId: laura?.id || null,
    };

  } catch (error) {
    console.error('[Smokeball Staff] ❌ Error getting default staff assignments:', error.message);
    
    // Fallback: use first available staff if specific staff not found
    console.warn('[Smokeball Staff] ⚠️ Falling back to first available staff member');
    const allStaff = await getAllStaff();

    if (allStaff.length === 0) {
      throw new Error('No staff members found in Smokeball');
    }

    const fallbackStaff = allStaff[0];
    console.log(`[Smokeball Staff] ⚠️ Using fallback: ${fallbackStaff.firstName} ${fallbackStaff.lastName}`);

    return {
      personResponsibleStaffId: fallbackStaff.id,
      personAssistingStaffId: null,
    };
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
  findSean,
  getDefaultStaffAssignments,
  clearStaffCache,
};
