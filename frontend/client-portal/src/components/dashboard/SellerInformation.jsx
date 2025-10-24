import React from 'react';

export default function SellerInformation({ primarySeller, additionalSeller, hasAdditional }) {
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
              <label className="field-label">Full Name</label>
              <p className="field-value">{primarySeller?.fullName || 'N/A'}</p>
            </div>
            <div className="info-row">
              <label className="field-label">Email Address</label>
              <p className="field-value">{primarySeller?.email || 'N/A'}</p>
            </div>
            <div className="info-row">
              <label className="field-label">Mobile</label>
              <p className="field-value">{primarySeller?.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Additional Seller - Only show if data exists */}
        {hasAdditional && (
          <div className="seller-section">
            <h4 className="seller-heading additional">Additional Seller</h4>
            <div className="seller-content">
              <div className="info-row">
                <label className="field-label">Full Name</label>
                <p className="field-value">{additionalSeller?.fullName || 'N/A'}</p>
              </div>
              <div className="info-row">
                <label className="field-label">Email Address</label>
                <p className="field-value">{additionalSeller?.email || 'N/A'}</p>
              </div>
              <div className="info-row">
                <label className="field-label">Mobile</label>
                <p className="field-value">{additionalSeller?.phone || 'N/A'}</p>
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
