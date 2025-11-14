/**
 * Generic File Upload Routes
 * Handles pre-deal file uploads (before deal is created)
 */

import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import hubspotClient from '../integrations/hubspot/client.js';

const router = express.Router();

// Multer setup for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/upload/file
 * Upload a single file to HubSpot (temporary storage)
 * Used by agent portal when creating leads before deal exists
 * 
 * Returns: { fileId, url, name, size }
 */
export const uploadFile = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'File is required'
      });
    }

    console.log(`[File Upload] 📤 Uploading file: ${file.originalname}`);
    console.log(`[File Upload] 📊 Size: ${file.size} bytes, Type: ${file.mimetype}`);

    // Create form data for HubSpot Files API
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    formData.append('options', JSON.stringify({
      access: 'PRIVATE',
      overwrite: false,
      duplicateValidationStrategy: 'NONE',
      duplicateValidationScope: 'ENTIRE_PORTAL'
    }));

    // Upload to HubSpot
    const fileUploadResponse = await hubspotClient.post('/files/v3/files', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    const uploadedFile = fileUploadResponse.data;
    console.log(`[File Upload] ✅ File uploaded to HubSpot: ${uploadedFile.id}`);

    return res.json({
      success: true,
      fileId: uploadedFile.id,
      url: uploadedFile.url,
      name: uploadedFile.name,
      size: uploadedFile.size,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('[File Upload] ❌ Error uploading file:', error.message);
    
    // Log more details if available
    if (error.response) {
      console.error('[File Upload] Response status:', error.response.status);
      console.error('[File Upload] Response data:', error.response.data);
    }

    return res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to upload file'
    });
  }
};

export default {
  uploadFile
};

