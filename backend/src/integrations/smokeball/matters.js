/**
 * Smokeball Matter Operations
 * CRUD operations for Smokeball matters (leads and converted matters)
 *
 * Lead Lifecycle:
 * 1. Create lead: POST /matters (isLead: true) → { id: UUID, number: null }
 * 2. Convert to matter: Webhook receives { id: UUID, number: "2024-CV-001" }
 * 3. Update HubSpot with matter_uid
 */

import * as client from './client.js';
import { SMOKEBALL_API, MATTER_TYPES } from '../../config/smokeball.js';

/**
 * Create a lead in Smokeball
 *
 * @param {Object} leadData - Lead information
 * @param {string} leadData.matterType - Matter type ID (e.g., 'conveyancing-purchase')
 * @param {string} leadData.shortName - Short description (e.g., "John Smith - 123 Main St")
 * @param {string} leadData.state - Australian state (e.g., "New South Wales")
 * @param {Array<Object>} leadData.contacts - Array of contact objects with roles
 * @param {Object} leadData.staff - Responsible staff assignments
 * @returns {Promise<Object>} Created lead with { id: UUID, number: null }
 */
export async function createLead(leadData) {
  try {
    console.log('[Smokeball Matters] 📝 Creating lead:', leadData.shortName);

    const payload = {
      isLead: true, // Critical: marks as lead (no matter number)
      matterType: leadData.matterType,
      shortName: leadData.shortName,
      state: leadData.state,
      contacts: leadData.contacts || [],
      staff: leadData.staff || {},
    };

    const response = await client.post(SMOKEBALL_API.endpoints.matters, payload);

    console.log('[Smokeball Matters] ✅ Lead created successfully');
    console.log(`[Smokeball Matters] 🆔 Lead UUID: ${response.id}`);
    console.log(`[Smokeball Matters] 📋 Matter Number: ${response.number || 'null (will be assigned on conversion)'}`);

    return response;

  } catch (error) {
    console.error('[Smokeball Matters] ❌ Error creating lead:', error.message);
    throw error;
  }
}

/**
 * Get matter by ID
 *
 * @param {string} matterId - Matter UUID
 * @returns {Promise<Object>} Matter details
 */
export async function getMatter(matterId) {
  try {
    console.log(`[Smokeball Matters] 🔍 Fetching matter: ${matterId}`);

    const response = await client.get(SMOKEBALL_API.endpoints.matter(matterId));

    console.log('[Smokeball Matters] ✅ Matter retrieved');
    console.log(`[Smokeball Matters] 📋 Matter Number: ${response.number || 'null (lead)'}`);
    console.log(`[Smokeball Matters] 📊 Is Lead: ${response.isLead}`);

    return response;

  } catch (error) {
    console.error('[Smokeball Matters] ❌ Error fetching matter:', error.message);
    throw error;
  }
}

/**
 * Update matter details
 *
 * @param {string} matterId - Matter UUID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated matter
 */
export async function updateMatter(matterId, updateData) {
  try {
    console.log(`[Smokeball Matters] 🔄 Updating matter: ${matterId}`);

    const response = await client.patch(
      SMOKEBALL_API.endpoints.matter(matterId),
      updateData
    );

    console.log('[Smokeball Matters] ✅ Matter updated successfully');

    return response;

  } catch (error) {
    console.error('[Smokeball Matters] ❌ Error updating matter:', error.message);
    throw error;
  }
}

/**
 * Search for matters
 *
 * @param {Object} searchParams - Search criteria
 * @param {string} searchParams.shortName - Search by short name (partial match)
 * @param {string} searchParams.matterType - Filter by matter type
 * @param {boolean} searchParams.isLead - Filter leads vs matters
 * @param {string} searchParams.state - Filter by state
 * @returns {Promise<Array>} Matching matters
 */
export async function searchMatters(searchParams = {}) {
  try {
    console.log('[Smokeball Matters] 🔍 Searching matters:', searchParams);

    const response = await client.get(SMOKEBALL_API.endpoints.matters, searchParams);

    const results = Array.isArray(response) ? response : response.items || [];

    console.log(`[Smokeball Matters] ✅ Found ${results.length} matters`);

    return results;

  } catch (error) {
    console.error('[Smokeball Matters] ❌ Error searching matters:', error.message);
    throw error;
  }
}

/**
 * Add contact to matter with role
 *
 * @param {string} matterId - Matter UUID
 * @param {string} contactId - Contact UUID
 * @param {string} role - Contact role (e.g., 'Purchaser', 'Vendor', 'Vendor Solicitor')
 * @returns {Promise<Object>} Updated matter
 */
export async function addContactToMatter(matterId, contactId, role) {
  try {
    console.log(`[Smokeball Matters] 👤 Adding contact ${contactId} to matter ${matterId} as ${role}`);

    // Get current matter
    const matter = await getMatter(matterId);

    // Add new contact to contacts array
    const updatedContacts = [
      ...(matter.contacts || []),
      {
        contactId,
        role,
      },
    ];

    // Update matter
    const response = await updateMatter(matterId, {
      contacts: updatedContacts,
    });

    console.log('[Smokeball Matters] ✅ Contact added to matter');

    return response;

  } catch (error) {
    console.error('[Smokeball Matters] ❌ Error adding contact to matter:', error.message);
    throw error;
  }
}

/**
 * Assign staff to matter
 *
 * @param {string} matterId - Matter UUID
 * @param {Object} staffAssignments - Staff member IDs by role
 * @param {string} staffAssignments.responsibleSolicitor - Staff UUID
 * @param {string} staffAssignments.assistantSolicitor - Staff UUID (optional)
 * @returns {Promise<Object>} Updated matter
 */
export async function assignStaff(matterId, staffAssignments) {
  try {
    console.log(`[Smokeball Matters] 👨‍💼 Assigning staff to matter ${matterId}`);

    const response = await updateMatter(matterId, {
      staff: staffAssignments,
    });

    console.log('[Smokeball Matters] ✅ Staff assigned to matter');

    return response;

  } catch (error) {
    console.error('[Smokeball Matters] ❌ Error assigning staff:', error.message);
    throw error;
  }
}

/**
 * Check if matter exists by searching for short name
 *
 * @param {string} shortName - Matter short name to search
 * @returns {Promise<Object|null>} Matter if found, null otherwise
 */
export async function findMatterByShortName(shortName) {
  try {
    const results = await searchMatters({ shortName });

    // Exact match (case-insensitive)
    const exactMatch = results.find(
      (matter) => matter.shortName.toLowerCase() === shortName.toLowerCase()
    );

    return exactMatch || null;

  } catch (error) {
    console.error('[Smokeball Matters] ❌ Error finding matter:', error.message);
    throw error;
  }
}

/**
 * Build matter short name from deal data
 * Format: "Client Name - Property Address"
 *
 * @param {Object} dealData - HubSpot deal data
 * @returns {string} Short name
 */
export function buildMatterShortName(dealData) {
  const clientName = dealData.properties?.client_name || 'Client';
  const propertyAddress = dealData.properties?.property_address || 'Property';

  // Truncate if too long (Smokeball may have limits)
  const shortName = `${clientName} - ${propertyAddress}`;

  return shortName.substring(0, 100); // Limit to 100 characters
}

export default {
  createLead,
  getMatter,
  updateMatter,
  searchMatters,
  addContactToMatter,
  assignStaff,
  findMatterByShortName,
  buildMatterShortName,
};
