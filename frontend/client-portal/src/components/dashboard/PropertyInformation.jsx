import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';

/**
 * PropertyInformation Component
 * Displays comprehensive read-only property details including seller, agency, and agent information
 * Organized into three sections: Seller Info, Property Details, and Agency Details
 */
export default function PropertyInformation({ dealId }) {
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`[PropertyInfo] 📋 Fetching property details for deal: ${dealId}`);

        const response = await api.get(`/client/property/${dealId}`);
        setPropertyData(response.data);
        console.log(`[PropertyInfo] ✅ Property data loaded successfully`);
      } catch (err) {
        console.error(`[PropertyInfo] ❌ Error fetching property data:`, err.message);
        setError(err.message || 'Failed to load property information');
        setPropertyData(null);
      } finally {
        setLoading(false);
      }
    };

    if (dealId) {
      fetchPropertyData();
    }
  }, [dealId]);

  if (loading) {
    return (
      <div className="property-info-container">
        <div className="loading-spinner">Loading property information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="property-info-container">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  if (!propertyData) {
    return (
      <div className="property-info-container">
        <div className="empty-state">No property information available</div>
      </div>
    );
  }

  // Helper function to check if seller data exists and is not N/A
  const hasAdditionalSellerData = () => {
    const seller = propertyData.additionalSeller;
    if (!seller) return false;
    return (
      (seller.fullName && seller.fullName !== 'N/A') ||
      (seller.email && seller.email !== 'N/A') ||
      (seller.phone && seller.phone !== 'N/A')
    );
  };

  return (
    <div className="property-info-container">
      {/* Section 1: Seller Information */}
      <div className="property-info-section">
        <div className="section-header">
          <h2 className="section-title">Seller Information</h2>
        </div>

        {/* Single Card for Seller Info */}
        <div className="info-card">
          <div className="sellers-container">
            {/* Primary Seller */}
            <div className="seller-block">
              <h3 className="seller-label">PRIMARY SELLER</h3>
              <div className="seller-fields">
                <div className="info-field">
                  <label className="field-label">Full Name</label>
                  <p className="field-value">{propertyData.primarySeller?.fullName || 'N/A'}</p>
                </div>
                <div className="info-field">
                  <label className="field-label">Email Address</label>
                  <p className="field-value">{propertyData.primarySeller?.email || 'N/A'}</p>
                </div>
                <div className="info-field">
                  <label className="field-label">Mobile</label>
                  <p className="field-value">{propertyData.primarySeller?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Additional Seller - Only show if data exists */}
            {hasAdditionalSellerData() && (
              <>
                <div className="seller-divider"></div>
                <div className="seller-block">
                  <h3 className="seller-label">ADDITIONAL SELLER</h3>
                  <div className="seller-fields">
                    <div className="info-field">
                      <label className="field-label">Full Name</label>
                      <p className="field-value">{propertyData.additionalSeller?.fullName || 'N/A'}</p>
                    </div>
                    <div className="info-field">
                      <label className="field-label">Email Address</label>
                      <p className="field-value">{propertyData.additionalSeller?.email || 'N/A'}</p>
                    </div>
                    <div className="info-field">
                      <label className="field-label">Mobile</label>
                      <p className="field-value">{propertyData.additionalSeller?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Property Details */}
      <div className="property-info-section">
        <div className="section-header">
          <h2 className="section-title">Property Details</h2>
        </div>

        <div className="info-card">
          <div className="info-grid-2col">
            <div className="info-field full-width">
              <label className="field-label">Property Address</label>
              <p className="field-value">{propertyData.propertyAddress || 'N/A'}</p>
            </div>
            <div className="info-field">
              <label className="field-label">Deal Stage</label>
              <p className="field-value">{propertyData.dealStage || 'N/A'}</p>
            </div>
            <div className="info-field">
              <label className="field-label">Next Step</label>
              <p className="field-value">{propertyData.nextStep || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Agency Details */}
      <div className="property-info-section">
        <div className="section-header">
          <h2 className="section-title">Agency Details</h2>
        </div>

        <div className="info-grid-2col-section">
          {/* Agency Information Card */}
          <div className="info-card">
            <h3 className="card-title">Agency</h3>
            <div className="info-fields">
              <div className="info-field">
                <label className="field-label">Agency Name</label>
                <p className="field-value">{propertyData.agency?.name || 'N/A'}</p>
              </div>
              <div className="info-field">
                <label className="field-label">Agency Phone</label>
                <p className="field-value">{propertyData.agency?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Agent Information Card */}
          <div className="info-card">
            <h3 className="card-title">Listing Agent</h3>
            <div className="info-fields">
              <div className="info-field">
                <label className="field-label">Agent Full Name</label>
                <p className="field-value">{propertyData.agent?.fullName || 'N/A'}</p>
              </div>
              <div className="info-field">
                <label className="field-label">Agent Phone Number</label>
                <p className="field-value">{propertyData.agent?.phone || 'N/A'}</p>
              </div>
              <div className="info-field">
                <label className="field-label">Agent Email</label>
                <p className="field-value">{propertyData.agent?.email || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .property-info-container {
          padding: 0;
          background: transparent;
        }

        .loading-spinner,
        .error-message,
        .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--gray-600);
          font-size: 16px;
        }

        .error-message {
          color: var(--error-color, #dc3545);
          background: rgba(220, 53, 69, 0.1);
          border-left: 4px solid var(--error-color, #dc3545);
          border-radius: 6px;
        }

        /* Section Structure */
        .property-info-section {
          margin-bottom: 40px;
        }

        .property-info-section:last-child {
          margin-bottom: 0;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0;
          letter-spacing: -0.3px;
          position: relative;
          padding-left: 0;
        }

        .section-title::before {
          content: '';
          position: absolute;
          left: 0;
          bottom: -8px;
          width: 40px;
          height: 3px;
          background: var(--primary-blue, #0E6DFF);
          border-radius: 2px;
        }

        /* Card Styling */
        .info-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .info-card:hover {
          border-color: var(--primary-blue, #0E6DFF);
          box-shadow: 0 4px 12px rgba(14, 109, 255, 0.12);
        }

        .card-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary-blue, #0E6DFF);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid #F3F4F6;
        }

        /* Seller Block Styling */
        .sellers-container {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .seller-block {
          padding: 0;
        }

        .seller-block:first-child {
          padding-bottom: 20px;
        }

        .seller-block:last-child {
          padding-top: 20px;
        }

        .seller-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary-blue, #0E6DFF);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 0 0 14px 0;
        }

        .seller-divider {
          height: 1px;
          background: #F3F4F6;
          margin: 0;
          width: 100%;
        }

        .seller-fields {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        /* Two Column Grid Section */
        .info-grid-2col-section {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .info-grid-2col {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .info-grid-2col .info-field.full-width {
          grid-column: 1 / -1;
        }

        /* Field Styling */
        .info-fields {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .info-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--gray-600, #4B5563);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .field-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--gray-900, #1F2937);
          margin: 0;
          word-break: break-word;
          line-height: 1.5;
        }

        .field-value:empty::before {
          content: 'N/A';
          color: var(--gray-400, #9CA3AF);
          font-weight: 400;
          font-style: italic;
        }

        /* Responsive Design - Tablet */
        @media (max-width: 1024px) {
          .info-grid-2col-section,
          .info-grid-2col {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .section-title {
            font-size: 18px;
          }

          .property-info-section {
            margin-bottom: 32px;
          }
        }

        /* Responsive Design - Mobile */
        @media (max-width: 768px) {
          .info-grid-2col-section,
          .info-grid-2col {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .section-title {
            font-size: 16px;
          }

          .section-title::before {
            width: 30px;
            height: 2px;
          }

          .info-card {
            padding: 16px;
          }

          .card-title {
            font-size: 13px;
            margin: 0 0 12px 0;
            padding-bottom: 10px;
          }

          .info-fields {
            gap: 14px;
          }

          .field-label {
            font-size: 10px;
          }

          .field-value {
            font-size: 13px;
          }

          .property-info-section {
            margin-bottom: 28px;
          }

          .seller-label {
            font-size: 11px;
          }

          .seller-block:first-child {
            padding-bottom: 16px;
          }

          .seller-block:last-child {
            padding-top: 16px;
          }
        }
      `}</style>
    </div>
  );
}
