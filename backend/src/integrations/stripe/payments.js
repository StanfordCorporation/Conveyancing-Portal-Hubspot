/**
 * Stripe Payments Integration
 * Handles creating and managing payment intents
 */

import stripe from '../../config/stripe.js';
import { STRIPE_CONFIG } from '../../config/stripe.js';

/**
 * Create a payment intent
 * @param {Object} paymentData - Payment information
 * @param {number} paymentData.amount - Amount in cents (e.g., 1099 = $10.99)
 * @param {string} paymentData.customerId - Stripe customer ID
 * @param {string} paymentData.description - Payment description
 * @param {Object} paymentData.metadata - Additional metadata (e.g., dealId, contactId)
 * @returns {Promise<Object>} Payment intent object with client_secret
 */
export const createPaymentIntent = async (paymentData) => {
  try {
    const { amount, customerId, description, metadata } = paymentData;

    console.log(`[Stripe Payments] 💳 Creating payment intent: ${description || 'Payment'}`);
    console.log(`[Stripe Payments] 💰 Amount: $${(amount / 100).toFixed(2)} ${STRIPE_CONFIG.currency.toUpperCase()}`);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: STRIPE_CONFIG.currency,
      customer: customerId,
      description: description || 'Property conveyancing payment',
      metadata: metadata || {},
      // Automatically determine supported payment methods (cards, Apple Pay, Google Pay, etc.)
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`[Stripe Payments] ✅ Payment intent created: ${paymentIntent.id}`);
    console.log(`[Stripe Payments] 🔑 Client secret generated for frontend`);

    return paymentIntent;
  } catch (error) {
    console.error(`[Stripe Payments] ❌ Error creating payment intent:`, error.message);
    throw error;
  }
};

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Payment intent object
 */
export const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`[Stripe Payments] ✅ Retrieved payment intent: ${paymentIntent.id} - Status: ${paymentIntent.status}`);
    return paymentIntent;
  } catch (error) {
    console.error(`[Stripe Payments] ❌ Error retrieving payment intent:`, error.message);
    throw error;
  }
};

/**
 * Cancel a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Cancelled payment intent
 */
export const cancelPaymentIntent = async (paymentIntentId) => {
  try {
    console.log(`[Stripe Payments] 🚫 Cancelling payment intent: ${paymentIntentId}`);

    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    console.log(`[Stripe Payments] ✅ Payment intent cancelled: ${paymentIntent.id}`);
    return paymentIntent;
  } catch (error) {
    console.error(`[Stripe Payments] ❌ Error cancelling payment intent:`, error.message);
    throw error;
  }
};

/**
 * List payment intents for a customer
 * @param {string} customerId - Stripe customer ID
 * @param {number} limit - Number of results to return (default: 10)
 * @returns {Promise<Array>} Array of payment intents
 */
export const listCustomerPayments = async (customerId, limit = 10) => {
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: limit,
    });

    console.log(`[Stripe Payments] ✅ Retrieved ${paymentIntents.data.length} payment intents for customer ${customerId}`);
    return paymentIntents.data;
  } catch (error) {
    console.error(`[Stripe Payments] ❌ Error listing payment intents:`, error.message);
    throw error;
  }
};
