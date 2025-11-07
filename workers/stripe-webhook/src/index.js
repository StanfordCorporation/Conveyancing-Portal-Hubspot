/**
 * Cloudflare Worker - Stripe Webhook Handler
 * Receives Stripe payment events and updates HubSpot deals
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Get raw body for signature verification
      const rawBody = await request.text();
      const signature = request.headers.get('stripe-signature');
      
      // Verify Stripe signature
      const isValid = await verifyStripeSignature(
        rawBody, 
        signature, 
        env.STRIPE_WEBHOOK_SECRET
      );
      
      if (!isValid) {
        console.error({ message: 'Invalid Stripe signature' });
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const payload = JSON.parse(rawBody);
      console.info({ message: 'Received Stripe webhook', type: payload.type });

      // Handle payment success
      if (payload.type === 'payment_intent.succeeded') {
        const paymentIntent = payload.data.object;
        const dealId = paymentIntent.metadata.dealId;
        
        if (!dealId) {
          console.warn({ message: 'No dealId in payment metadata' });
          return new Response(JSON.stringify({ received: true, warning: 'No dealId' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const amount = (paymentIntent.amount / 100).toFixed(2);
        const paymentDate = new Date().toISOString().split('T')[0];
        
        // Update HubSpot
        const hubspotToken = env.HUBSPOT_ACCESS_TOKEN;
        const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
        
        const hubspotPayload = {
          properties: {
            payment_status: 'Paid',
            payment_amount: amount,
            payment_date: paymentDate,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_customer_id: paymentIntent.customer,
            dealstage: '1904359900' // FUNDS_PROVIDED
          }
        };
        
        console.info({ 
          message: 'Updating HubSpot deal', 
          dealId, 
          amount,
          paymentIntentId: paymentIntent.id 
        });
        
        const hubspotResponse = await fetch(hubspotUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hubspotToken}`
          },
          body: JSON.stringify(hubspotPayload)
        });
        
        const responseData = await hubspotResponse.json();
        
        if (!hubspotResponse.ok) {
          console.error({ 
            message: 'HubSpot API error', 
            status: hubspotResponse.status, 
            data: responseData 
          });
          return new Response(JSON.stringify({
            error: 'Failed to update HubSpot deal',
            details: responseData
          }), {
            status: hubspotResponse.status,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        console.info({ message: 'Successfully updated HubSpot deal', dealId });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });

    } catch (error) {
      console.error({ message: 'Error processing Stripe webhook', error: error.message });

      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Verify Stripe webhook signature using HMAC-SHA256
 * @param {string} rawBody - Raw request body
 * @param {string} signatureHeader - Stripe-Signature header value
 * @param {string} secret - Webhook signing secret
 * @returns {Promise<boolean>}
 */
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) {
    console.warn({ message: 'Missing signature or secret for Stripe verification' });
    return false;
  }
  
  try {
    // Parse signature header: t=timestamp,v1=signature
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];
    
    if (!timestamp || !signature) {
      console.error({ message: 'Invalid signature header format' });
      return false;
    }
    
    // Create signed payload: timestamp.rawBody
    const payload = `${timestamp}.${rawBody}`;
    
    // Compute HMAC signature using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const isValid = computedSignature === signature;
    
    if (!isValid) {
      console.error({ message: 'Signature mismatch', expected: signature, computed: computedSignature });
    }
    
    return isValid;
    
  } catch (error) {
    console.error({ message: 'Error verifying Stripe signature', error: error.message });
    return false;
  }
}

