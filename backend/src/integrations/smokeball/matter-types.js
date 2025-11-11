/**
 * Smokeball Matter Types
 * Fetch and lookup matter types from Smokeball
 */

import * as client from './client.js';
import { SMOKEBALL_API } from '../../config/smokeball.js';

/**
 * In-memory cache for matter types
 */
let matterTypesCache = {};
let cacheTimestamp = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get all matter types for a specific state
 *
 * @param {string} state - Australian state (e.g., 'New South Wales', 'QLD')
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Matter types for the state
 */
export async function getMatterTypesByState(state, forceRefresh = false) {
  try {
    // Normalize state to full name if abbreviation provided
    const stateFullName = normalizeStateName(state);

    // Check cache
    const cacheKey = stateFullName;
    const isCacheValid = 
      matterTypesCache[cacheKey] && 
      cacheTimestamp && 
      (Date.now() - cacheTimestamp < CACHE_DURATION_MS);

    if (!forceRefresh && isCacheValid) {
      console.log(`[Smokeball Matter Types] ♻️ Using cached matter types for ${stateFullName}`);
      return matterTypesCache[cacheKey];
    }

    console.log(`[Smokeball Matter Types] 🔄 Fetching matter types for ${stateFullName}`);

    // Fetch matter types with type=1 filter (only matter types usable for lead/matter creation)
    // and location filter for the specific state
    const stateCode = getStateCode(stateFullName);
    const queryParams = {
      type: 1,  // Only fetch matter types that can be used for creating leads/matters
      location: stateCode,  // Filter by state code (e.g., QLD, NSW)
    };

    const response = await client.get(SMOKEBALL_API.endpoints.matterTypes, queryParams);

    // Smokeball API wraps responses in 'value' field (OData format)
    const stateMatterTypes = Array.isArray(response) ? response : response.value || [];

    console.log(`[Smokeball Matter Types] 📊 Total matter types fetched: ${stateMatterTypes.length}`);

    // Update cache
    matterTypesCache[cacheKey] = stateMatterTypes;
    cacheTimestamp = Date.now();

    console.log(`[Smokeball Matter Types] ✅ Retrieved ${stateMatterTypes.length} matter types for ${stateFullName}`);

    return stateMatterTypes;

  } catch (error) {
    console.error('[Smokeball Matter Types] ❌ Error fetching matter types:', error.message);
    throw error;
  }
}

/**
 * Find matter type by category and name
 * Based on old PHP implementation: smokeball_get_matter_type_and_role()
 *
 * @param {string} state - Australian state
 * @param {string} category - Category name (e.g., 'Conveyancing')
 * @param {string} name - Matter type name (e.g., 'Sale', 'Purchase')
 * @returns {Promise<Object|null>} { id: string, clientRole: string } or null
 */
export async function findMatterType(state, category, name) {
  try {
    console.log(`[Smokeball Matter Types] 🔍 Searching for: ${category} > ${name} in ${state}`);

    const matterTypes = await getMatterTypesByState(state);

    if (!matterTypes || matterTypes.length === 0) {
      console.error(`[Smokeball Matter Types] ❌ No matter types found for state: ${state}`);
      return null;
    }

    // Log available matter types for debugging
    console.log('[Smokeball Matter Types] Available matter types:');
    matterTypes.forEach(mt => {
      console.log(`  - ${mt.category || 'N/A'} > ${mt.name || 'N/A'} (ID: ${mt.id})`);
    });

    // Search for matching matter type (case-insensitive)
    const match = matterTypes.find(mt => {
      const categoryMatch = mt.category?.toLowerCase() === category.toLowerCase();
      const nameMatch = mt.name?.toLowerCase() === name.toLowerCase();
      const notDeleted = !mt.deleted || mt.deleted === false;

      return categoryMatch && nameMatch && notDeleted;
    });

    if (!match) {
      console.error(`[Smokeball Matter Types] ❌ No match found for: ${category} > ${name}`);
      return null;
    }

    // Determine preferred client role from representativeOptions
    // Smokeball uses terms like 'Vendor' (not 'Seller'), 'Purchaser' (not 'Buyer')
    let clientRole = 'Client'; // Default fallback
    
    if (match.representativeOptions && Array.isArray(match.representativeOptions)) {
      // Prefer Vendor/Purchaser over Seller/Buyer
      if (match.representativeOptions.includes('Vendor')) {
        clientRole = 'Vendor';
      } else if (match.representativeOptions.includes('Seller')) {
        clientRole = 'Seller';
      } else if (match.representativeOptions.includes('Purchaser')) {
        clientRole = 'Purchaser';
      } else if (match.representativeOptions.includes('Buyer')) {
        clientRole = 'Buyer';
      } else if (match.representativeOptions.includes('Prospect')) {
        clientRole = 'Prospect';
      } else if (match.representativeOptions.length > 0) {
        // Use first available role
        clientRole = match.representativeOptions[0];
      }
    }

    console.log(`[Smokeball Matter Types] ✅ Found: ${match.name} (ID: ${match.id}, Role: ${clientRole})`);

    return {
      id: match.id,
      clientRole: clientRole,
      name: match.name,
      category: match.category,
    };

  } catch (error) {
    console.error('[Smokeball Matter Types] ❌ Error finding matter type:', error.message);
    throw error;
  }
}

/**
 * Get matter type for conveyancing sale
 *
 * @param {string} state - Australian state
 * @returns {Promise<Object|null>} Matter type with id and clientRole
 */
export async function getConveyancingSaleMatterType(state) {
  return await findMatterType(state, 'Conveyancing', 'Sale');
}

/**
 * Get matter type for conveyancing purchase
 *
 * @param {string} state - Australian state
 * @returns {Promise<Object|null>} Matter type with id and clientRole
 */
export async function getConveyancingPurchaseMatterType(state) {
  return await findMatterType(state, 'Conveyancing', 'Purchase');
}

/**
 * Normalize state name to full name
 * 
 * @param {string} state - State code or full name
 * @returns {string} Full state name
 */
function normalizeStateName(state) {
  const stateMapping = {
    'NSW': 'New South Wales',
    'VIC': 'Victoria',
    'QLD': 'Queensland',
    'WA': 'Western Australia',
    'SA': 'South Australia',
    'TAS': 'Tasmania',
    'ACT': 'Australian Capital Territory',
    'NT': 'Northern Territory',
  };

  // If it's already a full name, return it
  if (Object.values(stateMapping).includes(state)) {
    return state;
  }

  // Otherwise, try to map from code
  return stateMapping[state.toUpperCase()] || state;
}

/**
 * Get state code from full name
 * 
 * @param {string} stateName - Full state name
 * @returns {string} State code
 */
function getStateCode(stateName) {
  const reverseMapping = {
    'New South Wales': 'NSW',
    'Victoria': 'VIC',
    'Queensland': 'QLD',
    'Western Australia': 'WA',
    'South Australia': 'SA',
    'Tasmania': 'TAS',
    'Australian Capital Territory': 'ACT',
    'Northern Territory': 'NT',
  };

  return reverseMapping[stateName] || stateName;
}

/**
 * Clear matter types cache
 */
export function clearMatterTypesCache() {
  matterTypesCache = {};
  cacheTimestamp = null;
  console.log('[Smokeball Matter Types] 🗑️ Cache cleared');
}

export default {
  getMatterTypesByState,
  findMatterType,
  getConveyancingSaleMatterType,
  getConveyancingPurchaseMatterType,
  clearMatterTypesCache,
};

