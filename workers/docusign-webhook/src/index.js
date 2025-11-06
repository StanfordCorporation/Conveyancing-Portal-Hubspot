/**
 * Cloudflare Worker - HubSpot Deal Patch Webhook for DocuSign
 * Receives JSON from DocuSign and sends a PATCH request to update a HubSpot deal
 */

export default {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const payload = await request.json();
      console.info({ message: 'Received DocuSign webhook payload', payload });

      // Extract envelope status
      const envelope_status = payload.data.envelopeSummary.status;
      
      // Extract deal ID from custom fields
      const dealID = payload.data.envelopeSummary.customFields.textCustomFields
        .find((obj) => obj.name === "hs_deal_id").value;
      
      // Extract recipient status
      const recipient_status = payload.data.envelopeSummary.recipients.signers
        .map(({ email, status }) => ({ email, status }));

      // Get HubSpot token from environment
      const hubspotToken = await env.HUBSPOT_ACCESS_TOKEN;

      // Prepare HubSpot API request
      const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealID}`;
      const hubspotPayload = {
        properties: {
          envelope_status,
          recipient_status: JSON.stringify(recipient_status)
        }
      };

      console.info({ 
        message: 'Sending PATCH to HubSpot', 
        dealID, 
        properties: { envelope_status, recipient_status } 
      });

      // Send PATCH request to HubSpot
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

      console.info({ message: 'Successfully updated HubSpot deal', dealID });

      return new Response(JSON.stringify({
        success: true,
        message: 'Deal updated successfully',
        dealId: dealID,
        hubspotResponse: responseData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error({ message: 'Error processing webhook', error: error.message });

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

