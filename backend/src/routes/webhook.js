/**
 * Webhook Handlers
 * Handles webhooks from Stripe and Smokeball
 */

import express from 'express';
import stripe from '../config/stripe.js';
import { STRIPE_CONFIG } from '../config/stripe.js';
import * as dealsIntegration from '../integrations/hubspot/deals.js';
import { DEAL_STAGES } from '../config/dealStages.js';
import * as smokeballPaymentWorkflow from '../services/workflows/smokeball-payment-receipting.js';

const router = express.Router();

/**
 * POST /api/webhook/stripe
 * Handle Stripe webhook events
 * IMPORTANT: This route must use express.raw() middleware to verify signatures
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = STRIPE_CONFIG.webhookSecret;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log(`[Webhook] ✅ Verified webhook event: ${event.type}`);
  } catch (err) {
    console.error(`[Webhook] ❌ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;

      case 'charge.succeeded':
        console.log(`[Webhook] 💳 Charge succeeded: ${event.data.object.id}`);
        break;

      case 'charge.failed':
        console.log(`[Webhook] ❌ Charge failed: ${event.data.object.id}`);
        break;

      default:
        console.log(`[Webhook] ℹ️ Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] ❌ Error processing webhook:`, error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle successful payment
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentSuccess(paymentIntent) {
  console.log(`[Webhook] 🎉 Payment succeeded!`);
  console.log(`[Webhook] 💳 Payment Intent ID: ${paymentIntent.id}`);
  console.log(`[Webhook] 💰 Amount: $${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`);
  console.log(`[Webhook] 📧 Customer: ${paymentIntent.customer}`);

  const dealId = paymentIntent.metadata?.deal_id;

  if (dealId) {
    try {
      // Update deal: mark as paid, store payment details, and progress to FUNDS_PROVIDED stage
      await dealsIntegration.updateDeal(dealId, {
        payment_method: 'Stripe',
        payment_status: 'Paid',
        payment_amount: (paymentIntent.amount / 100).toString(),
        payment_date: new Date().toISOString().split('T')[0],
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer,
        dealstage: DEAL_STAGES.FUNDS_PROVIDED.id, // Progress to Step 6
      });

      console.log(`[Webhook] ✅ Deal ${dealId} updated - marked as paid`);
      console.log(`[Webhook] 🎯 Deal stage progressed to: ${DEAL_STAGES.FUNDS_PROVIDED.label}`);
      console.log(`[Webhook] 💰 Payment: $${(paymentIntent.amount / 100).toFixed(2)} AUD`);
      console.log(`[Webhook] 🔗 Stripe Payment Intent: ${paymentIntent.id}`);

      // Receipt payment to Smokeball trust account
      try {
        console.log(`[Webhook] 🏦 Receipting payment to Smokeball trust account...`);
        const receiptResult = await smokeballPaymentWorkflow.receiptStripePayment(paymentIntent);
        console.log(`[Webhook] ✅ Payment receipted to Smokeball - Transaction ID: ${receiptResult.transactionId}`);
      } catch (smokeballError) {
        console.error(`[Webhook] ⚠️ Error receipting payment to Smokeball:`, smokeballError.message);
        // Don't throw - payment succeeded even if Smokeball receipting failed
      }
    } catch (error) {
      console.error(`[Webhook] ⚠️ Error updating HubSpot deal:`, error.message);
      // Don't throw - we still want to acknowledge the webhook
    }
  }

  // TODO: Send confirmation email to customer
}

/**
 * Handle failed payment
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentFailed(paymentIntent) {
  console.log(`[Webhook] ❌ Payment failed!`);
  console.log(`[Webhook] 💳 Payment Intent ID: ${paymentIntent.id}`);
  console.log(`[Webhook] 📧 Customer: ${paymentIntent.customer}`);
  console.log(`[Webhook] 🚫 Failure reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`);

  const dealId = paymentIntent.metadata?.deal_id;

  if (dealId) {
    try {
      // Update deal in HubSpot to mark payment as failed
      await dealsIntegration.updateDeal(dealId, {
        payment_status: 'Failed',
        payment_failure_reason: paymentIntent.last_payment_error?.message || 'Payment declined',
      });

      console.log(`[Webhook] ✅ Updated deal ${dealId} - marked payment as failed`);
    } catch (error) {
      console.error(`[Webhook] ⚠️ Error updating HubSpot deal:`, error.message);
    }
  }

  // TODO: Send payment failure notification to customer
}

/**
 * Handle canceled payment
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentCanceled(paymentIntent) {
  console.log(`[Webhook] 🚫 Payment canceled`);
  console.log(`[Webhook] 💳 Payment Intent ID: ${paymentIntent.id}`);

  const dealId = paymentIntent.metadata?.deal_id;

  if (dealId) {
    try {
      await dealsIntegration.updateDeal(dealId, {
        payment_status: 'Canceled',
      });

      console.log(`[Webhook] ✅ Updated deal ${dealId} - marked payment as canceled`);
    } catch (error) {
      console.error(`[Webhook] ⚠️ Error updating HubSpot deal:`, error.message);
    }
  }
}

/**
 * POST /api/webhook/docusign
 * Handle DocuSign webhook events (envelope status updates)
 * Updates HubSpot deal with envelope status and recipient information
 */
router.post('/docusign', express.json(), async (req, res) => {
  try {
    const payload = req.body;
    console.log('[DocuSign Webhook] 📥 Received envelope status update');

    // Extract envelope status
    const envelope_status = payload.data?.envelopeSummary?.status;

    // Extract deal ID from custom fields
    const customFields = payload.data?.envelopeSummary?.customFields?.textCustomFields || [];
    const dealIdField = customFields.find((obj) => obj.name === 'hs_deal_id');
    const dealId = dealIdField?.value;

    // Extract recipient status
    const signers = payload.data?.envelopeSummary?.recipients?.signers || [];
    const recipient_status = signers.map(({ email, status }) => ({ email, status }));

    if (!dealId) {
      console.warn('[DocuSign Webhook] ⚠️ No hs_deal_id found in custom fields');
      return res.status(400).json({ error: 'Missing hs_deal_id in envelope custom fields' });
    }

    console.log(`[DocuSign Webhook] 📋 Deal ID: ${dealId}`);
    console.log(`[DocuSign Webhook] ✍️ Envelope Status: ${envelope_status}`);
    console.log(`[DocuSign Webhook] 👥 Recipients:`, recipient_status);

    // Update HubSpot deal with envelope status
    await dealsIntegration.updateDeal(dealId, {
      envelope_status,
      recipient_status: JSON.stringify(recipient_status),
    });

    console.log(`[DocuSign Webhook] ✅ Deal ${dealId} updated with envelope status`);

    // If all signers completed, progress to next stage
    const allCompleted = signers.every(signer => signer.status === 'completed');
    if (allCompleted && envelope_status === 'completed') {
      console.log(`[DocuSign Webhook] 🎉 All signatures completed - progressing deal to Funds Requested`);
      await dealsIntegration.updateDeal(dealId, {
        dealstage: DEAL_STAGES.FUNDS_REQUESTED.id, // Stage 5
      });
      console.log(`[DocuSign Webhook] 🎯 Deal stage progressed to: ${DEAL_STAGES.FUNDS_REQUESTED.label}`);
    }

    res.json({
      success: true,
      message: 'Envelope status updated successfully',
      dealId,
      envelope_status,
      recipient_status
    });

  } catch (error) {
    console.error('[DocuSign Webhook] ❌ Error processing webhook:', error.message);
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

/**
 * POST /api/webhook/smokeball
 * Handle Smokeball webhook events (matter.converted, etc.)
 * Note: Smokeball webhook signature verification may vary - check Smokeball docs
 */
router.post('/smokeball', express.json(), async (req, res) => {
  try {
    const event = req.body;

    console.log(`[Smokeball Webhook] 📥 Received event: ${event.eventType}`);

    // Handle different event types
    switch (event.eventType) {
      case 'matter.converted':
        await handleMatterConverted(event.data);
        break;

      case 'matter.created':
        await handleMatterCreated(event.data);
        break;

      case 'matter.updated':
        console.log(`[Smokeball Webhook] ℹ️ Matter updated: ${event.data.id}`);
        // Optional: Sync matter changes
        break;

      default:
        console.log(`[Smokeball Webhook] ℹ️ Unhandled event type: ${event.eventType}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error(`[Smokeball Webhook] ❌ Error processing webhook:`, error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle matter.created event
 * Syncs lead creation from Smokeball to HubSpot
 * Note: Welcome tasks are NOT created here - they are created at Stage 3 (Quote Accepted)
 *
 * @param {Object} matterData - Matter data from Smokeball webhook
 * @param {string} matterData.id - Matter/Lead UUID
 */
async function handleMatterCreated(matterData) {
  try {
    console.log(`[Smokeball Webhook] 📝 Matter/Lead created!`);
    console.log(`[Smokeball Webhook] 🆔 ID: ${matterData.id}`);

    // Find HubSpot deal by smokeball_lead_uid using direct lookup
    let deal;
    try {
      deal = await dealsIntegration.getDealByCustomId(
        matterData.id,
        'smokeball_lead_uid',
        ['dealname', 'smokeball_lead_uid']
      );
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`[Smokeball Webhook] ⚠️ No deal found with smokeball_lead_uid: ${matterData.id}`);
      return;
      }
      throw error;
    }

    const dealId = deal.id;

    console.log(`[Smokeball Webhook] 📋 Found deal: ${deal.properties.dealname} (${dealId})`);

    // Update sync status only
    // Welcome tasks are created at Stage 3 (Quote Accepted), not here
    await dealsIntegration.updateDeal(dealId, {
      smokeball_last_sync: new Date().toISOString(),
    });

    console.log('[Smokeball Webhook] ✅ Matter created webhook processed');

  } catch (error) {
    console.error(`[Smokeball Webhook] ❌ Error handling matter.created:`, error.message);
    throw error;
  }
}

/**
 * Handle matter.converted event
 * Updates HubSpot deal with matter number when lead is converted
 *
 * @param {Object} matterData - Matter data from Smokeball webhook
 * @param {string} matterData.id - Matter UUID (same as smokeball_lead_uid)
 * @param {string} matterData.number - Newly assigned matter number
 */
async function handleMatterConverted(matterData) {
  try {
    console.log(`[Smokeball Webhook] 🔄 Matter converted!`);
    console.log(`[Smokeball Webhook] 🆔 Matter ID: ${matterData.id}`);
    console.log(`[Smokeball Webhook] 📋 Matter Number: ${matterData.number}`);

    // Find HubSpot deal by smokeball_lead_uid using direct lookup
    let deal;
    try {
      deal = await dealsIntegration.getDealByCustomId(
        matterData.id,
        'smokeball_lead_uid',
        ['dealname', 'smokeball_lead_uid', 'matter_uid']
      );
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`[Smokeball Webhook] ⚠️ No deal found with smokeball_lead_uid: ${matterData.id}`);
      return;
      }
      throw error;
    }

    const dealId = deal.id;

    console.log(`[Smokeball Webhook] 📋 Found deal: ${deal.properties.dealname} (${dealId})`);

    // Update deal with matter number (smokeball_lead_uid already exists, just update matter_uid)
    await dealsIntegration.updateDeal(dealId, {
      matter_uid: matterData.number,     // Matter number (after conversion)
      smokeball_sync_status: 'synced',
      smokeball_last_sync: new Date().toISOString(),
    });

    console.log(`[Smokeball Webhook] ✅ Deal updated with lead UUID: ${matterData.id}`);
    console.log(`[Smokeball Webhook] ✅ Deal updated with matter number: ${matterData.number}`);

  } catch (error) {
    console.error(`[Smokeball Webhook] ❌ Error handling matter.converted:`, error.message);
    throw error;
  }
}

/**
 * POST /api/webhook/hubspot
 * Handle HubSpot property change webhooks
 * Triggers when payment_status field changes to "Paid"
 */
router.post('/hubspot', express.json(), async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    console.log(`[HubSpot Webhook] 📥 Received ${events.length} webhook event(s)`);
    
    // Process each event
    for (const event of events) {
      // Check if this is a payment_status change to "Paid"
      if (event.propertyName === 'payment_status' && 
          event.propertyValue === 'Paid') {
        
        const dealId = event.objectId;
        console.log(`[HubSpot Webhook] 💰 Payment confirmed for deal: ${dealId}`);
        
        // Get deal to check payment method
        const deal = await dealsIntegration.getDeal(dealId, [
          'payment_method',
          'payment_amount',
          'smokeball_lead_uid',
          'matter_uid'
        ]);
        
        // Only process bank transfers (Stripe payments are handled by Stripe webhook)
        if (deal.properties.payment_method === 'Bank Transfer') {
          console.log('[HubSpot Webhook] 🏦 Processing bank transfer confirmation...');
          
          try {
            // Receipt to Smokeball with Bank Transfer type
            await handleBankTransferConfirmation(deal);
            
            // Update deal stage to FUNDS_PROVIDED
            await dealsIntegration.updateDeal(dealId, {
              dealstage: DEAL_STAGES.FUNDS_PROVIDED.id
            });
            
            console.log(`[HubSpot Webhook] ✅ Bank transfer processed successfully for deal ${dealId}`);
          } catch (error) {
            console.error(`[HubSpot Webhook] ❌ Error processing bank transfer:`, error.message);
            // Don't throw - still acknowledge webhook
          }
        } else {
          console.log(`[HubSpot Webhook] ℹ️ Payment method is ${deal.properties.payment_method}, not Bank Transfer - skipping`);
        }
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('[HubSpot Webhook] ❌ Error processing webhook:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle bank transfer confirmation
 * Creates Smokeball receipt with Bank Transfer type
 * @param {Object} deal - HubSpot deal object
 */
async function handleBankTransferConfirmation(deal) {
  const matterId = deal.properties.matter_uid || deal.properties.smokeball_lead_uid;
  const amount = parseFloat(deal.properties.payment_amount);
  
  if (!matterId) {
    throw new Error('No matter_uid or smokeball_lead_uid found in deal');
  }
  
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid payment amount: ${deal.properties.payment_amount}`);
  }
  
  console.log(`[HubSpot Webhook] 💰 Receipting bank transfer to Smokeball`);
  console.log(`[HubSpot Webhook]    Matter ID: ${matterId}`);
  console.log(`[HubSpot Webhook]    Amount: $${amount.toFixed(2)}`);
  
  // Create payment intent-like object for workflow
  const paymentData = {
    id: `bank_transfer_${deal.id}`,
    amount: Math.round(amount * 100), // Convert to cents
    metadata: {
      deal_id: deal.id
    }
  };
  
  // Receipt to Smokeball with Bank Transfer type
  await smokeballPaymentWorkflow.receiptStripePayment(paymentData, matterId, null, 'Bank Transfer');
  
  console.log(`[HubSpot Webhook] ✅ Bank transfer receipted to Smokeball`);
}

export default router;
