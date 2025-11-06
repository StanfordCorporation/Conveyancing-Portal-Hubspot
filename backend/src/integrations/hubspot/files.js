/**
 * HubSpot Files Integration
 * Handles file operations via HubSpot Files API
 */

import axios from 'axios';
import { hubspotConfig } from '../../config/hubspot.js';

const BASE_URL = 'https://api.hubapi.com';

/**
 * Get file metadata and signed download URL
 * @param {string} fileId - HubSpot file ID
 * @returns {Promise<Object>} File metadata with signed URL
 */
export async function getFileSignedUrl(fileId) {
  if (!fileId || fileId === 'null' || fileId === '') {
    return null;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/files/v3/files/${fileId}/signed-url`,
      {
        headers: {
          'Authorization': `Bearer ${hubspotConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      fileId,
      url: response.data.url,
      expiresAt: response.data.expiresAt,
      name: response.data.name,
      extension: response.data.extension,
      type: response.data.type,
      size: response.data.size,
      height: response.data.height,
      width: response.data.width
    };
  } catch (error) {
    console.error(`[Files] Failed to get signed URL for file ${fileId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Get file metadata for multiple file IDs
 * @param {Array<string>} fileIds - Array of HubSpot file IDs
 * @returns {Promise<Array<Object>>} Array of file metadata objects
 */
export async function getMultipleFileSignedUrls(fileIds) {
  const validFileIds = fileIds.filter(id => id && id !== 'null' && id !== '');

  if (validFileIds.length === 0) {
    return [];
  }

  const filePromises = validFileIds.map(fileId => getFileSignedUrl(fileId));
  const results = await Promise.all(filePromises);

  // Filter out null results (failed fetches)
  return results.filter(file => file !== null);
}

/**
 * Extract file IDs from deal properties
 * File upload fields can contain:
 * - Single file ID: "123456789"
 * - Multiple file IDs (comma-separated): "123456789,987654321"
 * - JSON array: "[123456789,987654321]"
 * @param {Object} dealProperties - Deal properties object
 * @param {Array<string>} fileFieldNames - Array of property names that contain file IDs
 * @returns {Object} Map of field name to array of file objects
 */
export async function extractFilesFromDeal(dealProperties, fileFieldNames) {
  const filesMap = {};

  for (const fieldName of fileFieldNames) {
    const fileValue = dealProperties[fieldName];

    if (!fileValue || fileValue === 'null' || fileValue === '') {
      filesMap[fieldName] = [];
      continue;
    }

    // Parse file IDs from various formats
    let fileIds = [];

    try {
      // Try parsing as JSON array first
      const parsed = JSON.parse(fileValue);
      if (Array.isArray(parsed)) {
        fileIds = parsed.map(id => String(id));
      } else {
        fileIds = [String(parsed)];
      }
    } catch {
      // Not JSON, try comma-separated
      if (fileValue.includes(',')) {
        fileIds = fileValue.split(',').map(id => id.trim());
      } else {
        fileIds = [fileValue.trim()];
      }
    }

    // Fetch file metadata for all IDs
    const files = await getMultipleFileSignedUrls(fileIds);
    filesMap[fieldName] = files;
  }

  return filesMap;
}

/**
 * Get all questionnaire file uploads for a deal
 * @param {string} dealId - HubSpot deal ID
 * @param {Object} dealProperties - Deal properties object
 * @returns {Promise<Object>} Map of file field names to file arrays
 */
export async function getQuestionnaireFiles(dealId, dealProperties) {
  console.log(`[Files] Fetching file uploads for deal ${dealId}`);

  // All file upload fields from questionnaire
  const fileFields = [
    'most_recent_rates_notice',
    'file_upload_water_notice',
    'tenancy_agreement_upload',
    'owner_builder_uploads',
    'enforcement_notice_uploads'
  ];

  const filesMap = await extractFilesFromDeal(dealProperties, fileFields);

  const totalFiles = Object.values(filesMap).reduce((sum, files) => sum + files.length, 0);
  console.log(`[Files] Found ${totalFiles} file(s) for deal ${dealId}`);

  return filesMap;
}

/**
 * Upload file to HubSpot Files
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} fileName - Original file name
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Uploaded file metadata
 */
export async function uploadFile(fileBuffer, fileName, options = {}) {
  const FormData = (await import('form-data')).default;

  try {
    const formData = new FormData();

    // Add the file
    formData.append('file', fileBuffer, fileName);

    // Add options (access level, folder path, etc.)
    const uploadOptions = {
      access: options.access || 'PRIVATE',
      ...options.ttl && { ttl: options.ttl }
    };
    formData.append('options', JSON.stringify(uploadOptions));

    // Add folder path or folder ID
    if (options.folderPath) {
      formData.append('folderPath', options.folderPath);
    } else if (options.folderId) {
      formData.append('folderId', options.folderId);
    } else {
      // Default folder for questionnaire files
      formData.append('folderPath', '/questionnaire-uploads');
    }

    // Add custom file name if provided
    if (options.customFileName) {
      formData.append('fileName', options.customFileName);
    }

    console.log(`[Files] Uploading file: ${fileName} to HubSpot`);

    const response = await axios.post(
      `${BASE_URL}/files/v3/files`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${hubspotConfig.accessToken}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    console.log(`[Files] ✅ File uploaded successfully: ${response.data.id}`);

    return {
      id: response.data.id,
      name: response.data.name,
      path: response.data.path,
      size: response.data.size,
      type: response.data.type,
      extension: response.data.extension,
      url: response.data.url,
      createdAt: response.data.createdAt
    };
  } catch (error) {
    console.error(`[Files] Failed to upload file ${fileName}:`, error.response?.data || error.message);
    throw new Error(`File upload failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Upload multiple files to HubSpot and return their IDs
 * @param {Array} files - Array of file objects with {buffer, originalname}
 * @param {Object} options - Upload options
 * @returns {Promise<Array<string>>} Array of file IDs
 */
export async function uploadMultipleFiles(files, options = {}) {
  console.log(`[Files] Uploading ${files.length} file(s) to HubSpot`);

  const uploadPromises = files.map(file =>
    uploadFile(file.buffer, file.originalname, options)
  );

  try {
    const results = await Promise.all(uploadPromises);
    const fileIds = results.map(result => result.id);

    console.log(`[Files] ✅ All ${files.length} file(s) uploaded successfully`);
    return fileIds;
  } catch (error) {
    console.error(`[Files] ❌ Error uploading multiple files:`, error.message);
    throw error;
  }
}

/**
 * Delete file from HubSpot
 * @param {string} fileId - HubSpot file ID
 * @returns {Promise<void>}
 */
export async function deleteFile(fileId) {
  if (!fileId || fileId === 'null' || fileId === '') {
    throw new Error('Invalid file ID');
  }

  try {
    await axios.delete(
      `${BASE_URL}/files/v3/files/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${hubspotConfig.accessToken}`
        }
      }
    );

    console.log(`[Files] ✅ File ${fileId} deleted successfully`);
  } catch (error) {
    console.error(`[Files] Failed to delete file ${fileId}:`, error.response?.data || error.message);
    throw new Error(`File deletion failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Remove file ID from deal property
 * @param {string} dealId - HubSpot deal ID
 * @param {string} propertyName - Property name to update
 * @param {string} fileIdToRemove - File ID to remove from the property
 * @returns {Promise<void>}
 */
export async function removeFileFromDealProperty(dealId, propertyName, fileIdToRemove) {
  try {
    // First, get current property value
    const dealResponse = await axios.get(
      `${BASE_URL}/crm/v3/objects/deals/${dealId}`,
      {
        headers: {
          'Authorization': `Bearer ${hubspotConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          properties: propertyName
        }
      }
    );

    const currentValue = dealResponse.data.properties[propertyName];

    if (!currentValue || currentValue === 'null' || currentValue === '') {
      console.log(`[Files] Property ${propertyName} is already empty`);
      return;
    }

    // Parse current file IDs
    let fileIds = [];
    try {
      const parsed = JSON.parse(currentValue);
      if (Array.isArray(parsed)) {
        fileIds = parsed.map(id => String(id));
      } else {
        fileIds = [String(parsed)];
      }
    } catch {
      if (currentValue.includes(',')) {
        fileIds = currentValue.split(',').map(id => id.trim());
      } else {
        fileIds = [currentValue.trim()];
      }
    }

    // Remove the file ID
    const updatedFileIds = fileIds.filter(id => id !== fileIdToRemove);

    // Update the property with remaining file IDs
    const newValue = updatedFileIds.length > 0 ? updatedFileIds.join(',') : '';

    await axios.patch(
      `${BASE_URL}/crm/v3/objects/deals/${dealId}`,
      {
        properties: {
          [propertyName]: newValue
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${hubspotConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Files] ✅ Removed file ${fileIdToRemove} from deal ${dealId} property ${propertyName}`);
  } catch (error) {
    console.error(`[Files] Failed to remove file from deal property:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update deal property with file ID
 * @param {string} dealId - HubSpot deal ID
 * @param {string} propertyName - Property name to update
 * @param {string} fileId - HubSpot file ID
 * @returns {Promise<void>}
 */
export async function updateDealFileProperty(dealId, propertyName, fileId) {
  try {
    const response = await axios.patch(
      `${BASE_URL}/crm/v3/objects/deals/${dealId}`,
      {
        properties: {
          [propertyName]: fileId
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${hubspotConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Files] ✅ Deal ${dealId} updated with file ID ${fileId} for property ${propertyName}`);
    return response.data;
  } catch (error) {
    console.error(`[Files] Failed to update deal property:`, error.response?.data || error.message);
    throw error;
  }
}

export default {
  getFileSignedUrl,
  getMultipleFileSignedUrls,
  extractFilesFromDeal,
  getQuestionnaireFiles,
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  removeFileFromDealProperty,
  updateDealFileProperty
};
