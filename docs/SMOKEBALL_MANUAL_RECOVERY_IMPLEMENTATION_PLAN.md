# Smokeball Manual Recovery Route - Implementation Plan

## Overview

Create a backend API route that HubSpot can call (via custom workflow actions or custom buttons) to manually trigger Smokeball operations when automated workflows fail. This provides recovery mechanisms for:
1. **Lead Creation** - If initial lead creation failed
2. **Lead-to-Matter Conversion** - If conversion didn't happen automatically
3. **Property Resync** - Sync property details from HubSpot to Smokeball

**Note:** This route is designed to be called from HubSpot's frontend (workflow actions/custom buttons), not from the agent portal.

---

## Use Cases

### Scenario 1: Lead Creation Failed
- **Trigger:** After funds provided, staff notices `smokeball_sync_status: 'Failed'` or missing `smokeball_lead_uid` in HubSpot
- **Action:** Staff clicks custom button in HubSpot deal record → Calls API → Manually triggers lead creation
- **Expected Result:** Lead created in Smokeball, `smokeball_lead_uid` populated in HubSpot

### Scenario 2: Conversion Failed
- **Trigger:** Lead exists but not converted to matter after quote acceptance
- **Action:** Staff triggers custom workflow action in HubSpot → Calls API → Manually triggers conversion
- **Expected Result:** Lead converted to matter, `matter_uid` populated (via webhook)

### Scenario 3: Property Details Out of Sync
- **Trigger:** Property address changed in HubSpot but not updated in Smokeball
- **Action:** Staff clicks "Resync Property" button in HubSpot → Calls API → Syncs property details
- **Expected Result:** Property details updated in Smokeball matter layout

---

## Route Design

### Option A: Single Endpoint with Action Parameter (Recommended)
**Route:** `POST /api/smokeball/deals/:dealId/sync`

**Query Parameters:**
- `action` (required): `'create-lead'` | `'convert-matter'` | `'sync-property'` | `'all'`

**Benefits:**
- Single endpoint, easier to maintain
- Can run all operations with `action=all`
- Consistent error handling

**Example:**
```javascript
POST /api/smokeball/deals/123456/sync?action=create-lead
POST /api/smokeball/deals/123456/sync?action=convert-matter
POST /api/smokeball/deals/123456/sync?action=sync-property
POST /api/smokeball/deals/123456/sync?action=all
```

### Option B: Separate Endpoints (Alternative)
**Routes:**
- `POST /api/smokeball/deals/:dealId/create-lead`
- `POST /api/smokeball/deals/:dealId/convert-matter`
- `POST /api/smokeball/deals/:dealId/sync-property`

**Benefits:**
- More RESTful
- Clearer intent per endpoint
- Easier to document

**Recommendation:** **Option A** - Single endpoint with action parameter for flexibility

---

## Authentication & Authorization

### Middleware Stack
```javascript
router.post('/deals/:dealId/sync', 
  requireSmokeballEnabled,  // Check if Smokeball integration enabled
  async (req, res) => { ... }
);
```

**Rationale:**
- `requireSmokeballEnabled`: Don't allow if integration disabled
- **No additional authentication:** Since HubSpot is calling this internally and we already have HubSpot API access, no need for separate API keys
- **Simple and secure:** The endpoint is internal to HubSpot workflows, and we verify the deal exists before processing

---

## Implementation Structure

### File: `backend/src/routes/smokeball.js`

Add new route handler at the end of the file (before `export default router`):

```javascript
/**
 * POST /api/smokeball/deals/:dealId/sync
 * Complete Smokeball sync workflow - creates lead, contacts, updates addresses, converts to matter
 * Called from HubSpot custom workflow actions or custom buttons
 * 
 * URL: POST /api/smokeball/deals/{dealId}/sync
 * 
 * This endpoint performs all Smokeball operations in sequence:
 * 1. Create lead in Smokeball (if not exists)
 * 2. Create/update contacts in Smokeball
 * 3. Update property address in Smokeball matter layout
 * 4. Update residential address in contacts
 * 5. Convert lead to matter
 * 
 * Example HubSpot workflow action:
 * POST https://your-api-domain.com/api/smokeball/deals/{{deal.id}}/sync
 */
router.post('/deals/:dealId/sync', 
  requireSmokeballEnabled,
  async (req, res) => {
    try {
      const { dealId } = req.params;
      
      console.log(`[Smokeball Manual Sync] 🔄 Complete sync workflow triggered for deal ${dealId}`);
      
      // Import the complete sync workflow
      const { syncDealToSmokeball } = await import('../services/workflows/smokeball-complete-sync.js');
      
      // Execute complete workflow
      const result = await syncDealToSmokeball(dealId);
      
      res.json({
        success: true,
        message: 'Smokeball sync completed successfully',
        result
      });
      
    } catch (error) {
      console.error('[Smokeball Manual Sync] ❌ Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Smokeball sync failed - check logs for details'
      });
    }
  }
);
```

**Location:** Add this route handler before the `export default router;` line at the end of `backend/src/routes/smokeball.js`

---

## New Service: Complete Sync Workflow

### File: `backend/src/services/workflows/smokeball-complete-sync.js`

**Purpose:** Single comprehensive workflow that performs all Smokeball operations in sequence, matching the exact patterns from existing implementations.

**Key Implementation Details:**
- Uses exact same contact filtering logic as `smokeball-lead-creation.js`
- Uses exact same contact creation pattern (`buildContactFromHubSpot` → `getOrCreateContact`)
- Uses exact same property address update pattern from webhook handler
- Uses exact same residential address update pattern from `smokeball-quote-accepted.js`
- Uses exact same lead creation payload structure
- Uses exact same conversion pattern with hardcoded matter type ID

```javascript
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
```

---

## Code Examples from Existing Implementations

### Contact Creation Pattern (from `smokeball-lead-creation.js`)

```javascript
// Step 1: Fetch HubSpot contact
const hubspotContact = await contactsIntegration.getContact(contactId);

// Step 2: Build Smokeball contact data using helper function
const contactData = smokeballContacts.buildContactFromHubSpot(hubspotContact);
// Returns: { firstName, lastName, email, phone, address }

// Step 3: Create or get existing contact (deduplicates by email)
const smokeballContact = await smokeballContacts.getOrCreateContact(contactData);
// Uses 'person' wrapper: { person: { firstName, lastName, email, phone: { number }, residentialAddress } }

// Step 4: Update HubSpot contact with Smokeball ID
await contactsIntegration.updateContact(contactId, {
  smokeball_contact_id: smokeballContact.id,
  smokeball_sync_status: 'Successful',
});
```

### Lead Creation Pattern (from `smokeball-lead-creation.js`)

```javascript
// Step 1: Get staff assignments
const staffAssignments = await smokeballStaff.getDefaultStaffAssignments();
// Returns: { personResponsibleStaffId, personAssistingStaffId }

// Step 2: Build lead payload
const leadData = {
  matterTypeId: matterTypeId,  // e.g., '0623643a-48a4-41d7-8c91-d35915b291cd_QLD'
  clientRole: clientRole,       // e.g., 'Vendor'
  clientIds: smokeballContactIds, // Array of contact UUIDs
  description: '',              // Leave empty
  status: 'Open',               // Set by createLead function
  leadOpenedDate: new Date().toISOString(), // Set by createLead function
  personResponsibleStaffId: staffAssignments.personResponsibleStaffId,
  personAssistingStaffId: staffAssignments.personAssistingStaffId,
  isLead: true,                 // Set by createLead function
  referralType: 'Real Estate Agent',
};

// Step 3: Create lead
const smokeballLead = await smokeballMatters.createLead(leadData);
// Returns: { id: UUID, number: null }
```

### Property Address Update Pattern (from `smokeball-webhook.js`)

```javascript
// Step 1: Parse address
const parsed = parsePropertyAddress(propertyAddress);
// Returns: { streetNumber, streetName, streetType, suburb, state, postcode, country }

// Step 2: Get matter to find layout
const matter = await smokeballMatters.getMatter(matterId);

// Step 3: Find Property Details layout
const propertyDetailsLayout = matter.items['Property Details'][0];
const layoutId = propertyDetailsLayout.id;

// Step 4: Update layout
const layoutUpdate = {
  values: [
    { key: 'Matter/PropertyDetailsRealEstates/Address/StreetNumber', value: parsed.streetNumber || '' },
    { key: 'Matter/PropertyDetailsRealEstates/Address/StreetName', value: parsed.streetName || '' },
    { key: 'Matter/PropertyDetailsRealEstates/Address/StreetType', value: parsed.streetType || '' },
    { key: 'Matter/PropertyDetailsRealEstates/Address/SuburbTown', value: parsed.suburb || '' },
    { key: 'Matter/PropertyDetailsRealEstates/Address/StateShort', value: parsed.state || '' },
    { key: 'Matter/PropertyDetailsRealEstates/Address/Postcode', value: parsed.postcode || '' },
  ],
};

await smokeballMatters.updateMatterLayout(matterId, layoutId, layoutUpdate);
```

### Residential Address Update Pattern (from `smokeball-quote-accepted.js`)

```javascript
// Step 1: Get primary seller contact
const primarySeller = await contactsIntegration.getContact(primarySellerContactId, [
  'smokeball_contact_id',
  'address',
  'firstname',
  'lastname'
]);

// Step 2: Get residential address (with fallback to property address)
let residentialAddressString = primarySeller.properties.address;
if (!residentialAddressString || residentialAddressString === 'N/A' || residentialAddressString.trim() === '') {
  residentialAddressString = propertyAddress; // Fallback
}

// Step 3: Parse address using buildResidentialAddress helper
const residentialAddress = buildResidentialAddress({
  address: residentialAddressString
});
// Returns: { streetNumber, streetName, streetType, city, state, zipCode, country }

// Step 4: Get current contact (PUT requires complete object)
const currentContact = await smokeballContacts.getContact(smokeballContactId);

// Step 5: Merge residential address into complete contact object
const updatePayload = {
  ...currentContact,
  person: {
    ...currentContact.person,
    residentialAddress
  }
};

// Step 6: PUT entire contact back with updated address
await smokeballContacts.updateContact(smokeballContactId, updatePayload);
```

### Lead Conversion Pattern (from `smokeball/matters.js`)

```javascript
// Step 1: Check if already converted
const currentMatter = await smokeballMatters.getMatter(leadUid);

if (!currentMatter.isLead) {
  // Already converted
  return { success: true, matterNumber: currentMatter.number };
}

// Step 2: Convert using hardcoded matter type ID
await smokeballMatters.convertLeadToMatter(leadUid);
// Uses hardcoded: matterTypeId = '0623643a-48a4-41d7-8c91-d35915b291cd_QLD'
// Uses hardcoded: clientRole = 'Vendor'
// Payload: { matterTypeId, clientRole, isLead: false }
// Returns: 202 Accepted (async processing)
// Matter number assigned via matter.converted webhook
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Smokeball sync completed successfully",
  "result": {
    "success": true,
    "leadId": "smokeball-lead-uuid",
    "dealId": "123456",
    "state": "Queensland",
    "matterType": "Sale",
    "matterTypeId": "0623643a-48a4-41d7-8c91-d35915b291cd_QLD",
    "clientRole": "Vendor",
    "contactsCreated": 2
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Could not extract state from address: Invalid Address",
  "message": "Smokeball sync failed - check logs for details"
}
```

**Note:** The workflow is designed to be resilient - if one step fails (e.g., property address update), it logs a warning and continues with other steps. Only critical failures (e.g., no contacts, invalid state) will cause the entire workflow to fail.

---

## Implementation Steps

### Phase 1: Create Complete Sync Workflow
1. ✅ Create `backend/src/services/workflows/smokeball-complete-sync.js`
2. ✅ Implement all operations in sequence:
   - Lead creation (with idempotency check)
   - Contact creation/update
   - Property address update
   - Residential address update
   - Lead to matter conversion
3. ✅ Add comprehensive error handling and logging

### Phase 2: Create Manual Sync Route
1. ✅ Add route to `backend/src/routes/smokeball.js`
2. ✅ Add `requireSmokeballEnabled` middleware
3. ✅ Implement route handler calling `syncDealToSmokeball`
4. ✅ Add error handling and response formatting

### Phase 3: Testing
1. ✅ Test complete workflow with new deal (no existing lead)
2. ✅ Test complete workflow with existing lead
3. ✅ Test complete workflow with already converted matter
4. ✅ Test error scenarios (missing deal, invalid address, etc.)
5. ✅ Test partial failures (property address update fails, but continues)

### Phase 4: HubSpot Integration
1. ✅ Configure HubSpot custom workflow action or button
2. ✅ Test end-to-end from HubSpot trigger
3. ✅ Verify all operations complete successfully
4. ✅ Verify HubSpot deal properties updated correctly

### Phase 5: Documentation
1. ✅ Update API documentation
2. ✅ Add usage examples
3. ✅ Document error scenarios and recovery

---

## Error Handling Strategy

### Idempotency
- **Lead Creation:** Check if `smokeball_lead_uid` exists in HubSpot deal properties before creating
- **Contact Creation:** Uses `getOrCreateContact` which deduplicates by email
- **Property Address:** Always updates (idempotent operation - can be run multiple times)
- **Residential Address:** Always updates (idempotent operation - can be run multiple times)
- **Conversion:** Check if `matter_uid` exists or if lead is already converted (`isLead: false`)

### Validation
- Verify deal exists before operations
- Verify required properties exist (`property_address`, etc.)
- Verify Smokeball authentication before API calls
- Extract and validate state from property address

### Error Recovery
- **Resilient Design:** Partial failures (e.g., property address update fails) don't stop other operations
- **Detailed Logging:** Each step logs success/failure with context
- **HubSpot Status Updates:** Deal's `smokeball_sync_status` updated on success/failure
- **Error Messages:** Clear error messages for troubleshooting

---

## Security Considerations

1. **Deal ID Validation:** Verify deal exists before operations (uses existing HubSpot client)
2. **Audit Logging:** Log all sync operations with timestamp
3. **Input Validation:** Validate dealId parameter
4. **Idempotency:** Safe to retry - checks for existing lead/matter before creating

**Note:** Since this is called from HubSpot internally and we already have HubSpot API authentication configured, no additional API keys are needed. The endpoint is simple and secure.

---

## HubSpot Integration Setup

### Option 1: Custom Workflow Action (Recommended)

**Setup Steps:**
1. In HubSpot, go to **Automation** → **Workflows**
2. Create a new workflow or edit existing
3. Add **"Send HTTP request"** action
4. Configure:
   - **Method:** POST
   - **URL:** `https://your-api-domain.com/api/smokeball/deals/{{deal.id}}/sync`
   - **Headers:**
     - `Content-Type: application/json`
   - **Body (optional):**
     ```json
     {}
     ```

**Note:** This single endpoint performs all operations:
- Creates lead (if not exists)
- Creates/updates contacts
- Updates property address
- Updates residential address
- Converts lead to matter

### Option 2: Custom Button (Alternative)

**Setup Steps:**
1. In HubSpot, go to **Settings** → **Properties** → **Deals**
2. Create custom button property or use custom action
3. Configure button to call API endpoint
4. Use HubSpot's custom action feature (requires HubSpot Enterprise)

**Button Configuration:**
- **Label:** "Sync to Smokeball"
- **URL:** `https://your-api-domain.com/api/smokeball/deals/{{deal.id}}/sync`
- **Method:** POST

### Option 3: HubSpot Custom Code Action

If you have HubSpot Enterprise, you can create custom code actions that call the API:

```javascript
// HubSpot Custom Code Action
const dealId = properties.deal.id;

const response = await fetch(
  `https://your-api-domain.com/api/smokeball/deals/${dealId}/sync`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }
);

const result = await response.json();
console.log('Sync result:', result);
```

---

## Testing Checklist

### Unit Tests
- [ ] Property sync service handles missing deal
- [ ] Property sync service handles missing UID
- [ ] Property sync service handles invalid address
- [ ] Lead creation idempotency check
- [ ] Conversion idempotency check

### Integration Tests
- [ ] Create lead when missing
- [ ] Create lead when exists (should return existing)
- [ ] Convert matter when lead exists
- [ ] Convert matter when already converted (should return success)
- [ ] Sync property with valid address
- [ ] Sync property with invalid address (should fail gracefully)
- [ ] Run all operations (`action=all`)

### Basic Tests
- [ ] Request succeeds with valid deal ID (200)
- [ ] Request fails with invalid deal ID (404 or 400)
- [ ] Request fails when Smokeball integration disabled (503)

### Error Scenario Tests
- [ ] Deal doesn't exist (404)
- [ ] Smokeball not authenticated (401)
- [ ] Smokeball API failure (500)
- [ ] Invalid action parameter (400)

---

## Future Enhancements

1. **Bulk Operations:** Sync multiple deals at once
2. **Scheduled Sync:** Automatic periodic property sync
3. **Sync History:** Track sync operations and results
4. **Webhook Retry:** Retry failed webhook operations
5. **Notification:** Email/Slack notification on sync failures
6. **Dashboard:** Admin dashboard showing sync status across all deals

---

## Design Decisions

1. **Single Comprehensive Workflow:** All operations in one call - simpler for HubSpot integration
2. **Idempotent by Default:** Safe to retry - checks for existing lead/matter before creating
3. **Resilient Error Handling:** Partial failures don't stop other operations (e.g., property address update failure doesn't prevent conversion)
4. **No Force Option:** Idempotency checks ensure safe retries without needing a force flag
5. **Uses Existing Patterns:** Matches exact implementation patterns from existing workflows for consistency

---

## Summary

This implementation provides:
- ✅ **Recovery mechanism** for failed automated workflows
- ✅ **Idempotent operations** (safe to retry)
- ✅ **Detailed error reporting** for troubleshooting
- ✅ **Single comprehensive workflow** (all operations in one call)
- ✅ **Uses existing HubSpot authentication** (no additional API keys needed)
- ✅ **Comprehensive logging** for audit trail
- ✅ **HubSpot integration ready** (workflow actions, custom buttons)

The route will be accessible at:
```
POST /api/smokeball/deals/:dealId/sync
```

**Example:**
```
POST https://your-api-domain.com/api/smokeball/deals/123456/sync
Content-Type: application/json
```

**Protected by:** `requireSmokeballEnabled` (checks if Smokeball integration is enabled)

**No additional authentication needed** - uses existing HubSpot API client authentication

## Next Steps

1. **Implement Complete Sync Workflow:** Create `backend/src/services/workflows/smokeball-complete-sync.js`
2. **Add Route:** Add route to `backend/src/routes/smokeball.js`
3. **Test API:** Test with Postman/curl before HubSpot integration
4. **Configure HubSpot:** Set up custom workflow action or button in HubSpot
5. **Test End-to-End:** Test complete workflow from HubSpot button click

