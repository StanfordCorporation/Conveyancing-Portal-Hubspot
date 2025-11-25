/**
 * Smokeball Receipt Automation Service
 * Executes JavaScript Playwright automation to create receipts via web automation
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SmokeBallReceiptAutomation from '../../../smokeball-receipt-automation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Execute JavaScript receipt automation
 * 
 * @param {Object} params - Receipt parameters
 * @param {string} params.matterId - Smokeball matter ID
 * @param {number} params.amount - Amount to receipt
 * @param {string} params.lastname - Contact lastname
 * @param {string} params.firstname - Contact firstname
 * @param {string} params.reason - Reason for receipt
 * @param {string} params.date - Date deposited (format: DD/MM/YYYY HH:MM:SS)
 * @param {boolean} params.testMode - If true, fills form but doesn't submit (default: false)
 * @returns {Promise<Object>} Result with success status and output
 */
export async function executeReceiptAutomation(params) {
  const {
    matterId,
    amount = 81.70,
    lastname = 'Stanford',
    firstname = 'Logan',
    reason = 'On account of test search fees',
    date = '21/11/2025 12:00:00',
    testMode = false
  } = params;

  // Validate required parameters
  if (!matterId) {
    throw new Error('matterId is required');
  }

  console.log('[Receipt Automation] 🚀 Executing JavaScript automation...');
  console.log(`[Receipt Automation] Matter ID: ${matterId}`);
  console.log(`[Receipt Automation] Amount: $${amount}`);
  console.log(`[Receipt Automation] Contact: ${lastname}, ${firstname}`);
  console.log(`[Receipt Automation] Date: ${date}`);
  console.log(`[Receipt Automation] Test Mode: ${testMode}`);

  try {
    // Create automation instance
    const automation = new SmokeBallReceiptAutomation(testMode);
    
    // Prepare receipt data
    const receiptData = {
      amount,
      date,
      lastname,
      firstname,
      reason
    };
    
    // Run automation
    const result = await automation.run(matterId, receiptData);
    
    return {
      success: result.success,
      message: result.message,
      error: result.error,
      stdout: '', // Keep for backward compatibility
      stderr: '' // Keep for backward compatibility
    };
  } catch (error) {
    console.error('[Receipt Automation] ❌ Automation failed:', error.message);
    throw error;
  }
}

/**
 * Trigger receipt automation for a deal
 * Fetches deal, extracts payment details, and triggers Python automation
 * Updates sync status on success/failure
 * 
 * @param {string} dealId - HubSpot deal ID
 * @returns {Promise<Object>} Result with success status
 */
export async function triggerReceiptAutomationForDeal(dealId) {
  // Check feature flag
  const automationEnabled = process.env.RECEIPT_AUTOMATION_ENABLED === 'true';
  
  if (!automationEnabled) {
    console.log(`[Receipt Automation] ⚠️ Automation disabled via RECEIPT_AUTOMATION_ENABLED flag`);
    console.log(`[Receipt Automation] 📋 Would have processed deal ${dealId} with:`);
    
    // Fetch deal to show what would have been done
    const dealsIntegration = await import('../../integrations/hubspot/deals.js');
    try {
      const deal = await dealsIntegration.getDeal(dealId, [
        'payment_method',
        'payment_amount',
        'payment_date',
        'payment_status',
        'stripe_payment_intent_id',
        'matter_uid',
        'smokeball_lead_uid'
      ]);
      
      const matterId = deal.properties.matter_uid || deal.properties.smokeball_lead_uid;
      let amount = 'N/A';
      if (deal.properties.payment_method === 'Stripe' && deal.properties.stripe_payment_intent_id) {
        amount = 'Would fetch from Stripe payment intent metadata (base_amount)';
      } else if (deal.properties.payment_method === 'Bank Transfer') {
        amount = `$${deal.properties.payment_amount || 'N/A'}`;
      }
      
      console.log(`   - Matter ID: ${matterId || 'N/A'}`);
      console.log(`   - Payment Method: ${deal.properties.payment_method || 'N/A'}`);
      console.log(`   - Amount: ${amount}`);
      console.log(`   - Payment Status: ${deal.properties.payment_status || 'N/A'}`);
      console.log(`   - Would fill form with current date/time`);
      console.log(`   - Would use Primary Seller contact from deal associations`);
      console.log(`   - Would run in TEST MODE (fill form, don't submit)`);
    } catch (error) {
      console.log(`   - Could not fetch deal details: ${error.message}`);
    }
    
    return {
      success: false,
      message: 'Receipt automation is disabled via RECEIPT_AUTOMATION_ENABLED flag',
      skipped: true
    };
  }
  
  const dealsIntegration = await import('../../integrations/hubspot/deals.js');
  
  try {
    console.log(`[Receipt Automation] 🚀 Triggering automation for deal ${dealId}...`);
    console.log(`[Receipt Automation] ✅ Feature flag enabled - proceeding with automation`);

    // Fetch deal with all required properties
    const deal = await dealsIntegration.getDeal(dealId, [
      'payment_method',
      'payment_amount',
      'payment_date',
      'payment_status',
      'stripe_payment_intent_id',
      'matter_uid',
      'smokeball_lead_uid'
    ]);

    // Validate payment status
    if (deal.properties.payment_status !== 'Paid') {
      console.warn(`[Receipt Automation] ⚠️ Payment status is "${deal.properties.payment_status}", not "Paid". Skipping automation.`);
      return {
        success: false,
        message: `Payment status is not Paid (current: ${deal.properties.payment_status})`
      };
    }

    // Get matter ID
    const matterId = deal.properties.matter_uid || deal.properties.smokeball_lead_uid;
    if (!matterId || matterId.trim() === '') {
      throw new Error('No matter_uid or smokeball_lead_uid found in deal. Create lead first.');
    }
    
    console.log(`[Receipt Automation] 📋 Extracted Matter ID: ${matterId}`);

    // Determine payment type and extract amount
    const paymentMethod = deal.properties.payment_method;
    if (!paymentMethod || (paymentMethod !== 'Stripe' && paymentMethod !== 'Bank Transfer')) {
      throw new Error(`Payment method not set or invalid: ${paymentMethod || 'undefined'}`);
    }

    let amount;
    if (paymentMethod === 'Stripe') {
      // Fetch payment intent and extract base_amount (net after fees)
      if (!deal.properties.stripe_payment_intent_id) {
        throw new Error('Stripe payment intent ID not found');
      }

      const stripePayments = await import('../../integrations/stripe/payments.js');
      const paymentIntent = await stripePayments.getPaymentIntent(deal.properties.stripe_payment_intent_id);
      
      const baseAmountCents = parseInt(paymentIntent.metadata?.base_amount);
      if (!baseAmountCents || isNaN(baseAmountCents)) {
        throw new Error('Could not extract base_amount from payment intent metadata');
      }
      
      amount = baseAmountCents / 100; // Convert cents to dollars
      console.log(`[Receipt Automation] 💳 Stripe payment - Net amount after fees: $${amount.toFixed(2)}`);
    } else {
      // Bank Transfer - use payment_amount directly
      amount = parseFloat(deal.properties.payment_amount);
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid payment amount: ${deal.properties.payment_amount}`);
      }
      console.log(`[Receipt Automation] 🏦 Bank transfer - Amount: $${amount.toFixed(2)}`);
    }

    // Get contact info - PRIMARY SELLER ONLY (no fallback)
    let lastname = null;
    let firstname = null;

    try {
      const associationsIntegration = await import('../../integrations/hubspot/associations.js');
      const dealContacts = await associationsIntegration.getDealContacts(dealId);
      
      if (!dealContacts || dealContacts.length === 0) {
        throw new Error('No contacts found for deal');
      }
      
      // Find Primary Seller (association type 1) - REQUIRED
      const primarySeller = dealContacts.find(contact => 
        contact.associationTypes?.some(type => type.typeId === 1)
      );
      
      if (!primarySeller) {
        throw new Error('Primary Seller not found. Deal must have a Primary Seller contact.');
      }
      
      if (!primarySeller.properties?.lastname || !primarySeller.properties?.firstname) {
        throw new Error('Primary Seller missing lastname or firstname');
      }
      
      lastname = primarySeller.properties.lastname;
      firstname = primarySeller.properties.firstname;
      
      console.log(`[Receipt Automation] 👤 Found Primary Seller: ${lastname}, ${firstname}`);
    } catch (error) {
      console.error('[Receipt Automation] ❌ Error fetching Primary Seller:', error.message);
      throw new Error(`Failed to get Primary Seller: ${error.message}`);
    }

    // Format date - Use current date & time (always use current, not payment_date)
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    // Format as DD/MM/YYYY HH:MM:SS
    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    console.log(`[Receipt Automation] 📅 Using current date & time: ${formattedDate}`);

    // Execute automation in TEST MODE (fills form but doesn't submit)
    // This ensures we can verify form filling without creating receipts
    console.log(`[Receipt Automation] 🧪 Running in TEST MODE - form will be filled but NOT submitted`);
    const result = await executeReceiptAutomation({
      matterId,
      amount,
      lastname,
      firstname,
      reason: 'On account of search fees',
      date: formattedDate,
      testMode: true // Always test mode when feature flag is enabled
    });

    // Update sync status on success
    try {
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Successful',
        smokeball_last_sync: new Date().toISOString()
      });
      console.log(`[Receipt Automation] ✅ Sync status updated to Successful`);
    } catch (updateError) {
      console.error(`[Receipt Automation] ⚠️ Failed to update sync status:`, updateError.message);
      // Don't throw - automation succeeded even if status update failed
    }

    return {
      success: true,
      ...result,
      dealId,
      matterId,
      amount
    };

  } catch (error) {
    console.error(`[Receipt Automation] ❌ Automation failed for deal ${dealId}:`, error.message);

    // Update sync status on error
    try {
      await dealsIntegration.updateDeal(dealId, {
        smokeball_sync_status: 'Failed',
        smokeball_sync_error: `Payment receipt failed: ${error.message}`
      });
      console.log(`[Receipt Automation] ❌ Sync status updated to Failed`);
    } catch (updateError) {
      console.error(`[Receipt Automation] ⚠️ Failed to update error status:`, updateError.message);
    }

    throw error;
  }
}

/**
 * Execute receipt automation with deal context
 * Wrapper function for backward compatibility with manual route
 * For test mode, fetches deal and executes with testMode flag
 * 
 * @param {string} dealId - HubSpot deal ID
 * @param {Object} options - Additional options
 * @param {number} options.amount - Override amount (default: from deal)
 * @param {string} options.reason - Override reason
 * @param {boolean} options.testMode - Test mode flag
 * @returns {Promise<Object>} Result
 */
export async function executeReceiptAutomationForDeal(dealId, options = {}) {
  // If test mode, we need to fetch deal and execute with testMode flag
  if (options.testMode) {
    const dealsIntegration = await import('../../integrations/hubspot/deals.js');
    const deal = await dealsIntegration.getDeal(dealId, [
      'payment_method',
      'payment_amount',
      'payment_date',
      'stripe_payment_intent_id',
      'matter_uid',
      'smokeball_lead_uid'
    ]);

    const matterId = deal.properties.matter_uid || deal.properties.smokeball_lead_uid;
    if (!matterId || matterId.trim() === '') {
      throw new Error('No matter_uid or smokeball_lead_uid found in deal. Create lead first.');
    }
    
    console.log(`[Receipt Automation] 📋 Extracted Matter ID: ${matterId}`);

    // Extract amount based on payment method
    let amount;
    if (deal.properties.payment_method === 'Stripe' && deal.properties.stripe_payment_intent_id) {
      const stripePayments = await import('../../integrations/stripe/payments.js');
      const paymentIntent = await stripePayments.getPaymentIntent(deal.properties.stripe_payment_intent_id);
      const baseAmountCents = parseInt(paymentIntent.metadata?.base_amount);
      amount = baseAmountCents ? baseAmountCents / 100 : (options.amount || 81.70);
    } else {
      amount = options.amount || parseFloat(deal.properties.payment_amount) || 81.70;
    }

    // Get contact info - PRIMARY SELLER ONLY (no fallback)
    let lastname = null;
    let firstname = null;
    
    try {
      const associationsIntegration = await import('../../integrations/hubspot/associations.js');
      const dealContacts = await associationsIntegration.getDealContacts(dealId);
      
      if (!dealContacts || dealContacts.length === 0) {
        throw new Error('No contacts found for deal');
      }
      
      // Find Primary Seller (association type 1) - REQUIRED
      const primarySeller = dealContacts.find(contact => 
        contact.associationTypes?.some(type => type.typeId === 1)
      );
      
      if (!primarySeller) {
        throw new Error('Primary Seller not found. Deal must have a Primary Seller contact.');
      }
      
      if (!primarySeller.properties?.lastname || !primarySeller.properties?.firstname) {
        throw new Error('Primary Seller missing lastname or firstname');
      }
      
      lastname = primarySeller.properties.lastname;
      firstname = primarySeller.properties.firstname;
      
      console.log(`[Receipt Automation] 👤 Found Primary Seller: ${lastname}, ${firstname}`);
    } catch (error) {
      console.error('[Receipt Automation] ❌ Error fetching Primary Seller:', error.message);
      throw new Error(`Failed to get Primary Seller: ${error.message}`);
    }

    // Format date - Use current date & time (always use current, not payment_date)
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    // Format as DD/MM/YYYY HH:MM:SS
    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    
    console.log(`[Receipt Automation] 📅 Using current date & time: ${formattedDate}`);

    return await executeReceiptAutomation({
      matterId,
      amount,
      lastname,
      firstname,
      reason: options.reason || 'On account of search fees',
      date: formattedDate,
      testMode: true
    });
  }
  
  // For webhook triggers or non-test mode, use unified function
  return await triggerReceiptAutomationForDeal(dealId);
}

export default {
  executeReceiptAutomation,
  executeReceiptAutomationForDeal,
  triggerReceiptAutomationForDeal
};

