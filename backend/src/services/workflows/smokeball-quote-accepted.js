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
              // Update primary seller's Smokeball contact
              await smokeballContacts.updateContact(smokeballContactId, {
                person: {
                  residentialAddress
                }
              });

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
