/**
 * Deal Timeline Service
 * 
 * Builds a timeline of events from HubSpot deal properties.
 * Uses built-in hs_v2_date_entered_{stage_id} properties that HubSpot automatically maintains.
 */

/**
 * Stage ID to label mapping
 * Must match the deal stages in HubSpot pipeline
 */
const DEAL_STAGE_MAP = {
  1923713518: "Client Details Required",
  1923713520: "Awaiting Search Questionnaire",
  1923682791: "Searches Quote Provided",
  1923682792: "Awaiting Signed Retainer",
  1924069846: "Searches Funds Requested",
  1904359900: "Funds Provided",
  1995278804: "Searches Started",
  1995278821: "Searches Returned - Awaiting Clients Rates & Water (Form 2s)",
  1904359901: "Searches Returned",
  1995356644: "Form 2 Drafting",
  1995278813: "Form 2 With Conveyancer For Review",
  1904359902: "Form 2 With Client",
  closedwon: "Form 2 Complete",
  closedlost: "Closed Lost"
};

/**
 * Build timeline events from deal properties
 * @param {Object} dealProperties - HubSpot deal properties object
 * @returns {Array} Timeline events sorted chronologically
 */
export function buildTimelineFromDeal(dealProperties) {
  const events = [];

  // 1. Add Lead Created event
  if (dealProperties.createdate) {
    events.push({
      type: 'lead_created',
      title: 'Lead Created',
      description: 'Created by agent',
      timestamp: dealProperties.createdate,
      stageId: null,
      stageName: null
    });
  }

  // 2. Parse all stage entry dates
  for (const [stageId, stageName] of Object.entries(DEAL_STAGE_MAP)) {
    const propertyName = `hs_v2_date_entered_${stageId}`;
    const dateEntered = dealProperties[propertyName];
    
    if (dateEntered) {
      events.push({
        type: 'stage_change',
        title: stageName,
        description: `Deal progressed to ${stageName}`,
        timestamp: dateEntered,
        stageId: stageId,
        stageName: stageName
      });
    }
  }

  // 3. Add Deal Closed event (if applicable)
  if (dealProperties.closedate) {
    const isClosed = dealProperties.dealstage === 'closedwon' || dealProperties.dealstage === 'closedlost';
    const status = dealProperties.dealstage === 'closedwon' ? 'Won' : 'Lost';
    
    if (isClosed) {
      events.push({
        type: 'deal_closed',
        title: 'Deal Closed',
        description: `Status: ${status}`,
        timestamp: dealProperties.closedate,
        stageId: dealProperties.dealstage,
        stageName: DEAL_STAGE_MAP[dealProperties.dealstage] || status
      });
    }
  }

  // 4. Sort events chronologically (oldest first)
  events.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateA - dateB;
  });

  console.log(`[Timeline Service] Built timeline with ${events.length} events`);
  return events;
}

/**
 * Get stage label by stage ID
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} Stage label or 'Unknown'
 */
export function getStageLabel(stageId) {
  return DEAL_STAGE_MAP[stageId] || 'Unknown';
}

export default {
  buildTimelineFromDeal,
  getStageLabel,
  DEAL_STAGE_MAP
};

