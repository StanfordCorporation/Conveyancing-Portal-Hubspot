import { createContact } from '../../integrations/hubspot/contacts.js';
import { createDealWithAssociations } from '../../integrations/hubspot/deals.js';
import hubspotClient from '../../integrations/hubspot/client.js';
import { createSmokeballLeadFromDeal } from './smokeball-lead-creation.js';
import { SMOKEBALL_ENABLED } from '../../config/smokeball.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Workflow 2: Agent-Initiated Client Creation
 *
 * This workflow handles when an agent creates a new client and property intake
 * through the agent portal.
 */

/**
 * Process agent-initiated client creation
 *
 * @param {Object} formData - Form data from agent portal
 * @param {Object} formData.client - Client information
 * @param {Object} formData.property - Property information
 * @param {string} formData.agentId - Agent's contact ID
 * @param {string} formData.agencyId - Agency's company ID
 * @returns {Object} Created deal and client contact
 */
export const processAgentClientCreation = async (formData) => {
  try {
    console.log('[Agent Client Creation] Starting workflow', {
      client: formData.client?.email,
      agent: formData.agentId
    });

    // Step 1: Create client contact
    const clientContact = await createContact({
      email: formData.client.email,
      firstname: formData.client.firstname,
      lastname: formData.client.lastname,
      phone: formData.client.phone || null,
      address: formData.client.address || null,
      contact_type: 'Client'
    });

    console.log('[Agent Client Creation] Client contact created:', clientContact.id);

    // Step 2: Create deal with property information
    const dealData = {
      dealname: `${formData.property.address} - ${formData.client.firstname} ${formData.client.lastname}`,
      dealstage: '1923713518', // First stage ID from HubSpot pipeline
      pipeline: HUBSPOT.PIPELINES.FORM_2S, // Form 2s pipeline only
      property_address: formData.property.address,
      number_of_owners: formData.property.number_of_owners?.toString() || '1',
      // Include any property disclosure data if provided
      ...formData.propertyDisclosure || {}
    };

    // Step 3: Build associations
    // NOTE: During deal creation, ONLY HUBSPOT_DEFINED associations work inline
    const associations = [
      // Client contact (use standard contact association)
      {
        to: { id: clientContact.id },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3 // Deal to Contact (standard HubSpot association)
        }]
      },
      // Agency
      {
        to: { id: formData.agencyId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 341 // Deal to Company
        }]
      },
      // Agent (use standard contact association)
      {
        to: { id: formData.agentId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3 // Deal to Contact (standard HubSpot association)
        }]
      }
    ];

    const deal = await createDealWithAssociations(dealData, associations);

    console.log('[Agent Client Creation] Deal created successfully:', deal.id);

    // ========================================
    // STEP 3B: Add custom association labels to distinguish contact roles
    // ========================================
    console.log('[Agent Client Creation] ⏳ STEP 3B: Adding custom association labels...');

    try {
      // Add Primary Seller label to client (USER_DEFINED type 1)
      console.log(`[Agent Client Creation] 🏷️  Labeling Client as Primary Seller: ${clientContact.id}`);
      await hubspotClient.put(
        `/crm/v4/objects/deal/${deal.id}/associations/contact/${clientContact.id}`,
        [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 1 // Primary Seller label (Deal → Primary Seller)
        }]
      );

      // Add Agent label (USER_DEFINED type 6)
      console.log(`[Agent Client Creation] 🏷️  Labeling Agent: ${formData.agentId}`);
      await hubspotClient.put(
        `/crm/v4/objects/deal/${deal.id}/associations/contact/${formData.agentId}`,
        [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 6 // Agent label (Deal → Agent)
        }]
      );

      console.log('[Agent Client Creation] ✅ Custom association labels added successfully');
    } catch (labelError) {
      console.error('[Agent Client Creation] ⚠️  Failed to add custom labels (non-critical):', labelError.message);
      // Don't fail the entire workflow - labels are nice to have but not critical
    }

    // Step 4: Create Smokeball lead (if enabled)
    let smokeballLead = null;
    if (SMOKEBALL_ENABLED) {
      try {
        console.log('[Agent Client Creation] ⏳ Creating Smokeball lead...');
        smokeballLead = await createSmokeballLeadFromDeal(deal.id);
        console.log('[Agent Client Creation] ✅ Smokeball lead created:', smokeballLead.leadId);
      } catch (smokeballError) {
        console.error('[Agent Client Creation] ⚠️ Smokeball lead creation failed:', smokeballError.message);
        // Don't fail entire workflow - deal is created, Smokeball can be synced later
      }
    }

    // Step 5: Update deal stage to indicate portal access should be sent
    // (This would trigger portal provisioning in the next step)

    return {
      success: true,
      deal,
      client: clientContact,
      nextStep: 'send_client_portal_access',
      smokeballLead
    };

  } catch (error) {
    console.error('[Agent Client Creation] Workflow error:', error);
    throw error;
  }
};

/**
 * Process property intake form (5-step wizard)
 *
 * @param {string} dealId - Existing deal ID
 * @param {Object} intakeData - Property intake data from wizard
 * @returns {Object} Updated deal
 */
export const processPropertyIntake = async (dealId, intakeData) => {
  try {
    console.log('[Property Intake] Processing for deal:', dealId);

    const { updateDeal } = await import('../hubspot/deals.service.js');

    // Combine all sections from the 5-step wizard
    const propertyDetails = {
      // Section 1: Title Details
      body_corporate: intakeData.section1?.body_corporate || '',
      registered_encumbrances: intakeData.section1?.registered_encumbrances || '',
      unregistered_encumbrances: intakeData.section1?.unregistered_encumbrances || '',
      registered_encumbrance_details: intakeData.section1?.registered_encumbrance_details || '',
      unregistered_encumbrance_details: intakeData.section1?.unregistered_encumbrance_details || '',

      // Section 2: Tenancy
      tenancy_agreement: intakeData.section2?.tenancy_agreement || '',
      informal_rental: intakeData.section2?.informal_rental || '',
      tenancy_agreement_last_rental_increase: intakeData.section2?.tenancy_agreement_last_rental_increase || '',
      tenancy_agreement_lease_start_date: intakeData.section2?.tenancy_agreement_lease_start_date || '',
      tenancy_agreement_lease_end_date: intakeData.section2?.tenancy_agreement_lease_end_date || '',
      tenancy_agreement_rent_and_bond_payable: intakeData.section2?.tenancy_agreement_rent_and_bond_payable || '',
      tenancy_agreement_upload: intakeData.section2?.tenancy_agreement_upload || '',

      // Section 3: Land Use & Environment
      resume_notice: intakeData.section3?.resume_notice || '',
      environmental_register: intakeData.section3?.environmental_register || '',
      government_notice: intakeData.section3?.government_notice || '',
      tree_order: intakeData.section3?.tree_order || '',
      heritage_act: intakeData.section3?.heritage_act || '',
      environmental_register_details: intakeData.section3?.environmental_register_details || '',
      government_notice_details: intakeData.section3?.government_notice_details || '',
      tree_order_details: intakeData.section3?.tree_order_details || '',
      heritage_act_details: intakeData.section3?.heritage_act_details || '',

      // Section 4: Buildings & Structures
      swimming_pool: intakeData.section4?.swimming_pool || '',
      owner_builder: intakeData.section4?.owner_builder || '',
      enforcement_notice: intakeData.section4?.enforcement_notice || '',
      owner_builder_uploads: intakeData.section4?.owner_builder_uploads || '',
      enforcement_notice_details: intakeData.section4?.enforcement_notice_details || '',
      enforcement_notice_uploads: intakeData.section4?.enforcement_notice_uploads || '',

      // Update completion timestamp
      property_details_completed_at: new Date().toISOString()
    };

    const updatedDeal = await updateDeal(dealId, propertyDetails);

    console.log('[Property Intake] Deal updated successfully:', dealId);

    return {
      success: true,
      deal: updatedDeal
    };

  } catch (error) {
    console.error('[Property Intake] Error:', error);
    throw error;
  }
};

export default {
  processAgentClientCreation,
  processPropertyIntake
};
