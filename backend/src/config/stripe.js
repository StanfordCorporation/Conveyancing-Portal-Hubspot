/**
 * Stripe Configuration
 * Initializes Stripe client with secret key from environment variables
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] ⚠️ STRIPE_SECRET_KEY not found in environment variables');
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Use latest API version
  typescript: false,
});

console.log('[Stripe] ✅ Stripe client initialized');

export default stripe;

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: 'aud', // Australian Dollar

  // Payments enabled/disabled flag
  // Set to false to temporarily disable all Stripe payments
  paymentsEnabled: false, // TODO: Set to true to re-enable payments

  // Fee surcharging configuration
  feeConfig: {
    // Set to true to enable dynamic card country detection
    // When true: Detects if card is domestic/international and adjusts fees accordingly
    // When false: Uses defaultCardType for all transactions (simpler, recommended)
    useDynamicDetection: false,

    // Default card type when useDynamicDetection is false
    // Options: 'domestic' (1.75%) or 'international' (2.9%)
    // Recommendation: 'domestic' since most AU customers use AU cards
    defaultCardType: 'domestic',
  },
};
