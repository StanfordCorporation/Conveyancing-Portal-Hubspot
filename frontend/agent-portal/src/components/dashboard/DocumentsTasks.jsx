import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Filter } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { LoadingButton } from './SkeletonLoaders';

export default function DocumentsTasks({ deals, onUploadDocument }) {
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null); // Track which document is being uploaded

  // Required documents for each deal
  const requiredDocuments = [
    { id: 'title_search', label: 'Title Search', field: 'title_search_upload' },
    { id: 'water_rates', label: 'Water Rates Certificate', field: 'water_rates_upload' },
    { id: 'rates_notice', label: 'Rates Notice', field: 'rates_notice_upload' }
  ];

  // Filter deals - only active deals need documents
  const activeDeals = deals.filter(d => 
    !['closedwon', 'closedlost', 'draft'].includes(d.dealstage?.toLowerCase())
  );

  // Get deals with pending documents
  const dealsWithDocuments = activeDeals.map(deal => {
    const pendingDocs = requiredDocuments.filter(doc => !deal[doc.field]);
    const completedDocs = requiredDocuments.filter(doc => deal[doc.field]);
    
    return {
      ...deal,
      pendingDocs,
      completedDocs,
      totalDocs: requiredDocuments.length,
      hasPending: pendingDocs.length > 0,
      isOverdue: getDaysInStage(deal) > 7 && pendingDocs.length > 0
    };
  });

  const filteredDeals = filterPendingOnly 
    ? dealsWithDocuments.filter(d => d.hasPending)
    : dealsWithDocuments;

  function getDaysInStage(deal) {
    if (!deal.hs_lastmodifieddate) return 0;
    return differenceInDays(new Date(), new Date(deal.hs_lastmodifieddate));
  }

  const handleFileUpload = async (dealId, documentType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const uploadKey = `${dealId}-${documentType}`;
        try {
          setUploadingDoc(uploadKey);
          await onUploadDocument(dealId, documentType, file);
        } catch (error) {
          console.error('Upload failed:', error);
          alert('Failed to upload document. Please try again.');
        } finally {
          setUploadingDoc(null);
        }
      }
    };

    input.click();
  };

  const getCompletionPercentage = (deal) => {
    return Math.round((deal.completedDocs.length / deal.totalDocs) * 100);
  };

  if (activeDeals.length === 0) {
    return (
      <div className="documents-tasks">
        <div className="content-header">
          <h1 className="content-title">Documents & Tasks</h1>
          <p className="content-subtitle">Upload and track required documents</p>
        </div>

        <div className="empty-state">
          <FileText size={48} color="var(--gray-400)" />
          <h3>No Active Deals</h3>
          <p>Documents will appear here when you have active deals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-tasks">
      {/* Header */}
      <div className="documents-header">
        <div>
          <h1 className="content-title">Documents & Tasks</h1>
          <p className="content-subtitle">
            Upload required documents for {activeDeals.length} active {activeDeals.length === 1 ? 'deal' : 'deals'}
          </p>
        </div>
        
        <div className="filter-toggle">
          <input
            type="checkbox"
            id="pendingFilter"
            checked={filterPendingOnly}
            onChange={(e) => setFilterPendingOnly(e.target.checked)}
          />
          <label htmlFor="pendingFilter">
            <Filter size={16} />
            <span>Show only pending documents</span>
          </label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="documents-summary">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)' }}>
            <FileText size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Total Documents Needed</p>
            <h2 className="summary-value">{activeDeals.length * 3}</h2>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Documents Uploaded</p>
            <h2 className="summary-value">
              {dealsWithDocuments.reduce((sum, d) => sum + d.completedDocs.length, 0)}
            </h2>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Pending Documents</p>
            <h2 className="summary-value">
              {dealsWithDocuments.reduce((sum, d) => sum + d.pendingDocs.length, 0)}
            </h2>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'var(--error-light)', color: 'var(--error)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Overdue Deals</p>
            <h2 className="summary-value">
              {dealsWithDocuments.filter(d => d.isOverdue).length}
            </h2>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="documents-list">
        {filteredDeals.length === 0 ? (
          <div className="no-pending">
            <CheckCircle size={48} color="var(--success)" />
            <h3>All Documents Uploaded!</h3>
            <p>All active deals have their required documents</p>
          </div>
        ) : (
          filteredDeals.map(deal => (
            <div key={deal.id} className={`document-deal-card ${deal.isOverdue ? 'overdue' : ''}`}>
              {/* Deal Header */}
              <div className="deal-card-header">
                <div className="deal-info">
                  <h3 className="deal-property">{deal.property_address || 'N/A'}</h3>
                  <p className="deal-client">
                    {deal.primarySeller?.firstname} {deal.primarySeller?.lastname}
                  </p>
                </div>
                <div className="deal-status">
                  <div className="completion-indicator">
                    <div className="completion-circle" style={{ 
                      background: `conic-gradient(var(--success) ${getCompletionPercentage(deal)}%, var(--gray-200) 0)` 
                    }}>
                      <span>{getCompletionPercentage(deal)}%</span>
                    </div>
                  </div>
                  {deal.isOverdue && (
                    <div className="overdue-badge">
                      <AlertCircle size={14} />
                      <span>Overdue</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Checklist */}
              <div className="documents-checklist">
                {requiredDocuments.map(doc => {
                  const isUploaded = deal[doc.field];
                  const uploadKey = `${deal.id}-${doc.id}`;
                  const isUploading = uploadingDoc === uploadKey;

                  return (
                    <div key={doc.id} className={`checklist-item ${isUploaded ? 'completed' : 'pending'}`}>
                      <div className="checklist-left">
                        <div className="checkbox">
                          {isUploaded ? (
                            <CheckCircle size={20} />
                          ) : (
                            <div className="checkbox-empty"></div>
                          )}
                        </div>
                        <div className="checklist-content">
                          <h4>{doc.label}</h4>
                          {isUploaded ? (
                            <p className="uploaded-info">Uploaded</p>
                          ) : (
                            <p className="pending-info">Required - PDF format</p>
                          )}
                        </div>
                      </div>

                      {!isUploaded && (
                        <LoadingButton
                          className="btn-upload"
                          onClick={() => handleFileUpload(deal.id, doc.id)}
                          loading={isUploading}
                          disabled={isUploading}
                        >
                          <Upload size={16} />
                          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                        </LoadingButton>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Deal Meta */}
              <div className="deal-meta">
                <span className="meta-item">
                  <span className="meta-label">Stage:</span>
                  <span className="meta-value">{deal.dealstage}</span>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Days in stage:</span>
                  <span className="meta-value">{getDaysInStage(deal)} days</span>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Last updated:</span>
                  <span className="meta-value">
                    {deal.hs_lastmodifieddate 
                      ? format(new Date(deal.hs_lastmodifieddate), 'MMM dd, yyyy')
                      : 'N/A'
                    }
                  </span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

