/**
 * Payment Routes
 * Stripe payment processing endpoints
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import * as stripeCustomers from '../integrations/stripe/customers.js';
import * as stripePayments from '../integrations/stripe/payments.js';
import * as dealsIntegration from '../integrations/hubspot/deals.js';
import { STRIPE_CONFIG } from '../config/stripe.js';
import { calculateAmountWithFees, getFeeBreakdown } from '../utils/stripe-fees.js';
import { handlePaymentSuccess } from './webhook.js';

const router = express.Router();

/**
 * GET /api/payment/config
 * Get Stripe publishable key for frontend
 */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: STRIPE_CONFIG.publishableKey,
    currency: STRIPE_CONFIG.currency,
    paymentsEnabled: STRIPE_CONFIG.paymentsEnabled,
  });
});

/**
 * POST /api/payment/create-payment-intent
 * Create a payment intent for a deal
 * Requires: dealId, amount (net amount you want to receive)
 *
 * Note: Stripe fees are automatically added to the charge amount
 * so the customer pays the fees and you receive the full net amount
 *
 * Behavior depends on STRIPE_CONFIG.feeConfig.useDynamicDetection:
 * - false: Uses default card type (simpler, recommended)
 * - true: Creates with international rates, adjusts after card detection
 */
router.post('/create-payment-intent', authenticateJWT, async (req, res) => {
  try {
    // Check if payments are enabled
    if (!STRIPE_CONFIG.paymentsEnabled) {
      console.log('[Payment] ⚠️ Payment attempted but payments are currently disabled');
      return res.status(503).json({
        error: 'Payments are temporarily unavailable',
        paymentsDisabled: true,
        message: 'Credit card payments are currently disabled. Please contact us for alternative payment methods.'
      });
    }

    const { dealId, amount } = req.body;
    const contactId = req.user.contactId;
    const userEmail = req.user.email;

    if (!dealId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: dealId, amount' });
    }

    const { useDynamicDetection, defaultCardType } = STRIPE_CONFIG.feeConfig;

    // For dynamic detection, start with international rates (conservative)
    // For static, use configured default
    const useDomestic = useDynamicDetection ? false : defaultCardType === 'domestic';

    // Calculate gross amount including Stripe fees
    const feeCalculation = calculateAmountWithFees(amount, { useDomestic });

    console.log(`[Payment] 💳 Creating payment intent for deal ${dealId}`);
    console.log(`[Payment] 🔧 Dynamic detection: ${useDynamicDetection ? 'ENABLED' : 'DISABLED'} (${useDomestic ? 'domestic' : 'international'} rates)`);
    console.log(`[Payment] 💰 Net amount (what you receive): ${feeCalculation.breakdown.netAmount}`);
    console.log(`[Payment] 💳 Stripe fee: ${feeCalculation.breakdown.stripeFee} (${feeCalculation.breakdown.feePercentage})`);
    console.log(`[Payment] 💵 Total charge to customer: ${feeCalculation.breakdown.grossAmount}`);

    // Get deal information
    const deal = await dealsIntegration.getDeal(dealId, ['dealname', 'property_address']);

    // Get or create Stripe customer
    const customer = await stripeCustomers.getOrCreateCustomer({
      email: userEmail,
      name: req.user.firstname ? `${req.user.firstname} ${req.user.lastname}`.trim() : userEmail,
      metadata: {
        hubspot_contact_id: contactId,
        hubspot_deal_id: dealId,
      },
    });

    // Create payment intent with gross amount (includes fees)
    const paymentIntent = await stripePayments.createPaymentIntent({
      amount: feeCalculation.grossAmountInCents,
      customerId: customer.id,
      description: `Conveyancing Fee for ${deal.properties.property_address || deal.properties.dealname} (includes card surcharge)`,
      metadata: {
        deal_id: dealId,
        contact_id: contactId,
        deal_name: deal.properties.dealname || 'Property Purchase',
        base_amount: amount,
        fee_percent: feeCalculation.feePercent,
        fixed_fee: feeCalculation.fixedFee,
        gross_amount: feeCalculation.grossAmountInCents,
        stripe_fee: feeCalculation.stripeFeeInCents,
      },
      // Enable manual capture for dynamic detection
      manualCapture: useDynamicDetection,
    });

    console.log(`[Payment] ✅ Payment intent created successfully`);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
      useDynamicDetection: useDynamicDetection,
      baseAmount: amount, // Pass base amount for adjust-and-capture endpoint
      // Include fee breakdown for frontend display
      feeBreakdown: {
        baseAmount: feeCalculation.breakdown.netAmount,
        stripeFee: feeCalculation.breakdown.stripeFee,
        totalAmount: feeCalculation.breakdown.grossAmount,
        feePercentage: feeCalculation.breakdown.feePercentage,
        baseAmountCents: feeCalculation.netAmountInCents,
        stripeFeeInCents: feeCalculation.stripeFeeInCents,
        totalAmountCents: feeCalculation.grossAmountInCents,
      },
    });
  } catch (error) {
    console.error(`[Payment] ❌ Error creating payment intent:`, error.message);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * GET /api/payment/status/:paymentIntentId
 * Get payment status
 */
router.get('/status/:paymentIntentId', authenticateJWT, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripePayments.getPaymentIntent(paymentIntentId);

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      metadata: paymentIntent.metadata,
    });
  } catch (error) {
    console.error(`[Payment] ❌ Error retrieving payment status:`, error.message);
    res.status(500).json({ error: 'Failed to retrieve payment status' });
  }
});

/**
 * POST /api/payment/cancel/:paymentIntentId
 * Cancel a payment intent
 */
router.post('/cancel/:paymentIntentId', authenticateJWT, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripePayments.cancelPaymentIntent(paymentIntentId);

    console.log(`[Payment] ✅ Payment intent cancelled`);

    res.json({
      success: true,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error(`[Payment] ❌ Error cancelling payment:`, error.message);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

/**
 * POST /api/payment/adjust-and-capture/:paymentIntentId
 * Detect card country, adjust fee if needed, and capture payment
 * Used for dynamic domestic/international fee adjustment
 *
 * Flow:
 * 1. Payment is authorized (not captured) on frontend
 * 2. This endpoint detects card country
 * 3. Adjusts amount based on domestic (1.7%) or international (3.5%) rates
 * 4. Captures the payment with correct amount
 */
router.post('/adjust-and-capture/:paymentIntentId', authenticateJWT, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { baseAmount } = req.body; // The net amount you want to receive

    if (!baseAmount) {
      return res.status(400).json({ error: 'Missing required field: baseAmount' });
    }

    console.log(`[Payment] 🔍 Detecting card country for payment ${paymentIntentId}`);

    // Step 1: Get card country
    const cardInfo = await stripePayments.getCardCountry(paymentIntentId);

    // Step 2: Calculate correct fee based on card type
    const feeCalculation = calculateAmountWithFees(baseAmount, {
      useDomestic: cardInfo.isDomestic,
    });

    console.log(`[Payment] 💳 Card type: ${cardInfo.cardType} (${cardInfo.cardCountry})`);
    console.log(`[Payment] 💰 Adjusted amount: ${feeCalculation.breakdown.grossAmount}`);

    // Step 3: Update payment intent amount
    await stripePayments.updatePaymentIntentAmount(
      paymentIntentId,
      feeCalculation.grossAmountInCents
    );

    // Step 4: Capture the payment
    const capturedPayment = await stripePayments.capturePaymentIntent(paymentIntentId);

    console.log(`[Payment] ✅ Payment captured with adjusted fee`);

    res.json({
      success: true,
      paymentIntentId: capturedPayment.id,
      status: capturedPayment.status,
      cardType: cardInfo.cardType,
      cardCountry: cardInfo.cardCountry,
      feeBreakdown: {
        baseAmount: feeCalculation.breakdown.netAmount,
        stripeFee: feeCalculation.breakdown.stripeFee,
        totalAmount: feeCalculation.breakdown.grossAmount,
        feePercentage: feeCalculation.breakdown.feePercentage,
        baseAmountCents: feeCalculation.netAmountInCents,
        stripeFeeInCents: feeCalculation.stripeFeeInCents,
        totalAmountCents: feeCalculation.grossAmountInCents,
      },
    });
  } catch (error) {
    console.error(`[Payment] ❌ Error adjusting and capturing payment:`, error.message);
    res.status(500).json({ error: 'Failed to adjust and capture payment' });
  }
});

/**
 * POST /api/payment/manual-update/:paymentIntentId
 * Manually update HubSpot deal for a payment that succeeded but webhook failed
 * Use this as a recovery mechanism when webhooks fail
 */
router.post('/manual-update/:paymentIntentId', authenticateJWT, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    console.log(`[Payment Manual Update] 🔄 Manually updating HubSpot for payment: ${paymentIntentId}`);

    // Get payment intent from Stripe
    const paymentIntent = await stripePayments.getPaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not succeeded', 
        status: paymentIntent.status 
      });
    }

    const dealId = paymentIntent.metadata?.deal_id;

    if (!dealId) {
      return res.status(400).json({ 
        error: 'No deal_id found in payment metadata' 
      });
    }

    console.log(`[Payment Manual Update] 📋 Found deal ID: ${dealId}`);

    // Use the same handler as webhook
    await handlePaymentSuccess(paymentIntent);

    console.log(`[Payment Manual Update] ✅ Successfully updated HubSpot deal ${dealId}`);

    res.json({
      success: true,
      message: 'HubSpot deal updated successfully',
      dealId,
      paymentIntentId,
      amount: (paymentIntent.amount / 100).toFixed(2),
    });
  } catch (error) {
    console.error(`[Payment Manual Update] ❌ Error:`, error.message);
    res.status(500).json({ 
      error: 'Failed to update HubSpot deal',
      details: error.message 
    });
  }
});

export default router;
