/**
 * Agent Routes
 * All routes for the agent dashboard portal
 * Protected by agentAuth middleware
 */

import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import { agentAuth } from '../middleware/agentAuth.js';
import { getAgentWithAgency, getAgentDeals, calculateMetrics } from '../services/domain/agent.js';
import { processAgentLeadCreation } from '../services/workflows/agent-lead-creation.js';
import { enhanceDealWithStageInfo } from '../config/stageHelpers.js';
import hubspotClient from '../integrations/hubspot/client.js';

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// All routes protected by agentAuth
router.use(agentAuth);

/**
 * GET /api/agent/dashboard-complete
 * Returns complete dashboard data: agent info, deals, and metrics
 */
router.get('/dashboard-complete', async (req, res) => {
  try {
    const agentId = req.user.id;
    console.log(`[Agent Dashboard] Loading dashboard for agent ${agentId}`);
    
    // Fetch agent info with agency
    const agent = await getAgentWithAgency(agentId);
    
    // Fetch all deals associated with agent
    const deals = await getAgentDeals(agentId);
    
    // Enhance deals with stage information (stage name, next steps, draft status)
    const enhancedDeals = deals.map(deal => enhanceDealWithStageInfo(deal));
    
    // Calculate performance metrics
    const metrics = calculateMetrics(enhancedDeals);
    
    console.log(`[Agent Dashboard] Successfully loaded dashboard: ${enhancedDeals.length} deals, ${metrics.activeLeads} active`);
    
    return res.json({
      agent,
      deals: enhancedDeals,
      metrics
    });
  } catch (error) {
    console.error('[Agent Dashboard] Error loading dashboard:', error);
    
    return res.status(500).json({ 
      error: 'Failed to load dashboard',
      message: error.message 
    });
  }
});

/**
 * POST /api/agent/leads/create
 * Create new lead from agent portal
 */
router.post('/leads/create', async (req, res) => {
  try {
    const agentId = req.user.id;
    const leadData = req.body;

    console.log(`[Agent Routes] Creating new lead for agent ${agentId}`);

    // Validate required fields
    if (!leadData.client?.email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Client email is required'
      });
    }

    if (!leadData.client?.fullName) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Client name is required'
      });
    }

    if (!leadData.property?.address) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Property address is required'
      });
    }

    // Process lead creation
    const result = await processAgentLeadCreation(agentId, leadData);

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: {
        dealId: result.deal.id,
        clientId: result.primarySeller.id,
        deal: result.deal,
        primarySeller: result.primarySeller,
        additionalSellers: result.additionalSellers,
        agencyId: result.agencyId
      }
    });
  } catch (error) {
    console.error('[Agent Routes] Error creating lead:', error);
    
    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to create lead'
    });
  }
});

/**
 * POST /api/agent/leads/:leadId/send-to-client
 * Send client portal invitation for an existing lead
 */
router.post('/leads/:leadId/send-to-client', async (req, res) => {
  try {
    const { leadId } = req.params;
    const agentId = req.user.id;

    console.log(`[Agent Routes] Sending client portal invitation for deal ${leadId}`);

    // Get deal and verify agent has access
    const deal = await hubspotClient.get(`/crm/v3/objects/deals/${leadId}`);
    
    // Get primary seller
    const sellersResponse = await hubspotClient.get(
      `/crm/v3/objects/deals/${leadId}/associations/contact`
    );
    
    const primarySellerAssoc = sellersResponse.data.results.find(s => 
      s.type?.includes('primary') || s.type === 'deal_to_contact'
    );
    
    if (!primarySellerAssoc) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No primary seller found for this deal'
      });
    }

    const seller = await hubspotClient.get(
      `/crm/v3/objects/contacts/${primarySellerAssoc.id}?properties=email,firstname,lastname`
    );

    // TODO: Send OTP invitation
    console.log('[Agent Routes] 📧 Would send invitation to:', seller.data.properties.email);

    // Update deal to active stage
    await hubspotClient.patch(`/crm/v3/objects/deals/${leadId}`, {
      properties: {
        dealstage: '1923713518', // Move from draft to active
        client_portal_sent_at: new Date().toISOString()
      }
    });

    return res.json({
      success: true,
      message: 'Client portal invitation sent successfully'
    });
  } catch (error) {
    console.error('[Agent Routes] Error sending invitation:', error);
    
    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to send invitation'
    });
  }
});

/**
 * PATCH /api/agent/leads/:leadId
 * Update lead details
 */
router.patch('/leads/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { updates } = req.body;

    console.log(`[Agent Routes] Updating lead ${leadId}`);

    const updatedDeal = await hubspotClient.patch(
      `/crm/v3/objects/deals/${leadId}`,
      { properties: updates }
    );

    return res.json({
      success: true,
      deal: updatedDeal.data
    });
  } catch (error) {
    console.error('[Agent Routes] Error updating lead:', error);
    
    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to update lead'
    });
  }
});

/**
 * POST /api/agent/leads/:dealId/upload
 * Upload files for questionnaire (multi-file support)
 */
router.post('/leads/:dealId/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { dealId } = req.params;
    const { fieldName } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least one file is required'
      });
    }

    if (!fieldName) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Field name is required'
      });
    }

    console.log(`[Agent Questionnaire] 📤 Uploading ${files.length} files for field ${fieldName}`);

    const fileIds = [];

    // Upload each file to HubSpot
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      formData.append('options', JSON.stringify({
        access: 'PRIVATE',
        overwrite: false,
        duplicateValidationStrategy: 'NONE',
        folderPath: `/questionnaire-uploads/${dealId}`
      }));

      const fileUploadResponse = await hubspotClient.post('/files/v3/files', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      fileIds.push(fileUploadResponse.data.id);
      console.log(`[Agent Questionnaire] ✅ File uploaded: ${fileUploadResponse.data.id}`);
    }

    // Update deal property with file IDs (comma-separated)
    // Get field's HubSpot property name from questionnaireHelper
    const { getAllMappings } = await import('../utils/questionnaireHelper.js');
    const propertyMapping = getAllMappings();
    const config = propertyMapping[fieldName];

    if (config) {
      const hsPropertyName = config.hsPropertyName;

      // Get existing file IDs
      const dealResponse = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}?properties=${hsPropertyName}`);
      const existingFileIds = dealResponse.data.properties[hsPropertyName] || '';

      // Append new file IDs
      const allFileIds = existingFileIds
        ? `${existingFileIds},${fileIds.join(',')}`
        : fileIds.join(',');

      await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
        properties: {
          [hsPropertyName]: allFileIds
        }
      });

      console.log(`[Agent Questionnaire] ✅ Deal property ${hsPropertyName} updated with file IDs`);
    }

    return res.json({
      success: true,
      fileIds,
      message: 'Files uploaded successfully'
    });
  } catch (error) {
    console.error('[Agent Questionnaire] ❌ Error uploading files:', error);

    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to upload files'
    });
  }
});

/**
 * GET /api/agent/leads/:dealId/file/:fileId/metadata
 * Get file metadata with signed URL
 */
router.get('/leads/:dealId/file/:fileId/metadata', async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log(`[Agent Questionnaire] 📎 Getting metadata for file ${fileId}`);

    const fileResponse = await hubspotClient.get(`/files/v3/files/${fileId}/signed-url`);

    return res.json(fileResponse.data);
  } catch (error) {
    console.error('[Agent Questionnaire] ❌ Error getting file metadata:', error);

    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to get file metadata'
    });
  }
});

/**
 * DELETE /api/agent/leads/:dealId/file/:fileId
 * Delete file from HubSpot and remove from deal property
 */
router.delete('/leads/:dealId/file/:fileId', async (req, res) => {
  try {
    const { dealId, fileId } = req.params;
    const { fieldName } = req.query;

    if (!fieldName) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Field name is required'
      });
    }

    console.log(`[Agent Questionnaire] 🗑️ Deleting file ${fileId} for field ${fieldName}`);

    // Delete file from HubSpot
    await hubspotClient.delete(`/files/v3/files/${fileId}`);

    // Remove file ID from deal property
    const { getAllMappings } = await import('../utils/questionnaireHelper.js');
    const propertyMapping = getAllMappings();
    const config = propertyMapping[fieldName];

    if (config) {
      const hsPropertyName = config.hsPropertyName;

      // Get current file IDs
      const dealResponse = await hubspotClient.get(`/crm/v3/objects/deals/${dealId}?properties=${hsPropertyName}`);
      const existingFileIds = dealResponse.data.properties[hsPropertyName] || '';

      // Remove deleted file ID
      const fileIdsArray = existingFileIds.split(',').filter(id => id.trim() !== fileId);
      const updatedFileIds = fileIdsArray.join(',');

      await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
        properties: {
          [hsPropertyName]: updatedFileIds
        }
      });

      console.log(`[Agent Questionnaire] ✅ File deleted and deal property updated`);
    }

    return res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('[Agent Questionnaire] ❌ Error deleting file:', error);

    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to delete file'
    });
  }
});

/**
 * POST /api/agent/deals/:dealId/upload
 * Upload document for a deal (legacy single-file upload)
 */
router.post('/deals/:dealId/upload', upload.single('file'), async (req, res) => {
  try {
    const { dealId } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'File is required'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Document type is required'
      });
    }

    console.log(`[Agent Routes] Uploading ${documentType} for deal ${dealId}`);
    console.log(`[Agent Routes] File: ${file.originalname}, Size: ${file.size} bytes`);

    // Create form data for HubSpot Files API
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    formData.append('options', JSON.stringify({
      access: 'PRIVATE',
      overwrite: false,
      duplicateValidationStrategy: 'NONE',
      duplicateValidationScope: 'ENTIRE_PORTAL'
    }));

    // Upload to HubSpot
    const fileUploadResponse = await hubspotClient.post('/files/v3/files', formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });

    const uploadedFile = fileUploadResponse.data;
    console.log(`[Agent Routes] File uploaded to HubSpot: ${uploadedFile.id}`);

    // Update deal property with file URL
    const fieldName = `${documentType}_upload`;
    await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
      properties: {
        [fieldName]: uploadedFile.url
      }
    });

    console.log(`[Agent Routes] Deal ${dealId} updated with ${fieldName}`);

    return res.json({
      success: true,
      fileId: uploadedFile.id,
      url: uploadedFile.url,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('[Agent Routes] Error uploading document:', error);
    
    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to upload document'
    });
  }
});

/**
 * POST /api/agent/leads/:dealId/questionnaire
 * Save questionnaire data for a deal (agent context)
 * Reuses same logic as client endpoint
 */
router.post('/leads/:dealId/questionnaire', async (req, res) => {
  try {
    const { dealId } = req.params;
    const formData = req.body;

    console.log(`[Agent Questionnaire] 💾 Saving questionnaire data for deal: ${dealId}`);
    console.log(`[Agent Questionnaire] 📝 Received ${Object.keys(formData).length} fields`);

    // Import questionnaireHelper
    const { getAllMappings } = await import('../utils/questionnaireHelper.js');
    const propertyMapping = getAllMappings();

    const properties = {};

    Object.entries(formData).forEach(([fieldName, value]) => {
      const config = propertyMapping[fieldName];
      if (config) {
        // Capitalize yes/no/unsure for HubSpot enumeration fields
        let hubspotValue = value;
        if (config.hsPropertyType === 'enumeration' && typeof value === 'string') {
          hubspotValue = value.charAt(0).toUpperCase() + value.slice(1);
        }
        properties[config.hsPropertyName] = hubspotValue;
      }
    });

    // Clear all hidden conditional fields (Bug Fix: Q2.1 and Q2.2 sub-questions)
    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.conditional && config.conditionalOn) {
        const { field, value } = config.conditionalOn;
        
        // If parent field doesn't match required value, nullify this field
        if (formData[field] !== value) {
          properties[config.hsPropertyName] = '';
          console.log(`[Agent Questionnaire] 🧹 Clearing hidden field: ${fieldName} (parent: ${field})`);
        }
      }
    });

    // Update deal in HubSpot
    await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
      properties
    });

    console.log(`[Agent Questionnaire] ✅ Questionnaire saved - ${Object.keys(properties).length} properties updated`);
    return res.json({ success: true, message: 'Questionnaire saved successfully' });

  } catch (error) {
    console.error(`[Agent Questionnaire] ❌ Error saving questionnaire:`, error.message);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to save questionnaire data'
    });
  }
});

/**
 * POST /api/agent/leads/:dealId/questionnaire/submit
 * Submit complete questionnaire with validation (agent context)
 */
router.post('/leads/:dealId/questionnaire/submit', async (req, res) => {
  try {
    const { dealId } = req.params;
    const formData = req.body;

    console.log(`[Agent Questionnaire] ✅ Submitting complete questionnaire for deal: ${dealId}`);

    // Check if user opted to skip rates notice (HubSpot enumeration: 'Yes' or null)
    const skipRatesNotice = formData.skip_rates_notice === 'yes' || formData.skip_rates_notice === 'Yes';
    if (skipRatesNotice) {
      console.log(`[Agent Questionnaire] ⏭️ User opted to send rates notice separately`);
    }

    // Import questionnaireHelper
    const { getAllMappings } = await import('../utils/questionnaireHelper.js');
    const propertyMapping = getAllMappings();

    // Validate all required fields
    const missingFields = [];

    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.required && (!formData[fieldName] || formData[fieldName] === '')) {
        // Skip rates notice fields if user opted to send separately
        if (skipRatesNotice && (fieldName === 'rates_notice_upload' || fieldName === 'water_notice_upload')) {
          console.log(`[Agent Questionnaire] ⏭️ Skipping validation for ${fieldName} (will send separately)`);
          return;
        }

        // Skip conditional fields that are not visible
        if (config.conditional && config.conditionalOn) {
          const { field, value } = config.conditionalOn;
          if (formData[field] !== value) {
            return; // Skip this field
          }
        }
        missingFields.push(fieldName);
      }
    });

    if (missingFields.length > 0) {
      console.log(`[Agent Questionnaire] ⚠️ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    // Transform and save
    const properties = {};
    Object.entries(formData).forEach(([fieldName, value]) => {
      const config = propertyMapping[fieldName];
      if (config) {
        let hubspotValue = value;
        if (config.hsPropertyType === 'enumeration' && typeof value === 'string') {
          hubspotValue = value.charAt(0).toUpperCase() + value.slice(1);
        }
        properties[config.hsPropertyName] = hubspotValue;
      }
    });

    // Clear all hidden conditional fields (Bug Fix: Q2.1 and Q2.2 sub-questions)
    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.conditional && config.conditionalOn) {
        const { field, value } = config.conditionalOn;
        
        // If parent field doesn't match required value, nullify this field
        if (formData[field] !== value) {
          properties[config.hsPropertyName] = '';
          console.log(`[Agent Questionnaire] 🧹 Clearing hidden field: ${fieldName} (parent: ${field})`);
        }
      }
    });

    await hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
      properties
    });

    console.log(`[Agent Questionnaire] ✅ Questionnaire submitted successfully`);
    return res.json({ success: true, message: 'Questionnaire submitted successfully' });

  } catch (error) {
    console.error(`[Agent Questionnaire] ❌ Error submitting questionnaire:`, error.message);
    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to submit questionnaire'
    });
  }
});

/**
 * PATCH /api/agent/profile
 * Update agent's own profile
 */
router.patch('/profile', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { firstname, lastname, email, phone } = req.body;

    console.log(`[Agent Routes] Updating profile for agent ${agentId}`);

    // Validate required fields
    if (!firstname || !lastname || !email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'First name, last name, and email are required'
      });
    }

    // Update HubSpot contact
    const updatedAgent = await hubspotClient.patch(
      `/crm/v3/objects/contacts/${agentId}`,
      {
        properties: {
          firstname,
          lastname,
          email,
          phone: phone || ''
        }
      }
    );

    console.log(`[Agent Routes] Profile updated successfully for ${agentId}`);

    // Return updated agent data
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      agent: {
        id: agentId,
        ...updatedAgent.data.properties
      }
    });
  } catch (error) {
    console.error('[Agent Routes] Error updating profile:', error);
    
    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to update profile'
    });
  }
});

export default router;

