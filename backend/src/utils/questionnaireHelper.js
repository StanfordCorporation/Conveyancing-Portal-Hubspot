import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for questionnaire schema (in-memory)
let cachedSchema = null;

/**
 * Load questionnaire schema from JSON file (cached)
 * @returns {Object} Questionnaire schema
 */
export function getQuestionnaireSchema() {
  if (!cachedSchema) {
    const schemaPath = path.join(__dirname, '../config/questionnaire.json');
    cachedSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  }
  return cachedSchema;
}

/**
 * Get field mapping for HubSpot by field name
 * @param {string} fieldName - Form field name
 * @returns {Object|null} Field mapping object or null
 */
export function getFieldMapping(fieldName) {
  const schema = getQuestionnaireSchema();

  for (const section of schema.sections) {
    const question = section.questions.find(q => q.form_field_name === fieldName);
    if (question) {
      return {
        hsPropertyName: question.HubSpot_Property_Name,
        required: question.required,
        conditional: question.conditional,
        type: question.form_field_type,
        options: question.options || null
      };
    }
  }
  return null;
}

/**
 * Get all HubSpot property names from schema
 * @returns {Array<string>} Array of HubSpot property names
 */
export function getAllHubSpotProperties() {
  const schema = getQuestionnaireSchema();
  const properties = [];

  schema.sections.forEach(section => {
    section.questions.forEach(question => {
      properties.push(question.HubSpot_Property_Name);
    });
  });

  return properties;
}

/**
 * Get all mappings organized by form field name
 * @returns {Object} Mappings keyed by form field name
 */
export function getAllMappings() {
  const schema = getQuestionnaireSchema();
  const mappings = {};

  schema.sections.forEach((section, index) => {
    section.questions.forEach(question => {
      mappings[question.form_field_name] = {
        hsPropertyName: question.HubSpot_Property_Name,
        hsPropertyType: question.HubSpot_Property_Type,
        formFieldType: question.form_field_type,
        section: index,
        required: question.required,
        conditional: question.conditional,
        options: question.options || null
      };
    });
  });

  return mappings;
}

/**
 * Get section mappings by section number
 * @param {number} sectionNumber - Section index (0-based)
 * @returns {Object|null} Section data with questions
 */
export function getSectionMappings(sectionNumber) {
  const schema = getQuestionnaireSchema();
  return schema.sections[sectionNumber] || null;
}

/**
 * Clear cached schema (useful for testing or reloading)
 */
export function clearSchemaCache() {
  cachedSchema = null;
}
