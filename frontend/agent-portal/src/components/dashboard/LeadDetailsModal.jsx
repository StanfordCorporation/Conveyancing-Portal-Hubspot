import React, { useState } from 'react';
import { X, Home, FileText, Clock, Paperclip, StickyNote } from 'lucide-react';
import { format } from 'date-fns';

export default function LeadDetailsModal({ isOpen, onClose, deal }) {
  const [activeTab, setActiveTab] = useState('overview');

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

          {/* Questionnaire Tab */}
          {activeTab === 'questionnaire' && (
            <div className="tab-content">
              <div className="questionnaire-summary">
                <div className="summary-section">
                  <h4>Section 1: Title Details</h4>
                  <div className="summary-item">
                    <span>Body Corporate:</span>
                    <span>{deal.body_corporate || 'Not answered'}</span>
                  </div>
                  <div className="summary-item">
                    <span>Registered Encumbrances:</span>
                    <span>{deal.registered_encumbrances || 'Not answered'}</span>
                  </div>
                  {deal.registered_encumbrance_details && (
                    <div className="summary-item full">
                      <span>Details:</span>
                      <span>{deal.registered_encumbrance_details}</span>
                    </div>
                  )}
                </div>

                <div className="summary-section">
                  <h4>Section 2: Tenancy</h4>
                  <div className="summary-item">
                    <span>Tenancy Agreement:</span>
                    <span>{deal.tenancy_agreement || 'Not answered'}</span>
                  </div>
                  {deal.tenancy_agreement === 'Yes' && (
                    <>
                      <div className="summary-item">
                        <span>Lease Start:</span>
                        <span>{deal.tenancy_agreement_lease_start_date || 'N/A'}</span>
                      </div>
                      <div className="summary-item">
                        <span>Lease End:</span>
                        <span>{deal.tenancy_agreement_lease_end_date || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="summary-section">
                  <h4>Section 3: Environment</h4>
                  <div className="summary-item">
                    <span>Environmental Register:</span>
                    <span>{deal.environmental_register || 'Not answered'}</span>
                  </div>
                  <div className="summary-item">
                    <span>Tree Orders:</span>
                    <span>{deal.tree_order || 'Not answered'}</span>
                  </div>
                </div>

                <div className="summary-section">
                  <h4>Section 4: Buildings</h4>
                  <div className="summary-item">
                    <span>Swimming Pool:</span>
                    <span>{deal.swimming_pool || 'Not answered'}</span>
                  </div>
                  <div className="summary-item">
                    <span>Owner Builder:</span>
                    <span>{deal.owner_builder || 'Not answered'}</span>
                  </div>
                  <div className="summary-item">
                    <span>Enforcement Notice:</span>
                    <span>{deal.enforcement_notice || 'Not answered'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="tab-content">
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h5>Lead Created</h5>
                    <p>Created by agent</p>
                    <span className="timeline-date">
                      {deal.createdate ? format(new Date(deal.createdate), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {deal.hs_lastmodifieddate && (
                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h5>Last Updated</h5>
                      <p>Information modified</p>
                      <span className="timeline-date">
                        {format(new Date(deal.hs_lastmodifieddate), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                )}
                
                {deal.closedate && (
                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h5>Deal Closed</h5>
                      <p>Status: {deal.dealstage === 'closedwon' ? 'Won' : 'Lost'}</p>
                      <span className="timeline-date">
                        {format(new Date(deal.closedate), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
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

