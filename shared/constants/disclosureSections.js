/**
 * Property Disclosure Sections
 * 5-section disclosure framework
 */

export const DISCLOSURE_SECTIONS = {
  SECTION_1: {
    id: 1,
    name: 'Title Details & Encumbrances',
    fields: [
      { id: 'body_corporate', label: 'Body Corporate', type: 'boolean' },
      { id: 'registered_encumbrances', label: 'Registered Encumbrances', type: 'boolean' },
      { id: 'registered_encumbrance_details', label: 'Details', type: 'text', conditional: 'registered_encumbrances' },
      { id: 'unregistered_encumbrances', label: 'Unregistered Encumbrances', type: 'boolean' },
      { id: 'unregistered_encumbrance_details', label: 'Details', type: 'text', conditional: 'unregistered_encumbrances' }
    ]
  },
  SECTION_2: {
    id: 2,
    name: 'Rental Agreement/Tenancy',
    fields: [
      { id: 'tenancy_agreement', label: 'Tenancy Agreement', type: 'boolean' },
      { id: 'informal_rental', label: 'Informal Rental', type: 'boolean' },
      { id: 'tenancy_agreement_last_rental_increase', label: 'Last Rental Increase', type: 'date', conditional: 'tenancy_agreement' },
      { id: 'tenancy_agreement_lease_start_date', label: 'Lease Start Date', type: 'date', conditional: 'tenancy_agreement' },
      { id: 'tenancy_agreement_lease_end_date', label: 'Lease End Date', type: 'date', conditional: 'tenancy_agreement' },
      { id: 'tenancy_agreement_rent_and_bond_payable', label: 'Rent & Bond Payable', type: 'text', conditional: 'tenancy_agreement' },
      { id: 'tenancy_agreement_upload', label: 'Upload Agreement', type: 'file', conditional: 'tenancy_agreement' }
    ]
  },
  SECTION_3: {
    id: 3,
    name: 'Land Use, Planning & Environment',
    fields: [
      { id: 'resume_notice', label: 'Resume Notice', type: 'boolean' },
      { id: 'environmental_register', label: 'Environmental Register', type: 'boolean' },
      { id: 'environmental_register_details', label: 'Details', type: 'text', conditional: 'environmental_register' },
      { id: 'government_notice', label: 'Government Notice', type: 'boolean' },
      { id: 'government_notice_details', label: 'Details', type: 'text', conditional: 'government_notice' },
      { id: 'tree_order', label: 'Tree Preservation Order', type: 'boolean' },
      { id: 'tree_order_details', label: 'Details', type: 'text', conditional: 'tree_order' },
      { id: 'heritage_act', label: 'Heritage Protection', type: 'boolean' },
      { id: 'heritage_act_details', label: 'Details', type: 'text', conditional: 'heritage_act' }
    ]
  },
  SECTION_4: {
    id: 4,
    name: 'Buildings & Structures',
    fields: [
      { id: 'swimming_pool', label: 'Swimming Pool/Spa', type: 'boolean' },
      { id: 'owner_builder', label: 'Owner Builder Work', type: 'boolean' },
      { id: 'owner_builder_uploads', label: 'Upload Certificates', type: 'file', conditional: 'owner_builder' },
      { id: 'enforcement_notice', label: 'Enforcement Notice', type: 'boolean' },
      { id: 'enforcement_notice_details', label: 'Details', type: 'text', conditional: 'enforcement_notice' },
      { id: 'enforcement_notice_uploads', label: 'Upload Notices', type: 'file', conditional: 'enforcement_notice' }
    ]
  },
  SECTION_5: {
    id: 5,
    name: 'Rates & Services',
    fields: [
      { id: 'rates_services_upload', label: 'Rates Notice Upload', type: 'file' },
      { id: 'water_rates_upload', label: 'Water Notice Upload', type: 'file' }
    ]
  }
};

// Helper function to get all field IDs
export const getAllFieldIds = () => {
  return Object.values(DISCLOSURE_SECTIONS).flatMap(section =>
    section.fields.map(field => field.id)
  );
};

// Helper function to get section by ID
export const getSectionById = (sectionId) => {
  return Object.values(DISCLOSURE_SECTIONS).find(section => section.id === sectionId);
};

// Helper function to check if field should be visible based on conditional logic
export const isFieldVisible = (fieldId, formData) => {
  let field = null;
  let section = null;

  // Find the field across all sections
  for (const sec of Object.values(DISCLOSURE_SECTIONS)) {
    const foundField = sec.fields.find(f => f.id === fieldId);
    if (foundField) {
      field = foundField;
      section = sec;
      break;
    }
  }

  if (!field) return false;

  // If no conditional, always visible
  if (!field.conditional) return true;

  // Check if conditional field is true
  return formData[field.conditional] === true || formData[field.conditional] === 'yes';
};

export default DISCLOSURE_SECTIONS;
