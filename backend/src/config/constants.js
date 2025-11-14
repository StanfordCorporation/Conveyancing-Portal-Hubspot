/**
 * Application Constants
 * HubSpot IDs, field names, and business logic constants
 */

export const HUBSPOT = {
  // Association Types (directional - each association has a forward and reverse)
  ASSOCIATION_TYPES: {
    CONTACT_TO_COMPANY: 279,       // Contact → Company (HUBSPOT_DEFINED)
    COMPANY_TO_CONTACT: 280,       // Company → Contact (HUBSPOT_DEFINED)
    
    // Primary Seller associations (USER_DEFINED)
    PRIMARY_SELLER_TO_DEAL: 2,     // Primary Seller (Contact) → Deal (USER_DEFINED)
    DEAL_TO_PRIMARY_SELLER: 1,     // Deal → Primary Seller (Contact) (USER_DEFINED) [REVERSE of 2]
    
    // Standard Contact associations (HUBSPOT_DEFINED)
    CONTACT_TO_DEAL: 4,            // Contact → Deal (HUBSPOT_DEFINED)
    DEAL_TO_CONTACT: 3,            // Deal → Contact (HUBSPOT_DEFINED) [REVERSE of 4]
    
    // Additional Seller associations (USER_DEFINED)
    ADDITIONAL_SELLER_TO_DEAL: 3,  // Additional Seller (Contact) → Deal (USER_DEFINED)
    DEAL_TO_ADDITIONAL_SELLER: 4,  // Deal → Additional Seller (Contact) (USER_DEFINED) [REVERSE of 3]
    
    // Agent associations (USER_DEFINED)
    AGENT_TO_DEAL: 5,              // Agent (Contact) → Deal (USER_DEFINED) - for client-disclosure workflow
    DEAL_TO_AGENT: 6,              // Deal → Agent (Contact) (USER_DEFINED) [REVERSE of 5]
    
    AGENT_LEAD_TO_DEAL: 6,         // Agent (Contact) → Deal (USER_DEFINED) - for agent-lead-creation workflow
    DEAL_TO_AGENT_LEAD: 7,         // Deal → Agent (Contact) (USER_DEFINED) [REVERSE of 6]
    
    // Company associations (HUBSPOT_DEFINED)
    COMPANY_TO_DEAL: 341,          // Company/Agency → Deal (HUBSPOT_DEFINED)
    DEAL_TO_COMPANY: 342,          // Deal → Company/Agency (HUBSPOT_DEFINED) [REVERSE of 341]
  },

  // Permission Types (for Agent Permissions via Association Types)
  PERMISSION_TYPES: {
    ADMIN: 7,           // Admin User (USER_DEFINED) - Full agency management
    VIEW_ALL: 9,        // View All User (USER_DEFINED) - Read-only agency view
    STANDARD: 279,      // Standard (HUBSPOT_DEFINED) - See own leads only
  },

  // Association Categories
  ASSOCIATION_CATEGORIES: {
    USER_DEFINED: 'USER_DEFINED',
    HUBSPOT_DEFINED: 'HUBSPOT_DEFINED',
  },

  // Contact Types
  CONTACT_TYPES: {
    AGENT: 'Agent',
    CLIENT: 'Client',
  },

  // Deal Pipelines
  PIPELINES: {
    FORM_2S: 'default',           // Form 2s (our main pipeline)
    SALES: '1242388962',          // Sales pipeline
    PURCHASES: '1242422748',      // Purchases pipeline
  },

  // Deal Pipeline Stages (Form 2s Pipeline)
  DEAL_STAGES: {
    STAGE_1: '1923713518',
    STAGE_2: '1923713520',
    STAGE_3: '1923682791',
    STAGE_4: '1923682792',
    STAGE_5: '1924069846',
    STAGE_6: '1904359900',
    STAGE_7: '1904359901',
    STAGE_8: '1904359902',
    CLOSED_WON: 'closedwon',
    CLOSED_LOST: 'closedlost',
  },

  // Custom Field Names (Property Disclosure 4 sections)
  CUSTOM_FIELDS: {
    // Section 1: Title & Land Details
    LAND_TITLE_NUMBER: 'land_title_number',
    LAND_SIZE: 'land_size',
    BUILDING_TYPE: 'building_type',
    YEAR_BUILT: 'year_built',

    // Section 2: Tenancy Details
    TENANCY_TYPE: 'tenancy_type',
    LEASE_TERM: 'lease_term',
    RENT_AMOUNT: 'rent_amount',

    // Section 3: Land Use
    CURRENT_LAND_USE: 'current_land_use',
    PERMITTED_USE: 'permitted_use',
    ZONING: 'zoning',

    // Section 4: Buildings & Improvements
    BUILDING_CONDITION: 'building_condition',
    IMPROVEMENTS: 'improvements',
  },

  // API Config
  API_BASE: 'https://api.hubapi.com',
  API_VERSION: 'v3',
};

export const AUTH = {
  // JWT
  JWT_EXPIRY: '7d',
  JWT_ALGORITHM: 'HS256',

  // OTP
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  MAX_OTP_ATTEMPTS: 3,

  // Roles
  ROLES: {
    CLIENT: 'client',
    AGENT: 'agent',
  },
};

export const VALIDATION = {
  // Email regex
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone regex (basic international)
  PHONE_REGEX: /^[\d\s\+\-\(\)]{7,}$/,

  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
};

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
};

export default {
  HUBSPOT,
  AUTH,
  VALIDATION,
  PAGINATION,
};
