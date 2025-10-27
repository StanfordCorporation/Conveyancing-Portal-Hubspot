/**
 * Property Mapping Configuration
 * Maps form field names to HubSpot deal properties
 * This is derived from questionnaire.json and serves as documentation
 *
 * Structure:
 * - fieldName (form_field_name): String key used in form
 * - hsPropertyName: HubSpot deal property name
 * - hsPropertyType: HubSpot property data type (text, enumeration, date, number, checkbox, etc)
 * - formFieldType: Frontend form field type
 * - section: Which questionnaire section this field belongs to
 * - required: Whether field is required
 * - fileUpload: Whether field stores file IDs
 */

const propertyMapping = {
  // Section 1: Title Details and Encumbrances
  body_corporate: {
    hsPropertyName: 'body_corporate',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 1,
    required: true,
    conditional: false
  },

  registered_encumbrances: {
    hsPropertyName: 'registered_encumbrances',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 1,
    required: true,
    conditional: false
  },

  registered_encumbrance_details: {
    hsPropertyName: 'registered_encumbrance_details',
    hsPropertyType: 'text',
    formFieldType: 'textarea',
    section: 1,
    required: false,
    conditional: true,
    conditionalOn: { field: 'registered_encumbrances', value: 'yes' }
  },

  unregistered_encumbrances: {
    hsPropertyName: 'unregistered_encumbrances',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 1,
    required: true,
    conditional: false
  },

  unregistered_encumbrance_details: {
    hsPropertyName: 'unregistered_encumbrance_details',
    hsPropertyType: 'text',
    formFieldType: 'textarea',
    section: 1,
    required: false,
    conditional: true,
    conditionalOn: { field: 'unregistered_encumbrances', value: 'yes' }
  },

  // Section 2: Rental Agreement / Tenancy
  tenancy_agreement: {
    hsPropertyName: 'tenancy_agreement',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 2,
    required: true,
    conditional: false
  },

  informal_rental: {
    hsPropertyName: 'informal_rental',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 2,
    required: false,
    conditional: true,
    conditionalOn: { field: 'tenancy_agreement', value: 'no' }
  },

  tenancy_agreement_last_rental_increase: {
    hsPropertyName: 'tenancy_agreement_last_rental_increase',
    hsPropertyType: 'date',
    formFieldType: 'date',
    section: 2,
    required: false,
    conditional: true,
    conditionalOn: { field: 'tenancy_agreement', value: 'yes' }
  },

  tenancy_agreement_lease_start_date: {
    hsPropertyName: 'tenancy_agreement_lease_start_date',
    hsPropertyType: 'date',
    formFieldType: 'date',
    section: 2,
    required: false,
    conditional: true,
    conditionalOn: { field: 'tenancy_agreement', value: 'yes' }
  },

  tenancy_agreement_lease_end_date: {
    hsPropertyName: 'tenancy_agreement_lease_end_date',
    hsPropertyType: 'date',
    formFieldType: 'date',
    section: 2,
    required: false,
    conditional: true,
    conditionalOn: { field: 'tenancy_agreement', value: 'yes' }
  },

  tenancy_agreement_rent_and_bond_payable: {
    hsPropertyName: 'tenancy_agreement_rent_and_bond_payable',
    hsPropertyType: 'text',
    formFieldType: 'text',
    section: 2,
    required: false,
    conditional: true,
    conditionalOn: { field: 'tenancy_agreement', value: 'yes' }
  },

  tenancy_agreement_upload: {
    hsPropertyName: 'tenancy_agreement_upload',
    hsPropertyType: 'text',
    formFieldType: 'file',
    section: 2,
    required: false,
    conditional: true,
    conditionalOn: { field: 'tenancy_agreement', value: 'yes' },
    fileUpload: true,
    maxFiles: 10,
    maxFileSize: 25 // MB
  },

  // Section 3: Land Use, Planning & Environment
  resume_notice: {
    hsPropertyName: 'resume_notice',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 3,
    required: true,
    conditional: false
  },

  environmental_register: {
    hsPropertyName: 'environmental_register',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 3,
    required: true,
    conditional: false
  },

  environmental_register_details: {
    hsPropertyName: 'environmental_register_details',
    hsPropertyType: 'text',
    formFieldType: 'textarea',
    section: 3,
    required: false,
    conditional: true,
    conditionalOn: { field: 'environmental_register', value: 'yes' }
  },

  government_notice: {
    hsPropertyName: 'government_notice',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 3,
    required: true,
    conditional: false
  },

  government_notice_details: {
    hsPropertyName: 'government_notice_details',
    hsPropertyType: 'text',
    formFieldType: 'textarea',
    section: 3,
    required: false,
    conditional: true,
    conditionalOn: { field: 'government_notice', value: 'yes' }
  },

  tree_order: {
    hsPropertyName: 'tree_order',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 3,
    required: true,
    conditional: false
  },

  tree_order_details: {
    hsPropertyName: 'tree_order_details',
    hsPropertyType: 'text',
    formFieldType: 'textarea',
    section: 3,
    required: false,
    conditional: true,
    conditionalOn: { field: 'tree_order', value: 'yes' }
  },

  heritage_act: {
    hsPropertyName: 'heritage_act',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 3,
    required: true,
    conditional: false
  },

  heritage_act_details: {
    hsPropertyName: 'heritage_act_details',
    hsPropertyType: 'text',
    formFieldType: 'textarea',
    section: 3,
    required: false,
    conditional: true,
    conditionalOn: { field: 'heritage_act', value: 'yes' }
  },

  // Section 4: Buildings & Structures
  swimming_pool: {
    hsPropertyName: 'swimming_pool',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 4,
    required: true,
    conditional: false
  },

  owner_builder: {
    hsPropertyName: 'owner_builder',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 4,
    required: true,
    conditional: false
  },

  owner_builder_uploads: {
    hsPropertyName: 'owner_builder_uploads',
    hsPropertyType: 'text',
    formFieldType: 'file',
    section: 4,
    required: false,
    conditional: true,
    conditionalOn: { field: 'owner_builder', value: 'yes' },
    fileUpload: true,
    maxFiles: 10,
    maxFileSize: 25 // MB
  },

  enforcement_notice: {
    hsPropertyName: 'enforcement_notice',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 4,
    required: true,
    conditional: false
  },

  enforcement_notice_details: {
    hsPropertyName: 'enforcement_notice_details',
    hsPropertyType: 'text',
    formFieldType: 'textarea',
    section: 4,
    required: false,
    conditional: true,
    conditionalOn: { field: 'enforcement_notice', value: 'yes' }
  },

  enforcement_notice_uploads: {
    hsPropertyName: 'enforcement_notice_uploads',
    hsPropertyType: 'text',
    formFieldType: 'file',
    section: 4,
    required: false,
    conditional: true,
    conditionalOn: { field: 'enforcement_notice', value: 'yes' },
    fileUpload: true,
    maxFiles: 10,
    maxFileSize: 25 // MB
  },

  // Section 5: Rates & Levies
  // (Assuming section 5 exists - add rates-related fields when available)
  council_rates: {
    hsPropertyName: 'council_rates',
    hsPropertyType: 'enumeration',
    formFieldType: 'radio',
    section: 5,
    required: true,
    conditional: false
  },

  rates_and_levies_upload: {
    hsPropertyName: 'rates_and_levies_upload',
    hsPropertyType: 'text',
    formFieldType: 'file',
    section: 5,
    required: false,
    conditional: false,
    fileUpload: true,
    maxFiles: 10,
    maxFileSize: 25 // MB
  }
};

/**
 * Get all mappings
 */
export const getAllMappings = () => propertyMapping;

/**
 * Get mapping for a specific field
 */
export const getFieldMapping = (fieldName) => propertyMapping[fieldName] || null;

/**
 * Get all mappings for a specific section
 */
export const getSectionMappings = (sectionNumber) => {
  return Object.entries(propertyMapping)
    .filter(([_, mapping]) => mapping.section === sectionNumber)
    .reduce((acc, [fieldName, mapping]) => {
      acc[fieldName] = mapping;
      return acc;
    }, {});
};

/**
 * Get all file upload fields
 */
export const getFileUploadFields = () => {
  return Object.entries(propertyMapping)
    .filter(([_, mapping]) => mapping.fileUpload)
    .map(([fieldName, mapping]) => ({
      fieldName,
      ...mapping
    }));
};

/**
 * Get HubSpot property name for a form field
 */
export const getHubSpotPropertyName = (fieldName) => {
  const mapping = propertyMapping[fieldName];
  return mapping ? mapping.hsPropertyName : null;
};

/**
 * Validate if a field is a file upload field
 */
export const isFileUploadField = (fieldName) => {
  const mapping = propertyMapping[fieldName];
  return mapping ? mapping.fileUpload === true : false;
};

/**
 * Get file size limit for a field
 */
export const getFileSizeLimit = (fieldName) => {
  const mapping = propertyMapping[fieldName];
  return mapping && mapping.maxFileSize ? mapping.maxFileSize : 25; // Default 25MB
};

/**
 * Get max files limit for a field
 */
export const getMaxFilesLimit = (fieldName) => {
  const mapping = propertyMapping[fieldName];
  return mapping && mapping.maxFiles ? mapping.maxFiles : 10; // Default 10 files
};

export default {
  propertyMapping,
  getAllMappings,
  getFieldMapping,
  getSectionMappings,
  getFileUploadFields,
  getHubSpotPropertyName,
  isFileUploadField,
  getFileSizeLimit,
  getMaxFilesLimit
};
