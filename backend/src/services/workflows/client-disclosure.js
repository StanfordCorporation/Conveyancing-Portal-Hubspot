import { findOrCreateContact, searchContactByEmailOrPhone } from '../../integrations/hubspot/contacts.js';
import { searchCompaniesByName, createCompany, searchCompaniesByNameAndEmail } from '../../integrations/hubspot/companies.js';
import { createDealWithAssociations } from '../../integrations/hubspot/deals.js';
import hubspotClient from '../../integrations/hubspot/client.js';
import { createSmokeballLeadFromDeal } from './smokeball-lead-creation.js';
import { SMOKEBALL_ENABLED } from '../../config/smokeball.js';
import { HUBSPOT } from '../../config/constants.js';

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

    // Extract primary seller information from contact (deal-level properties)
    const primarySellerFullName = `${primarySeller.properties?.firstname || ''} ${primarySeller.properties?.lastname || ''}`.trim();
    const primarySellerPhone = primarySeller.properties?.phone || null;

    const dealData = {
      dealname: `${formData.property.address} - ${formData.seller.firstname} ${formData.seller.lastname}`,
      dealstage: '1923713518', // First stage ID from HubSpot pipeline
      pipeline: HUBSPOT.PIPELINES.FORM_2S, // Form 2s pipeline only
      property_address: formData.property.address,
      transaction_type: 'sale', // Disclosure form is always for selling property
      number_of_owners: (additionalSellerIds.length + 1).toString(),
      lead_source: 'Disclosure_Page', // Track where this lead came from
      // Deal-level primary seller properties
      primary_seller_full_name: primarySellerFullName,
      primary_seller_phone: primarySellerPhone,
      ...initializeDisclosureFields()
    };

    // Build associations array
    // NOTE: During deal creation, ONLY HUBSPOT_DEFINED associations work inline
    // We use standard type 3 (Deal to Contact) for all contacts during creation
    const associations = [
      // Primary seller (use standard contact association)
      {
        to: { id: primarySeller.id },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3 // Deal to Contact (standard HubSpot association)
        }]
      },
      // Agency
      {
        to: { id: agency.id },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 341 // Deal to Company
        }]
      },
      // Agent (use standard contact association)
      {
        to: { id: agentContact.id },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3 // Deal to Contact (standard HubSpot association)
        }]
      }
    ];

    // Add additional sellers (use standard contact association)
    for (const sellerId of additionalSellerIds) {
      associations.push({
        to: { id: sellerId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3 // Deal to Contact (standard HubSpot association)
        }]
      });
    }

    const deal = await createDealWithAssociations(dealData, associations);
    
    // ========================================
    // STEP 6B: Add custom association labels to distinguish contact roles
    // ========================================
    console.log('[Client Disclosure] ⏳ STEP 6B: Adding custom association labels...');
    
    try {
      // Add Primary Seller label (USER_DEFINED type 1)
      console.log(`[Client Disclosure] 🏷️  Labeling Primary Seller: ${primarySeller.id}`);
      await hubspotClient.put(
        `/crm/v4/objects/deal/${deal.id}/associations/contact/${primarySeller.id}`,
        [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 1 // Primary Seller label (Deal → Primary Seller)
        }]
      );
      
      // Add Agent label (USER_DEFINED type 6)
      console.log(`[Client Disclosure] 🏷️  Labeling Agent: ${agentContact.id}`);
      await hubspotClient.put(
        `/crm/v4/objects/deal/${deal.id}/associations/contact/${agentContact.id}`,
        [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 6 // Agent label (Deal → Agent)
        }]
      );
      
      // Add Additional Seller labels (USER_DEFINED type 4)
      for (const sellerId of additionalSellerIds) {
        console.log(`[Client Disclosure] 🏷️  Labeling Additional Seller: ${sellerId}`);
        await hubspotClient.put(
          `/crm/v4/objects/deal/${deal.id}/associations/contact/${sellerId}`,
          [{
            associationCategory: 'USER_DEFINED',
            associationTypeId: 4 // Additional Seller label (Deal → Additional Seller)
          }]
        );
      }
      
      console.log('[Client Disclosure] ✅ Custom association labels added successfully');
    } catch (labelError) {
      console.error('[Client Disclosure] ⚠️  Failed to add custom labels (non-critical):', labelError.message);
      // Don't fail the entire workflow - labels are nice to have but not critical
    }

    console.log('[Client Disclosure] Deal created successfully:', deal.id);

    // ========================================
    // STEP 7: Create Smokeball lead (if enabled)
    // ========================================
    let smokeballLead = null;
    if (SMOKEBALL_ENABLED) {
      try {
        console.log('[Client Disclosure] ⏳ STEP 7: Creating Smokeball lead...');
        smokeballLead = await createSmokeballLeadFromDeal(deal.id);
        console.log('[Client Disclosure] ✅ Smokeball lead created:', smokeballLead.leadId);
      } catch (smokeballError) {
        console.error('[Client Disclosure] ⚠️ Smokeball lead creation failed:', smokeballError.message);
        // Don't fail entire workflow - deal is created, Smokeball can be synced later
      }
    }

    return {
      success: true,
      deal,
      primarySeller,
      additionalSellers: additionalSellerIds,
      agency,
      agent: agentContact,
      smokeballLead
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
