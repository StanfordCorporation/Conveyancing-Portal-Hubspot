import React from 'react';

export default function PropertyDetails({ propertyAddress, dealStage, nextStep, clientResidentialAddress }) {
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
      </div>
    </div>
  );
}
