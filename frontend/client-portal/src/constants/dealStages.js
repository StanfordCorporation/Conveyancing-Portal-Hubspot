/**
 * Deal Stage Mappings
 * Maps frontend step numbers to HubSpot deal stage IDs
 */

export const DEAL_STAGES = {
  1: '1923713518', // Step 1: Review Property Information
  2: '1923713520', // Step 2: Fill in Property Details (Questionnaire)
  3: '1923682791', // Step 3: Review Your Quote
  4: '1923682792', // Step 4: Awaiting Signature
  5: '1924069846', // Step 5: Payment Instructions
  6: 'post-workflow' // Step 6: Status Tracking (Situations 7-12)
};

// Reverse mapping: HubSpot stage ID to step number
export const STAGE_TO_STEP = {
  '1923713518': 1,
  '1923713520': 2,
  '1923682791': 3,
  '1923682792': 4,
  '1924069846': 5
};

/**
 * Post-workflow stages (Situations 6-12)
 * These stages show in the status tracking view (Step 6)
 */
export const POST_WORKFLOW_STAGES = [
  '1904359900', // Funds Provided
  '1995278804', // Searches Started
  '1995278821', // Awaiting Rates & Water
  '1904359901', // Searches Returned
  '1995356644', // Form 2 Drafting
  '1995278813', // Form 2 Conveyancer Review
  '1904359902'  // Form 2 With Client
];

/**
 * Stage names for post-workflow stages
 */
export const POST_WORKFLOW_STAGE_NAMES = {
  '1904359900': 'Funds Provided',
  '1995278804': 'Searches Started',
  '1995278821': 'Searches Returned - Awaiting Clients Rates & Water',
  '1904359901': 'Searches Returned',
  '1995356644': 'Form 2 Drafting',
  '1995278813': 'Form 2 With Conveyancer For Review',
  '1904359902': 'Form 2 With Client'
};

/**
 * Client next steps for post-workflow stages
 */
export const POST_WORKFLOW_NEXT_STEPS = {
  '1904359900': 'Searches Started',
  '1995278804': 'Awaiting Searches Return',
  '1995278821': 'Searches Returned',
  '1904359901': 'Form 2 Drafting',
  '1995356644': 'Form 2 With Conveyancer For Review',
  '1995278813': 'Form 2 With Client',
  '1904359902': 'Form 2 Complete'
};

/**
 * Check if stage is post-workflow (situations 7-12)
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {boolean} - True if post-workflow stage
 */
export const isPostWorkflowStage = (stageId) => {
  return POST_WORKFLOW_STAGES.includes(stageId);
};

/**
 * Get step number from HubSpot stage ID
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {number} - Step number (1-6), defaults to 1 if unknown
 */
export const getStepFromStage = (stageId) => {
  // Check if it's a post-workflow stage
  if (isPostWorkflowStage(stageId)) {
    return 6;
  }
  
  return STAGE_TO_STEP[stageId] || 1;
};

/**
 * Get HubSpot stage ID from step number
 * @param {number} stepNumber - Frontend step number (1-6)
 * @returns {string} - HubSpot deal stage ID
 */
export const getStageFromStep = (stepNumber) => {
  if (stepNumber === 6) {
    return 'post-workflow';
  }
  
  return DEAL_STAGES[stepNumber] || DEAL_STAGES[1];
};

/**
 * Get stage name for display (post-workflow stages)
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} - Stage name
 */
export const getStageName = (stageId) => {
  return POST_WORKFLOW_STAGE_NAMES[stageId] || 'In Progress';
};

/**
 * Get client next step for post-workflow stages
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} - Next step description
 */
export const getClientNextStep = (stageId) => {
  return POST_WORKFLOW_NEXT_STEPS[stageId] || 'Please wait for updates';
};
