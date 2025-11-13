/**
 * Smokeball Payment Receipting Workflow
 * Receipt Stripe payments to Smokeball trust account
 *
 * Trigger: Stripe payment.succeeded webhook
 * Actions:
 * 1. Verify payment and extract deal/matter info
 * 2. Receipt payment to Smokeball trust account
 * 3. Update HubSpot deal with transaction ID
 */

import * as dealsIntegration from '../../integrations/hubspot/deals.js';
import * as contactsIntegration from '../../integrations/hubspot/contacts.js';
import * as smokeballBankAccounts from '../../integrations/smokeball/bankAccounts.js';

/**
 * Receipt Stripe payment to Smokeball trust account
 *
 * @param {Object} paymentIntent - Stripe payment intent object
 * @returns {Promise<Object>} Result with transaction details
 */
export async function receiptStripePayment(paymentIntent) {
  try {
    console.log('[Smokeball Payment Workflow] 💳 Processing payment receipt');
    console.log(`[Smokeball Payment Workflow] Payment ID: ${paymentIntent.id}`);
    console.log(`[Smokeball Payment Workflow] Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);

    // ========================================
    // STEP 1: Extract deal and matter info
    // ========================================
    const dealId = paymentIntent.metadata?.deal_id;
    const contactId = paymentIntent.metadata?.contact_id;

    if (!dealId) {
      throw new Error('Payment metadata missing deal_id');
    }

    console.log(`[Smokeball Payment Workflow] 📋 Deal ID: ${dealId}`);

    // ========================================
    // STEP 2: Fetch deal to get smokeball_lead_uid/matter_uid
    // ========================================
    const deal = await dealsIntegration.getDeal(dealId, [
      'dealname',
      'smokeball_lead_uid',
      'matter_uid',
      'smokeball_sync_status',
    ]);

    const matterId = deal.properties.matter_uid || deal.properties.smokeball_lead_uid;

    if (!matterId) {
      throw new Error('No smokeball_lead_uid or matter_uid found in deal. Create lead first.');
    }

    console.log(`[Smokeball Payment Workflow] 🆔 Matter/Lead ID: ${matterId}`);

    // ========================================
    // STEP 3: Get payor contact ID from HubSpot
    // ========================================
    let smokeballPayorId = null;

    if (contactId) {
      try {
        console.log(`[Smokeball Payment Workflow] 👤 Fetching contact: ${contactId}`);
        const hubspotContact = await contactsIntegration.getContact(contactId, ['smokeball_contact_id']);
        smokeballPayorId = hubspotContact.properties?.smokeball_contact_id || null;
        
        if (smokeballPayorId) {
          console.log(`[Smokeball Payment Workflow] ✅ Found Smokeball payor ID: ${smokeballPayorId}`);
        } else {
          console.warn('[Smokeball Payment Workflow] ⚠️ Contact exists but no Smokeball ID stored');
        }
      } catch (error) {
        console.warn('[Smokeball Payment Workflow] ⚠️ Could not fetch payor contact:', error.message);
      }
    } else {
      console.log('[Smokeball Payment Workflow] ℹ️ No contact_id in payment metadata');
    }

    // ========================================
    // STEP 4: Receipt payment to trust account
    // ========================================
    console.log('[Smokeball Payment Workflow] 💰 Receipting payment to trust account...');

    const transaction = await smokeballBankAccounts.receiptStripePayment(
      paymentIntent,
      matterId,
      smokeballPayorId
    );

    console.log(`[Smokeball Payment Workflow] ✅ Payment receipted successfully`);
    console.log(`[Smokeball Payment Workflow] 🆔 Transaction ID: ${transaction.id}`);

    // ========================================
    // STEP 5: Update HubSpot deal
    // ========================================
    console.log('[Smokeball Payment Workflow] 🔄 Updating HubSpot deal...');

    await dealsIntegration.updateDeal(dealId, {
      smokeball_transaction_id: transaction.id,
      smokeball_last_sync: new Date().toISOString(),
    });

    console.log('[Smokeball Payment Workflow] ✅ Workflow completed successfully!');

    return {
      success: true,
      transactionId: transaction.id,
      matterId,
      dealId,
      amount: paymentIntent.amount / 100,
      paymentIntentId: paymentIntent.id,
    };

  } catch (error) {
    console.error('[Smokeball Payment Workflow] ❌ Workflow failed:', error.message);

    // Update HubSpot with error (if we have dealId)
    const dealId = paymentIntent.metadata?.deal_id;
    if (dealId) {
      try {
        await dealsIntegration.updateDeal(dealId, {
          smokeball_sync_status: 'Failed',
          smokeball_sync_error: `Payment receipt failed: ${error.message}`,
        });
      } catch (updateError) {
        console.error('[Smokeball Payment Workflow] ❌ Failed to update error status:', updateError.message);
      }
    }

    throw error;
  }
}

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
  receiptStripePayment,
  verifyPaymentReceipted,
};
