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
      <div className="tiles-grid">
        {/* Tile 1: Seller Information */}
        <div className="info-tile seller-tile">
          <div className="sellers-container">
            {/* Primary Seller */}
            <div className="seller-block">
              <h3 className="seller-label">Primary Seller</h3>
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
                  <h3 className="seller-label">Additional Seller</h3>
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

        {/* Tile 2: Property Details */}
        <div className="info-tile property-tile">
          <div className="tile-content">
            <div className="info-field">
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

        {/* Tile 3 & 4: Agency + Listing Agent (side by side) */}
        <div className="info-tile agency-tile">
          <div className="tile-content">
            <h3 className="tile-label">Agency</h3>
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

        <div className="info-tile agent-tile">
          <div className="tile-content">
            <h3 className="tile-label">Listing Agent</h3>
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

        /* Tiles Grid Layout */
        .tiles-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          width: 100%;
        }

        /* Base Tile Styling */
        .info-tile {
          background: #F9FAFB;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
          border: 1px solid #E5E7EB;
        }

        .info-tile:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #D1D5DB;
        }

        /* Tile Color Variants */
        .seller-tile {
          background: #EEF6FF;
          border-color: #DBEAFE;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
        }

        .seller-tile:hover {
          background: #E0EFFF;
        }

        .property-tile {
          background: #F0FDF4;
          border-color: #DCFCE7;
          grid-column: 2 / 3;
          grid-row: 1 / 2;
        }

        .property-tile:hover {
          background: #E8FBEA;
        }

        .agency-tile {
          background: #FEF3C7;
          border-color: #FEE2B6;
          grid-column: 1 / 2;
          grid-row: 2 / 3;
        }

        .agency-tile:hover {
          background: #FDE9B0;
        }

        .agent-tile {
          background: #FCE7F3;
          border-color: #FBCFE8;
          grid-column: 2 / 3;
          grid-row: 2 / 3;
        }

        .agent-tile:hover {
          background: #F8D9E8;
        }

        /* Tile Content */
        .tile-content {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Tile Label */
        .tile-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--gray-900, #1F2937);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 6px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
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
          padding-bottom: 16px;
        }

        .seller-block:last-child {
          padding-top: 16px;
        }

        .seller-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--gray-900, #1F2937);
          text-transform: capitalize;
          letter-spacing: 0.3px;
          margin: 0 0 12px 0;
        }

        .seller-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.12);
          margin: 0;
          width: 100%;
        }

        .seller-fields {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        /* Field Styling */
        .info-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--gray-600, #4B5563);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .field-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--gray-900, #1F2937);
          margin: 0;
          word-break: break-word;
          line-height: 1.4;
        }

        .field-value:empty::before {
          content: 'N/A';
          color: var(--gray-400, #9CA3AF);
          font-weight: 400;
          font-style: italic;
        }

        /* Responsive Design - Tablet (1024px and below) */
        @media (max-width: 1024px) {
          .tiles-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 18px;
          }
        }

        /* Responsive Design - Mobile (768px and below) */
        @media (max-width: 768px) {
          .tiles-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .seller-tile,
          .property-tile,
          .agency-tile,
          .agent-tile {
            grid-column: 1 / -1;
            grid-row: auto;
          }

          .info-tile {
            padding: 16px;
          }

          .tile-label {
            font-size: 12px;
            margin: 0 0 4px 0;
            padding-bottom: 6px;
          }

          .tile-content {
            gap: 12px;
          }

          .info-fields {
            gap: 10px;
          }

          .field-label {
            font-size: 9px;
          }

          .field-value {
            font-size: 13px;
          }

          .seller-label {
            font-size: 11px;
            margin: 0 0 10px 0;
          }

          .seller-block:first-child {
            padding-bottom: 12px;
          }

          .seller-block:last-child {
            padding-top: 12px;
          }

          .seller-fields {
            gap: 10px;
          }
        }

        /* Responsive Design - Large Screens (1440px and above) */
        @media (min-width: 1440px) {
          .tiles-grid {
            gap: 22px;
          }

          .info-tile {
            padding: 22px;
          }
        }
      `}</style>
    </div>
  );
}
