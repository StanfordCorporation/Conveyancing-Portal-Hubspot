/**
 * Smokeball Lead Creation Workflow
 * Creates a lead in Smokeball when a deal is created in HubSpot
 *
 * Based on old PHP implementation: smokeball_create_lead()
 *
 * Trigger: Deal created in HubSpot
 * Actions:
 * 1. Fetch deal and associated contacts from HubSpot
 * 2. Extract property state from address
 * 3. Lookup actual matter type from Smokeball by category/name/state
 * 4. Create contacts in Smokeball with correct 'person' wrapper
 * 5. Get staff assignments (Sean Kerswill, Laura Stuart)
 * 6. Create lead in Smokeball with correct API payload
 * 7. Update HubSpot deal with smokeball_lead_uid and sync status
 */

import * as dealsIntegration from '../../integrations/hubspot/deals.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import * as associationsIntegration from '../../integrations/hubspot/associations.js';
import * as smokeballMatters from '../../integrations/smokeball/matters.js';
import * as smokeballContacts from '../../integrations/smokeball/contacts.js';
import * as smokeballStaff from '../../integrations/smokeball/staff.js';
import * as smokeballMatterTypes from '../../integrations/smokeball/matter-types.js';
import { extractStateFromAddress } from '../../utils/stateExtractor.js';

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
    // STEP 3: Get matter type ID for Conveyancing > Sale dynamically
    // ========================================
    // Client disclosure is ALWAYS for selling property (Vendor/Sale)
    console.log(`[Smokeball Lead Workflow] 🔍 Looking up matter type for ${state}...`);
    
    const matterType = await smokeballMatterTypes.findMatterType(state, 'Conveyancing', 'Sale');
    if (!matterType) {
      throw new Error(`Could not find matter type for Conveyancing > Sale in state: ${state}`);
    }

    const matterTypeId = matterType.id;
    const clientRole = matterType.clientRole;

    console.log(`[Smokeball Lead Workflow] ✅ Matter Type: Conveyancing > Sale`);
    console.log(`[Smokeball Lead Workflow] ✅ Matter Type ID: ${matterTypeId}`);
    console.log(`[Smokeball Lead Workflow] ✅ Client Role: ${clientRole}`);

    // ========================================
    // STEP 4: Get associated contacts from HubSpot
    // ========================================
    console.log('[Smokeball Lead Workflow] 👥 Fetching associated contacts...');

    const allContacts = await associationsIntegration.getDealContacts(dealId);
    
    // Filter out agents (association type 6) - only create clients in Smokeball
    // Type 1: Primary Seller, Type 4: Additional Seller, Type 6: Agent (exclude)
    const clientContacts = [];
    const excludedContacts = [];
    
    allContacts.forEach(contact => {
      // Check association type (primary filter)
      const hasAgentAssociation = contact.associationTypes?.some(
        assocType => assocType.typeId === 6 || assocType.label?.toLowerCase().includes('agent')
      );
      
      // Check contact_type property (backup filter)
      const contactType = contact.properties?.contact_type?.toLowerCase();
      const isAgent = contactType?.includes('agent') || contactType?.includes('salesperson');
      
      if (hasAgentAssociation || isAgent) {
        const reason = hasAgentAssociation ? 'Agent association (type 6)' : `contact_type="${contact.properties?.contact_type}"`;
        excludedContacts.push({
          id: contact.id,
          name: `${contact.properties?.firstname || ''} ${contact.properties?.lastname || ''}`.trim(),
          email: contact.properties?.email,
          reason
        });
      } else {
        clientContacts.push(contact);
      }
    });
    
    const hubspotContactIds = clientContacts.map(contact => contact.id);

    console.log(`[Smokeball Lead Workflow] Found ${allContacts.length} total contacts (${clientContacts.length} clients, ${excludedContacts.length} excluded)`);
    
    if (excludedContacts.length > 0) {
      console.log('[Smokeball Lead Workflow] 🚫 Excluded contacts (not creating in Smokeball):');
      excludedContacts.forEach(contact => {
        console.log(`[Smokeball Lead Workflow]   - ${contact.name} (${contact.email}) - ${contact.reason}`);
      });
    }

    // ========================================
    // STEP 5: Create contacts in Smokeball
    // ========================================
    const smokeballContactIds = [];

    for (const contactId of hubspotContactIds) {
      try {
        // Fetch HubSpot contact
        const hubspotContact = await contactsIntegration.getContact(contactId);

        // Build Smokeball contact data
        const contactData = smokeballContacts.buildContactFromHubSpot(hubspotContact);

        // Create or get existing contact (now uses correct 'person' wrapper)
        const smokeballContact = await smokeballContacts.getOrCreateContact(contactData);

        smokeballContactIds.push(smokeballContact.id);

        // Update HubSpot contact with Smokeball ID
        await contactsIntegration.updateContact(contactId, {
          smokeball_contact_id: smokeballContact.id,
          smokeball_sync_status: 'Successful',
        });

        console.log(`[Smokeball Lead Workflow] ✅ Contact synced: ${smokeballContact.id}`);

      } catch (error) {
        console.error(`[Smokeball Lead Workflow] ⚠️ Error syncing contact ${contactId}:`, error.message);
        // Continue with other contacts
      }
    }

    if (smokeballContactIds.length === 0) {
      throw new Error('Failed to create any contacts in Smokeball');
    }

    // ========================================
    // STEP 6: Get default staff assignments
    // ========================================
    console.log('[Smokeball Lead Workflow] 👨‍💼 Getting staff assignments...');

    const staffAssignments = await smokeballStaff.getDefaultStaffAssignments();

    // ========================================
    // STEP 7: Create lead in Smokeball with correct payload structure
    // ========================================
    console.log('[Smokeball Lead Workflow] 📝 Creating lead in Smokeball...');

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

    console.log(`[Smokeball Lead Workflow] ✅ Lead created: ${smokeballLead.id}`);

    // ========================================
    // STEP 8: Update HubSpot deal with smokeball_lead_uid
    // ========================================
    console.log('[Smokeball Lead Workflow] 🔄 Updating HubSpot deal...');

    await dealsIntegration.updateDeal(dealId, {
      smokeball_lead_uid: smokeballLead.id,
      matter_uid: null, // Will be populated on conversion
      smokeball_sync_status: 'Successful',
      smokeball_last_sync: new Date().toISOString(),
    });

    console.log('[Smokeball Lead Workflow] ✅ Workflow completed successfully!');

    return {
      success: true,
      leadId: smokeballLead.id,
      dealId,
      state,
      matterType: 'Sale',
      matterTypeId: matterTypeId,
      clientRole: clientRole,
      contactsCreated: smokeballContactIds.length,
    };

  } catch (error) {
    console.error('[Smokeball Lead Workflow] ❌ Workflow failed:', error.message);
    console.error('[Smokeball Lead Workflow] Stack:', error.stack);

    // Update HubSpot with error status
    try {
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Failed',
        smokeball_sync_error: error.message,
      });
    } catch (updateError) {
      console.error('[Smokeball Lead Workflow] ❌ Failed to update error status:', updateError.message);
    }

    throw error;
  }
}

export default {
  createSmokeballLeadFromDeal,
};
