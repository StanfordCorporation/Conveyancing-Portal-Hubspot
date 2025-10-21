import { findOrCreateContact, searchContactByEmailOrPhone } from '../hubspot/contacts.service.js';
import { searchCompaniesByName, createCompany, searchCompaniesByNameAndEmail } from '../hubspot/companies.service.js';
import { createDealWithAssociations } from '../hubspot/deals.service.js';
import hubspotClient from '../hubspot/client.js';

/**
 * Workflow: Client-Initiated Disclosure Form
 *
 * This workflow handles when a client submits the disclosure form.
 *
 * Expected Form Data (5 fields for Agency):
 * 1) Agency Name
 * 2) Agency Phone Number
 * 3) Listing Salesperson Name
 * 4) Listing Salesperson Email
 * 5) Listing Salesperson Mobile
 *
 * Workflow Steps:
 * 1) Primary Seller: Check if email or phone exists
 * 2) Additional Sellers: Check if email or phone exists (for each)
 * 3) Agency: Check if name + phone exists
 * 4) Listing Salesperson: Check if email or phone exists
 */

/**
 * Process client disclosure form submission
 *
 * @param {Object} formData - Form data from client
 * @param {Object} formData.seller - Primary seller information
 * @param {Array} formData.additionalSellers - Additional sellers (optional)
 * @param {Object} formData.agency - Agency information (name, phone)
 * @param {Object} formData.agent - Agent information (firstname, lastname, email, phone)
 * @param {Object} formData.property - Property information
 * @returns {Object} Created deal with all associations
 */
export const processClientDisclosure = async (formData) => {
  try {
    console.log('[Client Disclosure] Starting workflow', {
      seller: formData.seller?.email,
      agency: formData.agency?.name
    });

    // ========================================
    // STEP 1: Find or create PRIMARY SELLER
    // ========================================
    console.log('[Client Disclosure] ⏳ STEP 1: Processing primary seller...');
    const primarySellerMatch = await searchContactByEmailOrPhone(
      formData.seller.email,
      formData.seller.phone
    );

    let primarySeller;
    if (primarySellerMatch) {
      console.log('[Client Disclosure] ✅ Primary seller found (existing contact):', primarySellerMatch.id);
      primarySeller = primarySellerMatch;
    } else {
      console.log('[Client Disclosure] 🆕 Creating new primary seller contact...');
      const { contact } = await findOrCreateContact({
        email: formData.seller.email,
        firstname: formData.seller.firstname,
        lastname: formData.seller.lastname,
        phone: formData.seller.phone || null,
        address: formData.seller.address || null,
        contact_type: 'Client'
      });
      primarySeller = contact;
    }

    console.log('[Client Disclosure] Primary seller processed:', primarySeller.id);

    // ========================================
    // STEP 2: Find or create ADDITIONAL SELLERS
    // ========================================
    console.log('[Client Disclosure] ⏳ STEP 2: Processing additional sellers...');
    const additionalSellerIds = [];
    if (formData.additionalSellers && formData.additionalSellers.length > 0) {
      for (const seller of formData.additionalSellers) {
        const additionalSellerMatch = await searchContactByEmailOrPhone(
          seller.email,
          seller.phone
        );

        let additionalSeller;
        if (additionalSellerMatch) {
          console.log('[Client Disclosure] ✅ Additional seller found (existing contact):', additionalSellerMatch.id);
          additionalSeller = additionalSellerMatch;
        } else {
          console.log('[Client Disclosure] 🆕 Creating new additional seller contact...');
          const { contact } = await findOrCreateContact({
            email: seller.email,
            firstname: seller.firstname,
            lastname: seller.lastname,
            phone: seller.phone || null,
            address: seller.address || null,
            contact_type: 'Client'
          });
          additionalSeller = contact;
        }
        additionalSellerIds.push(additionalSeller.id);
      }
      console.log('[Client Disclosure] Additional sellers processed:', additionalSellerIds.length);
    }

    // ========================================
    // STEP 3: Find or create AGENCY (Company)
    // ========================================
    console.log('[Client Disclosure] ⏳ STEP 3: Processing agency...');

    // Search for agency by name AND email
    const agencyMatches = await searchCompaniesByNameAndEmail(
      formData.agency.name,
      formData.agency.email
    );

    let agency;
    if (agencyMatches.length > 0) {
      console.log('[Client Disclosure] ✅ Agency found (existing company):', agencyMatches[0].id);
      agency = agencyMatches[0];
    } else {
      // If not found, search just by name to see if it exists
      const nameOnlyMatches = await searchCompaniesByName(formData.agency.name);

      if (nameOnlyMatches.length > 0) {
        console.log('[Client Disclosure] ℹ️ Agency name found but email differs. Using existing agency:', nameOnlyMatches[0].id);
        agency = nameOnlyMatches[0];
      } else {
        // Create new agency
        console.log('[Client Disclosure] 🆕 Creating new agency...');
        agency = await createCompany({
          name: formData.agency.name,
          email: formData.agency.email || '',
          address: formData.agency.address || ''
        });
        console.log('[Client Disclosure] Agency created:', agency.id);
      }
    }

    console.log('[Client Disclosure] Agency processed:', agency.id);

    // ========================================
    // STEP 4: Find or create LISTING SALESPERSON (Agent)
    // ========================================
    console.log('[Client Disclosure] ⏳ STEP 4: Processing listing salesperson...');

    const agentMatch = await searchContactByEmailOrPhone(
      formData.agent.email,
      formData.agent.phone
    );

    let agentContact;
    if (agentMatch) {
      console.log('[Client Disclosure] ✅ Listing salesperson found (existing contact):', agentMatch.id);
      agentContact = agentMatch;
    } else {
      console.log('[Client Disclosure] 🆕 Creating new listing salesperson contact...');
      const { contact } = await findOrCreateContact({
        email: formData.agent.email,
        firstname: formData.agent.firstname,
        lastname: formData.agent.lastname,
        phone: formData.agent.phone || null,
        contact_type: 'Agent'
      });
      agentContact = contact;
    }

    console.log('[Client Disclosure] Agent processed:', agentContact.id);

    // ========================================
    // STEP 5: Associate AGENT to AGENCY
    // ========================================
    console.log('[Client Disclosure] ⏳ STEP 5: Associating agent to agency...');
    try {
      await hubspotClient.put(`/crm/v3/objects/contact/${agentContact.id}/associations/company/${agency.id}/1`, {});
      console.log(`[Client Disclosure] ✅ Agent (${agentContact.id}) associated to Agency (${agency.id})`);
    } catch (error) {
      console.log(`[Client Disclosure] ⚠️ Agent-to-Agency association may already exist`);
    }

    // ========================================
    // STEP 6: Create DEAL with associations
    // ========================================
    console.log('[Client Disclosure] ⏳ STEP 6: Creating deal...');

    const dealData = {
      dealname: `${formData.property.address} - ${formData.seller.firstname} ${formData.seller.lastname}`,
      dealstage: '1923713518', // First stage ID from HubSpot pipeline
      pipeline: 'default',
      property_address: formData.property.address,
      number_of_owners: (additionalSellerIds.length + 1).toString(),
      ...initializeDisclosureFields()
    };

    // Build associations array
    const associations = [
      // Primary seller
      {
        to: { id: primarySeller.id },
        types: [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 1 // Primary Seller to Deal
        }]
      },
      // Agency
      {
        to: { id: agency.id },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 341 // Company to Deal
        }]
      },
      // Agent
      {
        to: { id: agentContact.id },
        types: [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 6 // Agent to Deal
        }]
      }
    ];

    // Add additional sellers
    for (const sellerId of additionalSellerIds) {
      associations.push({
        to: { id: sellerId },
        types: [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 4 // Additional Seller to Deal
        }]
      });
    }

    const deal = await createDealWithAssociations(dealData, associations);

    console.log('[Client Disclosure] Deal created successfully:', deal.id);

    return {
      success: true,
      deal,
      primarySeller,
      additionalSellers: additionalSellerIds,
      agency,
      agent: agentContact
    };

  } catch (error) {
    console.error('[Client Disclosure] Workflow error:', error);
    throw error;
  }
};

/**
 * Initialize all disclosure fields with empty values
 */
function initializeDisclosureFields() {
  return {
    // Section 1: Title Details
    body_corporate: '',
    registered_encumbrances: '',
    unregistered_encumbrances: '',
    registered_encumbrance_details: '',
    unregistered_encumbrance_details: '',

    // Section 2: Tenancy
    tenancy_agreement: '',
    informal_rental: '',
    tenancy_agreement_last_rental_increase: '',
    tenancy_agreement_lease_start_date: '',
    tenancy_agreement_lease_end_date: '',
    tenancy_agreement_rent_and_bond_payable: '',
    tenancy_agreement_upload: '',

    // Section 3: Land Use & Environment
    resume_notice: '',
    environmental_register: '',
    government_notice: '',
    tree_order: '',
    heritage_act: '',
    environmental_register_details: '',
    government_notice_details: '',
    tree_order_details: '',
    heritage_act_details: '',

    // Section 4: Buildings & Structures
    swimming_pool: '',
    owner_builder: '',
    enforcement_notice: '',
    owner_builder_uploads: '',
    enforcement_notice_details: '',
    enforcement_notice_uploads: ''
  };
}

export default {
  processClientDisclosure
};
