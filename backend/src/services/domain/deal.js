/**
 * Deal Domain Service
 * Business logic for deals (property disclosures)
 * Hides HubSpot implementation details from routes
 */

import * as dealsIntegration from '../../integrations/hubspot/deals.js';
import { HUBSPOT } from '../../config/constants.js';

/**
 * Create a new deal with associations
 * Handles association to primary seller, agency, agent, etc.
 */
export const create = async (dealData, associations) => {
  const deal = await dealsIntegration.createDeal(dealData, associations);

  return {
    id: deal.id,
    name: deal.properties.dealname,
    stage: deal.properties.dealstage,
    properties: deal.properties
  };
};

/**
 * Create deal with flexible associations
 * Supports multiple sellers, agent, agency
 */
export const createWithAssociations = async (dealData, contactIdOrAssociations, agencyId) => {
  const deal = await dealsIntegration.createDealWithAssociations(
    dealData,
    contactIdOrAssociations,
    agencyId
  );

  return {
    id: deal.id,
    name: deal.properties.dealname,
    stage: deal.properties.dealstage,
    properties: deal.properties
  };
};

/**
 * Get deal by ID
 */
export const getById = async (dealId) => {
  const deal = await dealsIntegration.getDeal(dealId);

  return {
    id: deal.id,
    name: deal.properties.dealname,
    stage: deal.properties.dealstage,
    properties: deal.properties
  };
};

/**
 * Update deal
 */
export const update = async (dealId, updates) => {
  const deal = await dealsIntegration.updateDeal(dealId, updates);

  return {
    id: deal.id,
    name: deal.properties.dealname,
    stage: deal.properties.dealstage,
    properties: deal.properties
  };
};

/**
 * Update deal stage (pipeline stage)
 */
export const updateStage = async (dealId, stage) => {
  const deal = await dealsIntegration.updateDealStage(dealId, stage);

  return {
    id: deal.id,
    name: deal.properties.dealname,
    stage: deal.properties.dealstage,
    properties: deal.properties
  };
};

/**
 * Update deal with property intake data (4 sections of disclosure)
 */
export const updatePropertyIntake = async (dealId, intakeData) => {
  const updates = {};

  // Map intake data to HubSpot property names
  if (intakeData.section1) {
    updates[HUBSPOT.CUSTOM_FIELDS.LAND_TITLE_NUMBER] = intakeData.section1.titleNumber;
    updates[HUBSPOT.CUSTOM_FIELDS.LAND_SIZE] = intakeData.section1.landSize;
    updates[HUBSPOT.CUSTOM_FIELDS.BUILDING_TYPE] = intakeData.section1.buildingType;
    updates[HUBSPOT.CUSTOM_FIELDS.YEAR_BUILT] = intakeData.section1.yearBuilt;
  }

  if (intakeData.section2) {
    updates[HUBSPOT.CUSTOM_FIELDS.TENANCY_TYPE] = intakeData.section2.tenancyType;
    updates[HUBSPOT.CUSTOM_FIELDS.LEASE_TERM] = intakeData.section2.leaseTerm;
    updates[HUBSPOT.CUSTOM_FIELDS.RENT_AMOUNT] = intakeData.section2.rentAmount;
  }

  if (intakeData.section3) {
    updates[HUBSPOT.CUSTOM_FIELDS.CURRENT_LAND_USE] = intakeData.section3.currentLandUse;
    updates[HUBSPOT.CUSTOM_FIELDS.PERMITTED_USE] = intakeData.section3.permittedUse;
    updates[HUBSPOT.CUSTOM_FIELDS.ZONING] = intakeData.section3.zoning;
  }

  if (intakeData.section4) {
    updates[HUBSPOT.CUSTOM_FIELDS.BUILDING_CONDITION] = intakeData.section4.buildingCondition;
    updates[HUBSPOT.CUSTOM_FIELDS.IMPROVEMENTS] = intakeData.section4.improvements;
  }

  return update(dealId, updates);
};

export default {
  create,
  createWithAssociations,
  getById,
  update,
  updateStage,
  updatePropertyIntake
};
