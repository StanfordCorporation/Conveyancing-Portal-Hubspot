/**
 * Smokeball Complete Sync Workflow
 * Performs all Smokeball operations in sequence:
 * 1. Create lead in Smokeball (if not exists)
 * 2. Create/update contacts in Smokeball
 * 3. Update property address in Smokeball matter layout
 * 4. Update residential address in contacts
 * 5. Convert lead to matter
 * 
 * Based on existing implementations:
 * - Lead creation: smokeball-lead-creation.js
 * - Contact creation: smokeball/contacts.js
 * - Property address: smokeball-webhook.js (updatePropertyDetailsInMatter)
 * - Residential address: smokeball-quote-accepted.js (buildResidentialAddress)
 * - Conversion: smokeball/matters.js (convertLeadToMatter)
 */

import * as dealsIntegration from '../../integrations/hubspot/deals.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import * as associationsIntegration from '../../integrations/hubspot/associations.js';
import * as smokeballMatters from '../../integrations/smokeball/matters.js';
import * as smokeballContacts from '../../integrations/smokeball/contacts.js';
import * as smokeballMatterTypes from '../../integrations/smokeball/matter-types.js';
import * as smokeballStaff from '../../integrations/smokeball/staff.js';
import { extractStateFromAddress } from '../../utils/stateExtractor.js';
import { parsePropertyAddress } from '../../utils/addressParser.js';

/**
 * Build residential address object from Google-formatted address string
 * EXACT COPY from smokeball-quote-accepted.js
 * Parses addresses in format: "55 Allen St, Hamilton QLD 4007, Australia"
 */
function buildResidentialAddress(contactProps) {
  const fullAddress = contactProps.address;

  if (!fullAddress) {
    return null;
  }

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

    if (streetParts[0] && /^\d+/.test(streetParts[0])) {
      streetNumber = streetParts[0];

      if (streetParts.length > 2) {
        streetType = streetParts[streetParts.length - 1];
        streetName = streetParts.slice(1, -1).join(' ');
      } else if (streetParts.length === 2) {
        streetName = streetParts[1];
      }
    } else {
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

    if (localityParts.length > 0) {
      const lastPart = localityParts[localityParts.length - 1];
      if (/^\d{4}$/.test(lastPart)) {
        zipCode = lastPart;

        if (localityParts.length > 1) {
          state = localityParts[localityParts.length - 2];

          if (localityParts.length > 2) {
            city = localityParts.slice(0, -2).join(' ');
          }
        }
      } else {
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

/**
 * Complete Smokeball sync workflow
 * 
 * @param {string} dealId - HubSpot deal ID
 * @returns {Promise<Object>} Complete sync result
 */
export async function syncDealToSmokeball(dealId) {
  try {
    console.log('[Smokeball Complete Sync] 🚀 Starting complete sync workflow for deal:', dealId);

    // ========================================
    // STEP 1: Fetch HubSpot deal
    // ========================================
    console.log('[Smokeball Complete Sync] 📋 Fetching deal from HubSpot...');

    const deal = await dealsIntegration.getDeal(dealId, [
      'dealname',
      'property_address',
      'client_name',
      'smokeball_lead_uid',
      'matter_uid',
    ]);

    const props = deal.properties;
    const propertyAddress = props.property_address;
    const existingLeadUid = props.smokeball_lead_uid;
    const existingMatterUid = props.matter_uid;

    console.log(`[Smokeball Complete Sync] ✅ Deal: ${props.dealname}`);
    console.log(`[Smokeball Complete Sync] 📍 Address: ${propertyAddress}`);

    // ========================================
    // STEP 2: Extract state from address
    // ========================================
    const state = extractStateFromAddress(propertyAddress);

    if (!state) {
      throw new Error(`Could not extract state from address: ${propertyAddress}`);
    }

    console.log(`[Smokeball Complete Sync] 🗺️ State: ${state}`);

    // ========================================
    // STEP 3: Get matter type ID for Conveyancing > Sale dynamically
    // ========================================
    console.log(`[Smokeball Complete Sync] 🔍 Looking up matter type for ${state}...`);

    const matterType = await smokeballMatterTypes.findMatterType(state, 'Conveyancing', 'Sale');
    if (!matterType) {
      throw new Error(`Could not find matter type for Conveyancing > Sale in state: ${state}`);
    }

    const matterTypeId = matterType.id;
    const clientRole = matterType.clientRole;

    console.log(`[Smokeball Complete Sync] ✅ Matter Type: Conveyancing > Sale`);
    console.log(`[Smokeball Complete Sync] ✅ Matter Type ID: ${matterTypeId}`);
    console.log(`[Smokeball Complete Sync] ✅ Client Role: ${clientRole}`);

    // ========================================
    // STEP 4: Get associated contacts from HubSpot
    // EXACT SAME LOGIC as smokeball-lead-creation.js
    // ========================================
    console.log('[Smokeball Complete Sync] 👥 Fetching associated contacts...');

    const allContacts = await associationsIntegration.getDealContacts(dealId);

    // Filter out agents - only create clients in Smokeball
    // Custom association types (Deal → Contact):
    // Type 1 = Primary Seller, Type 4 = Additional Seller, Type 6 = Agent (exclude)
    const clientContacts = [];
    const excludedContacts = [];

    allContacts.forEach(contact => {
      // Check for explicit client associations (PRIORITY - these override contact_type)
      const hasPrimarySeller = contact.associationTypes?.some(assocType => assocType.typeId === 1);
      const hasAdditionalSeller = contact.associationTypes?.some(assocType => assocType.typeId === 4);
      const isClientBySeller = hasPrimarySeller || hasAdditionalSeller;

      // Check for agent associations
      // Type 6 = Agent (client-disclosure), Type 7 = Agent (agent-lead-creation if used)
      const hasAgentAssociation = contact.associationTypes?.some(
        assocType => assocType.typeId === 6 || assocType.typeId === 7 || assocType.label?.toLowerCase().includes('agent')
      );

      // Check contact_type property (LOWEST PRIORITY - only used if no explicit associations)
      const contactType = contact.properties?.contact_type?.toLowerCase();
      const isAgentByType = contactType?.includes('agent') || contactType?.includes('salesperson');

      // Decision logic:
      // 1. If has Primary Seller (type 1) or Additional Seller (type 4) → INCLUDE as client
      // 2. Else if has Agent (type 6/7) → EXCLUDE
      // 3. Else fallback to contact_type property
      if (isClientBySeller) {
        // Include as client (seller association takes priority)
        clientContacts.push(contact);
      } else if (hasAgentAssociation || (isAgentByType && !isClientBySeller)) {
        // Exclude as agent
        const reason = hasAgentAssociation
          ? `Agent association (type ${contact.associationTypes?.find(a => a.typeId === 6 || a.typeId === 7)?.typeId})`
          : `contact_type="${contact.properties?.contact_type}"`;
        excludedContacts.push({
          id: contact.id,
          name: `${contact.properties?.firstname || ''} ${contact.properties?.lastname || ''}`.trim(),
          email: contact.properties?.email,
          reason
        });
      } else {
        // No explicit seller or agent association - include as generic contact
        clientContacts.push(contact);
      }
    });

    const hubspotContactIds = clientContacts.map(contact => contact.id);

    console.log(`[Smokeball Complete Sync] Found ${allContacts.length} total contacts (${clientContacts.length} clients, ${excludedContacts.length} excluded)`);

    if (excludedContacts.length > 0) {
      console.log('[Smokeball Complete Sync] 🚫 Excluded contacts (not creating in Smokeball):');
      excludedContacts.forEach(contact => {
        console.log(`[Smokeball Complete Sync]   - ${contact.name} (${contact.email}) - ${contact.reason}`);
      });
    }

    // ========================================
    // STEP 5: Create contacts in Smokeball
    // EXACT SAME PATTERN as smokeball-lead-creation.js
    // ========================================
    console.log('[Smokeball Complete Sync] 👤 Creating contacts in Smokeball...');
    const smokeballContactIds = [];

    for (const contactId of hubspotContactIds) {
      try {
        // Fetch HubSpot contact
        const hubspotContact = await contactsIntegration.getContact(contactId);

        // Build Smokeball contact data
        const contactData = smokeballContacts.buildContactFromHubSpot(hubspotContact);

        // Create or get existing contact (uses correct 'person' wrapper)
        const smokeballContact = await smokeballContacts.getOrCreateContact(contactData);

        smokeballContactIds.push(smokeballContact.id);

        // Update HubSpot contact with Smokeball ID
        await contactsIntegration.updateContact(contactId, {
          smokeball_contact_id: smokeballContact.id,
          smokeball_sync_status: 'Successful',
        });

        console.log(`[Smokeball Complete Sync] ✅ Contact synced: ${smokeballContact.id}`);

      } catch (error) {
        console.error(`[Smokeball Complete Sync] ⚠️ Error syncing contact ${contactId}:`, error.message);
        // Continue with other contacts
      }
    }

    if (smokeballContactIds.length === 0) {
      throw new Error('Failed to create any contacts in Smokeball');
    }

    // ========================================
    // STEP 6: Create lead in Smokeball (if not exists)
    // EXACT SAME PATTERN as smokeball-lead-creation.js
    // ========================================
    let leadUid = existingLeadUid;

    if (!leadUid) {
      console.log('[Smokeball Complete Sync] 📝 Creating lead in Smokeball...');

      // Get default staff assignments
      const staffAssignments = await smokeballStaff.getDefaultStaffAssignments();

      // Build payload matching Smokeball API structure (from smokeball-lead-creation.js)
      const leadData = {
        matterTypeId: matterTypeId,
        clientRole: clientRole,
        clientIds: smokeballContactIds,
        description: '', // Leave empty as per old PHP code
        personResponsibleStaffId: staffAssignments.personResponsibleStaffId,
        personAssistingStaffId: staffAssignments.personAssistingStaffId,
        referralType: 'Real Estate Agent', // Default referral type
      };

      const smokeballLead = await smokeballMatters.createLead(leadData);
      leadUid = smokeballLead.id;

      console.log(`[Smokeball Complete Sync] ✅ Lead created: ${leadUid}`);

      // Update HubSpot deal with smokeball_lead_uid
      await dealsIntegration.updateDeal(dealId, {
        smokeball_lead_uid: leadUid,
        matter_uid: null, // Will be populated on conversion
        smokeball_sync_status: 'Successful',
        smokeball_last_sync: new Date().toISOString(),
      });
    } else {
      console.log(`[Smokeball Complete Sync] ℹ️ Lead already exists: ${leadUid}`);
    }

    // ========================================
    // STEP 7: Update property address in Smokeball matter layout
    // EXACT SAME PATTERN as smokeball-webhook.js (updatePropertyDetailsInMatter)
    // ========================================
    console.log('[Smokeball Complete Sync] 📍 Updating property address in Smokeball...');

    try {
      // Parse address into components
      const parsed = parsePropertyAddress(propertyAddress);

      console.log('[Smokeball Complete Sync] Parsed address:', parsed);

      // Get matter to find property details layout
      const matter = await smokeballMatters.getMatter(leadUid);

      // Check if matter has property details layout
      if (!matter.items || !matter.items['Property Details']) {
        console.warn('[Smokeball Complete Sync] ⚠️ Property Details layout not found in matter');
      } else {
        const propertyDetailsLayout = matter.items['Property Details'][0];
        const layoutId = propertyDetailsLayout.id;

        // Update property details via layout API
        const layoutUpdate = {
          values: [
            {
              key: 'Matter/PropertyDetailsRealEstates/Address/StreetNumber',
              value: parsed.streetNumber || '',
            },
            {
              key: 'Matter/PropertyDetailsRealEstates/Address/StreetName',
              value: parsed.streetName || '',
            },
            {
              key: 'Matter/PropertyDetailsRealEstates/Address/StreetType',
              value: parsed.streetType || '',
            },
            {
              key: 'Matter/PropertyDetailsRealEstates/Address/SuburbTown',
              value: parsed.suburb || '',
            },
            {
              key: 'Matter/PropertyDetailsRealEstates/Address/StateShort',
              value: parsed.state || '',
            },
            {
              key: 'Matter/PropertyDetailsRealEstates/Address/Postcode',
              value: parsed.postcode || '',
            },
          ],
        };

        await smokeballMatters.updateMatterLayout(leadUid, layoutId, layoutUpdate);

        console.log('[Smokeball Complete Sync] ✅ Property details layout updated');
      }
    } catch (error) {
      console.error('[Smokeball Complete Sync] ⚠️ Error updating property address:', error.message);
      // Don't fail - continue with other steps
    }

    // ========================================
    // STEP 8: Update PRIMARY SELLER residential address
    // EXACT SAME PATTERN as smokeball-quote-accepted.js
    // ========================================
    console.log('[Smokeball Complete Sync] 🏠 Updating primary seller residential address...');

    try {
      // Find primary seller (association type 1)
      const primarySellerAssoc = clientContacts.find(contact =>
        contact.associationTypes?.some(assocType => assocType.typeId === 1)
      );

      if (!primarySellerAssoc) {
        console.warn('[Smokeball Complete Sync] ⚠️ No primary seller found - skipping address update');
      } else {
        const primarySellerContactId = primarySellerAssoc.id;
        console.log(`[Smokeball Complete Sync] 👤 Primary Seller Contact ID: ${primarySellerContactId}`);

        // Fetch primary seller's HubSpot contact
        const primarySeller = await contactsIntegration.getContact(primarySellerContactId, [
          'smokeball_contact_id',
          'address',
          'firstname',
          'lastname'
        ]);

        const smokeballContactId = primarySeller.properties.smokeball_contact_id;
        let residentialAddressString = primarySeller.properties.address;

        console.log(`[Smokeball Complete Sync] 📋 Primary Seller: ${primarySeller.properties.firstname} ${primarySeller.properties.lastname}`);
        console.log(`[Smokeball Complete Sync] 🏠 Residential Address: ${residentialAddressString || 'N/A'}`);

        // Validation checks
        if (!smokeballContactId) {
          console.warn('[Smokeball Complete Sync] ⚠️ Primary seller has no Smokeball contact ID');
        } else {
          // Check residential address (with fallback to property address)
          if (!residentialAddressString || residentialAddressString === 'N/A' || residentialAddressString.trim() === '') {
            console.warn('[Smokeball Complete Sync] ⚠️ No residential address for primary seller');

            // Fallback to property address (matches PHP behavior)
            if (propertyAddress && propertyAddress !== 'N/A') {
              console.log('[Smokeball Complete Sync] ℹ️ Using property address as fallback');
              residentialAddressString = propertyAddress;
            } else {
              console.warn('[Smokeball Complete Sync] ❌ No residential or property address available');
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

              console.log(`[Smokeball Complete Sync] ✅ Updated residential address for primary seller in Smokeball`);
            } else {
              console.warn('[Smokeball Complete Sync] ⚠️ Failed to parse residential address');
            }
          }
        }
      }
    } catch (addressError) {
      console.error('[Smokeball Complete Sync] ⚠️ Error updating residential address:', addressError.message);
      // Don't fail workflow - address update is not critical
    }

    // ========================================
    // STEP 9: Convert lead to matter (if not already converted)
    // EXACT SAME PATTERN as smokeball-quote-accepted.js
    // ========================================
    if (existingMatterUid) {
      console.log(`[Smokeball Complete Sync] ✅ Already converted to matter: ${existingMatterUid}`);
    } else {
      console.log('[Smokeball Complete Sync] 🔄 Converting lead to matter...');

      try {
        // Get current matter details to check if already converted
        const currentMatter = await smokeballMatters.getMatter(leadUid);

        if (!currentMatter.isLead) {
          console.log('[Smokeball Complete Sync] ℹ️ Already converted to matter in Smokeball');

          // Update HubSpot with matter number if available
          if (currentMatter.number) {
            await dealsIntegration.updateDeal(dealId, {
              matter_uid: currentMatter.number,
              smokeball_sync_status: 'Successful',
            });
          }
        } else {
          // Convert lead to matter (uses hardcoded matter type ID)
          await smokeballMatters.convertLeadToMatter(leadUid);

          console.log('[Smokeball Complete Sync] ✅ Lead to matter conversion initiated');
          console.log('[Smokeball Complete Sync] ℹ️ matter.converted webhook will provide matter number');

          // Update sync status (awaiting webhook for matter number)
          await dealsIntegration.updateDeal(dealId, {
            smokeball_sync_status: 'Successful',
            smokeball_last_sync: new Date().toISOString(),
          });
        }
      } catch (conversionError) {
        console.error('[Smokeball Complete Sync] ❌ Conversion error:', conversionError.message);
        // Don't fail - lead exists, conversion can be retried
      }
    }

    console.log('[Smokeball Complete Sync] ✅ Complete sync workflow finished successfully!');

    return {
      success: true,
      leadId: leadUid,
      dealId,
      state,
      matterType: 'Sale',
      matterTypeId: matterTypeId,
      clientRole: clientRole,
      contactsCreated: smokeballContactIds.length,
    };

  } catch (error) {
    console.error('[Smokeball Complete Sync] ❌ Workflow failed:', error.message);
    console.error('[Smokeball Complete Sync] Stack:', error.stack);

    // Update HubSpot with error status
    try {
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Failed',
        smokeball_sync_error: error.message,
      });
    } catch (updateError) {
      console.error('[Smokeball Complete Sync] ❌ Failed to update error status:', updateError.message);
    }

    throw error;
  }
}

export default {
  syncDealToSmokeball,
};

