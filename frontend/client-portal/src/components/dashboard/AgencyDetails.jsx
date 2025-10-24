import React from 'react';

export default function AgencyDetails({ agency }) {
  return (
    <div className="property-tile">
      <div className="tile-header">
        <h3 className="tile-title">Agency</h3>
      </div>
      <div className="tile-body">
        <div className="info-row">
          <label className="field-label">Agency Name</label>
          <p className="field-value">{agency?.name || 'N/A'}</p>
        </div>
        <div className="info-row">
          <label className="field-label">Agency Phone</label>
          <p className="field-value">{agency?.phone || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
