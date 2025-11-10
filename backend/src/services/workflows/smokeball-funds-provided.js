/**
 * Smokeball Funds Provided Workflow
 * Triggered when deal reaches Stage 6: Funds Provided
 *
 * Actions:
 * 1. Verify lead exists in Smokeball
 * 2. Create notification/note about funds being provided
 * 3. Lead-to-matter conversion is manual in Smokeball
 * 4. Webhook will sync matter_uid when conversion happens
 */

import * as dealsIntegration from '../../integrations/hubspot/deals.js';
import * as smokeballMatters from '../../integrations/smokeball/matters.js';

/**
 * Handle funds provided event
 *
 * @param {string} dealId - HubSpot deal ID
 * @returns {Promise<Object>} Result
 */
export async function handleFundsProvided(dealId) {
  try {
    console.log('[Smokeball Funds Workflow] 💰 Processing funds provided for deal:', dealId);

    // ========================================
    // STEP 1: Fetch HubSpot deal
    // ========================================
    const deal = await dealsIntegration.getDeal(dealId, [
      'dealname',
      'lead_uid',
      'matter_uid',
      'smokeball_sync_status',
    ]);

    const leadUid = deal.properties.lead_uid;
    const matterUid = deal.properties.matter_uid;

    if (!leadUid) {
      throw new Error('No lead_uid found. Lead must be created in Smokeball first.');
    }

    console.log(`[Smokeball Funds Workflow] 🆔 Lead UID: ${leadUid}`);

    // ========================================
    // STEP 2: Check if already converted to matter
    // ========================================
    if (matterUid) {
      console.log(`[Smokeball Funds Workflow] ✅ Already converted to matter: ${matterUid}`);
      return {
        success: true,
        message: 'Lead already converted to matter',
        matterUid,
      };
    }

    // ========================================
    // STEP 3: Verify lead exists in Smokeball
    // ========================================
    console.log('[Smokeball Funds Workflow] 🔍 Verifying lead in Smokeball...');

    const smokeballLead = await smokeballMatters.getMatter(leadUid);

    if (!smokeballLead.isLead) {
      // Already converted
      console.log('[Smokeball Funds Workflow] ℹ️ Lead already converted to matter in Smokeball');

      // Update HubSpot with matter number
      if (smokeballLead.number) {
        await dealsIntegration.updateDeal(dealId, {
          matter_uid: smokeballLead.number,
          smokeball_sync_status: 'Successful',
        });
      }

      return {
        success: true,
        message: 'Lead already converted in Smokeball',
        matterNumber: smokeballLead.number,
      };
    }

    // ========================================
    // STEP 4: Log funds received
    // ========================================
    console.log('[Smokeball Funds Workflow] 📝 Funds provided - awaiting manual conversion');
    console.log('[Smokeball Funds Workflow] ℹ️ Lead-to-matter conversion is manual in Smokeball');
    console.log('[Smokeball Funds Workflow] ℹ️ Webhook will sync matter_uid when conversion occurs');

    // Update sync status
    await dealsIntegration.updateDeal(dealId, {
      smokeball_sync_status: 'Successful',
      smokeball_last_sync: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Funds provided logged. Awaiting manual lead-to-matter conversion in Smokeball.',
      leadUid,
      nextSteps: [
        'Manually convert lead to matter in Smokeball',
        'Webhook will automatically sync matter number to HubSpot',
        'After conversion, payment receipting will be available',
      ],
    };

  } catch (error) {
    console.error('[Smokeball Funds Workflow] ❌ Workflow failed:', error.message);

    // Update HubSpot with error status
    try {
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Failed',
        smokeball_sync_error: error.message,
      });
    } catch (updateError) {
      console.error('[Smokeball Funds Workflow] ❌ Failed to update error status:', updateError.message);
    }

    throw error;
  }
}

export default {
  handleFundsProvided,
};
