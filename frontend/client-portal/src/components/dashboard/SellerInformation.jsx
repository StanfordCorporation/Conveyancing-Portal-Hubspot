import React from 'react';

export default function SellerInformation({ primarySeller, additionalSeller, hasAdditional, editMode, onChange }) {
  return (
    <div className="property-tile">
      <div className="tile-header">
        <h3 className="tile-title">Seller Information</h3>
      </div>
      <div className="tile-body">
        {/* Primary Seller */}
        <div className="seller-section">
          <h4 className="seller-heading">Primary Seller</h4>
          <div className="seller-content">
            <div className="info-row">
              <label className="field-label">First Name</label>
              {editMode ? (
                <input
                  type="text"
                  className="field-input"
                  value={primarySeller?.firstname || ''}
                  onChange={(e) => onChange('primarySeller', 'firstname', e.target.value)}
                />
              ) : (
                <p className="field-value">{primarySeller?.fullName?.split(' ')[0] || primarySeller?.firstname || 'N/A'}</p>
              )}
            </div>
            <div className="info-row">
              <label className="field-label">Last Name</label>
              {editMode ? (
                <input
                  type="text"
                  className="field-input"
                  value={primarySeller?.lastname || ''}
                  onChange={(e) => onChange('primarySeller', 'lastname', e.target.value)}
                />
              ) : (
                <p className="field-value">{primarySeller?.fullName?.split(' ').slice(1).join(' ') || primarySeller?.lastname || 'N/A'}</p>
              )}
            </div>
            <div className="info-row">
              <label className="field-label">Middle Name</label>
              {editMode ? (
                <input
                  type="text"
                  className="field-input"
                  value={primarySeller?.middlename || ''}
                  onChange={(e) => onChange('primarySeller', 'middlename', e.target.value)}
                />
              ) : (
                <p className="field-value">{primarySeller?.middleName || primarySeller?.middlename || 'N/A'}</p>
              )}
            </div>
            <div className="info-row">
              <label className="field-label">Email Address</label>
              {editMode ? (
                <input
                  type="email"
                  className="field-input"
                  value={primarySeller?.email || ''}
                  onChange={(e) => onChange('primarySeller', 'email', e.target.value)}
                />
              ) : (
                <p className="field-value">{primarySeller?.email || 'N/A'}</p>
              )}
            </div>
            <div className="info-row">
              <label className="field-label">Mobile</label>
              {editMode ? (
                <input
                  type="tel"
                  className="field-input"
                  value={primarySeller?.phone || ''}
                  onChange={(e) => onChange('primarySeller', 'phone', e.target.value)}
                />
              ) : (
                <p className="field-value">{primarySeller?.phone || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Seller - Only show if data exists */}
        {hasAdditional && (
          <div className="seller-section">
            <h4 className="seller-heading additional">Additional Seller</h4>
            <div className="seller-content">
              <div className="info-row">
                <label className="field-label">First Name</label>
                {editMode ? (
                  <input
                    type="text"
                    className="field-input"
                    value={additionalSeller?.firstname || ''}
                    onChange={(e) => onChange('additionalSeller', 'firstname', e.target.value)}
                  />
                ) : (
                  <p className="field-value">{additionalSeller?.fullName?.split(' ')[0] || additionalSeller?.firstname || 'N/A'}</p>
                )}
              </div>
              <div className="info-row">
                <label className="field-label">Last Name</label>
                {editMode ? (
                  <input
                    type="text"
                    className="field-input"
                    value={additionalSeller?.lastname || ''}
                    onChange={(e) => onChange('additionalSeller', 'lastname', e.target.value)}
                  />
                ) : (
                  <p className="field-value">{additionalSeller?.fullName?.split(' ').slice(1).join(' ') || additionalSeller?.lastname || 'N/A'}</p>
                )}
              </div>
              <div className="info-row">
                <label className="field-label">Middle Name</label>
                {editMode ? (
                  <input
                    type="text"
                    className="field-input"
                    value={additionalSeller?.middlename || ''}
                    onChange={(e) => onChange('additionalSeller', 'middlename', e.target.value)}
                  />
                ) : (
                  <p className="field-value">{additionalSeller?.middleName || additionalSeller?.middlename || 'N/A'}</p>
                )}
              </div>
              <div className="info-row">
                <label className="field-label">Email Address</label>
                {editMode ? (
                  <input
                    type="email"
                    className="field-input"
                    value={additionalSeller?.email || ''}
                    onChange={(e) => onChange('additionalSeller', 'email', e.target.value)}
                  />
                ) : (
                  <p className="field-value">{additionalSeller?.email || 'N/A'}</p>
                )}
              </div>
              <div className="info-row">
                <label className="field-label">Mobile</label>
                {editMode ? (
                  <input
                    type="tel"
                    className="field-input"
                    value={additionalSeller?.phone || ''}
                    onChange={(e) => onChange('additionalSeller', 'phone', e.target.value)}
                  />
                ) : (
                  <p className="field-value">{additionalSeller?.phone || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .seller-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .seller-section:not(:first-child) {
          border-top: 1px solid #E5E7EB;
          padding-top: 16px;
        }

        .seller-heading {
          font-size: 12px;
          font-weight: 700;
          color: #0E6DFF;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin: 0 0 8px 0;
        }

        .seller-heading.additional {
          color: #059669;
        }

        .seller-content {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
      `}</style>
    </div>
  );
}
