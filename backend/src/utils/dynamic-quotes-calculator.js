/**
 * Dynamic Quote Calculator
 *
 * Calculates search costs based on property questionnaire data
 * Updates dynamically as questionnaire answers change
 */

// Base searches (always included unless conditions met)
const baseSearches = [
  {
    name: 'Title Search',
    cost: 39.49,
    condition: 'title_search_done', // Excluded if title_search_done = 'yes' in client data
    excludeWhen: 'yes',
    dealCondition: 'agent_title_search', // Also excluded if agent did title search
    dealExcludeWhen: 'Yes' // Note: HubSpot returns capitalized "Yes"
  },
  {
    name: 'Plan Image Search',
    cost: 40.85,
    condition: null, // Always included
    excludeWhen: null,
    dealCondition: null,
    dealExcludeWhen: null
  }
];

// Conditional searches (triggered by questionnaire answers)
const conditionalSearches = [
  {
    name: 'Information Certificate',
    cost: 161.47,
    condition: 'body_corporate',
    triggerValues: ['yes', 'unsure'],
    section: 1,
    notes: 'Body Corporate - Information Certificate'
  },
  {
    name: 'CMS + Dealing Certificate',
    cost: 87.89,
    condition: 'body_corporate',
    triggerValues: ['yes', 'unsure'],
    section: 1,
    notes: 'Body Corporate - CMS + Dealing Certificate'
  },
  {
    name: 'TMR Search',
    cost: 67.01,
    condition: 'resume_notice',
    triggerValues: ['yes', 'unsure'],
    section: 3,
    notes: 'Transport and Main Roads Search'
  },
  {
    name: 'DES: Contaminated Land Search',
    cost: 110.09,
    condition: 'environmental_register',
    triggerValues: ['yes', 'unsure'],
    section: 3,
    notes: 'Department of Environment and Science - Contaminated Land'
  },
  {
    name: 'DES: Heritage Search',
    cost: 95.14,
    condition: 'heritage_act',
    triggerValues: ['yes', 'unsure'],
    section: 3,
    notes: 'Department of Environment and Science - Heritage Act'
  }
];

/**
 * Calculate quote based on property questionnaire data
 *
 * @param {Object} propertyData - Questionnaire answers from the deal
 * @param {Object} clientData - Client-specific data (e.g., title_search_done from contact)
 * @param {Object} dealData - Deal-specific data (e.g., agent_title_search from deal)
 * @returns {Object} Quote breakdown with total cost and itemized searches
 */
export function calculateQuote(propertyData = {}, clientData = {}, dealData = {}) {
  const quote = {
    baseSearches: [],
    conditionalSearches: [],
    baseTotal: 0,
    conditionalTotal: 0,
    grandTotal: 0,
    breakdown: []
  };

  // Calculate base searches
  baseSearches.forEach(search => {
    let isIncluded = true;
    let exclusionReason = null;

    // Check contact-level exclusion (e.g., title_search_done on contact)
    if (search.condition && search.excludeWhen) {
      const clientFieldValue = clientData[search.condition];
      if (clientFieldValue === search.excludeWhen) {
        isIncluded = false;
        exclusionReason = `Excluded: ${search.condition} = ${clientFieldValue} (contact)`;
      }
    }

    // Check deal-level exclusion (e.g., agent_title_search on deal)
    if (isIncluded && search.dealCondition && search.dealExcludeWhen) {
      const dealFieldValue = dealData[search.dealCondition];
      if (dealFieldValue === search.dealExcludeWhen) {
        isIncluded = false;
        exclusionReason = `Excluded: ${search.dealCondition} = ${dealFieldValue} (agent completed)`;
      }
    }

    if (isIncluded) {
      quote.baseSearches.push({
        name: search.name,
        cost: search.cost,
        type: 'base'
      });
      quote.baseTotal += search.cost;
      quote.breakdown.push({
        name: search.name,
        cost: search.cost,
        type: 'base',
        included: true,
        reason: 'Always included'
      });
    } else {
      quote.breakdown.push({
        name: search.name,
        cost: 0,
        type: 'base',
        included: false,
        reason: exclusionReason
      });
    }
  });

  // Calculate conditional searches
  conditionalSearches.forEach(search => {
    const fieldValue = propertyData[search.condition];
    const isRequired = search.triggerValues.includes(fieldValue);

    if (isRequired) {
      quote.conditionalSearches.push({
        name: search.name,
        cost: search.cost,
        type: 'conditional',
        section: search.section,
        trigger: `${search.condition} = ${fieldValue}`
      });
      quote.conditionalTotal += search.cost;
      quote.breakdown.push({
        name: search.name,
        cost: search.cost,
        type: 'conditional',
        included: true,
        reason: `Triggered by: ${search.condition} = "${fieldValue}"`,
        section: search.section,
        notes: search.notes
      });
    } else {
      quote.breakdown.push({
        name: search.name,
        cost: 0,
        type: 'conditional',
        included: false,
        reason: fieldValue ? `Not required: ${search.condition} = "${fieldValue}"` : `Not answered: ${search.condition}`,
        section: search.section,
        notes: search.notes
      });
    }
  });

  // Calculate grand total
  quote.grandTotal = quote.baseTotal + quote.conditionalTotal;

  // Round all costs to 2 decimal places
  quote.baseTotal = parseFloat(quote.baseTotal.toFixed(2));
  quote.conditionalTotal = parseFloat(quote.conditionalTotal.toFixed(2));
  quote.grandTotal = parseFloat(quote.grandTotal.toFixed(2));

  return quote;
}

/**
 * Get all search definitions for reference
 * @returns {Object} All base and conditional searches
 */
export function getSearchDefinitions() {
  return {
    baseSearches,
    conditionalSearches
  };
}

/**
 * Get fields that trigger conditional searches
 * @returns {Array} List of field names that affect quote calculation
 */
export function getQuoteRelevantFields() {
  const fields = new Set();

  // Add base search conditions
  baseSearches.forEach(search => {
    if (search.condition) {
      fields.add(search.condition);
    }
  });

  // Add conditional search triggers
  conditionalSearches.forEach(search => {
    fields.add(search.condition);
  });

  return Array.from(fields);
}

export default {
  calculateQuote,
  getSearchDefinitions,
  getQuoteRelevantFields
};
