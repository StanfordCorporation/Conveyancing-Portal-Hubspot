/**
 * Smokeball Quote Accepted Workflow
 * Triggered when deal reaches Stage 3: Searches Quote Provided/Accepted
 *
 * Actions:
 * 1. Update PRIMARY SELLER residential address in Smokeball (with fallback to property address)
 * 2. Convert lead to matter in Smokeball
 * 3. matter.converted webhook will store matter number
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
      'smokeball_lead_uid',
      'matter_uid',
      'property_address',
      'smokeball_sync_status',
    ]);

    const leadUid = deal.properties.smokeball_lead_uid;
    const matterUid = deal.properties.matter_uid;

    if (!leadUid) {
      throw new Error('No smokeball_lead_uid found. Lead must be created in Smokeball first.');
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
    // STEP 4: Update PRIMARY SELLER residential address
    // ========================================
    console.log('[Smokeball Quote Workflow] 📍 Updating primary seller residential address...');

    try {
      // Find primary seller (association type 1)
      const primarySellerAssoc = contacts.find(contact =>
        contact.associationTypes?.some(assocType => assocType.typeId === 1)
      );

      if (!primarySellerAssoc) {
        console.warn('[Smokeball Quote Workflow] ⚠️ No primary seller found - skipping address update');
      } else {
        const primarySellerContactId = primarySellerAssoc.id;
        console.log(`[Smokeball Quote Workflow] 👤 Primary Seller Contact ID: ${primarySellerContactId}`);

        // Fetch primary seller's HubSpot contact
        const primarySeller = await contactsIntegration.getContact(primarySellerContactId, [
          'smokeball_contact_id',
          'address',
          'firstname',
          'lastname'
        ]);

        const smokeballContactId = primarySeller.properties.smokeball_contact_id;
        let residentialAddressString = primarySeller.properties.address;

        console.log(`[Smokeball Quote Workflow] 📋 Primary Seller: ${primarySeller.properties.firstname} ${primarySeller.properties.lastname}`);
        console.log(`[Smokeball Quote Workflow] 🏠 Residential Address: ${residentialAddressString || 'N/A'}`);

        // Validation checks
        if (!smokeballContactId) {
          console.warn('[Smokeball Quote Workflow] ⚠️ Primary seller has no Smokeball contact ID');
        } else {
          // Check residential address (with fallback to property address)
          if (!residentialAddressString || residentialAddressString === 'N/A' || residentialAddressString.trim() === '') {
            console.warn('[Smokeball Quote Workflow] ⚠️ No residential address for primary seller');

            // Fallback to property address (matches PHP behavior)
            const propertyAddress = deal.properties.property_address;
            if (propertyAddress && propertyAddress !== 'N/A') {
              console.log('[Smokeball Quote Workflow] ℹ️ Using property address as fallback');
              residentialAddressString = propertyAddress;
            } else {
              console.warn('[Smokeball Quote Workflow] ❌ No residential or property address available');
              residentialAddressString = null;
            }
          }

          // Update Smokeball if we have an address
          if (residentialAddressString) {
            // Parse address using existing utility function
            const residentialAddress = buildResidentialAddress({
              address: residentialAddressString
            });

            if (residentialAddress) {
              // PUT requires COMPLETE contact object (not partial update)
              // 1. Get current contact data
              const currentContact = await smokeballContacts.getContact(smokeballContactId);

              // 2. Merge residential address into complete contact object
              const updatePayload = {
                ...currentContact,
                person: {
                  ...currentContact.person,
                  residentialAddress
                }
              };

              // 3. PUT entire contact back with updated address
              await smokeballContacts.updateContact(smokeballContactId, updatePayload);

              console.log(`[Smokeball Quote Workflow] ✅ Updated residential address for primary seller in Smokeball`);
            } else {
              console.warn('[Smokeball Quote Workflow] ⚠️ Failed to parse residential address');
            }
          }
        }
      }
    } catch (addressError) {
      console.error('[Smokeball Quote Workflow] ⚠️ Error updating residential address:', addressError.message);
      // Don't fail workflow - address update is not critical
    }

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
            smokeball_sync_status: 'Successful',
          });
        }

        return {
          success: true,
          message: 'Lead already converted',
          matterNumber: currentMatter.number,
        };
      }

      // Convert lead to matter (uses hardcoded matter type ID)
      await smokeballMatters.convertLeadToMatter(leadUid);

      console.log('[Smokeball Quote Workflow] ✅ Lead to matter conversion initiated');
      console.log('[Smokeball Quote Workflow] ℹ️ matter.converted webhook will provide matter number');

      // Update sync status (awaiting webhook for matter number)
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Successful',
        smokeball_last_sync: new Date().toISOString(),
      });

    } catch (conversionError) {
      console.error('[Smokeball Quote Workflow] ❌ Conversion error:', conversionError.message);
      throw conversionError;
    }

    console.log('[Smokeball Quote Workflow] ✅ Workflow completed successfully!');

    return {
      success: true,
      leadUid,
      dealId,
      message: 'Quote accepted processing complete. Awaiting matter.converted webhook for matter number.',
      nextSteps: [
        'Primary seller residential address updated in Smokeball',
        'Lead-to-matter conversion initiated',
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
 * Build residential address object from Google-formatted address string
 *
 * Parses addresses in format: "55 Allen St, Hamilton QLD 4007, Australia"
 *
 * @param {Object} contactProps - Contains address string
 * @returns {Object|null} Smokeball residential address format
 */
function buildResidentialAddress(contactProps) {
  const fullAddress = contactProps.address;

  if (!fullAddress) {
    return null;
  }

  // Parse Google-formatted address: "[Street], [Suburb State Postcode], [Country]"
  // Example: "55 Allen St, Hamilton QLD 4007, Australia"

  const parts = fullAddress.split(',').map(p => p.trim());

  let streetNumber = '';
  let streetName = '';
  let streetType = '';
  let city = '';
  let state = '';
  let zipCode = '';
  let country = 'Australia';

  // Part 1: Street address (e.g., "55 Allen St")
  if (parts[0]) {
    const streetParts = parts[0].trim().split(/\s+/);

    // First part is street number (e.g., "55")
    if (streetParts[0] && /^\d+/.test(streetParts[0])) {
      streetNumber = streetParts[0];

      // Last part is street type (e.g., "St", "Street", "Ave", "Road")
      if (streetParts.length > 2) {
        streetType = streetParts[streetParts.length - 1];
        streetName = streetParts.slice(1, -1).join(' ');
      } else if (streetParts.length === 2) {
        // Just number + name (no type)
        streetName = streetParts[1];
      }
    } else {
      // No street number - put everything in streetName
      if (streetParts.length > 1) {
        streetType = streetParts[streetParts.length - 1];
        streetName = streetParts.slice(0, -1).join(' ');
      } else {
        streetName = parts[0];
      }
    }
  }

  // Part 2: Suburb, State, Postcode (e.g., "Hamilton QLD 4007")
  if (parts[1]) {
    const localityParts = parts[1].trim().split(/\s+/);

    // Last part is postcode (e.g., "4007")
    if (localityParts.length > 0) {
      const lastPart = localityParts[localityParts.length - 1];
      if (/^\d{4}$/.test(lastPart)) {
        zipCode = lastPart;

        // Second-to-last is state (e.g., "QLD", "NSW", "VIC")
        if (localityParts.length > 1) {
          state = localityParts[localityParts.length - 2];

          // Everything before state is city/suburb
          if (localityParts.length > 2) {
            city = localityParts.slice(0, -2).join(' ');
          }
        }
      } else {
        // No postcode - treat as city
        city = localityParts.join(' ');
      }
    }
  }

  // Part 3: Country (e.g., "Australia")
  if (parts[2]) {
    country = parts[2].trim();
  }

  return {
    streetNumber,
    streetName,
    streetType,
    city,
    state,
    zipCode,
    country,
  };
}

export default {
  handleQuoteAccepted,
};
