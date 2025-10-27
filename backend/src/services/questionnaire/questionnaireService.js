import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Questionnaire Service
 * Handles form validation, conditional logic evaluation, and property mapping
 */

import configService from './configService.js';

class QuestionnaireService {
  constructor() {
    this.configService = configService;
  }

  /**
   * Get the questionnaire structure for a specific section
   * This is what the frontend requests to render the form
   * @param {string|number} sectionNumber - The section number
   * @returns {Object} Section data with all questions
   */
  getSectionStructure(sectionNumber) {
    const section = this.configService.getSection(sectionNumber);

    if (!section) {
      throw new Error(`Section ${sectionNumber} not found`);
    }

    return {
      section_number: section.section_number,
      section_title: section.section_title,
      questions: section.questions
    };
  }

  /**
   * Get complete questionnaire structure with all sections
   * @returns {Object} Complete questionnaire structure
   */
  getCompleteStructure() {
    const config = this.configService.getQuestionnaireConfig();

    return {
      sections: config.sections.map(section => ({
        section_number: section.section_number,
        section_title: section.section_title,
        question_count: section.questions.length
      })),
      total_sections: config.sections.length,
      total_questions: this.configService.getAllQuestions().length
    };
  }

  /**
   * Determine which questions should be visible based on form data
   * Evaluates conditional logic to show/hide questions
   * @param {string|number} sectionNumber - The section number
   * @param {Object} formData - Current form data values
   * @returns {Array} Visible questions for this section
   */
  getVisibleQuestions(sectionNumber, formData = {}) {
    const section = this.configService.getSection(sectionNumber);

    if (!section) {
      throw new Error(`Section ${sectionNumber} not found`);
    }

    return section.questions.filter(question => {
      // If not conditional, always show
      if (!question.conditional) {
        return true;
      }

      // If conditional, check if dependency is met
      const dependencyField = question.conditional_on.question;
      const expectedValue = question.conditional_on.value;

      // Return true if the dependency value matches expected value
      return formData[dependencyField] === expectedValue;
    });
  }

  /**
   * Validate form data for a specific section
   * Checks required fields and field types
   * @param {string|number} sectionNumber - The section number
   * @param {Object} formData - The form data to validate
   * @param {Object} options - Validation options
   *   - checkConditionals: boolean (default: true) - Only validate visible questions
   *   - strict: boolean (default: false) - Reject unknown fields
   * @returns {Object} { valid: boolean, errors: [] }
   */
  validateSectionData(sectionNumber, formData, options = {}) {
    const { checkConditionals = true, strict = false } = options;
    const errors = [];

    const section = this.configService.getSection(sectionNumber);
    if (!section) {
      errors.push(`Invalid section number: ${sectionNumber}`);
      return { valid: false, errors };
    }

    // Get questions to validate based on conditionals
    const questionsToValidate = checkConditionals
      ? this.getVisibleQuestions(sectionNumber, formData)
      : section.questions;

    const validFieldNames = new Set(questionsToValidate.map(q => q.form_field_name));

    // Validate each question
    questionsToValidate.forEach(question => {
      const value = formData[question.form_field_name];

      // Check required fields
      if (question.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: question.form_field_name,
          message: `${question.form_question} is required`,
          type: 'required'
        });
      }

      // Validate field type if value is provided
      if (value !== undefined && value !== null && value !== '') {
        this._validateFieldType(question, value, errors);
      }
    });

    // Check for unknown fields in strict mode
    if (strict) {
      Object.keys(formData).forEach(key => {
        if (key !== 'section_number' && !validFieldNames.has(key)) {
          errors.push({
            field: key,
            message: `Unknown field: ${key}`,
            type: 'unknown_field'
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      validated_fields: Array.from(validFieldNames)
    };
  }

  /**
   * Validate all questionnaire data across multiple sections
   * @param {Object} allSectionsData - Object with section_number as key and form data as value
   * @param {Object} options - Validation options
   * @returns {Object} { valid: boolean, errors: {} } - errors keyed by section
   */
  validateAllSections(allSectionsData, options = {}) {
    const allErrors = {};
    let isValid = true;

    const config = this.configService.getQuestionnaireConfig();

    config.sections.forEach(section => {
      const sectionNumber = section.section_number;
      const sectionData = allSectionsData[sectionNumber] || {};

      const validation = this.validateSectionData(sectionNumber, sectionData, options);

      if (!validation.valid) {
        allErrors[sectionNumber] = validation.errors;
        isValid = false;
      }
    });

    return {
      valid: isValid,
      errors: allErrors
    };
  }

  /**
   * Map form data to HubSpot properties
   * Converts form field names to HubSpot property names
   * Excludes empty/null/undefined values
   * @param {Object} formData - The form data
   * @returns {Object} Mapped object with HubSpot property names
   */
  mapFormDataToHubSpot(formData) {
    const hubSpotData = {};
    const fieldMappings = this.configService.getFieldMappings();

    Object.entries(formData).forEach(([fieldName, value]) => {
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Skip section_number (metadata, not a form field)
      if (fieldName === 'section_number') {
        return;
      }

      const mapping = fieldMappings[fieldName];

      if (mapping) {
        const hsPropertyName = mapping.hsPropertyName;

        // Transform value if needed based on field type
        hubSpotData[hsPropertyName] = this._transformValueForHubSpot(
          value,
          mapping.formFieldType,
          mapping.hsPropertyType
        );
      }
    });

    return hubSpotData;
  }

  /**
   * Map HubSpot data back to form data
   * Converts HubSpot property names to form field names
   * Useful when loading existing data
   * @param {Object} hubSpotData - Data from HubSpot (property names as keys)
   * @returns {Object} Form data with field names as keys
   */
  mapHubSpotDataToForm(hubSpotData) {
    const formData = {};
    const fieldMappings = this.configService.getFieldMappings();

    // Create reverse mapping
    const reverseMapping = {};
    Object.entries(fieldMappings).forEach(([fieldName, mapping]) => {
      reverseMapping[mapping.hsPropertyName] = {
        fieldName,
        formFieldType: mapping.formFieldType,
        hsPropertyType: mapping.hsPropertyType
      };
    });

    // Map HubSpot properties back to form fields
    Object.entries(hubSpotData).forEach(([hsPropertyName, value]) => {
      const mapping = reverseMapping[hsPropertyName];

      if (mapping) {
        formData[mapping.fieldName] = this._transformValueFromHubSpot(
          value,
          mapping.formFieldType
        );
      }
    });

    return formData;
  }

  /**
   * Get all required fields for a section
   * @param {string|number} sectionNumber - The section number
   * @returns {Array} Array of required field names
   */
  getRequiredFields(sectionNumber) {
    const section = this.configService.getSection(sectionNumber);

    if (!section) {
      throw new Error(`Section ${sectionNumber} not found`);
    }

    return section.questions
      .filter(q => q.required)
      .map(q => q.form_field_name);
  }

  /**
   * Check if all required fields are filled
   * Takes conditionals into account
   * @param {string|number} sectionNumber - The section number
   * @param {Object} formData - The form data
   * @returns {Object} { complete: boolean, missing: [] }
   */
  checkSectionCompletion(sectionNumber, formData) {
    const visibleQuestions = this.getVisibleQuestions(sectionNumber, formData);
    const requiredQuestions = visibleQuestions.filter(q => q.required);

    const missing = [];

    requiredQuestions.forEach(question => {
      const value = formData[question.form_field_name];

      if (value === undefined || value === null || value === '') {
        missing.push({
          field: question.form_field_name,
          label: question.form_question
        });
      }
    });

    return {
      complete: missing.length === 0,
      missing,
      required_fields: requiredQuestions.length,
      filled_required_fields: requiredQuestions.length - missing.length
    };
  }

  /**
   * Get field metadata for display purposes
   * @param {string} fieldName - The form_field_name
   * @returns {Object|null} Field metadata or null if not found
   */
  getFieldMetadata(fieldName) {
    const allQuestions = this.configService.getAllQuestions();
    const question = allQuestions.find(q => q.form_field_name === fieldName);

    if (!question) {
      return null;
    }

    return {
      form_question: question.form_question,
      form_field_name: question.form_field_name,
      form_field_type: question.form_field_type,
      required: question.required,
      conditional: question.conditional,
      conditional_on: question.conditional_on,
      options: question.options || null,
      HubSpot_Property_Name: question.HubSpot_Property_Name,
      HubSpot_Property_Type: question.HubSpot_Property_Type,
      HubSpot_Property_Label: question.HubSpot_Property_Label,
      section_number: question.section_number,
      section_title: question.section_title
    };
  }

  // Private helper methods

  /**
   * Validate individual field type
   * @private
   */
  _validateFieldType(question, value, errors) {
    const fieldType = question.form_field_type;
    const fieldName = question.form_field_name;

    switch (fieldType) {
      case 'email':
        if (!this._isValidEmail(value)) {
          errors.push({
            field: fieldName,
            message: `${question.form_question} must be a valid email`,
            type: 'invalid_format'
          });
        }
        break;

      case 'phone':
        if (!this._isValidPhone(value)) {
          errors.push({
            field: fieldName,
            message: `${question.form_question} must be a valid phone number`,
            type: 'invalid_format'
          });
        }
        break;

      case 'date':
        if (!this._isValidDate(value)) {
          errors.push({
            field: fieldName,
            message: `${question.form_question} must be a valid date`,
            type: 'invalid_format'
          });
        }
        break;

      case 'number':
        if (isNaN(value)) {
          errors.push({
            field: fieldName,
            message: `${question.form_question} must be a number`,
            type: 'invalid_format'
          });
        }
        break;

      case 'radio':
      case 'select':
        if (question.options) {
          const validValues = question.options.map(o => o.value);
          if (!validValues.includes(value)) {
            errors.push({
              field: fieldName,
              message: `${question.form_question} has invalid value`,
              type: 'invalid_option'
            });
          }
        }
        break;

      case 'checkbox':
        if (!Array.isArray(value)) {
          errors.push({
            field: fieldName,
            message: `${question.form_question} must be an array`,
            type: 'invalid_format'
          });
        } else if (question.options) {
          const validValues = question.options.map(o => o.value);
          const invalidValues = value.filter(v => !validValues.includes(v));
          if (invalidValues.length > 0) {
            errors.push({
              field: fieldName,
              message: `${question.form_question} has invalid values: ${invalidValues.join(', ')}`,
              type: 'invalid_option'
            });
          }
        }
        break;

      case 'file':
        // File validation happens at upload time
        // Here we just check it's not empty string
        if (typeof value !== 'string' || value.trim() === '') {
          errors.push({
            field: fieldName,
            message: `${question.form_question} file is invalid`,
            type: 'invalid_file'
          });
        }
        break;

      case 'textarea':
      case 'text':
      default:
        // Text fields are generally valid if present
        break;
    }
  }

  /**
   * Transform form value to HubSpot format
   * @private
   */
  _transformValueForHubSpot(value, formFieldType, hsPropertyType) {
    // If it's already a string/number and types are compatible, return as-is
    if (formFieldType === 'checkbox' && Array.isArray(value)) {
      // HubSpot uses semicolon-separated values for multi-select
      return value.join(';');
    }

    if (formFieldType === 'date') {
      // Ensure date is in ISO format
      if (typeof value === 'string') {
        return new Date(value).toISOString().split('T')[0];
      }
      return value;
    }

    // Return as-is for most cases
    return value;
  }

  /**
   * Transform HubSpot value back to form format
   * @private
   */
  _transformValueFromHubSpot(value, formFieldType) {
    if (formFieldType === 'checkbox' && typeof value === 'string') {
      // Split semicolon-separated values back to array
      return value.split(';').filter(v => v.trim() !== '');
    }

    return value;
  }

  /**
   * Validate email format
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (basic)
   * @private
   */
  _isValidPhone(phone) {
    // Allow various phone formats
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Validate date format
   * @private
   */
  _isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
}

// Create singleton instance
const questionnaireService = new QuestionnaireService();

export default questionnaireService;
