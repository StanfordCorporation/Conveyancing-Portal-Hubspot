/**
 * Smokeball Quote Accepted Workflow
 * Triggered when deal reaches Stage 3: Searches Quote Provided/Accepted
 *
 * Actions:
 * 1. Update contact residential addresses in Smokeball
 * 2. Convert lead to matter in Smokeball
 * 3. Create welcome tasks for Laura
 * 4. matter.converted webhook will store matter number
 */

import * as dealsIntegration from '../../integrations/hubspot/deals.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import * as associationsIntegration from '../../integrations/hubspot/associations.js';
import * as smokeballMatters from '../../integrations/smokeball/matters.js';
import * as smokeballContacts from '../../integrations/smokeball/contacts.js';
import * as smokeballStaff from '../../integrations/smokeball/staff.js';
import * as smokeballTasks from '../../integrations/smokeball/tasks.js';

/**
 * Handle searches quote accepted
 *
 * @param {string} dealId - HubSpot deal ID
 * @returns {Promise<Object>} Result
 */
export async function handleQuoteAccepted(dealId) {
  try {
    console.log('[Smokeball Quote Workflow] 🎯 Processing quote accepted for deal:', dealId);

    // ========================================
    // STEP 1: Fetch HubSpot deal
    // ========================================
    const deal = await dealsIntegration.getDeal(dealId, [
      'dealname',
      'lead_uid',
      'matter_uid',
      'property_address',
      'smokeball_sync_status',
    ]);

    const leadUid = deal.properties.lead_uid;
    const matterUid = deal.properties.matter_uid;

    if (!leadUid) {
      throw new Error('No lead_uid found. Lead must be created in Smokeball first.');
    }

    console.log(`[Smokeball Quote Workflow] 🆔 Lead UID: ${leadUid}`);

    // ========================================
    // STEP 2: Check if already converted to matter
    // ========================================
    if (matterUid) {
      console.log(`[Smokeball Quote Workflow] ✅ Already converted to matter: ${matterUid}`);
      return {
        success: true,
        message: 'Lead already converted to matter',
        matterUid,
      };
    }

    // ========================================
    // STEP 3: Get associated contacts from HubSpot
    // ========================================
    console.log('[Smokeball Quote Workflow] 👥 Fetching associated contacts...');

    const contacts = await associationsIntegration.getDealContacts(dealId);
    const hubspotContactIds = contacts.map(contact => contact.id);

    console.log(`[Smokeball Quote Workflow] Found ${hubspotContactIds.length} associated contacts`);

    // ========================================
    // STEP 4: Update residential addresses for contacts
    // ========================================
    console.log('[Smokeball Quote Workflow] 📍 Updating contact residential addresses...');

    let addressesUpdated = 0;

    for (const contactId of hubspotContactIds) {
      try {
        // Fetch HubSpot contact to get residential address
        const hubspotContact = await contactsIntegration.getContact(contactId, [
          'smokeball_contact_id',
          'address',
          'city',
          'state',
          'zip',
        ]);

        const smokeballContactId = hubspotContact.properties.smokeball_contact_id;

        if (!smokeballContactId) {
          console.warn(`[Smokeball Quote Workflow] ⚠️ No Smokeball contact ID for HubSpot contact ${contactId}`);
          continue;
        }

        // Build residential address from HubSpot contact properties
        const residentialAddress = buildResidentialAddress(hubspotContact.properties);

        if (!residentialAddress) {
          console.warn(`[Smokeball Quote Workflow] ⚠️ No residential address for contact ${contactId}`);
          continue;
        }

        // Update contact in Smokeball
        await smokeballContacts.updateContact(smokeballContactId, {
          person: {
            residentialAddress,
          },
        });

        addressesUpdated++;
        console.log(`[Smokeball Quote Workflow] ✅ Updated residential address for contact ${smokeballContactId}`);

      } catch (contactError) {
        console.error(`[Smokeball Quote Workflow] ⚠️ Error updating contact ${contactId}:`, contactError.message);
        // Continue with other contacts
      }
    }

    console.log(`[Smokeball Quote Workflow] ✅ Updated ${addressesUpdated} contact addresses`);

    // ========================================
    // STEP 5: Convert lead to matter
    // ========================================
    console.log('[Smokeball Quote Workflow] 🔄 Converting lead to matter...');

    try {
      // Get current matter details to check if already converted
      const currentMatter = await smokeballMatters.getMatter(leadUid);

      if (!currentMatter.isLead) {
        console.log('[Smokeball Quote Workflow] ℹ️ Already converted to matter in Smokeball');

        // Update HubSpot with matter number if available
        if (currentMatter.number) {
          await dealsIntegration.updateDeal(dealId, {
            matter_uid: currentMatter.number,
            smokeball_sync_status: 'Successfull',
          });
        }

        return {
          success: true,
          message: 'Lead already converted',
          matterNumber: currentMatter.number,
        };
      }

      // Convert lead to matter
      await smokeballMatters.updateMatter(leadUid, {
        isLead: false,
      });

      console.log('[Smokeball Quote Workflow] ✅ Lead to matter conversion initiated');
      console.log('[Smokeball Quote Workflow] ℹ️ matter.converted webhook will provide matter number');

      // Update sync status (awaiting webhook for matter number)
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Successfull',
        smokeball_last_sync: new Date().toISOString(),
      });

    } catch (conversionError) {
      console.error('[Smokeball Quote Workflow] ❌ Conversion error:', conversionError.message);
      throw conversionError;
    }

    // ========================================
    // STEP 6: Create welcome tasks for Laura
    // ========================================
    console.log('[Smokeball Quote Workflow] 📋 Creating welcome tasks for Laura...');

    try {
      const laura = await smokeballStaff.findLaura();

      if (!laura) {
        console.warn('[Smokeball Quote Workflow] ⚠️ Laura not found - skipping welcome tasks');
      } else {
        const tasks = await smokeballTasks.createWelcomeTasksForLaura(leadUid, laura.id);
        console.log(`[Smokeball Quote Workflow] ✅ Created ${tasks.length} welcome tasks for Laura`);
      }
    } catch (taskError) {
      console.error('[Smokeball Quote Workflow] ⚠️ Error creating tasks:', taskError.message);
      // Don't fail workflow - tasks can be created manually
    }

    console.log('[Smokeball Quote Workflow] ✅ Workflow completed successfully!');

    return {
      success: true,
      leadUid,
      dealId,
      addressesUpdated,
      message: 'Quote accepted processing complete. Awaiting matter.converted webhook for matter number.',
      nextSteps: [
        'Residential addresses updated in Smokeball',
        'Lead-to-matter conversion initiated',
        'Welcome tasks created for Laura',
        'matter.converted webhook will sync matter number to HubSpot',
      ],
    };

  } catch (error) {
    console.error('[Smokeball Quote Workflow] ❌ Workflow failed:', error.message);

    // Update HubSpot with error status
    try {
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Failed',
        smokeball_sync_error: error.message,
      });
    } catch (updateError) {
      console.error('[Smokeball Quote Workflow] ❌ Failed to update error status:', updateError.message);
    }

    throw error;
  }
}

/**
 * Build residential address object from HubSpot contact properties
 *
 * @param {Object} contactProps - HubSpot contact properties
 * @returns {Object|null} Smokeball residential address format
 */
function buildResidentialAddress(contactProps) {
  const address = contactProps.address;
  const city = contactProps.city;
  const state = contactProps.state;
  const zipCode = contactProps.zip;

  // Need at least street address
  if (!address) {
    return null;
  }

  // Parse street address into components
  // Format: "123 Main Street" or "456 Home Avenue"
  const addressParts = address.trim().split(' ');

  let streetNumber = '';
  let streetName = '';
  let streetType = '';

  if (addressParts.length >= 2) {
    // First part is likely street number
    if (/^\d+/.test(addressParts[0])) {
      streetNumber = addressParts[0];

      // Last part is likely street type (Street, Avenue, Road, etc.)
      if (addressParts.length > 2) {
        streetType = addressParts[addressParts.length - 1];
        streetName = addressParts.slice(1, -1).join(' ');
      } else {
        streetName = addressParts.slice(1).join(' ');
      }
    } else {
      // No street number, use full address as street name
      if (addressParts.length > 1) {
        streetType = addressParts[addressParts.length - 1];
        streetName = addressParts.slice(0, -1).join(' ');
      } else {
        streetName = address;
      }
    }
  } else {
    streetName = address;
  }

  return {
    streetNumber,
    streetName,
    streetType,
    city: city || '',
    state: state || '',
    zipCode: zipCode || '',
    country: 'Australia',
  };
}

export default {
  handleQuoteAccepted,
};
