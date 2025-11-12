import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Upload } from 'lucide-react';
import api from '../../services/api.js';
import AddressAutocomplete from '../../../src/components/common/AddressAutocomplete';

export default function PropertyDetails({
  dealId,
  propertyAddress,
  dealStage,
  nextStep,
  clientResidentialAddress,
  agentTitleSearch,
  agentTitleSearchFile,
  editMode,
  onChangePropertyAddress,
  onChangeResidentialAddress,
  onChangeAgentTitleSearch
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Handle file upload for agent title search
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      console.log('[PropertyDetails] 📤 Uploading agent title search file:', file.name);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        `/client/property/${dealId}/agent-title-search-file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setUploadedFile(response.data.file);
      onChangeAgentTitleSearch('Yes');
      console.log('[PropertyDetails] ✅ File uploaded successfully');

      // Reload page to show new file
      window.location.reload();

    } catch (error) {
      console.error('[PropertyDetails] ❌ Upload error:', error);
      alert(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="property-tile">
      <div className="tile-header">
        <h3 className="tile-title">Property Details</h3>
      </div>
      <div className="tile-body">
        <div className="info-row full-width">
          <label className="field-label">Property Address</label>
          {editMode ? (
            <AddressAutocomplete
              className="field-input"
              value={propertyAddress || ''}
              onChange={onChangePropertyAddress}
              placeholder="Enter property address"
            />
          ) : (
            <p className="field-value">{propertyAddress || 'N/A'}</p>
          )}
        </div>
        <div className="info-row full-width">
          <label className="field-label">Client Residential Address</label>
          {editMode ? (
            <AddressAutocomplete
              className="field-input"
              value={clientResidentialAddress || ''}
              onChange={onChangeResidentialAddress}
              placeholder="Enter residential address"
            />
          ) : (
            <p className="field-value">{clientResidentialAddress || 'N/A'}</p>
          )}
        </div>
        <div className="info-row">
          <label className="field-label">Deal Stage</label>
          <p className="field-value">{dealStage || 'N/A'}</p>
        </div>
        <div className="info-row">
          <label className="field-label">Next Step</label>
          <p className="field-value">{nextStep || 'N/A'}</p>
        </div>

        {/* Agent Title Search Section */}
        <div className="info-row full-width title-search-section">
          <label className="field-label">Agent Title Search</label>

          {editMode ? (
            <div className="edit-title-search">
              <select
                className="field-select"
                value={agentTitleSearch || 'No'}
                onChange={(e) => onChangeAgentTitleSearch(e.target.value)}
              >
                <option value="No">No - Not completed</option>
                <option value="Yes">Yes - Completed by agent</option>
              </select>

              {/* File upload when "Yes" is selected */}
              {agentTitleSearch === 'Yes' && (
                <div className="file-upload-section">
                  <label className="file-upload-label">
                    <Upload size={16} />
                    <span>{uploading ? 'Uploading...' : 'Upload Title Search Document'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {(agentTitleSearchFile || uploadedFile) && (
                    <div className="uploaded-file-info">
                      <FileText size={16} />
                      <span>{agentTitleSearchFile?.name || uploadedFile?.name || 'Document uploaded'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="field-value-with-icon">
                {agentTitleSearch === 'Yes' ? (
                  <>
                    <CheckCircle size={18} color="#10b981" />
                    <span className="status-text success">Completed by Agent</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} color="#ef4444" />
                    <span className="status-text pending">Not yet completed</span>
                  </>
                )}
              </div>

              {/* Display file if exists */}
              {agentTitleSearch === 'Yes' && agentTitleSearchFile && agentTitleSearchFile.url && (
                <div className="info-row full-width" style={{ marginTop: '12px' }}>
                  <label className="field-label">Title Search Document</label>
                  <a
                    href={agentTitleSearchFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-download-link"
                  >
                    <FileText size={18} />
                    <span>{agentTitleSearchFile.name || 'View Title Search Document'}</span>
                    {agentTitleSearchFile.size && (
                      <span className="file-size"> ({(agentTitleSearchFile.size / 1024).toFixed(0)} KB)</span>
                    )}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .field-input, .field-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .field-input:focus, .field-select:focus {
          outline: none;
          border-color: #0E6DFF;
          box-shadow: 0 0 0 3px rgba(14, 109, 255, 0.1);
        }

        .edit-title-search {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .field-select {
          cursor: pointer;
        }

        .file-upload-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          background: #F9FAFB;
          border-radius: 8px;
        }

        .file-upload-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #0E6DFF;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
          width: fit-content;
        }

        .file-upload-label:hover {
          background: #0D5FE6;
        }

        .file-upload-label:active {
          background: #0C54CC;
        }

        .uploaded-file-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 14px;
          color: #374151;
        }

        .title-search-section {
          border-top: 1px solid #E5E7EB;
          padding-top: 16px;
          margin-top: 8px;
        }

        .file-download-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #F3F4F6;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          color: #0E6DFF;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          margin-top: 8px;
        }

        .file-download-link:hover {
          background: #E5E7EB;
          border-color: #9CA3AF;
        }

        .file-size {
          color: #6B7280;
          font-size: 12px;
          font-weight: 400;
        }

        .field-value-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-text {
          font-size: 14px;
          font-weight: 500;
        }

        .status-text.success {
          color: #10b981;
        }

        .status-text.pending {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
