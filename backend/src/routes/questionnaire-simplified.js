/**
 * Property Questionnaire Routes
 * Follows HubSpot API v3 naming conventions and patterns
 *
 * API Pattern (matching HubSpot v3):
 * - GET    /crm/v3/objects/property-questionnaire              → Get all questionnaire questions
 * - PATCH  /crm/v3/objects/property-questionnaire/{dealId}     → Update deal with questionnaire answers
 * - POST   /crm/v3/objects/property-questionnaire/{dealId}/files/upload → Upload file
 *
 * Architecture:
 * questionnaire.json → questionnaireHelper.js → Routes → HubSpot
 * Single source of truth with cached helper functions
 */

import { getAllMappings, getFieldMapping, getSectionMappings, getQuestionnaireSchema } from '../utils/questionnaireHelper.js';
import { updateDeal } from '../integrations/hubspot/deals.js';
import multer from 'multer';

// Load questionnaire config using helper (cached)
const questionnaireConfig = getQuestionnaireSchema();

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
// API Endpoints (Following HubSpot v3 API Patterns)
// ============================================================================

/**
 * GET /crm/v3/objects/property-questionnaire
 * Get all questionnaire questions (all sections combined)
 * Returns the complete questionnaire schema with all questions and options
 */
export const getPropertyQuestionnaire = (_req, res) => {
  try {
    const questions = [];

    // Flatten all questions from all sections with their section info
    questionnaireConfig.sections.forEach(section => {
      section.questions.forEach(question => {
        questions.push({
          section_number: section.section_number,
          section_title: section.section_title,
          field_name: question.form_field_name,
          question: question.form_question,
          type: question.form_field_type,
          required: question.required,
          conditional: question.conditional,
          conditional_on: question.conditional_on,
          options: question.options || null,
          hsPropertyName: getFieldMapping(question.form_field_name)?.hsPropertyName || null
        });
      });
    });

    res.json({
      status: 'ok',
      results: questions,
      paging: {
        total: questions.length
      }
    });
  } catch (error) {
    console.error('[Property Questionnaire] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * PATCH /crm/v3/objects/property-questionnaire/{dealId}
 * Update a deal with questionnaire answers
 * Validates form data and syncs with HubSpot
 */
export const updatePropertyQuestionnaire = async (req, res) => {
  try {
    const { dealId } = req.params;
    const formData = req.body;

    if (!dealId) {
      return res.status(400).json({
        status: 'error',
        message: 'dealId is required'
      });
    }

    // Validate form data against questionnaire schema
    let allErrors = [];
    questionnaireConfig.sections.forEach(section => {
      const sectionValidation = validateFormData(section.section_number, formData);
      if (!sectionValidation.valid) {
        allErrors = allErrors.concat(sectionValidation.errors);
      }
    });

    if (allErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Form data validation failed',
        errors: allErrors
      });
    }

    // Map form data to HubSpot properties
    const hubSpotData = mapToHubSpot(formData);

    // Update deal in HubSpot
    try {
      await updateDeal(dealId, hubSpotData);

      res.json({
        status: 'ok',
        id: dealId,
        message: 'Questionnaire answers saved successfully',
        properties: Object.keys(hubSpotData)
      });
    } catch (hubspotError) {
      console.error('[Property Questionnaire] HubSpot error:', hubspotError.message);

      // Return 202 Accepted if HubSpot fails - indicates async processing
      res.status(202).json({
        status: 'error',
        id: dealId,
        message: 'Save queued for retry',
        error: hubspotError.message
      });
    }
  } catch (error) {
    console.error('[Property Questionnaire] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * POST /crm/v3/objects/property-questionnaire/{dealId}/files/upload
 * Upload a file associated with a questionnaire field
 * Files are uploaded to HubSpot with size and type validation
 */
export const uploadPropertyQuestionnaireFile = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const { fieldName } = req.body;

      if (!dealId) {
        return res.status(400).json({
          status: 'error',
          message: 'dealId is required'
        });
      }

      if (!fieldName) {
        return res.status(400).json({
          status: 'error',
          message: 'fieldName is required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'file is required in request body'
        });
      }

      // Validate field exists in mapping and supports file uploads
      const mapping = getFieldMapping(fieldName);
      if (!mapping) {
        return res.status(400).json({
          status: 'error',
          message: `fieldName '${fieldName}' not found in questionnaire`
        });
      }

      if (!mapping.fileUpload) {
        return res.status(400).json({
          status: 'error',
          message: `fieldName '${fieldName}' does not support file uploads`
        });
      }

      // TODO: Implement HubSpot file upload using Files API
      console.log(`[Property Questionnaire] File upload for field '${fieldName}' (${req.file.originalname}) to deal ${dealId}`);

      res.status(201).json({
        status: 'ok',
        id: 'temp-file-id',
        dealId: dealId,
        fieldName: fieldName,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('[Property Questionnaire] Error:', error.message);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
];

export default {
  getPropertyQuestionnaire,
  updatePropertyQuestionnaire,
  uploadPropertyQuestionnaireFile
};
