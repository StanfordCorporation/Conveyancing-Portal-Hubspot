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
 * @deprecated Use getBankAccountForMatter() instead to avoid 403 errors
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
 * Get bank account for a specific matter/lead
 * Uses matter-specific endpoint to avoid 403 permission issues
 * 
 * @param {string} matterId - Matter or Lead UUID
 * @returns {Promise<string>} Bank account UUID for this matter
 */
export async function getBankAccountForMatter(matterId) {
  try {
    console.log(`[Smokeball Bank] 🏦 Fetching bank account for matter: ${matterId}`);

    const response = await client.get(SMOKEBALL_API.endpoints.bankAccountForMatter(matterId));

    if (!response || !response.id) {
      throw new Error('Bank account response missing ID field');
    }

    console.log(`[Smokeball Bank] ✅ Bank account found: ${response.accountName || 'Unknown'} (${response.id})`);
    console.log(`[Smokeball Bank]    Account Type: ${response.accountType}`);
    console.log(`[Smokeball Bank]    Bank: ${response.bankName || 'Unknown'}`);

    return response.id;

  } catch (error) {
    console.error(`[Smokeball Bank] ❌ Error fetching bank account for matter ${matterId}:`, error.message);
    throw error;
  }
}

/**
 * Create a transaction in a bank account
 *
 * @param {string} bankAccountId - Bank account UUID
 * @param {Object} transactionData - Transaction details
 * @param {string} transactionData.matterId - Matter UUID
 * @param {string} transactionData.type - Transaction type (Bank Transfer, Deposit, Withdrawal, Transfer)
 * @param {number} transactionData.amount - Amount in dollars (e.g., 102.65)
 * @param {string} transactionData.reference - Reference/description (optional)
 * @param {string} transactionData.reason - Reason for transaction (optional)
 * @param {string} transactionData.description - Additional description (optional)
 * @param {string} transactionData.note - Transaction notes (optional)
 * @param {string} transactionData.payorId - Contact UUID of payor (optional)
 * @param {string} transactionData.effectiveDate - Transaction effective date ISO string (optional, defaults to now)
 * @returns {Promise<Object>} Created transaction with { id: UUID, ... }
 */
export async function createTransaction(bankAccountId, transactionData) {
  try {
    console.log('[Smokeball Bank] 💰 Creating transaction:');
    console.log(`  Type: ${transactionData.type}`);
    console.log(`  Amount: $${transactionData.amount.toFixed(2)}`);
    console.log(`  Matter: ${transactionData.matterId}`);

    // Build payload with all required and optional fields per Smokeball API documentation
    const payload = {
      matterId: transactionData.matterId,
      type: transactionData.type || 'Bank Transfer',
      amount: transactionData.amount,
      effectiveDate: transactionData.effectiveDate || new Date().toISOString(),
    };

    // Add optional fields if provided
    if (transactionData.payorId) {
      payload.payorId = transactionData.payorId;
    }

    if (transactionData.reference) {
      payload.reference = transactionData.reference;
    }

    if (transactionData.reason) {
      payload.reason = transactionData.reason;
    }

    if (transactionData.description) {
      payload.description = transactionData.description;
    }

    if (transactionData.note) {
      payload.note = transactionData.note;
    }

    console.log('[Smokeball Bank] 📝 Transaction payload:', JSON.stringify(payload, null, 2));

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
 * @param {string} matterId - Matter UUID (can be smokeball_lead_uid - Smokeball handles both)
 * @param {number} amount - Amount in dollars
 * @param {string} reference - Payment reference/description
 * @param {string} payorId - Contact UUID of person paying (optional)
 * @param {string} transactionType - Transaction type ('Credit Card' or 'Bank Transfer')
 * @returns {Promise<Object>} Transaction details with ID
 */
export async function receiptPayment(matterId, amount, reference = 'Search Fees', payorId = null, transactionType = 'Bank Transfer') {
  try {
    console.log('[Smokeball Bank] 💳 Receipting payment to trust account');
    console.log(`[Smokeball Bank]    Matter ID: ${matterId}`);
    console.log(`[Smokeball Bank]    Amount: $${amount.toFixed(2)}`);
    console.log(`[Smokeball Bank]    Payor ID: ${payorId || 'Not provided'}`);

    // Get bank account for this specific matter (avoids 403 errors)
    const accountId = await getBankAccountForMatter(matterId);

    // Create deposit transaction with all required fields per Smokeball API documentation
    const transaction = await createTransaction(accountId, {
      matterId,
      type: transactionType, // Use transaction type parameter
      amount,
      reference: '',
      reason: 'Client contribution towards payment for searches',
      description: '',
      note: 'Payment for searches',
      effectiveDate: new Date().toISOString(),
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
 * @param {string} transactionType - Transaction type ('Credit Card' or 'Bank Transfer')
 * @returns {Promise<Object>} Transaction details
 */
export async function receiptStripePayment(stripePaymentIntent, matterId, payorContactId = null, transactionType = 'Credit Card') {
  const amountInDollars = stripePaymentIntent.amount / 100; // Convert cents to dollars

  const reference = `Stripe Payment - ${stripePaymentIntent.id}`;

  return await receiptPayment(matterId, amountInDollars, reference, payorContactId, transactionType);
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
  getBankAccountForMatter,
  createTransaction,
  receiptPayment,
  receiptStripePayment,
  getTransactionsForMatter,
};
