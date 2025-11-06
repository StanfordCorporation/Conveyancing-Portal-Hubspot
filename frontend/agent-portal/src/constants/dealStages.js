/**
 * Deal Stages Constants for Agent Portal
 * Frontend version of stage mappings matching backend configuration
 */

export const DEAL_STAGES = {
  // Draft (detected by is_draft property)
  DRAFT: {
    id: 'draft',
    label: 'Draft',
    agentNextStep: 'Send to Client Portal',
    color: 'draft'
  },

  // Situation 1 & 2: Client Details Required
  CLIENT_DETAILS_REQUIRED: {
    id: '1923713518',
    label: 'Client Details Required',
    agentNextStep: 'Send to Client Portal',
    color: 'draft'
  },

  // Situation 2: Awaiting Search Questionnaire
  AWAITING_QUESTIONNAIRE: {
    id: '1923713520',
    label: 'Awaiting Search Questionnaire',
    agentNextStep: 'Provision of Searches Quote',
    color: 'active'
  },

  // Situation 3: Searches Quote Provided
  QUOTE_PROVIDED: {
    id: '1923682791',
    label: 'Searches Quote Provided',
    agentNextStep: 'Sign Retainer Agreement',
    color: 'signing'
  },

  // Situation 4: Awaiting Signed Retainer
  AWAITING_RETAINER: {
    id: '1923682792',
    label: 'Awaiting Signed Retainer',
    agentNextStep: 'Funds Request',
    color: 'signing'
  },

  // Situation 5: Searches Funds Requested
  FUNDS_REQUESTED: {
    id: '1924069846',
    label: 'Searches Funds Requested',
    agentNextStep: 'Funds Provided',
    color: 'payment'
  },

  // Situation 6: Funds Provided
  FUNDS_PROVIDED: {
    id: '1904359900',
    label: 'Funds Provided',
    agentNextStep: 'Searches Started',
    color: 'processing'
  },

  // Situation 7: Searches Started
  SEARCHES_STARTED: {
    id: '1995278804',
    label: 'Searches Started',
    agentNextStep: 'Awaiting Searches Return',
    color: 'processing'
  },

  // Situation 8: Awaiting Rates & Water
  AWAITING_RATES_WATER: {
    id: '1995278821',
    label: 'Searches Returned - Awaiting Clients Rates & Water',
    agentNextStep: 'Searches Returned',
    color: 'processing'
  },

  // Situation 9: Searches Returned
  SEARCHES_RETURNED: {
    id: '1904359901',
    label: 'Searches Returned',
    agentNextStep: 'Form 2 Drafting',
    color: 'review'
  },

  // Situation 10: Form 2 Drafting
  FORM2_DRAFTING: {
    id: '1995356644',
    label: 'Form 2 Drafting',
    agentNextStep: 'Form 2 With Conveyancer For Review',
    color: 'processing'
  },

  // Situation 11: Form 2 With Conveyancer
  FORM2_CONVEYANCER_REVIEW: {
    id: '1995278813',
    label: 'Form 2 With Conveyancer For Review',
    agentNextStep: 'Form 2 With Client',
    color: 'review'
  },

  // Situation 12: Form 2 With Client
  FORM2_WITH_CLIENT: {
    id: '1904359902',
    label: 'Form 2 With Client',
    agentNextStep: 'Form 2 Complete',
    color: 'complete'
  },

  // Final stages
  CLOSED_WON: {
    id: 'closedwon',
    label: 'Closed Won',
    agentNextStep: null,
    color: 'won'
  },

  CLOSED_LOST: {
    id: 'closedlost',
    label: 'Closed Lost',
    agentNextStep: null,
    color: 'lost'
  }
};

/**
 * Stage ID to config mapping for quick lookup
 */
export const STAGE_MAP = {
  'draft': DEAL_STAGES.DRAFT,
  '1923713518': DEAL_STAGES.CLIENT_DETAILS_REQUIRED,
  '1923713520': DEAL_STAGES.AWAITING_QUESTIONNAIRE,
  '1923682791': DEAL_STAGES.QUOTE_PROVIDED,
  '1923682792': DEAL_STAGES.AWAITING_RETAINER,
  '1924069846': DEAL_STAGES.FUNDS_REQUESTED,
  '1904359900': DEAL_STAGES.FUNDS_PROVIDED,
  '1995278804': DEAL_STAGES.SEARCHES_STARTED,
  '1995278821': DEAL_STAGES.AWAITING_RATES_WATER,
  '1904359901': DEAL_STAGES.SEARCHES_RETURNED,
  '1995356644': DEAL_STAGES.FORM2_DRAFTING,
  '1995278813': DEAL_STAGES.FORM2_CONVEYANCER_REVIEW,
  '1904359902': DEAL_STAGES.FORM2_WITH_CLIENT,
  'closedwon': DEAL_STAGES.CLOSED_WON,
  'closedlost': DEAL_STAGES.CLOSED_LOST
};

/**
 * Get stage configuration by stage ID
 * @param {string} stageId - HubSpot deal stage ID
 * @param {boolean} isDraft - Whether deal is in draft state
 * @returns {Object} Stage configuration
 */
export const getStageConfig = (stageId, isDraft = false) => {
  // If deal is draft, always return draft config
  if (isDraft) {
    return DEAL_STAGES.DRAFT;
  }

  return STAGE_MAP[stageId] || {
    id: stageId,
    label: 'Unknown Stage',
    agentNextStep: null,
    color: 'default'
  };
};

/**
 * Get stage label for display
 * @param {string} stageId - HubSpot deal stage ID
 * @param {boolean} isDraft - Whether deal is in draft state
 * @returns {string} Stage label
 */
export const getStageLabel = (stageId, isDraft = false) => {
  const config = getStageConfig(stageId, isDraft);
  return config.label;
};

/**
 * Get agent next step for a stage
 * @param {string} stageId - HubSpot deal stage ID
 * @param {boolean} isDraft - Whether deal is in draft state
 * @returns {string|null} Next step text
 */
export const getAgentNextStep = (stageId, isDraft = false) => {
  const config = getStageConfig(stageId, isDraft);
  return config.agentNextStep;
};

/**
 * Get stage color class
 * @param {string} stageId - HubSpot deal stage ID
 * @param {boolean} isDraft - Whether deal is in draft state
 * @returns {string} CSS class for stage color
 */
export const getStageColor = (stageId, isDraft = false) => {
  const config = getStageConfig(stageId, isDraft);
  return `status-${config.color}`;
};

/**
 * Check if deal is in draft state (from deal object)
 * @param {Object} deal - Deal object
 * @returns {boolean} True if deal is draft
 */
export const isDraft = (deal) => {
  if (!deal) return false;
  return deal.isDraft === true || deal.is_draft === 'Yes' || deal.is_draft === 'yes';
};

/**
 * Get all stages for pipeline display (12 stages)
 * @returns {Array} Array of stage configs for pipeline
 */
export const getPipelineStages = () => {
  return [
    { ...DEAL_STAGES.DRAFT, checkDraft: true },
    DEAL_STAGES.CLIENT_DETAILS_REQUIRED,
    DEAL_STAGES.AWAITING_QUESTIONNAIRE,
    DEAL_STAGES.QUOTE_PROVIDED,
    DEAL_STAGES.AWAITING_RETAINER,
    DEAL_STAGES.FUNDS_REQUESTED,
    DEAL_STAGES.FUNDS_PROVIDED,
    DEAL_STAGES.SEARCHES_STARTED,
    DEAL_STAGES.AWAITING_RATES_WATER,
    DEAL_STAGES.SEARCHES_RETURNED,
    DEAL_STAGES.FORM2_DRAFTING,
    DEAL_STAGES.FORM2_CONVEYANCER_REVIEW,
    DEAL_STAGES.FORM2_WITH_CLIENT
  ];
};

/**
 * Get filter options for stage dropdown
 * @returns {Array} Array of {value, label} objects
 */
export const getStageFilterOptions = () => {
  return [
    { value: 'all', label: 'All Stages' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: '1923713518', label: 'Client Details Required' },
    { value: '1923713520', label: 'Awaiting Questionnaire' },
    { value: '1923682791', label: 'Quote Provided' },
    { value: '1923682792', label: 'Awaiting Retainer' },
    { value: '1924069846', label: 'Funds Requested' },
    { value: '1904359900', label: 'Funds Provided' },
    { value: '1995278804', label: 'Searches Started' },
    { value: '1995278821', label: 'Awaiting Rates' },
    { value: '1904359901', label: 'Searches Returned' },
    { value: '1995356644', label: 'Form 2 Drafting' },
    { value: '1995278813', label: 'With Conveyancer' },
    { value: '1904359902', label: 'With Client' },
    { value: 'completed', label: 'Completed' },
    { value: 'closed', label: 'Closed' }
  ];
};

export default {
  DEAL_STAGES,
  STAGE_MAP,
  getStageConfig,
  getStageLabel,
  getAgentNextStep,
  getStageColor,
  isDraft,
  getPipelineStages,
  getStageFilterOptions
};

