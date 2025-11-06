import React from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';

export default function PropertyDetails({ 
  propertyAddress, 
  dealStage, 
  nextStep, 
  clientResidentialAddress,
  agentTitleSearch,
  agentTitleSearchFile 
}) {
  return (
    <div className="property-tile">
      <div className="tile-header">
        <h3 className="tile-title">Property Details</h3>
      </div>
      <div className="tile-body">
        <div className="info-row full-width">
          <label className="field-label">Property Address</label>
          <p className="field-value">{propertyAddress || 'N/A'}</p>
        </div>
        <div className="info-row full-width">
          <label className="field-label">Client Residential Address</label>
          <p className="field-value">{clientResidentialAddress || 'N/A'}</p>
        </div>
        <div className="info-row">
          <label className="field-label">Deal Stage</label>
          <p className="field-value">{dealStage || 'N/A'}</p>
        </div>
        <div className="info-row">
          <label className="field-label">Next Step</label>
          <p className="field-value">{nextStep || 'N/A'}</p>
        </div>
        
        {/* Title Search Information */}
        {agentTitleSearch && (
          <div className="info-row full-width title-search-info">
            <label className="field-label">Title Search Status</label>
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
          </div>
        )}
        
        {/* Title Search File */}
        {agentTitleSearch === 'Yes' && agentTitleSearchFile && (
          <div className="info-row full-width">
            <label className="field-label">Title Search Document</label>
            <a 
              href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/files/${agentTitleSearchFile}`}
              target="_blank"
              rel="noopener noreferrer"
              className="file-download-link"
            >
              <FileText size={18} />
              <span>View Title Search Document</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
