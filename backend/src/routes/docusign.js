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
        console.log(`[DocuSign Route] ℹ️ Checking status and generating signing URL if needed...`);
        
        // Check current status to see if we need to generate a signing URL
        const accessToken = await getAccessToken();
        const envelopeStatus = await getEnvelopeStatus(accessToken, docusignData.envelope_id);
        
        // Find signers from stored data
        const signers = docusignData.signers || [];
        const firstSigner = signers[0];
        
        // Check if first signer still needs to sign
        const firstSignerStatus = envelopeStatus.recipients?.signers?.find(s => 
          s.email === firstSigner?.email && s.routingOrder === '1'
        );
        
        if (firstSignerStatus && (firstSignerStatus.status === 'sent' || firstSignerStatus.status === 'delivered')) {
          // Check if we have a cached signing URL (< 5 minutes old)
          let signingUrl = null;
          
          if (docusignData.signing_url && docusignData.signing_url_created_at) {
            const urlAge = Date.now() - new Date(docusignData.signing_url_created_at).getTime();
            const FIVE_MINUTES = 5 * 60 * 1000;
            
            if (urlAge < FIVE_MINUTES) {
              console.log(`[DocuSign Route] ♻️ Using cached signing URL (${Math.round(urlAge/1000)}s old)`);
              signingUrl = docusignData.signing_url;
            } else {
              console.log(`[DocuSign Route] ⏰ Cached URL expired (${Math.round(urlAge/1000)}s old) - generating new URL`);
            }
          }
          
          // Generate new URL if no valid cache
          if (!signingUrl) {
            console.log(`[DocuSign Route] First signer (${firstSigner.email}) hasn't signed - generating URL...`);
            
            const dsApiClient = new docusign.ApiClient();
            dsApiClient.setBasePath(docusignConfig.basePath);
            dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
            
            const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
            const recipientViewRequest = new docusign.RecipientViewRequest();
            recipientViewRequest.returnUrl = docusignConfig.returnUrl;
            recipientViewRequest.authenticationMethod = 'none';
            recipientViewRequest.email = firstSigner.email;
            recipientViewRequest.userName = firstSigner.name;
            // Use the SAME clientUserId that was used when creating envelope
            recipientViewRequest.clientUserId = firstSigner.clientUserId;
            recipientViewRequest.pingUrl = docusignConfig.pingUrl;
            recipientViewRequest.pingFrequency = '300';
            
            const result = await envelopesApi.createRecipientView(
              docusignConfig.accountId,
              docusignData.envelope_id,
              { recipientViewRequest }
            );
            
            signingUrl = result.url;
            
            // Store URL in HubSpot for future reuse
            docusignData.signing_url = signingUrl;
            docusignData.signing_url_created_at = new Date().toISOString();
            await saveDocuSignData(dealId, docusignData);
            
            console.log(`[DocuSign Route] ✅ Signing URL generated and cached in HubSpot`);
          }
          
          console.log(`[DocuSign Route] 🔗 Signing URL:`, signingUrl);
          
          return res.json({
            success: true,
            dealId,
            envelopeId: docusignData.envelope_id,
            redirectUrl: signingUrl,
            signerName: firstSigner.name,  // Add for EmbeddedSigning display
            signerEmail: firstSigner.email, // Add for EmbeddedSigning display
            existingEnvelope: true,
            signers: signers.map(s => ({
              contactId: s.contactId,
              name: s.name,
              email: s.email,
              routingOrder: s.routingOrder,
              roleName: s.roleName
            })),
            additionalSigners: signers.slice(1).map(s => ({
              name: s.name,
              email: s.email,
              routingOrder: s.routingOrder
            })),
            totalSigners: signers.length,
            currentSigner: {
              name: firstSigner.name,
              email: firstSigner.email,
              routingOrder: 1
            }
          });
        } else {
          // First signer already signed or envelope complete
          console.log(`[DocuSign Route] Envelope status: ${envelopeStatus.status}`);
          return res.json({
            success: true,
            dealId,
            envelopeId: docusignData.envelope_id,
            existingEnvelope: true,
            status: envelopeStatus.status,
            message: 'Envelope already processed. Check status for details.',
            signers: signers.map(s => ({
              contactId: s.contactId,
              name: s.name,
              email: s.email,
              routingOrder: s.routingOrder,
              roleName: s.roleName
            }))
          });
        }
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
router.post('/envelope-status', async (req, res) => {
  try {
    const { envelopeId, dealId } = req.body;

    if (!envelopeId) {
      return res.status(400).json({ error: 'Envelope ID is required' });
    }

    console.log(`[DocuSign Route] Getting envelope status: ${envelopeId}`);

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
