import React, { useState, useEffect, useMemo } from 'react';
import { X, Home, FileText, Clock, Paperclip, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { agentApi } from '../../services/api';
import useQuestionnaireSchema from '../../hooks/useQuestionnaireSchema';

export default function LeadDetailsModal({ isOpen, onClose, deal }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(null);

  // Fetch questionnaire schema for dynamic rendering
  const { schema, loading: schemaLoading, error: schemaError } = useQuestionnaireSchema();

  // Helper function to check if a conditional field should be displayed
  const shouldShowConditionalField = (question, deal) => {
    if (!question.conditional || !question.conditional_on) return true;
    
    const parentField = question.conditional_on.question;
    const requiredValue = question.conditional_on.value;
    
    // Get the parent field's HubSpot property name
    const parentQuestion = schema?.sections
      .flatMap(s => s.questions)
      .find(q => q.form_field_name === parentField);
    
    if (!parentQuestion) return true;
    
    const parentPropertyName = parentQuestion.HubSpot_Property_Name;
    const actualValue = deal?.[parentPropertyName];
    
    // Compare values (case-insensitive for enumerations)
    if (typeof actualValue === 'string' && typeof requiredValue === 'string') {
      return actualValue.toLowerCase() === requiredValue.toLowerCase();
    }
    
    return actualValue === requiredValue;
  };

  // Helper function to format field values for display
  const formatFieldValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') {
      return 'Not answered';
    }
    
    // Format dates
    if (fieldType === 'date') {
      try {
        return format(new Date(value), 'MMM dd, yyyy');
      } catch {
        return value;
      }
    }
    
    // File uploads - show link or file ID
    if (fieldType === 'file') {
      return value ? 'File uploaded' : 'Not answered';
    }
    
    return value;
  };

  // Fetch timeline when timeline tab is active
  useEffect(() => {
    if (activeTab === 'timeline' && deal && isOpen) {
      fetchTimeline();
    }
  }, [activeTab, deal?.id, isOpen]);

  const fetchTimeline = async () => {
    if (!deal?.id) return;
    
    setTimelineLoading(true);
    setTimelineError(null);
    
    try {
      console.log('[LeadDetailsModal] Fetching timeline for deal:', deal.id);
      const response = await agentApi.getTimeline(deal.id);
      
      if (response.data?.timeline) {
        setTimeline(response.data.timeline);
        console.log('[LeadDetailsModal] Timeline loaded:', response.data.timeline.length, 'events');
      }
    } catch (error) {
      console.error('[LeadDetailsModal] Error fetching timeline:', error);
      setTimelineError(error.response?.data?.message || 'Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  if (!isOpen || !deal) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'questionnaire', label: 'Questionnaire', icon: FileText },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'documents', label: 'Documents', icon: Paperclip },
    { id: 'notes', label: 'Notes', icon: StickyNote }
  ];

  const getStageLabel = (stageId) => {
    const stages = {
      'draft': 'Draft',
      '1923713518': 'Questionnaire',
      '1923713520': 'Review',
      '1923682791': 'Signing',
      '1923682792': 'Processing',
      '1924069846': 'Post-Signing',
      '1904359900': 'Final Review',
      '1904359901': 'Payment',
      '1904359902': 'Complete',
      'closedwon': 'Closed Won',
      'closedlost': 'Closed Lost'
    };
    return stages[stageId] || 'Unknown';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container lead-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{deal.property_address || 'Lead Details'}</h2>
            <p className="modal-subtitle">
              {deal.primarySeller?.firstname} {deal.primarySeller?.lastname} • {getStageLabel(deal.dealstage)}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="modal-body">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              <div className="details-grid">
                <div className="detail-card">
                  <h4>Property Information</h4>
                  <div className="detail-item">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{deal.property_address || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Number of Owners:</span>
                    <span className="detail-value">{deal.number_of_owners || '1'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Current Stage:</span>
                    <span className="detail-value">
                      <span className="stage-badge">{getStageLabel(deal.dealstage)}</span>
                    </span>
                  </div>
                </div>

                <div className="detail-card">
                  <h4>Primary Seller</h4>
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">
                      {deal.primarySeller?.firstname} {deal.primarySeller?.lastname}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{deal.primarySeller?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{deal.primarySeller?.phone || 'N/A'}</span>
                  </div>
                </div>

                <div className="detail-card">
                  <h4>Important Dates</h4>
                  <div className="detail-item">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">
                      {deal.createdate ? format(new Date(deal.createdate), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Modified:</span>
                    <span className="detail-value">
                      {deal.hs_lastmodifieddate ? format(new Date(deal.hs_lastmodifieddate), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </span>
                  </div>
                  {deal.closedate && (
                    <div className="detail-item">
                      <span className="detail-label">Closed:</span>
                      <span className="detail-value">
                        {format(new Date(deal.closedate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Questionnaire Tab - Dynamic Schema-Driven Rendering */}
          {activeTab === 'questionnaire' && (
            <div className="tab-content">
              {schemaLoading ? (
                <div className="questionnaire-loading">
                  <p>Loading questionnaire schema...</p>
                </div>
              ) : schemaError ? (
                <div className="questionnaire-error">
                  <p>⚠️ Error loading questionnaire schema</p>
                </div>
              ) : !schema?.sections ? (
                <div className="questionnaire-error">
                  <p>No questionnaire schema available</p>
                </div>
              ) : (
                <div className="questionnaire-summary">
                  {schema.sections.map((section) => {
                    // Filter questions to only show visible ones (non-conditional or conditionally visible)
                    const visibleQuestions = section.questions.filter(question => 
                      shouldShowConditionalField(question, deal)
                    );

                    // Skip empty sections
                    if (visibleQuestions.length === 0) return null;

                    return (
                      <div key={section.section_number} className="summary-section">
                        <h4>Section {section.section_number}: {section.section_title}</h4>
                        {visibleQuestions.map((question) => {
                          const propertyName = question.HubSpot_Property_Name;
                          const value = deal?.[propertyName];
                          const displayValue = formatFieldValue(value, question.form_field_type);
                          
                          // For textarea fields or details fields, use full-width display
                          const isFullWidth = question.form_field_type === 'textarea' || 
                                             question.form_field_name.includes('_details');

                          return (
                            <div 
                              key={question.form_field_name} 
                              className={`summary-item ${isFullWidth ? 'full' : ''}`}
                            >
                              <span>{question.HubSpot_Property_Label || question.form_question}:</span>
                              <span>{displayValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="tab-content">
              {timelineLoading ? (
                <div className="timeline-loading">
                  <div className="spinner"></div>
                  <p>Loading timeline...</p>
                </div>
              ) : timelineError ? (
                <div className="timeline-error">
                  <p className="error-message">⚠️ {timelineError}</p>
                  <button onClick={fetchTimeline} className="retry-button">
                    Retry
                  </button>
                </div>
              ) : timeline.length === 0 ? (
                <div className="timeline-empty">
                  <p>No timeline events found</p>
                </div>
              ) : (
                <div className="timeline">
                  {timeline.map((event, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <h5>{event.title}</h5>
                        <p>{event.description}</p>
                        <span className="timeline-date">
                          {event.timestamp ? format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="tab-content">
              <div className="documents-list">
                <p className="placeholder-text">Document management will be implemented in Phase 4</p>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="tab-content">
              <div className="notes-section">
                <p className="placeholder-text">Agent notes feature will be implemented in a future update</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

