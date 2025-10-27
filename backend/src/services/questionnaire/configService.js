/**
 * Questionnaire Config Service
 * Loads and manages the questionnaire configuration from questionnaire.json
 * Provides methods to retrieve questions, sections, and conditional dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class QuestionnaireConfigService {
  constructor() {
    this.config = null;
    this.initialized = false;
    this.configPath = path.join(__dirname, '../../config/questionnaire.json');
  }

  /**
   * Initialize the config service by loading questionnaire.json
   * Called once at server startup
   */
  async initialize() {
    try {
      if (this.initialized) {
        console.log('[ConfigService] Already initialized, skipping...');
        return;
      }

      console.log(`[ConfigService] 📋 Loading questionnaire config from: ${this.configPath}`);

      const fileContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(fileContent);

      this.initialized = true;
      console.log(`[ConfigService] ✅ Config loaded successfully with ${this.config.sections.length} sections`);

      // Log summary
      let totalQuestions = 0;
      this.config.sections.forEach(section => {
        totalQuestions += section.questions.length;
      });
      console.log(`[ConfigService] 📊 Total questions: ${totalQuestions}`);

    } catch (error) {
      console.error('[ConfigService] ❌ Error initializing config:', error.message);
      throw new Error(`Failed to load questionnaire config: ${error.message}`);
    }
  }

  /**
   * Get the complete questionnaire configuration
   * @returns {Object} Full questionnaire config with all sections and questions
   */
  getQuestionnaireConfig() {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Get a specific section by section number
   * @param {string|number} sectionNumber - The section number (1, 2, 3, 4, or 5)
   * @returns {Object|null} Section object or null if not found
   */
  getSection(sectionNumber) {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    const sectionStr = String(sectionNumber);
    const section = this.config.sections.find(s => s.section_number === sectionStr);

    if (!section) {
      console.warn(`[ConfigService] ⚠️  Section ${sectionNumber} not found`);
      return null;
    }

    return section;
  }

  /**
   * Get all questions for a specific section
   * @param {string|number} sectionNumber - The section number
   * @returns {Array} Array of question objects
   */
  getSectionQuestions(sectionNumber) {
    const section = this.getSection(sectionNumber);
    return section ? section.questions : [];
  }

  /**
   * Get a specific question by section and field name
   * @param {string|number} sectionNumber - The section number
   * @param {string} fieldName - The form_field_name
   * @returns {Object|null} Question object or null if not found
   */
  getQuestion(sectionNumber, fieldName) {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    const section = this.getSection(sectionNumber);
    if (!section) return null;

    const question = section.questions.find(q => q.form_field_name === fieldName);

    if (!question) {
      console.warn(`[ConfigService] ⚠️  Question ${fieldName} not found in section ${sectionNumber}`);
      return null;
    }

    return question;
  }

  /**
   * Get all questions that depend on a specific field (conditional logic)
   * @param {string} fieldName - The form_field_name to check dependencies for
   * @returns {Array} Array of questions that depend on this field
   */
  getDependentQuestions(fieldName) {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    const dependents = [];

    this.config.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.conditional && question.conditional_on.question === fieldName) {
          dependents.push({
            ...question,
            section_number: section.section_number,
            section_title: section.section_title
          });
        }
      });
    });

    return dependents;
  }

  /**
   * Get all conditional dependencies for a specific field
   * Returns the field(s) that this field depends on
   * @param {string} fieldName - The form_field_name to check
   * @returns {Object|null} The conditional_on object or null if not conditional
   */
  getConditionalDependency(fieldName) {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    for (const section of this.config.sections) {
      const question = section.questions.find(q => q.form_field_name === fieldName);

      if (question && question.conditional) {
        return {
          fieldName,
          dependsOn: question.conditional_on.question,
          expectedValue: question.conditional_on.value,
          question
        };
      }
    }

    return null;
  }

  /**
   * Get the HubSpot property name for a form field
   * @param {string} fieldName - The form_field_name
   * @returns {string|null} The HubSpot property name or null if not found
   */
  getHubSpotPropertyName(fieldName) {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    for (const section of this.config.sections) {
      const question = section.questions.find(q => q.form_field_name === fieldName);

      if (question) {
        return question.HubSpot_Property_Name;
      }
    }

    return null;
  }

  /**
   * Get all field mappings (form field name -> HubSpot property name)
   * @returns {Object} Object mapping form field names to HubSpot property names
   */
  getFieldMappings() {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    const mappings = {};

    this.config.sections.forEach(section => {
      section.questions.forEach(question => {
        mappings[question.form_field_name] = {
          hsPropertyName: question.HubSpot_Property_Name,
          hsPropertyType: question.HubSpot_Property_Type,
          hsPropertyLabel: question.HubSpot_Property_Label,
          formFieldType: question.form_field_type
        };
      });
    });

    return mappings;
  }

  /**
   * Get all questions across all sections (flattened)
   * @returns {Array} Array of all questions with section information
   */
  getAllQuestions() {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    const allQuestions = [];

    this.config.sections.forEach(section => {
      section.questions.forEach(question => {
        allQuestions.push({
          ...question,
          section_number: section.section_number,
          section_title: section.section_title
        });
      });
    });

    return allQuestions;
  }

  /**
   * Validate that a form data object matches the schema
   * Returns validation errors if any
   * @param {Object} formData - The form data to validate (section_number and fields)
   * @returns {Object} { valid: boolean, errors: [] }
   */
  validateFormData(formData) {
    const errors = [];
    const section = this.getSection(formData.section_number);

    if (!section) {
      errors.push(`Invalid section number: ${formData.section_number}`);
      return { valid: false, errors };
    }

    // Check required fields
    section.questions.forEach(question => {
      if (question.required && !formData[question.form_field_name]) {
        errors.push(`Required field missing: ${question.form_question}`);
      }
    });

    // Check that only valid fields are present
    const validFieldNames = new Set(section.questions.map(q => q.form_field_name));
    Object.keys(formData).forEach(key => {
      if (key !== 'section_number' && !validFieldNames.has(key)) {
        errors.push(`Unknown field: ${key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get field type for validation purposes
   * @param {string} fieldName - The form_field_name
   * @returns {string|null} The form_field_type or null if not found
   */
  getFieldType(fieldName) {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    for (const section of this.config.sections) {
      const question = section.questions.find(q => q.form_field_name === fieldName);
      if (question) {
        return question.form_field_type;
      }
    }

    return null;
  }

  /**
   * Get field options for radio/select/checkbox fields
   * @param {string} fieldName - The form_field_name
   * @returns {Array|null} Array of options or null if field doesn't exist or has no options
   */
  getFieldOptions(fieldName) {
    if (!this.initialized) {
      throw new Error('ConfigService not initialized. Call initialize() first.');
    }

    for (const section of this.config.sections) {
      const question = section.questions.find(q => q.form_field_name === fieldName);
      if (question && question.options) {
        return question.options;
      }
    }

    return null;
  }
}

// Create singleton instance
const configService = new QuestionnaireConfigService();

export default configService;
