/**
 * Cloudflare Worker - Smokeball Webhook Handler
 * Receives Smokeball matter events and updates HubSpot deals
 * Enhanced version: Also forwards to backend for advanced processing
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
      const payload = await request.json();
      console.info({ message: 'Received Smokeball webhook', eventType: payload.eventType || payload.type });

      const eventType = payload.eventType || payload.type;
      const matterData = payload.data || payload.payload;
      
      if (!matterData || !matterData.id) {
        console.warn({ message: 'Invalid Smokeball payload - missing data.id' });
        return new Response(JSON.stringify({ received: true, warning: 'Invalid payload' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get HubSpot token
      const hubspotToken = env.HUBSPOT_ACCESS_TOKEN;
      
      // Find HubSpot deal by smokeball_lead_uid using direct lookup
      const dealUrl = `https://api.hubapi.com/crm/v3/objects/deals/${matterData.id}?idProperty=smokeball_lead_uid&properties=dealname,smokeball_lead_uid,matter_uid`;
      const dealResponse = await fetch(dealUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hubspotToken}`
        }
      });
      
      if (dealResponse.status === 404) {
        console.warn({ message: 'No HubSpot deal found for Smokeball lead', leadUid: matterData.id });
        return new Response(JSON.stringify({ received: true, warning: 'No matching deal' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const deal = await dealResponse.json();
      
      console.info({ message: 'Found matching deal', dealId: deal.id, dealName: deal.properties.dealname });
      
      // Determine updates based on event type
      let updates = {};
      
      switch (eventType) {
        case 'matter.created':
          updates = {
            smokeball_last_sync: new Date().toISOString()
          };
          console.info({ message: 'Processing matter.created', dealId: deal.id });
          break;
          
        case 'matter.converted':
          updates = {
            matter_uid: matterData.number,
            smokeball_sync_status: 'synced',
            smokeball_last_sync: new Date().toISOString()
          };
          console.info({ 
            message: 'Processing matter.converted', 
            dealId: deal.id, 
            matterNumber: matterData.number 
          });
          break;
          
        case 'matter.updated':
          updates = {
            smokeball_last_sync: new Date().toISOString()
          };
          console.info({ message: 'Processing matter.updated', dealId: deal.id });
          break;
          
        default:
          console.warn({ message: 'Unknown event type', eventType });
          return new Response(JSON.stringify({ received: true, warning: 'Unknown event type' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
      }
      
      // Update HubSpot deal if we have updates
      if (Object.keys(updates).length > 0) {
        const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/deals/${deal.id}`;
        
        const hubspotResponse = await fetch(hubspotUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hubspotToken}`
          },
          body: JSON.stringify({ properties: updates })
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
        
        console.info({ 
          message: 'Successfully updated HubSpot deal', 
          dealId: deal.id, 
          eventType,
          updates 
        });
      }

      return new Response(JSON.stringify({ 
        received: true,
        processed: true,
        eventType: eventType,
        dealId: deal.id
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });

    } catch (error) {
      console.error({ message: 'Error processing Smokeball webhook', error: error.message, stack: error.stack });

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

