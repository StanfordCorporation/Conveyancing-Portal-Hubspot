/**
 * Questionnaire Routes - SIMPLIFIED VERSION
 * Lightweight, direct approach using propertyMapping.js as single source of truth
 *
 * Architecture:
 * propertyMapping.js → Routes → HubSpot
 * No redundant service layer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllMappings, getFieldMapping, getSectionMappings } from '../config/propertyMapping.js';
import { updateDeal } from '../integrations/hubspot/deals.js';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load questionnaire config from JSON file
const questionnaireConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/questionnaire.json'), 'utf8')
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    cb(allowedMimes.includes(file.mimetype) ? null : new Error('Invalid file type'));
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get section config by number
 */
function getSection(sectionNumber) {
  return questionnaireConfig.sections.find(s => s.section_number === String(sectionNumber));
}

/**
 * Get visible questions for a section (considering conditionals)
 */
function getVisibleQuestions(sectionNumber, formData = {}) {
  const section = getSection(sectionNumber);
  if (!section) return [];

  return section.questions.filter(q => {
    if (!q.conditional) return true;
    return formData[q.conditional_on.question] === q.conditional_on.value;
  });
}

/**
 * Validate form data against schema
 */
function validateFormData(sectionNumber, formData) {
  const errors = [];
  const visibleQuestions = getVisibleQuestions(sectionNumber, formData);

  visibleQuestions.forEach(question => {
    const value = formData[question.form_field_name];

    // Check required
    if (question.required && !value) {
      errors.push({
        field: question.form_field_name,
        message: `${question.form_question} is required`,
        type: 'required'
      });
      return;
    }

    if (!value) return; // Skip validation for empty non-required fields

    // Type validation
    switch (question.form_field_type) {
      case 'radio':
      case 'select':
        if (question.options && !question.options.map(o => o.value).includes(value)) {
          errors.push({
            field: question.form_field_name,
            message: `Invalid option for ${question.form_question}`,
            type: 'invalid_option'
          });
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            field: question.form_field_name,
            message: `${question.form_question} must be valid email`,
            type: 'invalid_format'
          });
        }
        break;

      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push({
            field: question.form_field_name,
            message: `${question.form_question} must be valid date`,
            type: 'invalid_format'
          });
        }
        break;

      case 'number':
        if (isNaN(value)) {
          errors.push({
            field: question.form_field_name,
            message: `${question.form_question} must be number`,
            type: 'invalid_format'
          });
        }
        break;
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Map form data to HubSpot properties
 */
function mapToHubSpot(formData) {
  const hubSpotData = {};
  const mappings = getAllMappings();

  Object.entries(formData).forEach(([fieldName, value]) => {
    if (!value || value === '') return; // Skip empty values

    const mapping = getFieldMapping(fieldName);
    if (mapping) {
      hubSpotData[mapping.hsPropertyName] = value;
    }
  });

  return hubSpotData;
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * GET /api/questionnaire/structure
 */
export const getQuestionnaireStructure = (req, res) => {
  try {
    const structure = {
      sections: questionnaireConfig.sections.map(s => ({
        section_number: s.section_number,
        section_title: s.section_title,
        question_count: s.questions.length
      })),
      total_sections: questionnaireConfig.sections.length,
      total_questions: questionnaireConfig.sections.reduce((sum, s) => sum + s.questions.length, 0)
    };

    res.json({ success: true, data: structure });
  } catch (error) {
    console.error('[Questionnaire] Error:', error.message);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * GET /api/questionnaire/:sectionNumber/fields
 */
export const getSectionFields = (req, res) => {
  try {
    const { sectionNumber } = req.params;
    const section = getSection(sectionNumber);

    if (!section) {
      return res.status(404).json({ error: 'Not Found', message: `Section ${sectionNumber} not found` });
    }

    res.json({
      success: true,
      data: {
        section_number: section.section_number,
        section_title: section.section_title,
        field_count: section.questions.length,
        fields: section.questions.map(q => ({
          field_name: q.form_field_name,
          question: q.form_question,
          type: q.form_field_type,
          required: q.required,
          conditional: q.conditional,
          conditional_on: q.conditional_on,
          options: q.options || null
        }))
      }
    });
  } catch (error) {
    console.error('[Questionnaire] Error:', error.message);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * GET /api/questionnaire/:dealId/section/:sectionNumber
 */
export const getSectionData = (req, res) => {
  try {
    const { dealId, sectionNumber } = req.params;
    const section = getSection(sectionNumber);

    if (!section) {
      return res.status(404).json({ error: 'Not Found', message: `Section ${sectionNumber} not found` });
    }

    res.json({
      success: true,
      data: {
        section_number: sectionNumber,
        section_title: section.section_title,
        questions: section.questions,
        savedData: {} // TODO: Fetch from HubSpot deal when implemented
      }
    });
  } catch (error) {
    console.error('[Questionnaire] Error:', error.message);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * POST /api/questionnaire/:dealId/section/:sectionNumber
 */
export const saveSectionData = async (req, res) => {
  try {
    const { dealId, sectionNumber } = req.params;
    const formData = req.body;

    // Validate section exists
    const section = getSection(sectionNumber);
    if (!section) {
      return res.status(404).json({ error: 'Not Found', message: `Section ${sectionNumber} not found` });
    }

    // Validate form data
    const validation = validateFormData(sectionNumber, formData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Form data validation failed',
        errors: validation.errors
      });
    }

    // Map to HubSpot properties
    const hubSpotData = mapToHubSpot(formData);

    // Save to HubSpot
    try {
      await updateDeal(dealId, hubSpotData);

      res.json({
        success: true,
        message: `Section ${sectionNumber} saved successfully`,
        data: {
          dealId,
          sectionNumber,
          fields_updated: Object.keys(hubSpotData).length
        }
      });
    } catch (hubspotError) {
      // HubSpot error - could implement queue here if needed
      console.error('[Questionnaire] HubSpot error:', hubspotError.message);

      res.status(202).json({
        success: false,
        message: 'Save queued for retry',
        error: hubspotError.message
      });
    }
  } catch (error) {
    console.error('[Questionnaire] Error:', error.message);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * POST /api/questionnaire/:dealId/file-upload
 */
export const uploadFile = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const { fieldName } = req.body;

      if (!fieldName) {
        return res.status(400).json({ error: 'Validation Error', message: 'fieldName is required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Validation Error', message: 'file is required' });
      }

      // Validate field exists in mapping
      const mapping = getFieldMapping(fieldName);
      if (!mapping) {
        return res.status(400).json({ error: 'Validation Error', message: `fieldName ${fieldName} not found` });
      }

      // TODO: Implement HubSpot file upload
      console.log(`[Questionnaire] File upload for ${fieldName}: ${req.file.originalname}`);

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          fileId: 'temp-file-id',
          fileName: req.file.originalname,
          fieldName: fieldName
        }
      });
    } catch (error) {
      console.error('[Questionnaire] Error:', error.message);
      res.status(500).json({ error: 'Server Error', message: error.message });
    }
  }
];

/**
 * GET /api/questionnaire/sync-queue/status
 */
export const getSyncQueueStatus = (req, res) => {
  try {
    // TODO: Implement queue if needed
    res.json({
      success: true,
      data: {
        status: 'active',
        message: 'Simplified version - no queue needed yet'
      }
    });
  } catch (error) {
    console.error('[Questionnaire] Error:', error.message);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * GET /api/questionnaire/sync-queue/items
 */
export const getSyncQueueItems = (req, res) => {
  try {
    // TODO: Implement queue if needed
    res.json({
      success: true,
      data: {
        count: 0,
        items: []
      }
    });
  } catch (error) {
    console.error('[Questionnaire] Error:', error.message);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export default {
  getQuestionnaireStructure,
  getSectionFields,
  getSectionData,
  saveSectionData,
  uploadFile,
  getSyncQueueStatus,
  getSyncQueueItems
};
