/**
 * Smokeball Bank Account Operations
 * Handle trust account transactions and receipting
 * 
 * NOTE: Trust account transaction creation via API is not supported by Smokeball.
 * The createTransaction, receiptPayment, and receiptStripePayment functions have been removed.
 * Use Python Playwright automation instead via smokeball-receipt-automation.js
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
  getTransactionsForMatter,
};
