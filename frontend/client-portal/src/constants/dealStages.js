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
 * Post-workflow stages (Situations 6-12+)
 * These stages show in the status tracking view (Step 6)
 */
export const POST_WORKFLOW_STAGES = [
  '1904359900', // Funds Provided
  '1995278804', // Searches Started
  '1995278821', // Awaiting Rates & Water
  '1904359901', // Searches Returned
  '1995356644', // Form 2 Drafting
  '1995278813', // Form 2 Conveyancer Review
  '1904359902', // Form 2 With Client
  'closedwon'   // Form 2 Complete
];

/**
 * Stage names for all stages (workflow + post-workflow)
 */
export const STAGE_NAMES = {
  // Workflow stages (Steps 1-5)
  '1923713518': 'Client Details Required',
  '1923713520': 'Awaiting Search Questionnaire',
  '1923682791': 'Searches Quote Provided',
  '1923682792': 'Awaiting Signed Retainer',
  '1924069846': 'Searches Funds Requested',
  // Post-workflow stages (Step 6)
  '1904359900': 'Funds Provided',
  '1995278804': 'Searches Started',
  '1995278821': 'Searches Returned - Awaiting Clients Rates & Water',
  '1904359901': 'Searches Returned',
  '1995356644': 'Form 2 Drafting',
  '1995278813': 'Form 2 With Conveyancer For Review',
  '1904359902': 'Form 2 With Client',
  'closedwon': 'Form 2 Complete'
};

/**
 * Stage names for post-workflow stages (legacy - kept for compatibility)
 */
export const POST_WORKFLOW_STAGE_NAMES = {
  '1904359900': 'Funds Provided',
  '1995278804': 'Searches Started',
  '1995278821': 'Searches Returned - Awaiting Clients Rates & Water',
  '1904359901': 'Searches Returned',
  '1995356644': 'Form 2 Drafting',
  '1995278813': 'Form 2 With Conveyancer For Review',
  '1904359902': 'Form 2 With Client',
  'closedwon': 'Form 2 Complete'
};

/**
 * Detailed descriptions for all stages
 */
export const STAGE_DESCRIPTIONS = {
  // Workflow stages (Steps 1-5)
  '1923713518': 'Please provide the necessary client details to proceed.',
  '1923713520': 'Please complete and return the search questionnaire to proceed.',
  '1923682791': 'The searches quote has been provided, please review and sign the retainer to proceed.',
  '1923682792': 'Please sign the embedded DocuSign to proceed.',
  '1924069846': 'Please review and accept the quote to proceed with the searches.',
  // Post-workflow stages (Step 6)
  '1904359900': 'Funds have been provided. We will now initiate the searches.',
  '1995278804': 'Searches have been initiated. We will update you once they are returned.',
  '1995278821': 'Searches have been returned. Please provide your rates and water information to proceed with Form 2 drafting.',
  '1904359901': 'All searches have been returned. We will now proceed with Form 2 drafting. No action is required from you at this time.',
  '1995356644': 'The team is currently drafting the Form 2. No action is required from you at this time.',
  '1995278813': 'The conveyancer is reviewing the Form 2. No action is required from you at this time.',
  '1904359902': 'The Form 2 DocuSign has been sent to your allocated email for review and signature.',
  'closedwon': 'The Form 2 has been completed and signed by all parties. A copy has been sent to both your inbox and the agent\'s inbox.'
};

/**
 * Client next steps for post-workflow stages (legacy - kept for compatibility)
 */
export const POST_WORKFLOW_NEXT_STEPS = {
  '1904359900': 'Searches Started',
  '1995278804': 'Awaiting Searches Return',
  '1995278821': 'Searches Returned',
  '1904359901': 'Form 2 Drafting',
  '1995356644': 'Form 2 With Conveyancer For Review',
  '1995278813': 'Form 2 With Client',
  '1904359902': 'Form 2 Complete',
  'closedwon': 'Transaction Complete'
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
 * Get stage name for display (all stages)
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} - Stage name
 */
export const getStageName = (stageId) => {
  return STAGE_NAMES[stageId] || 'In Progress';
};

/**
 * Get stage description for display (all stages)
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} - Detailed stage description
 */
export const getStageDescription = (stageId) => {
  return STAGE_DESCRIPTIONS[stageId] || 'Please wait for updates from our team.';
};

/**
 * Get client next step for post-workflow stages (legacy - use getStageDescription instead)
 * @param {string} stageId - HubSpot deal stage ID
 * @returns {string} - Next step description
 */
export const getClientNextStep = (stageId) => {
  // Return detailed description instead of short next step
  return getStageDescription(stageId);
};
