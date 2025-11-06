/**
 * Stage Helper Functions
 * 
 * Utility functions for working with deal stages across the application.
 * Handles draft detection, stage info retrieval, and stage visibility logic.
 */

import { 
  getStageById, 
  getAgentNextStep as getAgentNextStepFromConfig,
  getClientNextStep as getClientNextStepFromConfig,
  getStageLabel as getStageLabelFromConfig,
  isClientVisible as isClientVisibleFromConfig
} from './dealStages.js';

/**
 * Get complete stage information for a deal
 * @param {string} stageId - HubSpot deal stage ID
 * @param {Object} deal - Deal object (optional, for draft detection)
 * @returns {Object} Complete stage configuration
 */
export const getStageInfo = (stageId, deal = null) => {
  const stageConfig = getStageById(stageId);
  
  // Check if this is a draft deal
  const isDraft = deal ? isDraftStage(deal) : false;
  
  return {
    ...stageConfig,
    isDraft
  };
};

/**
 * Get agent-specific next step for a stage
 * @param {string} stageId - HubSpot deal stage ID
 * @param {Object} deal - Deal object (optional, for draft detection)
 * @returns {string|null} Next step text for agent portal
 */
export const getAgentNextStep = (stageId, deal = null) => {
  // If it's a draft, the next step is always to send to client portal
  if (deal && isDraftStage(deal)) {
    return 'Send to Client Portal';
  }
  
  return getAgentNextStepFromConfig(stageId);
};

/**
 * Get client-specific next step for a stage
 * @param {string} stageId - HubSpot deal stage ID
 * @param {Object} deal - Deal object (optional, for draft detection)
 * @returns {string|null} Next step text for client portal
 */
export const getClientNextStep = (stageId, deal = null) => {
  // Drafts are not visible to clients, so no next step
  if (deal && isDraftStage(deal)) {
    return null;
  }
  
  return getClientNextStepFromConfig(stageId);
};

/**
 * Get stage display name
 * @param {string} stageId - HubSpot deal stage ID
 * @param {Object} deal - Deal object (optional, for draft detection)
 * @returns {string} Stage display name
 */
export const getStageName = (stageId, deal = null) => {
  // If it's a draft, show "Draft" label
  if (deal && isDraftStage(deal)) {
    return 'Draft';
  }
  
  return getStageLabelFromConfig(stageId);
};

/**
 * Check if stage should be visible to client
 * @param {string} stageId - HubSpot deal stage ID
 * @param {Object} deal - Deal object (optional, for draft detection)
 * @returns {boolean} True if client should see this stage
 */
export const isClientVisible = (stageId, deal = null) => {
  // Drafts are never visible to clients
  if (deal && isDraftStage(deal)) {
    return false;
  }
  
  return isClientVisibleFromConfig(stageId);
};

/**
 * Check if deal is in draft state
 * Uses the is_draft property to determine draft status
 * @param {Object} deal - Deal object with properties
 * @returns {boolean} True if deal is in draft state
 */
export const isDraftStage = (deal) => {
  if (!deal) return false;
  
  // Check the is_draft property
  // It can be 'Yes', 'yes', true, or any truthy value
  const isDraftValue = deal.is_draft || deal.properties?.is_draft;
  
  if (typeof isDraftValue === 'string') {
    return isDraftValue.toLowerCase() === 'yes';
  }
  
  return Boolean(isDraftValue);
};

/**
 * Check if deal should be visible to client
 * A deal is visible to client if:
 * 1. It's not in draft state (is_draft !== 'Yes')
 * 2. OR it has been explicitly sent to client portal
 * @param {Object} deal - Deal object
 * @returns {boolean} True if deal should be shown in client portal
 */
export const shouldShowToClient = (deal) => {
  if (!deal) return false;
  
  // If it's a draft, don't show to client
  if (isDraftStage(deal)) {
    return false;
  }
  
  // If it has a client-visible stage, show it
  return isClientVisible(deal.dealstage || deal.properties?.dealstage, deal);
};

/**
 * Get all stage IDs that are post-workflow (Situations 7-12)
 * These stages are display-only for clients
 * @returns {Array<string>} Array of stage IDs
 */
export const getPostWorkflowStages = () => {
  return [
    '1904359900', // Funds Provided (Situation 6 & 7)
    '1995278821', // Awaiting Rates & Water (Situation 8)
    '1904359901', // Searches Returned (Situation 9)
    '1995356644', // Form 2 Drafting (Situation 10)
    '1995278813', // Form 2 Conveyancer Review (Situation 11)
    '1904359902'  // Form 2 With Client (Situation 12)
  ];
};

/**
 * Check if stage is in post-workflow phase
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {boolean} True if stage is post-workflow (situations 7-12)
 */
export const isPostWorkflowStage = (stageId) => {
  return getPostWorkflowStages().includes(stageId);
};

/**
 * Enhance deal object with stage information
 * Adds computed fields for easier access in frontend
 * @param {Object} deal - Deal object from HubSpot
 * @returns {Object} Enhanced deal object
 */
export const enhanceDealWithStageInfo = (deal) => {
  if (!deal) return null;
  
  const stageId = deal.dealstage || deal.properties?.dealstage;
  const isDraft = isDraftStage(deal);
  
  return {
    ...deal,
    stageInfo: getStageInfo(stageId, deal),
    agentNextStep: getAgentNextStep(stageId, deal),
    clientNextStep: getClientNextStep(stageId, deal),
    stageName: getStageName(stageId, deal),
    isDraft,
    isPostWorkflow: isPostWorkflowStage(stageId),
    visibleToClient: shouldShowToClient(deal)
  };
};

export default {
  getStageInfo,
  getAgentNextStep,
  getClientNextStep,
  getStageName,
  isClientVisible,
  isDraftStage,
  shouldShowToClient,
  getPostWorkflowStages,
  isPostWorkflowStage,
  enhanceDealWithStageInfo
};

