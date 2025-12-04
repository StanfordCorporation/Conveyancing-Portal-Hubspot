/**
 * Webhook Handlers
 * Handles webhooks from Stripe and Smokeball
 */

import express from 'express';
import stripe from '../config/stripe.js';
import { STRIPE_CONFIG } from '../config/stripe.js';
import * as dealsIntegration from '../integrations/hubspot/deals.js';
import { DEAL_STAGES } from '../config/dealStages.js';
import * as receiptAutomation from '../services/workflows/smokeball-receipt-automation.js';
import * as githubActions from '../services/github-actions-trigger.js';

const router = express.Router();

/**
 * POST /api/webhook/stripe
 * Handle Stripe webhook events
 * IMPORTANT: This route must use express.raw() middleware to verify signatures
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = STRIPE_CONFIG.webhookSecret;

  // Debug logging
  console.log(`[Webhook] 🔍 Debug info:`);
  console.log(`[Webhook]   - Has signature header: ${!!sig}`);
  console.log(`[Webhook]   - Has webhook secret: ${!!endpointSecret}`);
  console.log(`[Webhook]   - Webhook secret starts with: ${endpointSecret ? endpointSecret.substring(0, 10) : 'N/A'}`);
  console.log(`[Webhook]   - Webhook secret length: ${endpointSecret ? endpointSecret.length : 0}`);
  console.log(`[Webhook]   - Request body type: ${typeof req.body}`);
  console.log(`[Webhook]   - Request body is Buffer: ${Buffer.isBuffer(req.body)}`);
  console.log(`[Webhook]   - Request body length: ${req.body ? req.body.length : 0}`);
  console.log(`[Webhook]   - Content-Type header: ${req.headers['content-type']}`);
  console.log(`[Webhook]   - Config debug - Secret set: ${STRIPE_CONFIG._debug?.webhookSecretSet}`);
  console.log(`[Webhook]   - Config debug - Secret prefix: ${STRIPE_CONFIG._debug?.webhookSecretPrefix}`);

  if (!endpointSecret) {
    console.error(`[Webhook] ❌ STRIPE_WEBHOOK_SECRET is not set in environment variables`);
    return res.status(500).send(`Webhook Error: Webhook secret not configured`);
  }

  if (!sig) {
    console.error(`[Webhook] ❌ No stripe-signature header found`);
    return res.status(400).send(`Webhook Error: No signature header`);
  }

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

      case 'payout.paid':
        await handlePayoutPaid(event.data.object);
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
export async function handlePaymentSuccess(paymentIntent) {
  console.log(`[Webhook] 🎉 Payment succeeded!`);
  console.log(`[Webhook] 💳 Payment Intent ID: ${paymentIntent.id}`);
  console.log(`[Webhook] 📧 Customer: ${paymentIntent.customer}`);

  const dealId = paymentIntent.metadata?.deal_id;

  if (dealId) {
    try {
      // Extract payment breakdown from metadata
      const searchesAmount = parseFloat(paymentIntent.metadata?.searches_amount || '0');
      const conveyancingDeposit = parseFloat(paymentIntent.metadata?.conveyancing_deposit || '0');
      const totalBaseAmount = parseFloat(paymentIntent.metadata?.total_base_amount || '0');

      // Calculate amounts: gross (what customer paid) vs net (what business receives)
      const grossAmount = paymentIntent.amount / 100; // Total charged to customer (includes fees)
      const netAmount = totalBaseAmount; // What business receives (after Stripe fees)
      const stripeFee = grossAmount - netAmount; // Stripe processing fee

      console.log(`[Webhook] 💰 Payment breakdown:`);
      console.log(`[Webhook]   - Gross Amount (charged to customer): $${grossAmount.toFixed(2)} ${paymentIntent.currency.toUpperCase()}`);
      console.log(`[Webhook]   - Stripe Fee: $${stripeFee.toFixed(2)}`);
      console.log(`[Webhook]   - Net Amount (business receives): $${netAmount.toFixed(2)}`);
      console.log(`[Webhook]   - Breakdown: Searches $${searchesAmount} + Deposit $${conveyancingDeposit}`);

      // Update deal: mark as pending with NET amount (will be marked as paid when payout completes)
      await dealsIntegration.updateDeal(dealId, {
        payment_method: 'Stripe',
        payment_status: 'Pending',
        payment_amount: netAmount.toFixed(2), // ✅ NET amount (what you actually receive)
        // Note: payment_amount_gross and stripe_fee properties don't exist in HubSpot
        // Gross amount and fee are logged above for reference
        payment_date: new Date().toISOString().split('T')[0],
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer,
        dealstage: DEAL_STAGES.FUNDS_PROVIDED.id, // Progress to Step 6
        // Save payment breakdown
        searches_quote_amount: searchesAmount.toString(),
        quote_amount: totalBaseAmount.toString(),
      });

      console.log(`[Webhook] ✅ Deal ${dealId} updated - marked as pending`);
      console.log(`[Webhook] 🎯 Deal stage progressed to: ${DEAL_STAGES.FUNDS_PROVIDED.label}`);
      console.log(`[Webhook] 💾 Stored net amount: $${netAmount.toFixed(2)} (after $${stripeFee.toFixed(2)} fee)`);
      console.log(`[Webhook] 💾 Breakdown saved to HubSpot`);
      console.log(`[Webhook] 🔗 Stripe Payment Intent: ${paymentIntent.id}`);

      // Note: Receipt automation will be triggered when payout.paid webhook sets payment_status to "Paid"
    } catch (error) {
      console.error(`[Webhook] ⚠️ Error updating HubSpot deal:`, error.message);
      // Don't throw - we still want to acknowledge the webhook
    }
  }

  // TODO: Send confirmation email to customer
}

/**
 * Handle payout.paid event
 * Updates HubSpot deals when a payout is completed.
 * Extracts deal_id from charge metadata and updates payment_status to 'Paid'.
 * 
 * @param {Object} payout - Stripe payout object
 */
async function handlePayoutPaid(payout) {
  console.log(`[Webhook] 💸 Payout paid!`);
  console.log(`[Webhook] 🆔 Payout ID: ${payout.id}`);
  console.log(`[Webhook] 💰 Amount: $${(payout.amount / 100).toFixed(2)} ${payout.currency.toUpperCase()}`);
  console.log(`[Webhook] 📅 Arrival date: ${payout.arrival_date}`);

  try {
    // List all balance transactions associated with this payout
    // Using expand[]=data.source to get charge objects directly
    const balanceTransactions = await stripe.balanceTransactions.list({
      payout: payout.id,
      expand: ['data.source'],
      limit: 100, // Adjust if you expect more transactions per payout
    });

    console.log(`[Webhook] 📊 Found ${balanceTransactions.data.length} balance transaction(s) in payout`);

    const dealsToUpdate = [];
    
    // Process each transaction to find charges and extract deal_id from metadata
    for (const transaction of balanceTransactions.data) {
      // Only process charge transactions (skip payout transactions)
      if (transaction.type === 'charge' && transaction.source && transaction.source.object === 'charge') {
        const charge = transaction.source;
        const dealId = charge.metadata?.deal_id;

        if (dealId) {
          dealsToUpdate.push({
            dealId,
            chargeId: charge.id,
            paymentIntentId: charge.payment_intent,
            amount: charge.amount,
          });
          console.log(`[Webhook] 💳 Found deal ${dealId} in charge ${charge.id} (Payment Intent: ${charge.payment_intent})`);
        } else {
          console.warn(`[Webhook] ⚠️ Charge ${charge.id} has no deal_id in metadata`);
        }
      }
    }

    if (dealsToUpdate.length === 0) {
      console.log(`[Webhook] ⚠️ No deals found in payout ${payout.id}`);
      return;
    }

    console.log(`[Webhook] 🔍 Updating ${dealsToUpdate.length} deal(s)...`);

    // Update deals
    let updatedCount = 0;
    for (const { dealId, chargeId, paymentIntentId } of dealsToUpdate) {
      try {
        // Update deal to mark payment as paid
        await dealsIntegration.updateDeal(dealId, {
          payment_status: 'Paid',
        });

        console.log(`[Webhook] ✅ Deal ${dealId} updated - payment_status set to 'Paid'`);
        
        // Trigger receipt automation via GitHub Actions
        try {
          console.log(`[Webhook] 🤖 Triggering receipt automation for deal ${dealId}...`);
          
          // Fetch deal details needed for GitHub Actions
          const deal = await dealsIntegration.getDeal(dealId, [
            'smokeball_lead_uid',
            'stripe_payment_intent_id'
          ]);
          
          // Get Lead UID - MUST use smokeball_lead_uid from HubSpot
          const leadUid = deal.properties.smokeball_lead_uid;
          if (!leadUid || leadUid.trim() === '') {
            throw new Error('smokeball_lead_uid is required but not found in deal. Create lead first.');
          }
          
          console.log(`[Webhook] 🔍 Using Lead UID from HubSpot: ${leadUid}`);
          
          // Get payment intent to extract net amount (base_amount after fees)
          // Use paymentIntentId from the loop if available, otherwise fetch from deal
          const intentId = paymentIntentId || deal.properties.stripe_payment_intent_id;
          if (!intentId) {
            throw new Error('Stripe payment intent ID not found');
          }
          
          const stripePayments = await import('../integrations/stripe/payments.js');
          const paymentIntent = await stripePayments.getPaymentIntent(intentId);
          
          const baseAmountCents = parseInt(paymentIntent.metadata?.base_amount);
          if (!baseAmountCents || isNaN(baseAmountCents)) {
            throw new Error('Could not extract base_amount from payment intent metadata');
          }
          
          const amount = baseAmountCents / 100; // Convert cents to dollars
          console.log(`[Webhook] 💳 Stripe payment - Net amount after fees: $${amount.toFixed(2)}`);
          
          // Get contact info from associations (Primary Seller)
          const associationsIntegration = await import('../integrations/hubspot/associations.js');
          const dealContacts = await associationsIntegration.getDealContacts(dealId);
          
          // Find primary seller
          let primarySeller = null;
          for (const contact of dealContacts) {
            const associationTypes = contact.associationTypes || [];
            const isPrimary = associationTypes.some(t => t.typeId === 1 || t.typeId === '1');
            if (isPrimary && contact.properties.firstname && contact.properties.lastname) {
              primarySeller = contact.properties;
              break;
            }
          }
          
          if (!primarySeller) {
            throw new Error('No primary seller found for deal');
          }
          
          // Format date
          const now = new Date();
          const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
          
          // Trigger GitHub Action
          const result = await githubActions.triggerReceiptAutomation({
            deal_id: dealId,
            matter_id: leadUid, // Using Lead_UID (smokeball_lead_uid) instead of matter_uid
            amount: amount,
            lastname: primarySeller.lastname || 'Unknown',
            firstname: primarySeller.firstname || 'Unknown',
            date: date,
            test_mode: process.env.RECEIPT_AUTOMATION_TEST_MODE !== 'false' // Default to TRUE (test mode) unless explicitly set to 'false'
          });
          
          if (result.success) {
            console.log(`[Webhook] ✅ GitHub Action triggered successfully`);
            console.log(`[Webhook] 📊 Check status: ${result.actions_url}`);
          }
        } catch (automationError) {
          console.error(`[Webhook] ⚠️ Receipt automation failed for deal ${dealId}:`, automationError.message);
          // Don't throw - continue processing other deals even if automation fails
        }
        
        updatedCount++;
      } catch (error) {
        console.error(`[Webhook] ⚠️ Error updating deal ${dealId} (charge ${chargeId}):`, error.message);
        // Continue with other deals
      }
    }

    console.log(`[Webhook] ✅ Payout ${payout.id} processed: ${updatedCount} of ${dealsToUpdate.length} deal(s) updated`);

  } catch (error) {
    console.error(`[Webhook] ❌ Error processing payout.paid:`, error.message);
    throw error;
  }
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
 * Supports multiple form types: Form 2 CSA and Complete Form 2
 */
router.post('/docusign', express.json(), async (req, res) => {
  try {
    const payload = req.body;
    const envelopeId = payload.data?.envelopeSummary?.envelopeId || 'unknown';

    console.log('[DocuSign Webhook] 📥 Received envelope status update');
    console.log(`[DocuSign Webhook] 📨 Envelope ID: ${envelopeId}`);

    // Log full payload for debugging
    console.log('[DocuSign Webhook] 🔍 Full payload structure:', JSON.stringify(payload, null, 2));

    // Extract envelope status
    const envelope_status = payload.data?.envelopeSummary?.status;

    // Extract deal ID and Form Type from custom fields
    const textCustomFields = payload.data?.envelopeSummary?.customFields?.textCustomFields || [];
    const listCustomFields = payload.data?.envelopeSummary?.customFields?.listCustomFields || [];
    
    // Find deal ID from textCustomFields (it's a text field)
    const dealIdField = textCustomFields.find((obj) => obj.name === 'hs_deal_id');
    const dealId = dealIdField?.value;
    
    // Find Form Type from listCustomFields (it's a list field, not text field)
    const formTypeField = listCustomFields.find((obj) => obj.name === 'Form Type');
    const formTypeValue = formTypeField?.value?.trim(); // Trim whitespace and handle empty strings

    // Extract recipient status
    const signers = payload.data?.envelopeSummary?.recipients?.signers || [];
    const recipient_status = signers.map(({ email, status }) => ({ email, status }));

    if (!dealId) {
      console.warn(`[DocuSign Webhook] ⚠️ No hs_deal_id found for envelope ${envelopeId}`);
      console.warn(`[DocuSign Webhook] Text custom fields:`, JSON.stringify(textCustomFields));
      console.warn(`[DocuSign Webhook] List custom fields:`, JSON.stringify(listCustomFields));
      console.warn(`[DocuSign Webhook] This envelope was likely not created through our system - skipping`);
      // Return 200 to acknowledge receipt and prevent retries
      // This is expected for envelopes not created through our system
      return res.status(200).json({
        success: true,
        message: 'Webhook received but no hs_deal_id found - envelope not tracked',
        envelopeId
      });
    }

    // Determine which HubSpot property to update based on Form Type
    let hsFormProperty = "";
    if (!formTypeField || !formTypeValue) {
      console.warn(`[DocuSign Webhook] ⚠️ No Form Type found or Form Type value is empty for envelope ${envelopeId}`);
      console.warn(`[DocuSign Webhook] Text custom fields:`, JSON.stringify(textCustomFields));
      console.warn(`[DocuSign Webhook] List custom fields:`, JSON.stringify(listCustomFields));
      // Default to docusign_csa_json for backward compatibility
      hsFormProperty = "docusign_csa_json";
      console.log(`[DocuSign Webhook] ℹ️ Defaulting to docusign_csa_json (no Form Type specified)`);
    } else {
      // Map Form Type to HubSpot property
      switch(formTypeValue) {
        case "Form 2 CSA":
          hsFormProperty = "docusign_csa_json";
          break;
        case "Complete Form 2":
          hsFormProperty = "docusign_form_2_json";
          break;
        case "Other":
        case "other":
          console.log(`[DocuSign Webhook] ℹ️ Form Type is "${formTypeValue}" - skipping processing`);
          return res.status(200).json({
            success: true,
            message: `Webhook received but Form Type is "${formTypeValue}" - not processed`,
            envelopeId
          });
        default:
          console.warn(`[DocuSign Webhook] ⚠️ Unknown Form Type "${formTypeValue}" for envelope ${envelopeId}`);
          // Default to docusign_csa_json for unknown types
          hsFormProperty = "docusign_csa_json";
          console.log(`[DocuSign Webhook] ℹ️ Defaulting to docusign_csa_json for unknown Form Type`);
      }
    }

    console.log(`[DocuSign Webhook] 📋 Deal ID: ${dealId}`);
    console.log(`[DocuSign Webhook] 📝 Form Type: ${formTypeValue || 'Not specified'}`);
    console.log(`[DocuSign Webhook] 🏷️ HubSpot Property: ${hsFormProperty}`);
    console.log(`[DocuSign Webhook] ✍️ Envelope Status: ${envelope_status}`);
    console.log(`[DocuSign Webhook] 👥 Recipients:`, recipient_status);

    // Build HubSpot update data with dynamic property name
    let hubspotUpdateData = {
      [hsFormProperty]: JSON.stringify(payload.data),
    };

    // Handle deal stage progression based on form type
    if (hsFormProperty === "docusign_form_2_json" && envelope_status === "completed") {
      // Complete Form 2: When envelope is completed, mark deal as won
      hubspotUpdateData.dealstage = "closedwon";
      console.log(`[DocuSign Webhook] 🎉 Complete Form 2 envelope completed - marking deal as won`);
    } else if (hsFormProperty === "docusign_csa_json") {
      // Form 2 CSA: Progress deal when FIRST signer (routing order 1) completes
      // This allows the business to request funds while waiting for additional signatures
      const firstSigner = signers.find(signer => signer.routingOrder === '1' || signer.routingOrder === 1);

      if (firstSigner && firstSigner.status === 'completed') {
        // ✅ GUARD: Fetch current deal state to prevent backward progression
        const currentDeal = await dealsIntegration.getDeal(dealId, ['dealstage', 'payment_status']);
        const currentStage = currentDeal.properties.dealstage;
        const paymentStatus = currentDeal.properties.payment_status;

        console.log(`[DocuSign Webhook] 📊 Current deal state:`);
        console.log(`[DocuSign Webhook]   - Stage: ${currentStage}`);
        console.log(`[DocuSign Webhook]   - Payment Status: ${paymentStatus || 'Not set'}`);

        // ✅ GUARD 1: Check if payment already made
        const paymentAlreadyMade = (paymentStatus === 'Pending' || paymentStatus === 'Paid');

        // ✅ GUARD 2: Check if stage already at or past Funds Provided
        const alreadyAtFundsProvided = (currentStage === DEAL_STAGES.FUNDS_PROVIDED.id);

        // Only move to FUNDS_REQUESTED if both guards pass
        if (!paymentAlreadyMade && !alreadyAtFundsProvided) {
          hubspotUpdateData.dealstage = DEAL_STAGES.FUNDS_REQUESTED.id; // Stage 5
          console.log(`[DocuSign Webhook] ✅ Progressing deal to Funds Requested (first signer completed)`);
          console.log(`[DocuSign Webhook] 👤 First signer: ${firstSigner.name} (${firstSigner.email})`);
        } else {
          console.log(`[DocuSign Webhook] ⚠️ Skipping stage update - preventing backward progression:`);
          if (paymentAlreadyMade) {
            console.log(`[DocuSign Webhook]    - Payment status is "${paymentStatus}" (funds already provided)`);
          }
          if (alreadyAtFundsProvided) {
            console.log(`[DocuSign Webhook]    - Deal already at Funds Provided stage`);
          }
          console.log(`[DocuSign Webhook] 👤 First signer: ${firstSigner.name} (${firstSigner.email}) - acknowledged but not changing stage`);
        }

        // Check if additional signers exist
        const additionalSigners = signers.filter(s => s.routingOrder !== '1' && s.routingOrder !== 1);
        if (additionalSigners.length > 0) {
          console.log(`[DocuSign Webhook] ⏳ ${additionalSigners.length} additional signer(s) still pending:`);
          additionalSigners.forEach(signer => {
            console.log(`[DocuSign Webhook]    - ${signer.name} (${signer.email}) - Status: ${signer.status}`);
          });
        }
      } else if (firstSigner) {
        console.log(`[DocuSign Webhook] ⏳ First signer has not completed yet - Status: ${firstSigner.status}`);
      }
    }

    console.log(`[DocuSign Webhook] 📤 Storing full webhook payload in ${hsFormProperty} property`);

    // Update HubSpot deal
    const updateResult = await dealsIntegration.updateDeal(dealId, hubspotUpdateData);

    console.log(`[DocuSign Webhook] ✅ Deal ${dealId} updated with DocuSign webhook data`);
    console.log(`[DocuSign Webhook] 📊 HubSpot deal update result:`, updateResult);

    res.json({
      success: true,
      message: 'Envelope status updated successfully',
      dealId,
      formType: formTypeValue || 'Not specified',
      hubspotProperty: hsFormProperty,
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

            // Note: HubSpot automation handles deal stage progression when payment_status changes to "Paid"
            // We only trigger receipt automation here

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
 * Creates Smokeball receipt via GitHub Actions or direct automation
 * @param {Object} deal - HubSpot deal object
 */
async function handleBankTransferConfirmation(deal) {
  console.log(`[HubSpot Webhook] 💰 Triggering receipt automation for bank transfer`);
  console.log(`[HubSpot Webhook]    Deal ID: ${deal.id}`);

  // Check if GitHub Actions is configured
  const useGitHubActions = githubActions.isGitHubActionsConfigured();

  if (useGitHubActions) {
    console.log(`[HubSpot Webhook] 🚀 Using GitHub Actions for receipt automation`);

    try {
      // Extract receipt data from deal
      const { properties } = deal;

      // Get Lead UID - MUST use smokeball_lead_uid from HubSpot (NOT matter_uid from Smokeball)
      // We use Lead_UID specifically because visiting the correct URL with Lead_UID
      // pre-fills Date, Account, and Received From fields - only Reason and Amount need to be filled
      // matter_uid is the Smokeball matter number (e.g., "25-2126") which is NOT what we need
      const leadUid = properties.smokeball_lead_uid;
      if (!leadUid || leadUid.trim() === '') {
        throw new Error('smokeball_lead_uid is required but not found in deal. Create lead first.');
      }

      console.log(`[HubSpot Webhook] 🔍 Using Lead UID from HubSpot: ${leadUid}`);
      console.log(`[HubSpot Webhook]    smokeball_lead_uid: ${leadUid}`);
      console.log(`[HubSpot Webhook]    matter_uid: ${properties.matter_uid || 'NOT SET'} (NOT USED - we need Lead_UID, not Matter Number)`);

      // Construct the URL that will be visited
      const accountId = '34154dcb-8a76-4f8c-9281-a9b80e3cca16';
      const transactionsUrl = `https://app.smokeball.com.au/#/billing/view-matter/${leadUid}/transactions/trust/${accountId}~2FTrust`;
      console.log(`[HubSpot Webhook] 🔗 URL to visit: ${transactionsUrl}`);

      // Get contact info from associations
      const associationsIntegration = await import('../integrations/hubspot/associations.js');
      const dealContacts = await associationsIntegration.getDealContacts(deal.id);

      // Find primary seller
      let primarySeller = null;
      for (const contact of dealContacts) {
        const associationTypes = contact.associationTypes || [];
        const isPrimary = associationTypes.some(t => t.typeId === 1 || t.typeId === '1');
        if (isPrimary && contact.properties.firstname && contact.properties.lastname) {
          primarySeller = contact.properties;
          break;
        }
      }

      if (!primarySeller && dealContacts.length > 0) {
        primarySeller = dealContacts[0].properties;
      }

      if (!primarySeller) {
        throw new Error('No primary seller found for deal');
      }

      // Format date
      const now = new Date();
      const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Trigger GitHub Action
      const result = await githubActions.triggerReceiptAutomation({
        deal_id: deal.id,
        matter_id: leadUid, // Using Lead_UID (smokeball_lead_uid) instead of matter_uid
        amount: parseFloat(properties.payment_amount) || 0,
        lastname: primarySeller.lastname || 'Unknown',
        firstname: primarySeller.firstname || 'Unknown',
        date: date,
        test_mode: process.env.RECEIPT_AUTOMATION_TEST_MODE !== 'false' // Default to TRUE (test mode) unless explicitly set to 'false'
      });

      if (result.success) {
        console.log(`[HubSpot Webhook] ✅ GitHub Action triggered successfully`);
        console.log(`[HubSpot Webhook] 📊 Check status: ${result.actions_url}`);
      }
    } catch (error) {
      console.error(`[HubSpot Webhook] ❌ GitHub Actions trigger failed:`, error.message);
      throw error;
    }
  } else {
    console.log(`[HubSpot Webhook] 🔧 Using direct automation (GitHub Actions not configured)`);

    // Fall back to direct automation
    try {
      const automationResult = await receiptAutomation.triggerReceiptAutomationForDeal(deal.id);

      if (automationResult.skipped) {
        console.log(`[HubSpot Webhook] ⚠️ Receipt automation skipped: ${automationResult.message}`);
      } else if (automationResult.success) {
        console.log(`[HubSpot Webhook] ✅ Bank transfer receipt automation completed`);
      } else {
        console.error(`[HubSpot Webhook] ⚠️ Receipt automation failed: ${automationResult.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`[HubSpot Webhook] ❌ Receipt automation error:`, error.message);
      throw error;
    }
  }
}

export default router;
