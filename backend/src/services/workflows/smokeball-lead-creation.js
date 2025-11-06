/**
 * Smokeball Lead Creation Workflow
 * Creates a lead in Smokeball when a deal is created in HubSpot
 *
 * Trigger: Deal created in HubSpot
 * Actions:
 * 1. Fetch deal and associated contacts from HubSpot
 * 2. Extract property state from address
 * 3. Determine matter type (purchase vs sale)
 * 4. Create contacts in Smokeball
 * 5. Create lead in Smokeball
 * 6. Update HubSpot deal with lead_uid and sync status
 */

import * as dealsIntegration from '../../integrations/hubspot/deals.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import * as smokeballMatters from '../../integrations/smokeball/matters.js';
import * as smokeballContacts from '../../integrations/smokeball/contacts.js';
import * as smokeballStaff from '../../integrations/smokeball/staff.js';
import { extractStateFromAddress } from '../../utils/stateExtractor.js';
import { MATTER_TYPES } from '../../config/smokeball.js';

/**
 * Create Smokeball lead from HubSpot deal
 *
 * @param {string} dealId - HubSpot deal ID
 * @returns {Promise<Object>} Result with lead info and sync status
 */
export async function createSmokeballLeadFromDeal(dealId) {
  try {
    console.log('[Smokeball Lead Workflow] 🚀 Starting lead creation for deal:', dealId);

    // ========================================
    // STEP 1: Fetch HubSpot deal
    // ========================================
    console.log('[Smokeball Lead Workflow] 📋 Fetching deal from HubSpot...');

    const deal = await dealsIntegration.getDeal(dealId, [
      'dealname',
      'property_address',
      'transaction_type',
      'client_name',
    ]);

    const props = deal.properties;

    console.log(`[Smokeball Lead Workflow] ✅ Deal: ${props.dealname}`);
    console.log(`[Smokeball Lead Workflow] 📍 Address: ${props.property_address}`);

    // ========================================
    // STEP 2: Extract state from address
    // ========================================
    const state = extractStateFromAddress(props.property_address);

    if (!state) {
      throw new Error(`Could not extract state from address: ${props.property_address}`);
    }

    console.log(`[Smokeball Lead Workflow] 🗺️ State: ${state}`);

    // ========================================
    // STEP 3: Determine matter type
    // ========================================
    const transactionType = props.transaction_type?.toLowerCase();
    const matterType = determineMatterType(transactionType);

    console.log(`[Smokeball Lead Workflow] 📂 Matter Type: ${matterType}`);

    // ========================================
    // STEP 4: Get associated contacts from HubSpot
    // ========================================
    console.log('[Smokeball Lead Workflow] 👥 Fetching associated contacts...');

    const associations = await dealsIntegration.getDealAssociations(dealId, 'contacts');
    const hubspotContactIds = associations.results?.map(assoc => assoc.id) || [];

    console.log(`[Smokeball Lead Workflow] Found ${hubspotContactIds.length} associated contacts`);

    // ========================================
    // STEP 5: Create contacts in Smokeball
    // ========================================
    const smokeballContactsWithRoles = [];

    for (const contactId of hubspotContactIds) {
      try {
        // Fetch HubSpot contact
        const hubspotContact = await contactsIntegration.getContact(contactId);

        // Build Smokeball contact data
        const contactData = smokeballContacts.buildContactFromHubSpot(hubspotContact);

        // Create or get existing contact
        const smokeballContact = await smokeballContacts.getOrCreateContact(contactData);

        // Determine role based on transaction type
        const role = determineContactRole(transactionType);

        smokeballContactsWithRoles.push({
          contactId: smokeballContact.id,
          role,
        });

        // Update HubSpot contact with Smokeball ID
        await contactsIntegration.updateContact(contactId, {
          smokeball_contact_id: smokeballContact.id,
          smokeball_sync_status: 'synced',
        });

        console.log(`[Smokeball Lead Workflow] ✅ Contact synced: ${smokeballContact.id}`);

      } catch (error) {
        console.error(`[Smokeball Lead Workflow] ⚠️ Error syncing contact ${contactId}:`, error.message);
        // Continue with other contacts
      }
    }

    // ========================================
    // STEP 6: Get default staff assignments
    // ========================================
    console.log('[Smokeball Lead Workflow] 👨‍💼 Getting staff assignments...');

    const staffAssignments = await smokeballStaff.getDefaultStaffAssignments();

    // ========================================
    // STEP 7: Create lead in Smokeball
    // ========================================
    console.log('[Smokeball Lead Workflow] 📝 Creating lead in Smokeball...');

    const shortName = smokeballMatters.buildMatterShortName(deal);

    const leadData = {
      matterType,
      shortName,
      state,
      contacts: smokeballContactsWithRoles,
      staff: staffAssignments,
    };

    const smokeballLead = await smokeballMatters.createLead(leadData);

    console.log(`[Smokeball Lead Workflow] ✅ Lead created: ${smokeballLead.id}`);

    // ========================================
    // STEP 7.5: Fill in property address in Smokeball
    // ========================================
    console.log('[Smokeball Lead Workflow] 📍 Updating property address in Smokeball...');

    try {
      await smokeballMatters.updateMatter(smokeballLead.id, {
        propertyAddress: props.property_address,
      });
      console.log('[Smokeball Lead Workflow] ✅ Property address updated in Smokeball');
    } catch (addressError) {
      console.error('[Smokeball Lead Workflow] ⚠️ Failed to update property address:', addressError.message);
      // Don't fail the entire workflow - property address can be updated later
    }

    // ========================================
    // STEP 8: Update HubSpot deal with lead_uid
    // ========================================
    console.log('[Smokeball Lead Workflow] 🔄 Updating HubSpot deal...');

    await dealsIntegration.updateDeal(dealId, {
      lead_uid: smokeballLead.id,
      matter_uid: null, // Will be populated on conversion
      smokeball_sync_status: 'synced',
      smokeball_last_sync: new Date().toISOString(),
    });

    console.log('[Smokeball Lead Workflow] ✅ Workflow completed successfully!');

    return {
      success: true,
      leadId: smokeballLead.id,
      dealId,
      shortName,
      state,
      matterType,
      contactsCreated: smokeballContactsWithRoles.length,
    };

  } catch (error) {
    console.error('[Smokeball Lead Workflow] ❌ Workflow failed:', error.message);

    // Update HubSpot with error status
    try {
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'error',
        smokeball_sync_error: error.message,
      });
    } catch (updateError) {
      console.error('[Smokeball Lead Workflow] ❌ Failed to update error status:', updateError.message);
    }

    throw error;
  }
}

/**
 * Determine matter type based on transaction type
 *
 * @param {string} transactionType - 'purchase' or 'sale'
 * @returns {string} Smokeball matter type ID
 */
function determineMatterType(transactionType) {
  if (transactionType === 'purchase') {
    return MATTER_TYPES.CONVEYANCING_PURCHASE;
  } else if (transactionType === 'sale') {
    return MATTER_TYPES.CONVEYANCING_SALE;
  } else {
    // Default to purchase
    console.warn('[Smokeball Lead Workflow] ⚠️ Unknown transaction type, defaulting to purchase');
    return MATTER_TYPES.CONVEYANCING_PURCHASE;
  }
}

/**
 * Determine contact role based on transaction type
 *
 * @param {string} transactionType - 'purchase' or 'sale'
 * @returns {string} Contact role
 */
function determineContactRole(transactionType) {
  if (transactionType === 'purchase') {
    return 'Purchaser';
  } else if (transactionType === 'sale') {
    return 'Vendor';
  } else {
    return 'Client';
  }
}

export default {
  createSmokeballLeadFromDeal,
};
