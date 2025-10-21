import { createContact } from '../hubspot/contacts.service.js';
import { createDealWithAssociations } from '../hubspot/deals.service.js';

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
      pipeline: 'default',
      property_address: formData.property.address,
      number_of_owners: formData.property.number_of_owners?.toString() || '1',
      // Include any property disclosure data if provided
      ...formData.propertyDisclosure || {}
    };

    // Step 3: Build associations
    const associations = [
      // Client contact
      {
        to: { id: clientContact.id },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3 // Contact to Deal
        }]
      },
      // Agency
      {
        to: { id: formData.agencyId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 341 // Company to Deal
        }]
      },
      // Agent (USER_DEFINED type 6)
      {
        to: { id: formData.agentId },
        types: [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 6 // Agent to Deal
        }]
      }
    ];

    const deal = await createDealWithAssociations(dealData, associations);

    console.log('[Agent Client Creation] Deal created successfully:', deal.id);

    // Step 4: Update deal stage to indicate portal access should be sent
    // (This would trigger portal provisioning in the next step)

    return {
      success: true,
      deal,
      client: clientContact,
      nextStep: 'send_client_portal_access'
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
