import express from 'express';
import docusign from 'docusign-esign';
import { createEmbeddedSigningSession, getEnvelopeStatus } from '../integrations/docusign/client.js';
import { getAccessToken, getUserInfo, testJWTAuth } from '../integrations/docusign/jwtAuth.js';
import hubspotClient from '../integrations/hubspot/client.js';
import { getDealContacts } from '../integrations/hubspot/associations.js';
import docusignConfig from '../config/docusign.js';

const router = express.Router();

// Helper function to get DocuSign data from HubSpot JSON field
function getDocuSignData(deal) {
  try {
    const jsonString = deal.properties?.docusign_csa_json;
    if (!jsonString) {
      return null;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[DocuSign Route] Error parsing docusign_csa_json:', error);
    return null;
  }
}

// Helper function to save DocuSign data to HubSpot JSON field
async function saveDocuSignData(dealId, data) {
  try {
    const jsonString = JSON.stringify(data);
    await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
      properties: {
        docusign_csa_json: jsonString
      }
    });
    return true;
  } catch (error) {
    console.error('[DocuSign Route] Error saving docusign_csa_json:', error);
    throw error;
  }
}

// Helper function to get primary sellers for a deal
async function getPrimarySellersForDeal(dealId) {
  try {
    console.log(`[DocuSign Route] Fetching contacts for deal: ${dealId}`);
    
    // Get all contacts associated with the deal
    const contacts = await getDealContacts(dealId);
    
    // Filter for primary sellers (role_in_deal === 'Seller' or 'Primary Seller')
    const sellers = contacts.filter(contact => {
      const role = contact.properties?.role_in_deal?.toLowerCase();
      return role === 'seller' || role === 'primary seller' || role === 'primary_seller';
    });
    
    if (sellers.length === 0) {
      throw new Error('No sellers found for this deal');
    }
    
    console.log(`[DocuSign Route] Found ${sellers.length} seller contact(s) for signing`);
    return sellers;
  } catch (error) {
    console.error('[DocuSign Route] Error getting sellers:', error);
    throw error;
  }
}

// GET /api/docusign/check-envelope - Check if envelope exists for a deal
router.get('/check-envelope/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    console.log(`[DocuSign Route] Checking for existing envelope for deal: ${dealId}`);

    // Check HubSpot for existing envelope in JSON field
    const response = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}`, {
      params: {
        properties: 'docusign_csa_json'
      }
    });
    const docusignData = getDocuSignData(response.data);
    
    if (!docusignData || !docusignData.envelope_id) {
      console.log(`[DocuSign Route] No envelope found for deal: ${dealId}`);
      return res.json({
        success: true,
        hasEnvelope: false,
        dealId
      });
    }

    console.log(`[DocuSign Route] ✅ Found existing envelope: ${docusignData.envelope_id}`);
    
    res.json({
      success: true,
      hasEnvelope: true,
      dealId,
      envelopeId: docusignData.envelope_id,
      status: docusignData.status,
      createdAt: docusignData.created_at,
      statusUpdatedAt: docusignData.status_updated_at
    });
  } catch (error) {
    console.error('[DocuSign Route] Error checking envelope:', error);
    res.status(500).json({
      error: 'Failed to check envelope',
      message: error.message
    });
  }
});

// POST /api/docusign/create-signing-session
router.post('/create-signing-session', async (req, res) => {
  try {
    const { dealId, signers: providedSigners } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    console.log(`[DocuSign Route] Creating signing session for deal: ${dealId}`);
    
    if (providedSigners && providedSigners.length > 0) {
      console.log(`[DocuSign Route] ✅ Using ${providedSigners.length} signer(s) provided by frontend (no HubSpot fetch needed)`);
      console.log(`[DocuSign Route] 📧 Provided signers:`, JSON.stringify(providedSigners, null, 2));
    }

    // Check if envelope already exists for this deal
    try {
      const response = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}`, {
        params: {
          properties: 'docusign_csa_json'
        }
      });
      const docusignData = getDocuSignData(response.data);
      
      if (docusignData && docusignData.envelope_id) {
        console.log(`[DocuSign Route] 🔍 Found existing envelope: ${docusignData.envelope_id}`);
        console.log(`[DocuSign Route] 📋 Stored signers in envelope:`, JSON.stringify(docusignData.signers, null, 2));
        
        const envelopeId = docusignData.envelope_id;
        const signers = docusignData.signers || [];
        
        // HYBRID SIGNING APPROACH
        // Get current user's email from the request (first signer in providedSigners)
        const currentUserEmail = providedSigners && providedSigners.length > 0 
          ? providedSigners[0]?.email?.toLowerCase()?.trim()
          : null;
        
        if (!currentUserEmail) {
          console.log(`[DocuSign Route] ⚠️ No current user email in request`);
          return res.json({
            success: true,
            dealId,
            envelopeId,
            existingEnvelope: true,
            message: 'Envelope exists. Please refresh to continue.'
          });
        }
        
        console.log(`[DocuSign Route] 👤 Current user: ${currentUserEmail}`);
        
        // Fetch recipient status from HubSpot (updated by webhooks)
        const dealData = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}`, {
          params: { properties: 'recipient_status,envelope_status' }
        });
        
        const recipientStatusJson = dealData.data.properties.recipient_status;
        const envelopeStatus = dealData.data.properties.envelope_status;
        
        if (!recipientStatusJson) {
          console.log(`[DocuSign Route] ℹ️ No recipient_status yet (webhook hasn't fired) - returning basic info`);
          return res.json({
            success: true,
            dealId,
            envelopeId,
            existingEnvelope: true,
            message: 'Envelope created, awaiting status update. Please refresh in a moment.'
          });
        }
        
        const recipientStatus = JSON.parse(recipientStatusJson);
        console.log(`[DocuSign Route] 📊 Recipient status from HubSpot:`, recipientStatus);
        console.log(`[DocuSign Route] ✉️ Envelope status: ${envelopeStatus}`);
        
        // Find current user in recipient list
        const currentRecipient = recipientStatus.find(r => 
          r.email?.toLowerCase()?.trim() === currentUserEmail
        );
        
        if (!currentRecipient) {
          console.log(`[DocuSign Route] ❌ Current user not found in recipient list`);
          return res.status(403).json({ 
            error: 'You are not a signer on this envelope' 
          });
        }
        
        console.log(`[DocuSign Route] 👤 Current user status: ${currentRecipient.status}`);
        
        // Check if current user has already signed
        if (currentRecipient.status === 'completed') {
          console.log(`[DocuSign Route] ✅ Current user has already signed`);
          return res.json({
            success: true,
            dealId,
            envelopeId,
            existingEnvelope: true,
            alreadySigned: true,
            message: 'You have already signed this document',
            signers: signers.map(s => ({
              contactId: s.contactId,
              name: s.name,
              email: s.email,
              routingOrder: s.routingOrder
            }))
          });
        }
        
        // Check if it's the current user's turn to sign
        if (currentRecipient.status !== 'sent' && currentRecipient.status !== 'delivered') {
          console.log(`[DocuSign Route] ⏳ Not current user's turn yet (status: ${currentRecipient.status})`);
          return res.json({
            success: true,
            dealId,
            envelopeId,
            existingEnvelope: true,
            waitingForOthers: true,
            message: 'Waiting for previous signers to complete',
            signers: signers.map(s => ({
              contactId: s.contactId,
              name: s.name,
              email: s.email,
              routingOrder: s.routingOrder
            }))
          });
        }
        
        // Current user needs to sign - generate their signing URL
        console.log(`[DocuSign Route] 📝 Current user needs to sign - generating URL...`);
        
        // Find current signer in stored signers data
        const currentSigner = signers.find(s => 
          s.email?.toLowerCase()?.trim() === currentUserEmail
        );
        
        if (!currentSigner) {
          console.log(`[DocuSign Route] ⚠️ Current user not found in stored signers`);
          return res.status(500).json({ 
            error: 'Signer data not found. Please contact support.' 
          });
        }
        
        // Use the existing getRecipientSigningUrl function
        const { getRecipientSigningUrl } = await import('../integrations/docusign/client.js');
        
        const signingUrl = await getRecipientSigningUrl({
          envelopeId,
          recipientEmail: currentSigner.email,
          recipientName: currentSigner.name,
          recipientClientId: currentSigner.clientUserId || `${currentSigner.contactId}_${Date.now()}`,
          useJWT: true
        });
        
        console.log(`[DocuSign Route] ✅ Signing URL generated for ${currentSigner.name}`);
        
        return res.json({
          success: true,
          dealId,
          envelopeId,
          redirectUrl: signingUrl,
          signerName: currentSigner.name,
          signerEmail: currentSigner.email,
          existingEnvelope: true,
          signers: signers.map(s => ({
            contactId: s.contactId,
            name: s.name,
            email: s.email,
            routingOrder: s.routingOrder
          })),
          additionalSigners: signers.filter(s => s.email !== currentUserEmail).map(s => ({
            name: s.name,
            email: s.email,
            routingOrder: s.routingOrder
          })),
          totalSigners: signers.length,
          currentSigner: {
            name: currentSigner.name,
            email: currentSigner.email,
            routingOrder: currentSigner.routingOrder
          }
        });
      }
    } catch (checkError) {
      console.log(`[DocuSign Route] ⚠️ Could not check for existing envelope:`, checkError.message);
      // Continue with creation if check fails
    }

    // Get JWT access token
    console.log(`[DocuSign Route] Getting JWT access token...`);
    const accessToken = await getAccessToken();

    // Get deal details from HubSpot
    const dealResponse = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}`, {
      params: {
        properties: 'dealname,address'
      }
    });
    const deal = dealResponse.data;
    
    let signers;
    
    // If frontend provided signers, use them (avoids redundant HubSpot fetch)
    if (providedSigners && providedSigners.length > 0) {
      console.log(`[DocuSign Route] Using signers from frontend request`);
      signers = providedSigners.map((signer, index) => ({
        contactId: signer.contactId || signer.id,
        email: signer.email,
        name: signer.name || `${signer.firstname || ''} ${signer.lastname || ''}`.trim(),
        clientUserId: `${signer.contactId || signer.id}_${Date.now()}`,
        routingOrder: index + 1,
        roleName: index === 0 ? 'Client 1' : `Client ${index + 1}`
      }));
    } else {
      // Fallback: Fetch from HubSpot if not provided
      console.log(`[DocuSign Route] No signers provided, fetching from HubSpot...`);
      const sellerContacts = await getPrimarySellersForDeal(dealId);
      
      signers = sellerContacts.map((contact, index) => {
        const routingOrder = index + 1;
        const roleName = index === 0 ? 'Client 1' : `Client ${index + 1}`;
        
        return {
          contactId: contact.id,
          email: contact.properties.email,
          name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
          clientUserId: `${contact.id}_${Date.now()}`,
          routingOrder,
          roleName
        };
      });
    }

    console.log(`[DocuSign Route] Creating envelope with ${signers.length} signer(s):`);
    signers.forEach((signer, index) => {
      console.log(`[DocuSign Route]   ${index + 1}. ${signer.name} (${signer.email}) - Order: ${signer.routingOrder}, Role: ${signer.roleName}`);
    });

    // Create embedded signing session with all signers
    const result = await createEmbeddedSigningSession({
      accessToken,
      signers,
      templateId: docusignConfig.templateId,
      dealName: deal.properties.dealname,
      propertyAddress: deal.properties.address
    });

    // Store envelope data in HubSpot JSON field
    try {
      console.log(`[DocuSign Route] 💾 Storing envelope data in HubSpot deal...`);
      const docusignData = {
        envelope_id: result.envelopeId,
        status: 'sent',
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
        signers: signers.map(s => ({
          contactId: s.contactId,
          name: s.name,
          email: s.email,
          routingOrder: s.routingOrder,
          roleName: s.roleName,
          clientUserId: s.clientUserId  // Store this for generating recipient view later
        }))
      };
      
      await saveDocuSignData(dealId, docusignData);
      console.log(`[DocuSign Route] ✅ Envelope data stored in HubSpot (docusign_csa_json)`);
    } catch (hubspotError) {
      console.error(`[DocuSign Route] ⚠️ Failed to store envelope data in HubSpot:`, hubspotError.message);
      // Don't fail the request if HubSpot update fails
    }

    const response = {
      success: true,
      dealId,
      envelopeId: result.envelopeId,
      signers: signers.map(s => ({
        contactId: s.contactId,
        name: s.name,
        email: s.email,
        routingOrder: s.routingOrder,
        roleName: s.roleName
      })),
      // Additional signers info (everyone except first signer)
      additionalSigners: signers.slice(1).map(s => ({
        name: s.name,
        email: s.email,
        routingOrder: s.routingOrder
      })),
      totalSigners: signers.length
    };

    // Only add redirect URL for first signer (embedded signing)
    if (result.redirectUrl) {
      response.redirectUrl = result.redirectUrl;
      response.signerName = signers[0].name;  // For EmbeddedSigning display
      response.signerEmail = signers[0].email; // For EmbeddedSigning display
      response.currentSigner = {
        name: signers[0].name,
        email: signers[0].email,
        routingOrder: 1
      };
    }

    console.log(`[DocuSign Route] ✅ Signing session created: ${result.envelopeId}`);
    res.json(response);
  } catch (error) {
    console.error('[DocuSign Route] ❌ Error creating signing session:', error);
    res.status(500).json({
      error: 'Failed to create signing session',
      message: error.message,
      details: error.stack
    });
  }
});

// POST /api/docusign/envelope-status
// DEPRECATED: Using DocuSign webhooks instead of polling
// This endpoint is kept for backward compatibility but should not be used
router.post('/envelope-status', async (req, res) => {
  try {
    const { envelopeId, dealId } = req.body;

    if (!envelopeId) {
      return res.status(400).json({ error: 'Envelope ID is required' });
    }

    console.log(`[DocuSign Route] ⚠️ DEPRECATED: Getting envelope status via API polling: ${envelopeId}`);
    console.log(`[DocuSign Route] ⚠️ Consider using DocuSign webhooks for real-time updates`);

    // Get JWT access token automatically
    const accessToken = await getAccessToken();

    const envelopeData = await getEnvelopeStatus(accessToken, envelopeId);

    console.log(`[DocuSign Route] ✅ Envelope status retrieved`);

    // Update HubSpot with latest status
    if (dealId) {
      try {
        // Get existing data first
        const response = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}`, {
          params: {
            properties: 'docusign_csa_json'
          }
        });
        const existingData = getDocuSignData(response.data) || {};

        // Update with new status
        const updatedData = {
          ...existingData,
          status: envelopeData.status,
          status_updated_at: new Date().toISOString(),
          status_datetime: envelopeData.statusDateTime
        };

        await saveDocuSignData(dealId, updatedData);
        console.log(`[DocuSign Route] 💾 Updated envelope status in HubSpot: ${envelopeData.status}`);

        // If signing is completed, progress deal to next stage
        if (envelopeData.status === 'completed') {
          const { DEAL_STAGES } = await import('../config/dealStages.js');
          const { updateDeal } = await import('../integrations/hubspot/deals.js');

          await updateDeal(dealId, {
            dealstage: DEAL_STAGES.FUNDS_REQUESTED.id  // Progress to Step 5: Payment
          });

          console.log(`[DocuSign Route] 🎯 Signing completed - Deal progressed to: ${DEAL_STAGES.FUNDS_REQUESTED.label}`);
          
          // Clear cached signing URL (no longer needed)
          if (updatedData.signing_url || updatedData.signing_url_created_at) {
            delete updatedData.signing_url;
            delete updatedData.signing_url_created_at;
            await saveDocuSignData(dealId, updatedData);
            console.log(`[DocuSign Route] 🗑️ Cleared cached signing URL from HubSpot`);
          }
        }

        // Include stored signers in response as fallback
        if (existingData.signers) {
          envelopeData.storedSigners = existingData.signers;
        }
      } catch (hubspotError) {
        console.error(`[DocuSign Route] ⚠️ Failed to update status in HubSpot:`, hubspotError.message);
      }
    }

    res.json({
      success: true,
      envelopeId,
      status: envelopeData.status,
      statusDateTime: envelopeData.statusDateTime,
      recipients: envelopeData.recipients,
      storedSigners: envelopeData.storedSigners || null
    });
  } catch (error) {
    console.error('[DocuSign Route] ❌ Error getting envelope status:', error);
    res.status(500).json({
      error: 'Failed to get envelope status',
      message: error.message
    });
  }
});

// GET /api/docusign/user-info - Get DocuSign user info (test JWT auth)
router.get('/user-info', async (req, res) => {
  try {
    console.log('[DocuSign Route] Getting user info...');
    
    const userInfo = await getUserInfo();
    
    res.json({
      success: true,
      userInfo
    });
  } catch (error) {
    console.error('[DocuSign Route] Error getting user info:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: error.message
    });
  }
});

// GET /api/docusign/test-jwt - Test JWT authentication
router.get('/test-jwt', async (req, res) => {
  try {
    console.log('[DocuSign Route] Testing JWT authentication...');
    
    const result = await testJWTAuth();
    
    res.json({
      success: true,
      message: 'JWT authentication successful',
      ...result
    });
  } catch (error) {
    console.error('[DocuSign Route] JWT test failed:', error);
    res.status(500).json({
      error: 'JWT authentication failed',
      message: error.message
    });
  }
});

// POST /api/docusign/refresh-token - Force refresh JWT token
router.post('/refresh-token', async (req, res) => {
  try {
    console.log('[DocuSign Route] Forcing token refresh...');
    
    // Clear cache and get new token
    const accessToken = await getAccessToken(true); // true = force refresh
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      tokenPreview: accessToken.substring(0, 20) + '...'
    });
  } catch (error) {
    console.error('[DocuSign Route] Token refresh failed:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

// DELETE /api/docusign/clear-envelope/:dealId - Clear envelope data for a deal (testing/debugging)
router.delete('/clear-envelope/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;
    
    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }
    
    console.log(`[DocuSign Route] 🗑️ Clearing envelope data for deal: ${dealId}`);
    
    // Clear the docusign_csa_json field
    await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
      properties: {
        docusign_csa_json: ''
      }
    });
    
    console.log(`[DocuSign Route] ✅ Envelope data cleared from HubSpot`);
    
    res.json({
      success: true,
      message: 'Envelope data cleared. You can now create a fresh envelope.',
      dealId
    });
  } catch (error) {
    console.error('[DocuSign Route] ❌ Error clearing envelope:', error);
    res.status(500).json({
      error: 'Failed to clear envelope',
      message: error.message
    });
  }
});

export default router;
