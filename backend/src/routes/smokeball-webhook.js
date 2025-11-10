/**
 * Smokeball Webhook Handler (Vercel Endpoint)
 * Handles webhook notifications directly from Smokeball CRM
 * Based on old PHP implementation: smokeball-webhook-handler.php
 *
 * Setup Required:
 * 1. Deploy to Vercel
 * 2. Register webhook URL with Smokeball via /api/smokeball/webhook/register
 * 3. Smokeball will send events to this endpoint
 *
 * Webhook Types Handled:
 * - matter.created: When a new lead/matter is created
 * - matter.initialized: When matter is initialized (skipped to avoid duplicates)
 * - matter.updated: When a lead/matter is updated
 * - matter.converted: When lead is converted to matter
 */

import express from 'express';
import crypto from 'crypto';
import * as dealsIntegration from '../integrations/hubspot/deals.js';
import * as smokeballMatters from '../integrations/smokeball/matters.js';
import * as smokeballTasks from '../integrations/smokeball/tasks.js';
import * as smokeballStaff from '../integrations/smokeball/staff.js';
import { parsePropertyAddress } from '../utils/addressParser.js';
import { SMOKEBALL_CONFIG } from '../config/smokeball.js';

const router = express.Router();

/**
 * POST /api/smokeball/webhook
 * Receives Smokeball webhook notifications (called by Cloudflare Worker)
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;

    console.log('[Smokeball Webhook] 📨 Received webhook:', {
      eventType: payload.type || payload.eventType,
      matterId: payload.payload?.id || payload.data?.id,
    });

    // Verify webhook signature or API key
    if (!verifyWebhookAuth(req)) {
      console.error('[Smokeball Webhook] ❌ Unauthorized webhook request');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - invalid API key',
      });
    }

    // Route to appropriate handler based on event type
    const eventType = payload.type || payload.eventType;

    switch (eventType) {
      case 'matter.created':
        return await handleMatterCreated(req, res, payload);

      case 'matter.initialized':
        // Log but don't process - matter.created handles everything
        console.log('[Smokeball Webhook] ℹ️ matter.initialized ignored (prevents duplicates)');
        return res.json({
          success: true,
          message: 'matter.initialized ignored to prevent duplicates',
        });

      case 'matter.updated':
        return await handleMatterUpdated(req, res, payload);

      case 'matter.converted':
        return await handleMatterConverted(req, res, payload);

      default:
        console.warn('[Smokeball Webhook] ⚠️ Unhandled event type:', eventType);
        return res.json({
          success: true,
          message: 'Event type not handled',
        });
    }

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal error processing webhook',
      error: error.message,
    });
  }
});

/**
 * Verify webhook authentication
 * Checks for valid API key in header
 */
function verifyWebhookAuth(req) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-smokeball-key'];
  
  // Verify against Smokeball API key
  if (apiKey === SMOKEBALL_CONFIG.apiKey) {
    return true;
  }

  console.error('[Smokeball Webhook] ❌ Invalid API key provided');
  return false;
}

/**
 * Handle matter.created webhook
 * Triggers property details update and welcome call task creation
 */
async function handleMatterCreated(req, res, payload) {
  try {
    const matterData = payload.payload || payload.data;
    const matterId = matterData.id;
    const matterNumber = matterData.number;
    const isLead = matterData.isLead !== false; // True if lead, false if matter

    console.log('[Smokeball Webhook] 📝 Processing matter.created:', {
      matterId,
      matterNumber,
      isLead,
    });

    // Find HubSpot deal by lead_uid
    const deal = await findDealByLeadUid(matterId);

    if (!deal) {
      console.warn('[Smokeball Webhook] ⚠️ No matching HubSpot deal found for matter:', matterId);
      return res.json({
        success: true,
        message: 'No matching deal found',
      });
    }

    console.log('[Smokeball Webhook] ✅ Found HubSpot deal:', deal.id);

    // Only process if this is a lead (not already a matter)
    if (isLead) {
      console.log('[Smokeball Webhook] 🔄 Processing new lead creation...');

      // Queue post-creation tasks
      await queuePostCreationTasks(matterId, deal);
    } else {
      console.log('[Smokeball Webhook] ℹ️ Matter already created (not a lead)');
    }

    // Update sync status
    await dealsIntegration.updateDeal(deal.id, {
      smokeball_last_sync: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'matter.created processed',
      matterId,
      dealId: deal.id,
    });

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Error in matter.created:', error);
    throw error;
  }
}

/**
 * Handle matter.updated webhook
 * Updates matter number if provided
 */
async function handleMatterUpdated(req, res, payload) {
  try {
    const matterData = payload.payload || payload.data;
    const matterId = matterData.id;
    const matterNumber = matterData.number;

    console.log('[Smokeball Webhook] 🔄 Processing matter.updated:', {
      matterId,
      matterNumber,
    });

    // Find HubSpot deal
    const deal = await findDealByLeadUid(matterId);

    if (!deal) {
      console.warn('[Smokeball Webhook] ⚠️ No matching deal found');
      return res.json({
        success: true,
        message: 'No matching deal found',
      });
    }

    // Update matter number if provided and not already set
    const updates = {
      smokeball_last_sync: new Date().toISOString(),
    };

    if (matterNumber && !deal.properties.matter_uid) {
      updates.matter_uid = matterNumber;
      console.log('[Smokeball Webhook] 📝 Updating matter number:', matterNumber);
    }

    await dealsIntegration.updateDeal(deal.id, updates);

    return res.json({
      success: true,
      message: 'matter.updated processed',
      matterId,
      dealId: deal.id,
    });

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Error in matter.updated:', error);
    throw error;
  }
}

/**
 * Handle matter.converted webhook
 * Captures matter number when lead converts to matter
 * Based on old PHP: smokeball_handle_matter_converted()
 */
async function handleMatterConverted(req, res, payload) {
  try {
    const matterData = payload.payload || payload.data;
    const matterId = matterData.id;
    const matterNumber = matterData.number;
    const isLead = matterData.isLead;

    console.log('[Smokeball Webhook] 🎉 Processing matter.converted:', {
      matterId,
      matterNumber,
      isLead,
    });

    // Find HubSpot deal
    const deal = await findDealByLeadUid(matterId);

    if (!deal) {
      console.warn('[Smokeball Webhook] ⚠️ No matching deal found for converted matter');
      return res.json({
        success: true,
        message: 'No matching deal found',
      });
    }

    console.log('[Smokeball Webhook] ✅ Found deal for converted matter:', deal.id);

    // Store matter number in HubSpot
    if (matterNumber) {
      await dealsIntegration.updateDeal(deal.id, {
        matter_uid: matterNumber,
        smokeball_sync_status: 'Successful',
        smokeball_last_sync: new Date().toISOString(),
      });

      console.log('[Smokeball Webhook] 💾 Matter number saved to HubSpot:', matterNumber);
    } else {
      console.warn('[Smokeball Webhook] ⚠️ matter.converted did not include matter number');
    }

    return res.json({
      success: true,
      message: 'matter.converted processed successfully',
      matterId,
      matterNumber,
      dealId: deal.id,
    });

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Error in matter.converted:', error);
    throw error;
  }
}

/**
 * Queue post-creation tasks
 * Based on old PHP: smokeball_queue_post_creation_tasks()
 *
 * Actions:
 * 1. Update property details in Smokeball
 * 2. Create welcome call task for Laura
 */
async function queuePostCreationTasks(matterId, deal) {
  try {
    console.log('[Smokeball Webhook] 📋 Queueing post-creation tasks:', {
      matterId,
      dealId: deal.id,
    });

    const propertyAddress = deal.properties.property_address;

    // Task 1: Update property details (if address available)
    if (propertyAddress) {
      try {
        await updatePropertyDetailsInMatter(matterId, propertyAddress);
        console.log('[Smokeball Webhook] ✅ Property details updated');
      } catch (propError) {
        console.error('[Smokeball Webhook] ⚠️ Property details update failed:', propError.message);
        // Don't fail entire workflow
      }
    }

    // Task 2: Create welcome call task for Laura
    try {
      await createWelcomeCallTask(matterId, deal);
      console.log('[Smokeball Webhook] ✅ Welcome call task created');
    } catch (taskError) {
      console.error('[Smokeball Webhook] ⚠️ Welcome task creation failed:', taskError.message);
      // Don't fail entire workflow
    }

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Error in post-creation tasks:', error);
    // Don't throw - webhook should still succeed
  }
}

/**
 * Update property details in Smokeball matter
 * Parses address and populates property fields
 */
async function updatePropertyDetailsInMatter(matterId, propertyAddress) {
  try {
    console.log('[Smokeball Webhook] 📍 Updating property details:', {
      matterId,
      address: propertyAddress,
    });

    // Parse address into components
    const parsed = parsePropertyAddress(propertyAddress);

    console.log('[Smokeball Webhook] Parsed address:', parsed);

    // Get matter to find property details layout
    const matter = await smokeballMatters.getMatter(matterId);

    // Check if matter has property details layout
    if (!matter.items || !matter.items['Property Details']) {
      console.warn('[Smokeball Webhook] ⚠️ Property Details layout not found in matter');
      return false;
    }

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

    await smokeballMatters.updateMatterLayout(matterId, layoutId, layoutUpdate);

    console.log('[Smokeball Webhook] ✅ Property details layout updated');

    return true;

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Property details update error:', error);
    throw error;
  }
}

/**
 * Create welcome call task for new leads
 * Based on old PHP: smokeball_create_welcome_call_task()
 */
async function createWelcomeCallTask(matterId, deal) {
  try {
    console.log('[Smokeball Webhook] 📞 Creating welcome call task for matter:', matterId);

    // Get Laura Stuart
    const laura = await smokeballStaff.findLaura();

    if (!laura) {
      console.warn('[Smokeball Webhook] ⚠️ Laura Stuart not found - skipping task');
      return null;
    }

    // Determine lead source for task note
    const leadSource = deal.properties.lead_source || 'Portal';
    let leadSourceDisplay = leadSource;

    switch (leadSource) {
      case 'agent_portal':
        leadSourceDisplay = 'Agent Portal';
        break;
      case 'disclosure_form':
        leadSourceDisplay = 'Disclosure Form';
        break;
      case 'client_portal':
        leadSourceDisplay = 'Client Portal';
        break;
      default:
        leadSourceDisplay = leadSource.replace(/_/g, ' ');
    }

    // Get client name from deal
    const clientName = deal.properties.client_name || 
                      deal.properties.dealname?.split(' - ')[0] || 
                      'Client';

    // Create welcome call task
    const taskData = {
      matterId,
      title: `Welcome call for ${clientName}`,
      description: `The client just registered themselves from the ${leadSourceDisplay}, please give them a call.`,
      assignedTo: laura.id,
      dueDate: new Date().toISOString().split('T')[0], // Today
      priority: 'High',
    };

    const task = await smokeballTasks.createTask(taskData);

    console.log('[Smokeball Webhook] ✅ Welcome call task created:', task.id);

    return task;

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Welcome task creation error:', error);
    throw error;
  }
}

/**
 * Find HubSpot deal by Smokeball lead_uid
 */
async function findDealByLeadUid(leadUid) {
  try {
    // Search HubSpot for deal with matching lead_uid
    const searchResults = await dealsIntegration.searchDeals({
      filterGroups: [{
        filters: [{
          propertyName: 'lead_uid',
          operator: 'EQ',
          value: leadUid,
        }],
      }],
      properties: [
        'dealname',
        'lead_uid',
        'matter_uid',
        'property_address',
        'client_name',
        'lead_source',
      ],
      limit: 1,
    });

    if (searchResults.results && searchResults.results.length > 0) {
      return searchResults.results[0];
    }

    return null;

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Error finding deal:', error);
    throw error;
  }
}

/**
 * GET /api/smokeball/webhook/register
 * Register webhook subscription with Smokeball
 * Based on old PHP: smokeball_register_webhook_subscription()
 */
router.get('/webhook/register', async (req, res) => {
  try {
    console.log('[Smokeball Webhook] 📝 Registering webhook subscription...');

    // Generate webhook key for signature verification
    const webhookKey = generateWebhookKey();

    // Store in environment/config (you may want to store this in database)
    console.log('[Smokeball Webhook] 🔑 Webhook Key:', webhookKey.substring(0, 20) + '...');

    // Get webhook URL (use environment variable or construct from request)
    const webhookUrl = process.env.SMOKEBALL_WEBHOOK_URL || 
                       `${req.protocol}://${req.get('host')}/api/smokeball/webhook`;

    // Prepare subscription data
    const subscriptionData = {
      key: webhookKey,
      name: 'Stanford Legal - Lead Creation & Updates',
      eventTypes: [
        'matter.created',
        'matter.initialized',
        'matter.updated',
        'matter.converted',
      ],
      eventNotificationUrl: webhookUrl,
    };

    console.log('[Smokeball Webhook] 📡 Webhook URL:', webhookUrl);
    console.log('[Smokeball Webhook] 📋 Event types:', subscriptionData.eventTypes);

    // Register webhook with Smokeball
    const response = await smokeballMatters.registerWebhook(subscriptionData);

    console.log('[Smokeball Webhook] ✅ Webhook registered successfully');
    console.log('[Smokeball Webhook] 🆔 Subscription ID:', response.id);

    return res.json({
      success: true,
      subscriptionId: response.id,
      webhookUrl,
      eventTypes: subscriptionData.eventTypes,
      webhookKey: webhookKey.substring(0, 10) + '...(hidden)',
    });

  } catch (error) {
    console.error('[Smokeball Webhook] ❌ Webhook registration failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate webhook key for signature verification
 */
function generateWebhookKey() {
  return crypto.randomBytes(32).toString('hex');
}

export default router;

