import express from 'express';
import { getSearchDefinitions } from '../utils/dynamic-quotes-calculator.js';
import { calculateQuoteForDeal } from '../services/quoteService.js';

const router = express.Router();

/**
 * POST /api/quote/calculate
 * Calculate quote based on deal questionnaire data
 *
 * Body: { dealId: string }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { dealId } = req.body;

    if (!dealId) {
      return res.status(400).json({
        error: 'Missing dealId',
        message: 'dealId is required in request body'
      });
    }

    console.log(`[Quote] 🔍 Calculating quote for deal: ${dealId}`);

    // Use shared quote service
    const result = await calculateQuoteForDeal(dealId, true);

    res.json(result);

  } catch (error) {
    console.error('[Quote] ❌ Error calculating quote:', error);
    
    // Handle specific error cases
    if (error.message.includes('not eligible') || error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Deal not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to calculate quote',
      message: error.message
    });
  }
});

/**
 * GET /api/quote/search-definitions
 * Get all search definitions (base and conditional searches)
 */
router.get('/search-definitions', (req, res) => {
  try {
    const definitions = getSearchDefinitions();
    res.json({
      success: true,
      definitions
    });
  } catch (error) {
    console.error('[Quote] ❌ Error fetching search definitions:', error);
    res.status(500).json({
      error: 'Failed to fetch search definitions',
      message: error.message
    });
  }
});

export default router;
