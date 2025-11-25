/**
 * Stripe Configuration
 * Initializes Stripe client with secret key from environment variables
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Debug: Log environment variable loading
console.log('[Stripe Config] 🔍 Environment check:');
console.log(`[Stripe Config]   - STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? 'SET (' + process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...)' : 'NOT SET'}`);
console.log(`[Stripe Config]   - STRIPE_PUBLISHABLE_KEY: ${process.env.STRIPE_PUBLISHABLE_KEY ? 'SET (' + process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 10) + '...)' : 'NOT SET'}`);
console.log(`[Stripe Config]   - STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? 'SET (' + process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...)' : 'NOT SET'}`);

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

  // Debug: Log webhook secret status (first 10 chars only for security)
  _debug: {
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) : 'NOT SET',
  },

  // Payments enabled/disabled flag
  // Set to false to temporarily disable all Stripe payments
  paymentsEnabled: true, // ✅ Payments enabled

  // Fee surcharging configuration
  feeConfig: {
    // Set to true to enable dynamic card country detection
    // When true: Detects if card is domestic/international and adjusts fees accordingly
    // When false: Uses defaultCardType for all transactions (simpler, recommended)
    useDynamicDetection: false,

    // Default card type when useDynamicDetection is false
    // Options: 'domestic' (1.7%) or 'international' (3.5%)
    // Recommendation: 'domestic' since most AU customers use AU cards
    defaultCardType: 'domestic',
  },
};
