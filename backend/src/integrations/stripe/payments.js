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
 * @param {boolean} paymentData.manualCapture - If true, use manual capture for fee adjustment
 * @returns {Promise<Object>} Payment intent object with client_secret
 */
export const createPaymentIntent = async (paymentData) => {
  try {
    const { amount, customerId, description, metadata, manualCapture = false } = paymentData;

    console.log(`[Stripe Payments] 💳 Creating payment intent: ${description || 'Payment'}`);
    console.log(`[Stripe Payments] 💰 Amount: $${(amount / 100).toFixed(2)} ${STRIPE_CONFIG.currency.toUpperCase()}`);
    if (manualCapture) {
      console.log(`[Stripe Payments] 🔒 Manual capture enabled for fee adjustment`);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: STRIPE_CONFIG.currency,
      customer: customerId,
      description: description || 'Property conveyancing payment',
      metadata: metadata || {},
      // Manual capture allows adjusting amount after card country is known
      capture_method: manualCapture ? 'manual' : 'automatic',

      // ============================================================
      // PAYMENT METHODS ENABLED - CREDIT CARDS ACTIVE
      // ============================================================

      // Automatically determine supported payment methods (cards, Apple Pay, Google Pay, etc.)
      automatic_payment_methods: {
        enabled: true,
      },

      // payment_method_types: [], // ✅ Re-enabled automatic payment methods
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

/**
 * Update payment intent amount (useful for fee adjustment after card country detection)
 * @param {string} paymentIntentId - Payment intent ID
 * @param {number} newAmount - New amount in cents
 * @returns {Promise<Object>} Updated payment intent
 */
export const updatePaymentIntentAmount = async (paymentIntentId, newAmount) => {
  try {
    console.log(`[Stripe Payments] 💳 Updating payment intent ${paymentIntentId} amount to $${(newAmount / 100).toFixed(2)}`);

    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      amount: newAmount,
    });

    console.log(`[Stripe Payments] ✅ Payment intent amount updated`);
    return paymentIntent;
  } catch (error) {
    console.error(`[Stripe Payments] ❌ Error updating payment intent:`, error.message);
    throw error;
  }
};

/**
 * Capture a manually authorized payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @param {number} amountToCapture - Optional: amount to capture (defaults to full amount)
 * @returns {Promise<Object>} Captured payment intent
 */
export const capturePaymentIntent = async (paymentIntentId, amountToCapture = null) => {
  try {
    console.log(`[Stripe Payments] 💰 Capturing payment intent: ${paymentIntentId}`);

    const params = {};
    if (amountToCapture !== null) {
      params.amount_to_capture = amountToCapture;
      console.log(`[Stripe Payments] 💰 Capturing amount: $${(amountToCapture / 100).toFixed(2)}`);
    }

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, params);

    console.log(`[Stripe Payments] ✅ Payment captured successfully`);
    return paymentIntent;
  } catch (error) {
    console.error(`[Stripe Payments] ❌ Error capturing payment:`, error.message);
    throw error;
  }
};

/**
 * Get card country from payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Object with card country and type info
 */
export const getCardCountry = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Extract payment method details
    const paymentMethodId = paymentIntent.payment_method;
    if (!paymentMethodId) {
      throw new Error('No payment method attached to payment intent');
    }

    // Get full payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const cardCountry = paymentMethod.card?.country;

    if (!cardCountry) {
      throw new Error('Card country not available');
    }

    const merchantCountry = 'AU'; // Australian business
    const isDomestic = cardCountry === merchantCountry;

    console.log(`[Stripe Payments] 🌍 Card country: ${cardCountry}`);
    console.log(`[Stripe Payments] ${isDomestic ? '🏠' : '🌏'} Card type: ${isDomestic ? 'Domestic' : 'International'}`);

    return {
      cardCountry,
      merchantCountry,
      isDomestic,
      cardType: isDomestic ? 'domestic' : 'international',
    };
  } catch (error) {
    console.error(`[Stripe Payments] ❌ Error getting card country:`, error.message);
    throw error;
  }
};
