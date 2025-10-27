/**
 * HubSpot File Upload Service
 * Handles file uploads to HubSpot Files API
 * Files are uploaded and file IDs are stored in deal properties
 */

import hubspotClient from '../../integrations/hubspot/client.js';
import FormData from 'form-data';
import fs from 'fs';

class FileUploadService {
  /**
   * Upload a file to HubSpot
   * Returns the file ID from HubSpot
   * @param {Buffer|Stream} fileContent - File content (Buffer or Stream)
   * @param {string} fileName - Original file name
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<Object>} { fileId: string, fileName: string, url: string }
   */
  async uploadFileToHubSpot(fileContent, fileName, mimeType) {
    try {
      console.log(`[FileUpload] 📤 Uploading file to HubSpot: ${fileName}`);

      // Create FormData for multipart upload
      const formData = new FormData();

      // Append file content
      formData.append('file', fileContent, {
        filename: fileName,
        contentType: mimeType
      });

      // HubSpot Files API endpoint
      const response = await hubspotClient.post(
        '/crm/v3/objects/files',
        formData,
        {
          headers: {
            ...formData.getHeaders()
          }
        }
      );

      const fileId = response.data.id;
      const fileUrl = response.data.url;

      console.log(`[FileUpload] ✅ File uploaded successfully`);
      console.log(`[FileUpload]    File ID: ${fileId}`);
      console.log(`[FileUpload]    File Name: ${fileName}`);
      console.log(`[FileUpload]    URL: ${fileUrl}`);

      return {
        fileId,
        fileName,
        url: fileUrl,
        mimeType,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[FileUpload] ❌ Error uploading file:`, error.message);

      if (error.response) {
        console.error(`[FileUpload] Response Status: ${error.response.status}`);
        console.error(`[FileUpload] Response Data:`, error.response.data);
      }

      throw new Error(`Failed to upload file to HubSpot: ${error.message}`);
    }
  }

  /**
   * Upload file from file path
   * Convenience method that reads file and calls uploadFileToHubSpot
   * @param {string} filePath - Path to the file to upload
   * @returns {Promise<Object>} { fileId, fileName, url, mimeType, uploadedAt }
   */
  async uploadFileFromPath(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats for validation
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      // Check file size (max 25MB)
      if (fileSizeInMB > 25) {
        throw new Error(`File size (${fileSizeInMB.toFixed(2)}MB) exceeds maximum of 25MB`);
      }

      // Extract filename from path
      const fileName = filePath.split(/[/\\]/).pop();

      // Read file
      const fileContent = fs.readFileSync(filePath);

      // Determine MIME type
      const mimeType = this._getMimeType(fileName);

      // Upload to HubSpot
      return await this.uploadFileToHubSpot(fileContent, fileName, mimeType);
    } catch (error) {
      console.error(`[FileUpload] ❌ Error uploading from path:`, error.message);
      throw error;
    }
  }

  /**
   * Upload multiple files
   * Returns array of upload results (some may succeed, some may fail)
   * @param {Array} files - Array of { fileContent, fileName, mimeType }
   * @returns {Promise<Object>} { successful: [], failed: [] }
   */
  async uploadMultipleFiles(files) {
    console.log(`[FileUpload] 📦 Uploading ${files.length} files...`);

    const results = {
      successful: [],
      failed: []
    };

    for (const file of files) {
      try {
        const result = await this.uploadFileToHubSpot(
          file.fileContent,
          file.fileName,
          file.mimeType
        );
        results.successful.push(result);
      } catch (error) {
        results.failed.push({
          fileName: file.fileName,
          error: error.message
        });
      }
    }

    console.log(`[FileUpload] ✅ Upload batch complete: ${results.successful.length} successful, ${results.failed.length} failed`);

    return results;
  }

  /**
   * Get file from HubSpot
   * @param {string} fileId - The HubSpot file ID
   * @returns {Promise<Object>} File metadata
   */
  async getFile(fileId) {
    try {
      console.log(`[FileUpload] 📋 Fetching file metadata: ${fileId}`);

      const response = await hubspotClient.get(`/crm/v3/objects/files/${fileId}`);

      return response.data;
    } catch (error) {
      console.error(`[FileUpload] ❌ Error fetching file:`, error.message);
      throw error;
    }
  }

  /**
   * Delete file from HubSpot
   * @param {string} fileId - The HubSpot file ID
   * @returns {Promise<void>}
   */
  async deleteFile(fileId) {
    try {
      console.log(`[FileUpload] 🗑️  Deleting file: ${fileId}`);

      await hubspotClient.delete(`/crm/v3/objects/files/${fileId}`);

      console.log(`[FileUpload] ✅ File deleted successfully`);
    } catch (error) {
      console.error(`[FileUpload] ❌ Error deleting file:`, error.message);
      throw error;
    }
  }

  /**
   * Associate file with a deal
   * Stores the file ID in the appropriate deal property
   * @param {string} dealId - HubSpot deal ID
   * @param {string} fileFieldName - The form field name that stores this file (e.g., 'tenancy_agreement_upload')
   * @param {string} fileId - HubSpot file ID
   * @returns {Promise<Object>} Updated deal object
   */
  async associateFileWithDeal(dealId, fileFieldName, fileId) {
    try {
      console.log(`[FileUpload] 🔗 Associating file with deal`);
      console.log(`[FileUpload]    Deal ID: ${dealId}`);
      console.log(`[FileUpload]    File Field: ${fileFieldName}`);
      console.log(`[FileUpload]    File ID: ${fileId}`);

      // Import the deals module to update the deal
      const { updateDeal } = await import('../../integrations/hubspot/deals.js');

      // Update deal with file ID
      const result = await updateDeal(dealId, {
        [fileFieldName]: fileId
      });

      console.log(`[FileUpload] ✅ File associated with deal successfully`);

      return result;
    } catch (error) {
      console.error(`[FileUpload] ❌ Error associating file:`, error.message);
      throw error;
    }
  }

  /**
   * Handle file upload from Express request
   * Validates file and uploads to HubSpot
   * @param {Object} file - Express file object (from multer middleware)
   * @param {Object} options - Options for upload
   *   - dealId: string (optional) - If provided, file is associated with deal
   *   - fieldName: string (optional) - The form field name for association
   * @returns {Promise<Object>} { fileId, fileName, url, dealAssociated? }
   */
  async handleRequestFileUpload(file, options = {}) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      console.log(`[FileUpload] 📥 Processing file from request: ${file.originalname}`);

      // Validate file size
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB > 25) {
        throw new Error(`File size exceeds maximum of 25MB`);
      }

      // Upload to HubSpot
      const uploadResult = await this.uploadFileToHubSpot(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // Associate with deal if dealId provided
      if (options.dealId && options.fieldName) {
        await this.associateFileWithDeal(
          options.dealId,
          options.fieldName,
          uploadResult.fileId
        );

        uploadResult.dealAssociated = true;
      }

      return uploadResult;
    } catch (error) {
      console.error(`[FileUpload] ❌ Error processing request file:`, error.message);
      throw error;
    }
  }

  /**
   * Validate file before upload
   * @param {Object} file - File object with size, mimetype properties
   * @param {Array} allowedMimeTypes - Array of allowed MIME types
   * @returns {Object} { valid: boolean, errors: [] }
   */
  validateFile(file, allowedMimeTypes = []) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    // Check file size (max 25MB)
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > 25) {
      errors.push(`File size (${fileSizeInMB.toFixed(2)}MB) exceeds maximum of 25MB`);
    }

    // Check MIME type if allowedMimeTypes provided
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    // Check file name
    if (!file.originalname || file.originalname.trim() === '') {
      errors.push('Invalid file name');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Private helper methods

  /**
   * Determine MIME type from file extension
   * @private
   */
  _getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();

    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'zip': 'application/zip'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

// Create singleton instance
const fileUploadService = new FileUploadService();

export default fileUploadService;
