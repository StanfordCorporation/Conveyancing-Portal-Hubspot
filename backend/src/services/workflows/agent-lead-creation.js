/**
 * Workflow: Agent-Initiated Lead Creation
 * 
 * This workflow handles when an agent creates a new lead through the agent portal.
 * Unlike client disclosure, the agent's identity is already known from JWT token.
 */

import { findOrCreateContact, searchContactByEmailOrPhone } from '../../integrations/hubspot/contacts.js';
import { createDealWithAssociations } from '../../integrations/hubspot/deals.js';
import hubspotClient from '../../integrations/hubspot/client.js';
import { createSmokeballLeadFromDeal } from './smokeball-lead-creation.js';
import { SMOKEBALL_ENABLED } from '../../config/smokeball.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Process agent-initiated lead creation
 * 
 * @param {string} agentId - Agent's contact ID (from JWT)
 * @param {Object} leadData - Lead data from agent portal
 * @param {Object} leadData.client - Primary seller information
 * @param {Array} leadData.additionalSellers - Additional sellers (optional)
 * @param {Object} leadData.property - Property information
 * @param {Object} leadData.questionnaireData - Property questionnaire data (optional)
 * @param {boolean} leadData.sendInvitation - Whether to send client portal invitation
 * @param {boolean} leadData.isDraft - Whether to save as draft
 * @returns {Object} Created deal with client information
 */
export const processAgentLeadCreation = async (agentId, leadData) => {
  try {
    console.log('[Agent Lead Creation] Starting workflow', {
      agent: agentId,
      client: leadData.client?.email,
      property: leadData.property?.address
    });

    // ========================================
    // STEP 1: Find or create PRIMARY SELLER
    // ========================================
    console.log('[Agent Lead Creation] ⏳ STEP 1: Processing primary seller...');
    
    // Split full name into firstname and lastname
    const splitName = (fullName) => {
      const parts = fullName.trim().split(' ');
      const firstname = parts[0] || '';
      const lastname = parts.slice(1).join(' ') || parts[0];
      return { firstname, lastname };
    };

    const primarySellerNames = splitName(leadData.client.fullName);
    
    const primarySellerMatch = await searchContactByEmailOrPhone(
      leadData.client.email,
      leadData.client.mobile
    );

    let primarySeller;
    if (primarySellerMatch) {
      console.log('[Agent Lead Creation] ✅ Primary seller found (existing contact):', primarySellerMatch.id);
      primarySeller = primarySellerMatch;
    } else {
      console.log('[Agent Lead Creation] 🆕 Creating new primary seller contact...');
      const { contact } = await findOrCreateContact({
        email: leadData.client.email,
        firstname: primarySellerNames.firstname,
        lastname: primarySellerNames.lastname,
        phone: leadData.client.mobile || null,
        address: leadData.client.address || null,
        contact_type: 'Client'
      });
      primarySeller = contact;
    }

    console.log('[Agent Lead Creation] Primary seller processed:', primarySeller.id);

    // ========================================
    // STEP 2: Find or create ADDITIONAL SELLERS
    // ========================================
    console.log('[Agent Lead Creation] ⏳ STEP 2: Processing additional sellers...');
    const additionalSellerIds = [];
    
    if (leadData.additionalSellers && leadData.additionalSellers.length > 0) {
      for (const seller of leadData.additionalSellers) {
        const sellerNames = splitName(seller.fullName);
        
        const additionalSellerMatch = await searchContactByEmailOrPhone(
          seller.email,
          seller.mobile
        );

        let additionalSeller;
        if (additionalSellerMatch) {
          console.log('[Agent Lead Creation] ✅ Additional seller found (existing contact):', additionalSellerMatch.id);
          additionalSeller = additionalSellerMatch;
        } else {
          console.log('[Agent Lead Creation] 🆕 Creating new additional seller contact...');
          const { contact } = await findOrCreateContact({
            email: seller.email,
            firstname: sellerNames.firstname,
            lastname: sellerNames.lastname,
            phone: seller.mobile || null,
            address: seller.address || null,
            contact_type: 'Client'
          });
          additionalSeller = contact;
        }
        
        additionalSellerIds.push(additionalSeller.id);
      }
      console.log('[Agent Lead Creation] Additional sellers processed:', additionalSellerIds.length);
    }

    // ========================================
    // STEP 3: Get agent's AGENCY
    // ========================================
    console.log('[Agent Lead Creation] ⏳ STEP 3: Getting agent\'s agency...');
    
    let agencyId = null;
    try {
      const agencyAssocResponse = await hubspotClient.get(
        `/crm/v3/objects/contacts/${agentId}/associations/company`
      );
      
      if (agencyAssocResponse.data.results.length > 0) {
        agencyId = agencyAssocResponse.data.results[0].id;
        console.log('[Agent Lead Creation] ✅ Agent\'s agency found:', agencyId);
      } else {
        console.log('[Agent Lead Creation] ⚠️ No agency associated with agent');
      }
    } catch (error) {
      console.error('[Agent Lead Creation] ⚠️ Error fetching agency:', error.message);
    }

    // ========================================
    // STEP 4: Create DEAL with associations
    // ========================================
    console.log('[Agent Lead Creation] ⏳ STEP 4: Creating deal...');

    // Transform questionnaire data (lowercase "yes" → "Yes" for HubSpot enumeration fields)
    let transformedQuestionnaireData = {};
    if (leadData.questionnaireData) {
      const { getAllMappings } = await import('../../utils/questionnaireHelper.js');
      const propertyMapping = getAllMappings();

      Object.entries(leadData.questionnaireData).forEach(([fieldName, value]) => {
        const config = propertyMapping[fieldName];
        if (config) {
          // Capitalize yes/no/unsure for HubSpot enumeration fields
          let hubspotValue = value;
          if (config.hsPropertyType === 'enumeration' && typeof value === 'string') {
            hubspotValue = value.charAt(0).toUpperCase() + value.slice(1);
          }
          transformedQuestionnaireData[config.hsPropertyName] = hubspotValue;
        }
      });

      console.log(`[Agent Lead Creation] Transformed ${Object.keys(transformedQuestionnaireData).length} questionnaire fields`);
    }

    const dealData = {
      dealname: `${leadData.property.address} - ${primarySellerNames.firstname} ${primarySellerNames.lastname}`,
      dealstage: '1923713518', // Stage 1: Client Disclosure
      pipeline: HUBSPOT.PIPELINES.FORM_2S, // Form 2s pipeline only
      property_address: leadData.property.address,
      number_of_owners: (additionalSellerIds.length + 1).toString(),
      is_draft: leadData.isDraft ? 'Yes' : null, // Use is_draft property (Yes or null)
      agent_title_search: leadData.agentTitleSearch || null,
      agent_title_search_file: leadData.agentTitleSearchFile || null,
      // Add transformed questionnaire data
      ...transformedQuestionnaireData
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
      // Agent
      {
        to: { id: agentId },
        types: [{
          associationCategory: 'USER_DEFINED',
          associationTypeId: 5 // Agent to Deal
        }]
      }
    ];

    // Add agency if found
    if (agencyId) {
      associations.push({
        to: { id: agencyId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 341 // Company to Deal
        }]
      });
    }

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

    console.log('[Agent Lead Creation] Deal created successfully:', deal.id);

    // ========================================
    // STEP 5: Create Smokeball lead (if enabled and not draft)
    // ========================================
    let smokeballLead = null;
    if (SMOKEBALL_ENABLED && !leadData.isDraft) {
      try {
        console.log('[Agent Lead Creation] ⏳ STEP 5: Creating Smokeball lead...');
        smokeballLead = await createSmokeballLeadFromDeal(deal.id);
        console.log('[Agent Lead Creation] ✅ Smokeball lead created:', smokeballLead.leadId);
      } catch (smokeballError) {
        console.error('[Agent Lead Creation] ⚠️ Smokeball lead creation failed:', smokeballError.message);
        // Don't fail entire workflow - deal is created, Smokeball can be synced later
      }
    }

    // ========================================
    // STEP 6: Send client portal invitation (if requested)
    // ========================================
    if (leadData.sendInvitation && !leadData.isDraft) {
      console.log('[Agent Lead Creation] ⏳ STEP 6: Sending client portal invitation...');
      // TODO: Implement OTP invitation sending
      // This will use the existing /api/auth/send-otp endpoint
      console.log('[Agent Lead Creation] 📧 Client portal invitation will be sent to:', primarySeller.properties?.email);
    }

    return {
      success: true,
      deal,
      primarySeller,
      additionalSellers: additionalSellerIds,
      agencyId,
      smokeballLead
    };

  } catch (error) {
    console.error('[Agent Lead Creation] Workflow error:', error);
    throw error;
  }
};

export default {
  processAgentLeadCreation
};

