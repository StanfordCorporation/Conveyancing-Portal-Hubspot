import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { getDeal } from '../integrations/hubspot/deals.js';
import { buildTimelineFromDeal, DEAL_STAGE_MAP } from '../services/timeline/dealTimeline.js';

const router = express.Router();

/**
 * GET /api/timeline/:dealId
 * Fetch timeline events for a deal
 *
 * Returns a chronologically sorted list of all timeline events including:
 * - Lead created
 * - All stage transitions (using HubSpot's hs_v2_date_entered_* properties)
 * - Deal closed (if applicable)
 */
router.get('/:dealId', authenticateJWT, async (req, res) => {
  try {
    const { dealId } = req.params;

    console.log(`[Timeline] 📅 Fetching timeline for deal: ${dealId}`);

    // Build list of properties to fetch
    // IMPORTANT: hs_v2_date_entered_* properties must be explicitly requested
    const stageEntryProperties = Object.keys(DEAL_STAGE_MAP).map(
      stageId => `hs_v2_date_entered_${stageId}`
    );

    const propertiesToFetch = [
      'createdate',
      'dealstage',
      'closedate',
      ...stageEntryProperties
    ];

    console.log(`[Timeline] 📋 Fetching ${propertiesToFetch.length} properties (${stageEntryProperties.length} stage entry dates)`);

    // Fetch deal with timeline-specific properties
    const deal = await getDeal(dealId, propertiesToFetch);
    
    if (!deal || !deal.properties) {
      console.warn(`[Timeline] ⚠️ Deal ${dealId} not found or has no properties`);
      return res.status(404).json({ error: 'Deal not found' });
    }

    console.log(`[Timeline] ✅ Deal fetched successfully`);

    // Build timeline from deal properties
    const timeline = buildTimelineFromDeal(deal.properties);

    console.log(`[Timeline] 📊 Timeline built with ${timeline.length} events`);

    res.json({
      success: true,
      dealId,
      timeline
    });

  } catch (error) {
    console.error(`[Timeline] ❌ Error fetching timeline:`, error.message);
    res.status(500).json({ 
      error: 'Failed to fetch timeline',
      message: error.message 
    });
  }
});

export default router;

