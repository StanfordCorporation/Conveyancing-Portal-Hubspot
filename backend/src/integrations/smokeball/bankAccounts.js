/**
 * Smokeball Bank Account Operations
 * Handle trust account transactions and receipting
 */

import * as client from './client.js';
import { SMOKEBALL_CONFIG, SMOKEBALL_API, TRANSACTION_TYPES } from '../../config/smokeball.js';

/**
 * Cached trust account ID
 * Set via environment variable or fetched on first use
 */
let trustAccountId = SMOKEBALL_CONFIG.trustAccountId;

/**
 * Get all bank accounts
 *
 * @returns {Promise<Array>} Bank accounts
 */
export async function getAllBankAccounts() {
  try {
    console.log('[Smokeball Bank] 🏦 Fetching bank accounts');

    const response = await client.get(SMOKEBALL_API.endpoints.bankAccounts);

    const results = Array.isArray(response) ? response : response.items || [];

    console.log(`[Smokeball Bank] ✅ Retrieved ${results.length} bank accounts`);

    return results;

  } catch (error) {
    console.error('[Smokeball Bank] ❌ Error fetching bank accounts:', error.message);
    throw error;
  }
}

/**
 * Get trust account ID
 * Finds the trust account from all bank accounts
 *
 * @param {boolean} forceRefresh - Force refetch even if cached
 * @returns {Promise<string>} Trust account UUID
 */
export async function getTrustAccountId(forceRefresh = false) {
  // Return cached value if available
  if (trustAccountId && !forceRefresh) {
    console.log('[Smokeball Bank] ♻️ Using cached trust account ID');
    return trustAccountId;
  }

  try {
    console.log('[Smokeball Bank] 🔍 Looking for trust account...');

    const accounts = await getAllBankAccounts();

    // Find trust account (typically named "Trust Account" or similar)
    // Adjust filter logic based on your Smokeball account structure
    const trustAccount = accounts.find(account =>
      account.name?.toLowerCase().includes('trust') ||
      account.type?.toLowerCase() === 'trust' ||
      account.isTrustAccount === true
    );

    if (!trustAccount) {
      throw new Error('Trust account not found. Please set SMOKEBALL_TRUST_ACCOUNT_ID in .env');
    }

    trustAccountId = trustAccount.id;

    console.log(`[Smokeball Bank] ✅ Trust account found: ${trustAccount.name} (${trustAccountId})`);

    return trustAccountId;

  } catch (error) {
    console.error('[Smokeball Bank] ❌ Error getting trust account ID:', error.message);
    throw error;
  }
}

/**
 * Create a transaction in a bank account
 *
 * @param {string} bankAccountId - Bank account UUID
 * @param {Object} transactionData - Transaction details
 * @param {string} transactionData.matterId - Matter UUID
 * @param {string} transactionData.type - Transaction type (Deposit, Withdrawal, Transfer)
 * @param {number} transactionData.amount - Amount in dollars (e.g., 102.65)
 * @param {string} transactionData.reference - Reference/description
 * @param {string} transactionData.payorId - Contact UUID of payor (optional)
 * @param {string} transactionData.date - Transaction date ISO string (optional, defaults to now)
 * @returns {Promise<Object>} Created transaction with { id: UUID, ... }
 */
export async function createTransaction(bankAccountId, transactionData) {
  try {
    console.log('[Smokeball Bank] 💰 Creating transaction:');
    console.log(`  Type: ${transactionData.type}`);
    console.log(`  Amount: $${transactionData.amount.toFixed(2)}`);
    console.log(`  Matter: ${transactionData.matterId}`);

    const payload = {
      matterId: transactionData.matterId,
      type: transactionData.type,
      amount: transactionData.amount,
      reference: transactionData.reference || 'Payment',
      payorId: transactionData.payorId || null,
      date: transactionData.date || new Date().toISOString(),
    };

    // Remove null values
    Object.keys(payload).forEach(key => {
      if (payload[key] === null) delete payload[key];
    });

    const response = await client.post(
      SMOKEBALL_API.endpoints.transactions(bankAccountId),
      payload
    );

    console.log('[Smokeball Bank] ✅ Transaction created successfully');
    console.log(`[Smokeball Bank] 🆔 Transaction ID: ${response.id}`);

    return response;

  } catch (error) {
    console.error('[Smokeball Bank] ❌ Error creating transaction:', error.message);
    throw error;
  }
}

/**
 * Receipt payment to trust account
 * Creates a Deposit transaction for a matter
 *
 * @param {string} matterId - Matter UUID (can be lead_uid - Smokeball handles both)
 * @param {number} amount - Amount in dollars
 * @param {string} reference - Payment reference/description
 * @param {string} payorId - Contact UUID of person paying (optional)
 * @returns {Promise<Object>} Transaction details with ID
 */
export async function receiptPayment(matterId, amount, reference = 'Search Fees', payorId = null) {
  try {
    console.log('[Smokeball Bank] 💳 Receipting payment to trust account');

    // Get trust account ID
    const accountId = await getTrustAccountId();

    // Create deposit transaction
    const transaction = await createTransaction(accountId, {
      matterId,
      type: TRANSACTION_TYPES.DEPOSIT,
      amount,
      reference,
      payorId,
    });

    console.log('[Smokeball Bank] ✅ Payment receipted successfully');

    return transaction;

  } catch (error) {
    console.error('[Smokeball Bank] ❌ Error receipting payment:', error.message);
    throw error;
  }
}

/**
 * Receipt Stripe payment to trust account
 * Convenience wrapper for Stripe webhook integration
 *
 * @param {Object} stripePaymentIntent - Stripe payment intent object
 * @param {string} matterId - Matter UUID (from metadata)
 * @param {string} payorContactId - Contact UUID of payor (optional)
 * @returns {Promise<Object>} Transaction details
 */
export async function receiptStripePayment(stripePaymentIntent, matterId, payorContactId = null) {
  const amountInDollars = stripePaymentIntent.amount / 100; // Convert cents to dollars

  const reference = `Stripe Payment - ${stripePaymentIntent.id}`;

  return await receiptPayment(matterId, amountInDollars, reference, payorContactId);
}

/**
 * Get transactions for a matter
 *
 * @param {string} matterId - Matter UUID
 * @returns {Promise<Array>} Transactions for the matter
 */
export async function getTransactionsForMatter(matterId) {
  try {
    const accountId = await getTrustAccountId();

    const response = await client.get(
      SMOKEBALL_API.endpoints.transactions(accountId),
      { matterId }
    );

    const results = Array.isArray(response) ? response : response.items || [];

    console.log(`[Smokeball Bank] ✅ Found ${results.length} transactions for matter`);

    return results;

  } catch (error) {
    console.error('[Smokeball Bank] ❌ Error fetching transactions:', error.message);
    throw error;
  }
}

export default {
  getAllBankAccounts,
  getTrustAccountId,
  createTransaction,
  receiptPayment,
  receiptStripePayment,
  getTransactionsForMatter,
};
