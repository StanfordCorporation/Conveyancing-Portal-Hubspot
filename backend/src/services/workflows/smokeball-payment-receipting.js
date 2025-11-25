/**
 * Smokeball Payment Receipting Workflow
 * 
 * @deprecated This file is legacy. The receiptStripePayment function has been removed
 * because it used the Smokeball API which does not support Trust account transactions.
 * 
 * Use Python Playwright automation instead via:
 * - backend/src/services/workflows/smokeball-receipt-automation.js
 * - triggerReceiptAutomationForDeal() function
 * 
 * Only verifyPaymentReceipted remains for verification purposes.
 */

import * as smokeballBankAccounts from '../../integrations/smokeball/bankAccounts.js';

/**
 * Verify payment was receipted
 *
 * @param {string} matterId - Matter/Lead UUID
 * @returns {Promise<Array>} Transactions for matter
 */
export async function verifyPaymentReceipted(matterId) {
  try {
    const transactions = await smokeballBankAccounts.getTransactionsForMatter(matterId);
    return transactions;
  } catch (error) {
    console.error('[Smokeball Payment Workflow] ❌ Error verifying payment:', error.message);
    throw error;
  }
}

export default {
  verifyPaymentReceipted,
};
