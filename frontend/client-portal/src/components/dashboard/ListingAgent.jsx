import React from 'react';

export default function ListingAgent({ agent }) {
  return (
    <div className="property-tile">
      <div className="tile-header">
        <h3 className="tile-title">Listing Agent</h3>
      </div>
      <div className="tile-body">
        <div className="info-row">
          <label className="field-label">Agent Full Name</label>
          <p className="field-value">{agent?.fullName || 'N/A'}</p>
        </div>
        <div className="info-row">
          <label className="field-label">Agent Phone Number</label>
          <p className="field-value">{agent?.phone || 'N/A'}</p>
        </div>
        <div className="info-row">
          <label className="field-label">Agent Email</label>
          <p className="field-value">{agent?.email || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
