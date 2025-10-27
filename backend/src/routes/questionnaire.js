/**
 * Questionnaire Routes
 * Endpoints for questionnaire CRUD operations and file uploads
 *
 * Endpoints:
 * GET  /questionnaire/structure - Get questionnaire structure (sections and questions)
 * GET  /questionnaire/:dealId/section/:sectionNumber - Get saved data for a section
 * POST /questionnaire/:dealId/section/:sectionNumber - Save section data to HubSpot
 * POST /questionnaire/:dealId/file-upload - Upload file for a form field
 * GET  /questionnaire/sync-queue/status - Get sync queue status
 */

import configService from '../services/questionnaire/configService.js';
import questionnaireService from '../services/questionnaire/questionnaireService.js';
import fileUploadService from '../services/questionnaire/fileUploadService.js';
import syncQueueService from '../services/questionnaire/syncQueueService.js';
import { updateDeal } from '../integrations/hubspot/deals.js';
import multer from 'multer';

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

/**
 * GET /questionnaire/structure
 * Get the complete questionnaire structure
 * Frontend requests this on initial load to render the form
 */
export const getQuestionnaireStructure = async (req, res) => {
  try {
    console.log('[Questionnaire] 📋 Fetching questionnaire structure');

    const structure = questionnaireService.getCompleteStructure();

    res.json({
      success: true,
      data: structure
    });
  } catch (error) {
    console.error('[Questionnaire] ❌ Error fetching structure:', error.message);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch questionnaire structure'
    });
  }
};

/**
 * GET /questionnaire/:dealId/section/:sectionNumber
 * Get current saved data for a specific section
 * Loads data from HubSpot deal
 */
export const getSectionData = async (req, res) => {
  try {
    const { dealId, sectionNumber } = req.params;

    console.log(`[Questionnaire] 📖 Fetching section ${sectionNumber} data for deal ${dealId}`);

    // Validate section exists
    const section = configService.getSection(sectionNumber);
    if (!section) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Section ${sectionNumber} not found`
      });
    }

    // Get section structure
    const sectionStructure = questionnaireService.getSectionStructure(sectionNumber);

    // TODO: Fetch actual data from HubSpot deal for this section
    // For now, return empty structure
    // In production, fetch the deal and extract section data using mapping config

    res.json({
      success: true,
      data: {
        section_number: sectionNumber,
        section_title: sectionStructure.section_title,
        questions: sectionStructure.questions,
        savedData: {} // TODO: Add actual HubSpot data here
      }
    });
  } catch (error) {
    console.error('[Questionnaire] ❌ Error fetching section data:', error.message);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch section data'
    });
  }
};

/**
 * POST /questionnaire/:dealId/section/:sectionNumber
 * Save questionnaire section data to HubSpot
 * Validates form data and updates deal properties
 */
export const saveSectionData = async (req, res) => {
  try {
    const { dealId, sectionNumber } = req.params;
    const formData = req.body;

    console.log(`[Questionnaire] 💾 Saving section ${sectionNumber} for deal ${dealId}`);

    // Validate section exists
    const section = configService.getSection(sectionNumber);
    if (!section) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Section ${sectionNumber} not found`
      });
    }

    // Validate form data
    const validation = questionnaireService.validateSectionData(
      sectionNumber,
      formData,
      { checkConditionals: true, strict: false }
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Form data validation failed',
        errors: validation.errors
      });
    }

    // Map form data to HubSpot properties
    const hubSpotData = questionnaireService.mapFormDataToHubSpot(formData);

    // Update deal with form data
    try {
      const updateResult = await updateDeal(dealId, hubSpotData);

      console.log(`[Questionnaire] ✅ Section ${sectionNumber} saved successfully for deal ${dealId}`);

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
      // If HubSpot sync fails, add to queue for retry
      console.error('[Questionnaire] ⚠️  HubSpot sync failed, queuing for retry');

      const queueItem = syncQueueService.addToQueue({
        dealId,
        sectionNumber,
        formData,
        endpoint: `/questionnaire/${dealId}/section/${sectionNumber}`,
        error: hubspotError.message
      });

      res.status(202).json({
        success: false,
        message: 'HubSpot sync queued for retry',
        queueId: queueItem.id,
        error: hubspotError.message
      });
    }
  } catch (error) {
    console.error('[Questionnaire] ❌ Error saving section data:', error.message);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to save section data'
    });
  }
};

/**
 * POST /questionnaire/:dealId/file-upload
 * Upload a file for a form field and associate with deal
 * Uploads to HubSpot Files API
 * Body: multipart form data with file and fieldName
 */
export const uploadFile = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { dealId } = req.params;
      const { fieldName } = req.body;

      if (!fieldName) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'fieldName is required'
        });
      }

      console.log(`[Questionnaire] 📤 Uploading file for field ${fieldName} in deal ${dealId}`);

      // Validate file
      const fileValidation = fileUploadService.validateFile(req.file);
      if (!fileValidation.valid) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'File validation failed',
          errors: fileValidation.errors
        });
      }

      // Upload file to HubSpot
      try {
        const uploadResult = await fileUploadService.handleRequestFileUpload(
          req.file,
          { dealId, fieldName }
        );

        console.log(`[Questionnaire] ✅ File uploaded successfully, ID: ${uploadResult.fileId}`);

        res.json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            fileId: uploadResult.fileId,
            fileName: uploadResult.fileName,
            url: uploadResult.url,
            dealAssociated: uploadResult.dealAssociated
          }
        });
      } catch (uploadError) {
        // Queue file upload for retry
        const queueItem = syncQueueService.addToQueue({
          dealId,
          sectionNumber: null,
          formData: { [fieldName]: req.file.originalname },
          endpoint: `/questionnaire/${dealId}/file-upload`,
          error: uploadError.message
        });

        res.status(202).json({
          success: false,
          message: 'File upload queued for retry',
          queueId: queueItem.id,
          error: uploadError.message
        });
      }
    } catch (error) {
      console.error('[Questionnaire] ❌ Error uploading file:', error.message);

      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to upload file'
      });
    }
  }
];

/**
 * GET /questionnaire/sync-queue/status
 * Get current sync queue status
 * Shows pending syncs and items requiring manual review
 */
export const getSyncQueueStatus = async (req, res) => {
  try {
    console.log('[Questionnaire] 📊 Fetching sync queue status');

    const summary = syncQueueService.getQueueSummary();
    const stats = syncQueueService.getQueueStats();

    res.json({
      success: true,
      data: {
        status: summary.status,
        statistics: stats,
        requiresAttention: summary.requiresAttention,
        itemsRequiringAttention: summary.itemsRequiringAttention,
        oldestFailedItem: summary.oldestFailedItem
      }
    });
  } catch (error) {
    console.error('[Questionnaire] ❌ Error fetching queue status:', error.message);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch queue status'
    });
  }
};

/**
 * GET /questionnaire/sync-queue/items
 * Get all items in sync queue (with optional filtering)
 * Query params: status=queued|scheduled|completed|failed_manual_review
 */
export const getSyncQueueItems = async (req, res) => {
  try {
    const { status, dealId } = req.query;

    console.log('[Questionnaire] 📋 Fetching sync queue items');

    const items = syncQueueService.getQueueItems({ status, dealId });

    res.json({
      success: true,
      data: {
        count: items.length,
        items
      }
    });
  } catch (error) {
    console.error('[Questionnaire] ❌ Error fetching queue items:', error.message);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch queue items'
    });
  }
};

/**
 * GET /questionnaire/:sectionNumber/fields
 * Get all fields for a specific section
 * Useful for frontend to know which fields to validate
 */
export const getSectionFields = async (req, res) => {
  try {
    const { sectionNumber } = req.params;

    console.log(`[Questionnaire] 📝 Fetching fields for section ${sectionNumber}`);

    const fields = configService.getSectionQuestions(sectionNumber);

    if (fields.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Section ${sectionNumber} not found`
      });
    }

    res.json({
      success: true,
      data: {
        section_number: sectionNumber,
        field_count: fields.length,
        fields: fields.map(q => ({
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
    console.error('[Questionnaire] ❌ Error fetching section fields:', error.message);

    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch section fields'
    });
  }
};

export default {
  getQuestionnaireStructure,
  getSectionData,
  saveSectionData,
  uploadFile,
  getSyncQueueStatus,
  getSyncQueueItems,
  getSectionFields
};
