/**
 * Deal Stages Configuration
 *
 * Centralized configuration for deal stages across Agent Portal, Client Portal, and HubSpot.
 * Stages are synced with HubSpot deal stages, while Next Steps are UI-only indicators.
 * 
 * This matches the 12 situations from the conveyancing workflow.
 */

export const DEAL_STAGES = {
  // Situation 1: Draft created by agent (uses is_draft property, not a separate stage)
  CLIENT_DETAILS_REQUIRED: {
    id: '1923713518',
    label: 'Client Details Required',
    agentNextStep: 'Send to Client Portal',
    clientNextStep: null, // Not visible to client in draft state
    description: 'Agent is preparing the lead details',
    color: 'draft'
  },

  // Situation 2: Sent to client portal
  AWAITING_QUESTIONNAIRE: {
    id: '1923713520',
    label: 'Awaiting Search Questionnaire',
    agentNextStep: 'Provision of Searches Quote',
    clientNextStep: 'Get Your Searches Quote',
    description: 'Client needs to complete the property questionnaire',
    color: 'active'
  },

  // Situation 3: Questionnaire completed, moved to quote
  QUOTE_PROVIDED: {
    id: '1923682791',
    label: 'Searches Quote Provided',
    agentNextStep: 'Sign Retainer Agreement',
    clientNextStep: 'Sign Retainer Agreement',
    description: 'Quote has been provided, awaiting client acceptance',
    color: 'signing'
  },

  // Situation 4: Quote accepted, moved to DocuSign
  AWAITING_RETAINER: {
    id: '1923682792',
    label: 'Awaiting Signed Retainer',
    agentNextStep: 'Funds Request',
    clientNextStep: 'Funds Request',
    description: 'Client needs to sign the retainer agreement',
    color: 'signing'
  },

  // Situation 5: Retainer signed, moved to payment
  FUNDS_REQUESTED: {
    id: '1924069846',
    label: 'Searches Funds Requested',
    agentNextStep: 'Funds Provided',
    clientNextStep: 'Funds Provided',
    description: 'Payment requested for searches',
    color: 'payment'
  },

  // Situation 6: Funds provided
  FUNDS_PROVIDED: {
    id: '1904359900',
    label: 'Funds Provided',
    agentNextStep: 'Searches Started',
    clientNextStep: 'Searches Started',
    description: 'Funds received, searches will be ordered',
    color: 'processing'
  },

  // Situation 7: Searches started/ordered
  SEARCHES_STARTED: {
    id: '1995278804',
    label: 'Searches Started',
    agentNextStep: 'Awaiting Searches Return',
    clientNextStep: 'Awaiting Searches Return',
    description: 'Searches have been ordered and are in progress',
    color: 'processing'
  },

  // Situation 8: Searches returned, awaiting rates & water
  AWAITING_RATES_WATER: {
    id: '1995278821',
    label: 'Searches Returned - Awaiting Clients Rates & Water',
    agentNextStep: 'Searches Returned',
    clientNextStep: 'Searches Returned',
    description: 'Searches completed, awaiting rates and water documents',
    color: 'processing'
  },

  // Situation 9: Searches returned
  SEARCHES_RETURNED: {
    id: '1904359901',
    label: 'Searches Returned',
    agentNextStep: 'Form 2 Drafting',
    clientNextStep: 'Form 2 Drafting',
    description: 'All searches have been returned',
    color: 'review'
  },

  // Situation 10: Form 2 drafting
  FORM2_DRAFTING: {
    id: '1995356644',
    label: 'Form 2 Drafting',
    agentNextStep: 'Form 2 With Conveyancer For Review',
    clientNextStep: 'Form 2 With Conveyancer For Review',
    description: 'Form 2 is being prepared',
    color: 'processing'
  },

  // Situation 11: Form 2 with conveyancer
  FORM2_CONVEYANCER_REVIEW: {
    id: '1995278813',
    label: 'Form 2 With Conveyancer For Review',
    agentNextStep: 'Form 2 With Client',
    clientNextStep: 'Form 2 With Client',
    description: 'Form 2 under review by conveyancer',
    color: 'review'
  },

  // Situation 12: Form 2 with client
  FORM2_WITH_CLIENT: {
    id: '1904359902',
    label: 'Form 2 With Client',
    agentNextStep: 'Form 2 Complete',
    clientNextStep: 'Form 2 Complete',
    description: 'Form 2 sent to client for review',
    color: 'complete'
  },

  // Additional standard stages
  CLOSED_WON: {
    id: 'closedwon',
    label: 'Closed Won',
    agentNextStep: null,
    clientNextStep: null,
    description: 'Deal successfully completed',
    color: 'won'
  },

  CLOSED_LOST: {
    id: 'closedlost',
    label: 'Closed Lost',
    agentNextStep: null,
    clientNextStep: null,
    description: 'Deal closed without completion',
    color: 'lost'
  }
};

/**
 * Stage order for progress tracking
 */
export const STAGE_ORDER = [
  '1923713518', // Client Details Required (Step 1)
  '1923713520', // Awaiting Questionnaire (Step 2)
  '1923682791', // Quote Provided (Step 3)
  '1923682792', // Awaiting Retainer (Step 4)
  '1924069846', // Funds Requested (Step 5)
  '1904359900', // Funds Provided (Step 6)
  '1995278804', // Searches Started (Step 7)
  '1995278821', // Awaiting Rates & Water (Step 8)
  '1904359901', // Searches Returned (Step 9)
  '1995356644', // Form 2 Drafting (Step 10)
  '1995278813', // Form 2 Conveyancer Review (Step 11)
  '1904359902', // Form 2 With Client (Step 12)
  'closedwon'
];

/**
 * Get stage configuration by stage ID
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {Object|null} Stage configuration object
 */
export const getStageById = (stageId) => {
  if (!stageId) return null;

  const stage = Object.values(DEAL_STAGES).find(s => s.id === stageId);
  return stage || {
    id: stageId,
    label: 'Unknown Stage',
    agentNextStep: null,
    clientNextStep: null,
    description: 'Stage not configured',
    color: 'default'
  };
};

/**
 * Get agent-specific next step for a stage
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string|null} Next step text for agent portal
 */
export const getAgentNextStep = (stageId) => {
  const stage = getStageById(stageId);
  return stage?.agentNextStep || null;
};

/**
 * Get client-specific next step for a stage
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string|null} Next step text for client portal
 */
export const getClientNextStep = (stageId) => {
  const stage = getStageById(stageId);
  return stage?.clientNextStep || null;
};

/**
 * Get stage label
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} Stage label
 */
export const getStageLabel = (stageId) => {
  const stage = getStageById(stageId);
  return stage?.label || 'Unknown';
};

/**
 * Get stage color class
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} CSS class name for stage color
 */
export const getStageColor = (stageId) => {
  const stage = getStageById(stageId);
  return `status-${stage?.color || 'default'}`;
};

/**
 * Check if client can view this stage
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {boolean} True if client should see this stage
 */
export const isClientVisible = (stageId) => {
  const stage = getStageById(stageId);
  return stage?.clientNextStep !== null;
};

/**
 * Get all stages as array (for dropdowns, etc.)
 * @returns {Array} Array of stage objects
 */
export const getAllStages = () => {
  return Object.values(DEAL_STAGES);
};

/**
 * Get stage progress percentage (for progress bars)
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {number} Progress percentage (0-100)
 */
export const getStageProgress = (stageId) => {
  const index = STAGE_ORDER.indexOf(stageId);
  if (index === -1) return 0;

  return Math.round((index / (STAGE_ORDER.length - 1)) * 100);
};

export default {
  DEAL_STAGES,
  STAGE_ORDER,
  getStageById,
  getAgentNextStep,
  getClientNextStep,
  getStageLabel,
  getStageColor,
  isClientVisible,
  getAllStages,
  getStageProgress
};
