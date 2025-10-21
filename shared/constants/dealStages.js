/**
 * HubSpot Deal Pipeline Stages
 * 10-stage conveyancing lifecycle
 */

export const DEAL_STAGES = {
  CLIENT_DETAILS_REQUIRED: {
    id: 'client_details_required',
    name: 'Client Details Required',
    order: 1,
    description: 'Initial lead creation stage'
  },
  CLIENT_PORTAL_SENT: {
    id: 'client_portal_sent',
    name: 'Client Portal Sent',
    order: 2,
    description: 'Portal access provisioned to client'
  },
  SEARCHES_QUOTE_PROVIDED: {
    id: 'searches_quote_provided',
    name: 'Searches Quote Provided',
    order: 3,
    description: 'Cost estimate generated and presented'
  },
  AWAITING_SIGNED_RETAINER: {
    id: 'awaiting_signed_retainer',
    name: 'Awaiting Signed Retainer',
    order: 4,
    description: 'Legal agreement pending signature'
  },
  SEARCHES_FUNDS_REQUESTED: {
    id: 'searches_funds_requested',
    name: 'Searches Funds Requested',
    order: 5,
    description: 'Payment instructions provided'
  },
  FUNDS_PROVIDED: {
    id: 'funds_provided',
    name: 'Funds Provided',
    order: 6,
    description: 'Payment received and confirmed'
  },
  SEARCHES_RETURNED: {
    id: 'searches_returned',
    name: 'Searches Returned',
    order: 7,
    description: 'Search results delivered to client'
  },
  FORM_2_WITH_CLIENT: {
    id: 'form_2_with_client',
    name: 'Form 2 with Client',
    order: 8,
    description: 'Final documentation stage'
  },
  FORM_2_COMPLETE: {
    id: 'closedwon',
    name: 'Form 2 Complete (Closed/Won)',
    order: 9,
    description: 'Successful transaction completion'
  },
  CLOSED_LOST: {
    id: 'closedlost',
    name: 'Closed/Lost',
    order: 10,
    description: 'Unsuccessful transaction termination'
  }
};

// Helper function to get stage by ID
export const getStageById = (stageId) => {
  return Object.values(DEAL_STAGES).find(stage => stage.id === stageId);
};

// Helper function to get next stage
export const getNextStage = (currentStageId) => {
  const currentStage = getStageById(currentStageId);
  if (!currentStage) return null;

  const nextOrder = currentStage.order + 1;
  return Object.values(DEAL_STAGES).find(stage => stage.order === nextOrder);
};

// Helper function to check if stage transition is valid
export const isValidStageTransition = (fromStageId, toStageId) => {
  const fromStage = getStageById(fromStageId);
  const toStage = getStageById(toStageId);

  if (!fromStage || !toStage) return false;

  // Allow moving forward or to closed/lost
  return toStage.order >= fromStage.order || toStageId === DEAL_STAGES.CLOSED_LOST.id;
};

export default DEAL_STAGES;
