import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import useQuestionnaireSchema from '../../hooks/useQuestionnaireSchema.js';
import './property-questionnaire.css';

/**
 * PropertyQuestionnaireAgent Component
 * Dynamic form generation for agent portal based on schema from backend API
 * Features:
 * - Schema-driven (questionnaire.json)
 * - Handles conditional fields, file uploads, and validation
 * - Agent-specific UI and API endpoints
 * - Works in create mode (no dealId) and edit mode (with dealId)
 */

export default function PropertyQuestionnaireAgent({
  dealId,
  clientName = 'the client',
  isAgentContext = true,
  initialData = {},
  initialFiles = {},
  onSubmitSuccess,
  onDataUpdate
}) {
  // Fetch questionnaire schema from backend (with caching)
  const { schema, loading: schemaLoading, error: schemaError } = useQuestionnaireSchema();

  // Derive configuration from schema
  const sectionConfig = useMemo(() => {
    if (!schema?.sections) return {};

    const config = {};
    schema.sections.forEach(section => {
      config[section.section_number] = {
        title: section.section_title,
        description: `Section ${section.section_number}` // Could add description to schema if needed
      };
    });
    return config;
  }, [schema]);

  const fieldLabels = useMemo(() => {
    if (!schema?.sections) return {};

    const labels = {};
    schema.sections.forEach(section => {
      section.questions.forEach(question => {
        labels[question.form_field_name] = question.form_question;
      });
    });
    return labels;
  }, [schema]);

  const propertyMapping = useMemo(() => {
    if (!schema?.sections) return {};

    const mapping = {};
    schema.sections.forEach((section) => {
      section.questions.forEach(question => {
        mapping[question.form_field_name] = {
          hsPropertyName: question.HubSpot_Property_Name,
          hsPropertyType: question.HubSpot_Property_Type,
          formFieldType: question.form_field_type,
          section: parseInt(section.section_number), // Use section_number from schema (1, 2, 3, 4, 5)
          required: false, // Override: All questions optional for agents
          conditional: question.conditional,
          conditionalOn: question.conditional_on?.question && question.conditional_on?.value
            ? { field: question.conditional_on.question, value: question.conditional_on.value }
            : null,
          options: question.options || null,
          maxFiles: 10,
          maxFileSize: 25
        };
      });
    });
    return mapping;
  }, [schema]);

  const [formData, setFormData] = useState({});
  const [conditionalFields, setConditionalFields] = useState({});
  const [activeSection, setActiveSection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [existingFiles, setExistingFiles] = useState({});

  // Initialize form data from props (no API call needed!)
  useEffect(() => {
    console.log(`[Questionnaire] 📋 Initializing from pre-loaded data for deal: ${dealId}`);
    console.log(`[Questionnaire] 📊 Received ${Object.keys(initialData).length} fields from parent`);

    if (Object.keys(initialData).length > 0) {
      // Normalize values: HubSpot returns 'Yes'/'No'/'Unsure' but we need lowercase
      const normalizedData = {};
      Object.entries(initialData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          // Convert Yes/No/Unsure to lowercase
          normalizedData[key] = value.toLowerCase();
        } else {
          normalizedData[key] = value;
        }
      });

      console.log(`[Questionnaire] ✅ Loaded ${Object.keys(normalizedData).length} questionnaire fields (no API call)`);
      setFormData(normalizedData);

      // Initialize conditional fields based on loaded data
      initializeConditionalFields(normalizedData);
    } else {
      console.log(`[Questionnaire] ℹ️ No existing questionnaire data, starting fresh`);
      setFormData({});
    }
  }, [dealId, initialData]);

  // Initialize existing files from HubSpot
  useEffect(() => {
    if (Object.keys(initialFiles).length > 0) {
      console.log(`[Questionnaire] 📎 Loading existing files from HubSpot`);
      setExistingFiles(initialFiles);

      const fileCount = Object.values(initialFiles).reduce((sum, files) => sum + files.length, 0);
      console.log(`[Questionnaire] ✅ Loaded ${fileCount} existing file(s)`);
    }
  }, [dealId, initialFiles]);

  // Listen for save events from parent Dashboard
  useEffect(() => {
    const handleSaveEvent = (event) => {
      if (event.detail.dealId === dealId) {
        console.log('[Questionnaire] 💾 Save event received from Dashboard');
        handleSave();
      }
    };

    window.addEventListener('saveQuestionnaire', handleSaveEvent);
    return () => {
      window.removeEventListener('saveQuestionnaire', handleSaveEvent);
    };
  }, [dealId, formData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize conditional field visibility based on form data
  const initializeConditionalFields = (data) => {
    const conditionals = {};

    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.conditional && config.conditionalOn) {
        const { field, value } = config.conditionalOn;
        conditionals[fieldName] = data[field] === value;
      }
    });

    setConditionalFields(conditionals);
  };

  // Handle form field changes
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear any validation errors for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Update conditional fields
    updateConditionalFields(fieldName, value);
  };

  // Update visibility of conditional fields (supports nested conditionals)
  const updateConditionalFields = (changedField, value) => {
    // Use updated form data (with the change applied)
    const updatedFormData = {
      ...formData,
      [changedField]: value
    };

    // Recalculate ALL conditional fields based on current form state
    // This handles nested conditionals correctly (parent → child → grandchild)
    const updates = {};
    const fieldsToCleare = [];

    Object.entries(propertyMapping).forEach(([fieldName, config]) => {
      if (config.conditional && config.conditionalOn) {
        const { field, value: requiredValue } = config.conditionalOn;
        const shouldShow = updatedFormData[field] === requiredValue;

        updates[fieldName] = shouldShow;

        // Track fields that need to be cleared if hidden
        if (!shouldShow && formData[fieldName]) {
          fieldsToCleare.push(fieldName);
        }
      }
    });

    // Clear data for all hidden fields (including nested children)
    if (fieldsToCleare.length > 0) {
      setFormData(prev => {
        const newData = { ...prev, [changedField]: value };
        fieldsToCleare.forEach(field => {
          delete newData[field];
        });
        return newData;
      });
    }

    setConditionalFields(updates);
  };

  // Handle file deletion
  const handleFileDelete = async (fileId, fieldName) => {
    if (!dealId) {
      alert('Cannot delete files until deal is created.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      console.log(`[Questionnaire Agent] 🗑️  Deleting file ${fileId} for field ${fieldName}`);

      await api.delete(`/agent/leads/${dealId}/file/${fileId}?fieldName=${fieldName}`);

      // Remove file from existingFiles state
      const config = propertyMapping[fieldName];
      setExistingFiles(prev => ({
        ...prev,
        [config.hsPropertyName]: (prev[config.hsPropertyName] || []).filter(
          file => file.fileId !== fileId
        )
      }));

      console.log(`[Questionnaire Agent] ✅ File deleted successfully`);
    } catch (err) {
      console.error(`[Questionnaire Agent] ❌ Error deleting file:`, err.message);
      alert('Failed to delete file. Please try again.');
    }
  };

  // Handle file upload
  const handleFileUpload = async (fieldName, files) => {
    if (!dealId) {
      alert('File uploads will be available after creating the lead.');
      return;
    }

    if (!files || files.length === 0) return;

    const config = propertyMapping[fieldName];
    const maxFiles = config.maxFiles || 10;
    const maxFileSize = (config.maxFileSize || 25) * 1024 * 1024; // Convert MB to bytes

    // Validate file count
    if (files.length > maxFiles) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: `Maximum ${maxFiles} files allowed`
      }));
      return;
    }

    // Validate file sizes
    for (const file of files) {
      if (file.size > maxFileSize) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: `File ${file.name} exceeds maximum size of ${config.maxFileSize}MB`
        }));
        return;
      }
    }

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      // Add fieldName so backend knows which property to update
      formData.append('fieldName', fieldName);

      console.log(`[Questionnaire Agent] 📤 Uploading ${files.length} files for ${fieldName}`);

      const response = await api.post(`/agent/leads/${dealId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const fileIds = response.data.fileIds;

      // Update form data with file IDs
      handleFieldChange(fieldName, fileIds.join(','));

      // Fetch file metadata from backend to display with Download/Delete buttons
      console.log(`[Questionnaire Agent] 📎 Fetching metadata for uploaded files...`);
      const hsPropertyName = config.hsPropertyName;

      try {
        // Fetch file metadata for the newly uploaded files
        const fileMetadataPromises = fileIds.map(async (fileId) => {
          const metadataResponse = await api.get(`/agent/leads/${dealId}/file/${fileId}/metadata`);
          return metadataResponse.data;
        });

        const fileMetadata = await Promise.all(fileMetadataPromises);

        // Add to existingFiles state so Download/Delete buttons appear
        setExistingFiles(prev => ({
          ...prev,
          [hsPropertyName]: [...(prev[hsPropertyName] || []), ...fileMetadata]
        }));

        console.log(`[Questionnaire Agent] ✅ Files uploaded and metadata loaded`);
      } catch (metadataErr) {
        console.warn(`[Questionnaire Agent] ⚠️ Files uploaded but failed to fetch metadata:`, metadataErr.message);
        // Files are uploaded, just refresh the page to see them
      }

      // Clear uploaded files indicator
      setUploadedFiles(prev => {
        const newState = { ...prev };
        delete newState[fieldName];
        return newState;
      });

    } catch (err) {
      console.error(`[Questionnaire Agent] ❌ Error uploading files:`, err.message);
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Failed to upload files. Please try again.'
      }));
    }
  };

  // Validate form section
  const validateSection = (sectionNumber) => {
    const sectionFields = Object.entries(propertyMapping).filter(
      ([_, config]) => config.section === sectionNumber
    );

    const newErrors = {};

    sectionFields.forEach(([fieldName, config]) => {
      // Skip conditional fields that are not visible
      if (config.conditional && !conditionalFields[fieldName]) {
        return;
      }

      // Check required fields
      if (config.required && (!formData[fieldName] || formData[fieldName] === '')) {
        newErrors[fieldName] = `${fieldLabels[fieldName] || fieldName} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save questionnaire data
  const handleSave = async () => {
    try {
      setSaving(true);

      // If no dealId (create mode), just save to parent state
      if (!dealId) {
        console.log(`[Questionnaire Agent] 💾 Saving to parent form state (no dealId yet)`);
        if (onDataUpdate) {
          onDataUpdate(null, formData);
        }
        alert('Progress saved!');
        setSaving(false);
        return;
      }

      console.log(`[Questionnaire Agent] 💾 Saving questionnaire data for deal: ${dealId}`);

      await api.post(`/agent/leads/${dealId}/questionnaire`, formData);

      console.log(`[Questionnaire Agent] ✅ Questionnaire saved successfully`);

      // Notify parent component about the data update (use current form data)
      if (onDataUpdate) {
        onDataUpdate(dealId, formData);
        console.log(`[Questionnaire Agent] 🔄 Parent component notified of data update`);
      }

      alert('Progress saved successfully!');
    } catch (err) {
      console.error(`[Questionnaire Agent] ❌ Error saving questionnaire:`, err.message);
      alert('Failed to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Submit questionnaire (with validation)
  const handleSubmit = async () => {
    // Validate all sections
    let allValid = true;
    for (let i = 1; i <= 5; i++) {
      if (!validateSection(i)) {
        allValid = false;
        setActiveSection(i);
        break;
      }
    }

    if (!allValid) {
      alert('Please complete all required fields before submitting.');
      return;
    }

    // In create mode (no dealId), parent modal handles submission
    if (!dealId) {
      console.log(`[Questionnaire Agent] ✅ Validation passed, parent will handle submission`);
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      return;
    }

    try {
      setSaving(true);
      console.log(`[Questionnaire Agent] ✅ Submitting complete questionnaire for deal: ${dealId}`);

      await api.post(`/agent/leads/${dealId}/questionnaire/submit`, formData);

      console.log(`[Questionnaire Agent] ✅ Questionnaire submitted successfully`);
      alert('Questionnaire submitted successfully!');

      // Call onSubmitSuccess callback
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      console.error(`[Questionnaire Agent] ❌ Error submitting questionnaire:`, err.message);
      alert('Failed to submit questionnaire. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render form field based on type
  const renderField = (fieldName, config) => {
    const label = fieldLabels[fieldName] || fieldName;
    const value = formData[fieldName] || '';
    const error = errors[fieldName];

    // Skip conditional fields that are not visible
    if (config.conditional && !conditionalFields[fieldName]) {
      return null;
    }

    return (
      <div key={fieldName} className="form-group">
        <label className={`form-label ${config.required ? 'required' : ''}`}>
          {label}
        </label>

        {config.formFieldType === 'radio' && (
          <div className="radio-group">
            {config.options && config.options.map((option) => (
              <label key={option.value} className="radio-item">
                <input
                  type="radio"
                  name={fieldName}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                />
                <span className="radio-label">{option.label}</span>
              </label>
            ))}
          </div>
        )}

        {config.formFieldType === 'textarea' && (
          <textarea
            className="form-textarea"
            name={fieldName}
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            rows={4}
          />
        )}

        {config.formFieldType === 'text' && (
          <input
            type="text"
            className="form-input"
            name={fieldName}
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        )}

        {config.formFieldType === 'date' && (
          <input
            type="date"
            className="form-input"
            name={fieldName}
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          />
        )}

        {config.formFieldType === 'number' && (
          <input
            type="number"
            className="form-input"
            name={fieldName}
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            min="0"
            step="0.01"
          />
        )}

        {config.formFieldType === 'file' && (
          <div className="file-upload-container">
            {/* Show message if deal not created yet */}
            {!dealId && (
              <div className="file-upload-disabled" style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
                marginBottom: '16px'
              }}>
                <AlertCircle size={18} style={{ marginRight: '8px', color: '#6c757d', verticalAlign: 'middle' }} />
                <span style={{ color: '#6c757d', fontSize: '14px' }}>
                  File uploads will be available after creating the lead.
                </span>
              </div>
            )}

            {/* Show existing files from HubSpot */}
            {dealId && existingFiles[config.hsPropertyName] && existingFiles[config.hsPropertyName].length > 0 && (
              <div className="existing-files-list" style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#666', fontWeight: '500' }}>Uploaded Files:</h4>
                {existingFiles[config.hsPropertyName].map((file, index) => (
                  <div key={index} className="existing-file-item" style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px', color: '#212529' }}>
                        {file.name}.{file.extension}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {(file.size / 1024).toFixed(2)} KB
                        {file.type === 'IMG' && file.width && ` • ${file.width}×${file.height}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          textDecoration: 'none',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-block'
                        }}
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleFileDelete(file.fileId, fieldName)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new files - only show if deal exists */}
            {dealId && (
              <>
                <input
                  type="file"
                  className="form-file-input"
                  id={`file-${fieldName}`}
                  multiple
                  accept="*/*"
                  onChange={(e) => handleFileUpload(fieldName, e.target.files)}
                />
                <label htmlFor={`file-${fieldName}`} className="file-upload-label">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                  </svg>
                  Choose Files
                </label>
                <span className="file-upload-info">
                  Max {config.maxFiles || 10} files, {config.maxFileSize || 25}MB each
                </span>
                {uploadedFiles[fieldName] && (
                  <div className="uploaded-files-list">
                    {uploadedFiles[fieldName].length} file(s) uploaded
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {error && <div className="field-error">{error}</div>}
      </div>
    );
  };

  // Render section
  const renderSection = (sectionNumber) => {
    // Get section from schema to maintain original question order (with sub-questions following their parents)
    const section = schema?.sections?.find(s => s.section_number === String(sectionNumber));

    if (!section) {
      return <div className="questionnaire-section">Section not found</div>;
    }

    return (
      <div className="questionnaire-section">
        <h3 className="section-title">{section.section_title}</h3>
        <p className="section-description">{sectionConfig[sectionNumber]?.description || ''}</p>

        <div className="section-fields">
          {section.questions.map((question) => {
            const fieldName = question.form_field_name;
            const config = propertyMapping[fieldName];
            return config ? renderField(fieldName, config) : null;
          })}
        </div>

        <div className="section-actions">
          {sectionNumber > 1 && (
            <button
              className="btn-secondary"
              onClick={() => setActiveSection(sectionNumber - 1)}
            >
              Previous Section
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>

          {sectionNumber < 5 ? (
            <button
              className="btn-primary"
              onClick={() => {
                if (validateSection(sectionNumber)) {
                  setActiveSection(sectionNumber + 1);
                }
              }}
            >
              Next Section
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Submitting...' : 'Submit Questionnaire'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Show loading state while schema is being fetched
  if (schemaLoading) {
    return (
      <div className="questionnaire-loading">
        <div className="loading-spinner">Loading questionnaire schema...</div>
      </div>
    );
  }

  // Show error if schema failed to load
  if (schemaError) {
    return (
      <div className="questionnaire-error">
        <p>Error: Failed to load questionnaire schema</p>
        <p className="error-details">{schemaError}</p>
      </div>
    );
  }

  // Schema must be loaded before rendering
  if (!schema || !propertyMapping || Object.keys(propertyMapping).length === 0) {
    return (
      <div className="questionnaire-loading">
        <div className="loading-spinner">Initializing questionnaire...</div>
      </div>
    );
  }

  // Calculate progress
  const totalFields = Object.keys(propertyMapping).length;
  const filledFields = Object.keys(formData).filter(key =>
    formData[key] && formData[key] !== ''
  ).length;
  const progressPercentage = Math.round((filledFields / totalFields) * 100);

  return (
    <div className="property-questionnaire-container">
      {/* Agent Banner */}
      {isAgentContext && (
        <div className="agent-banner" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)'
        }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '15px', fontWeight: '500' }}>
            You're completing this questionnaire on behalf of <strong>{clientName}</strong>
          </span>
        </div>
      )}

      <div className="questionnaire-header">
        <div className="progress-info">
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <span className="progress-text">{progressPercentage}% Complete</span>
        </div>
      </div>

      <div className="questionnaire-tabs">
        {[1, 2, 3, 4, 5].map(sectionNum => (
          <button
            key={sectionNum}
            className={`questionnaire-tab ${activeSection === sectionNum ? 'active' : ''}`}
            onClick={() => setActiveSection(sectionNum)}
          >
            <span className="tab-number">{sectionNum}</span>
            <span className="tab-title">{sectionConfig[sectionNum]?.title?.split(' ')[0] || `S${sectionNum}`}</span>
          </button>
        ))}
      </div>

      <div className="questionnaire-content">
        {renderSection(activeSection)}
      </div>
    </div>
  );
}
