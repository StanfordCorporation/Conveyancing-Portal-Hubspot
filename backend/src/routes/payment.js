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

const router = express.Router();

/**
 * GET /api/payment/config
 * Get Stripe publishable key for frontend
 */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: STRIPE_CONFIG.publishableKey,
    currency: STRIPE_CONFIG.currency,
  });
});

/**
 * POST /api/payment/create-payment-intent
 * Create a payment intent for a deal
 * Requires: dealId, amount
 */
router.post('/create-payment-intent', authenticateJWT, async (req, res) => {
  try {
    const { dealId, amount } = req.body;
    const contactId = req.user.contactId;
    const userEmail = req.user.email;

    if (!dealId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: dealId, amount' });
    }

    console.log(`[Payment] 💳 Creating payment intent for deal ${dealId}`);
    console.log(`[Payment] 💰 Amount: $${(amount / 100).toFixed(2)}`);

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

    // Create payment intent
    const paymentIntent = await stripePayments.createPaymentIntent({
      amount: amount,
      customerId: customer.id,
      description: `Payment for ${deal.properties.property_address || deal.properties.dealname}`,
      metadata: {
        deal_id: dealId,
        contact_id: contactId,
        deal_name: deal.properties.dealname || 'Property Purchase',
      },
    });

    console.log(`[Payment] ✅ Payment intent created successfully`);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
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

export default router;
