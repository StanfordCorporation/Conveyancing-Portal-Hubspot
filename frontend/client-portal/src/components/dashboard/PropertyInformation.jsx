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
      {/* Seller Information Tile */}
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
                <p className="field-value">{propertyData.primarySeller?.fullName || 'N/A'}</p>
              </div>
              <div className="info-row">
                <label className="field-label">Email Address</label>
                <p className="field-value">{propertyData.primarySeller?.email || 'N/A'}</p>
              </div>
              <div className="info-row">
                <label className="field-label">Mobile</label>
                <p className="field-value">{propertyData.primarySeller?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Additional Seller - Only show if data exists */}
          {hasAdditionalSellerData() && (
            <div className="seller-section">
              <h4 className="seller-heading additional">Additional Seller</h4>
              <div className="seller-content">
                <div className="info-row">
                  <label className="field-label">Full Name</label>
                  <p className="field-value">{propertyData.additionalSeller?.fullName || 'N/A'}</p>
                </div>
                <div className="info-row">
                  <label className="field-label">Email Address</label>
                  <p className="field-value">{propertyData.additionalSeller?.email || 'N/A'}</p>
                </div>
                <div className="info-row">
                  <label className="field-label">Mobile</label>
                  <p className="field-value">{propertyData.additionalSeller?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Details Tile */}
      <div className="property-tile">
        <div className="tile-header">
          <h3 className="tile-title">Property Details</h3>
        </div>
        <div className="tile-body">
          <div className="info-row full-width">
            <label className="field-label">Property Address</label>
            <p className="field-value">{propertyData.propertyAddress || 'N/A'}</p>
          </div>
          <div className="info-row">
            <label className="field-label">Deal Stage</label>
            <p className="field-value">{propertyData.dealStage || 'N/A'}</p>
          </div>
          <div className="info-row">
            <label className="field-label">Next Step</label>
            <p className="field-value">{propertyData.nextStep || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Agency Details Tile */}
      <div className="property-tile">
        <div className="tile-header">
          <h3 className="tile-title">Agency</h3>
        </div>
        <div className="tile-body">
          <div className="info-row">
            <label className="field-label">Agency Name</label>
            <p className="field-value">{propertyData.agency?.name || 'N/A'}</p>
          </div>
          <div className="info-row">
            <label className="field-label">Agency Phone</label>
            <p className="field-value">{propertyData.agency?.phone || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Listing Agent Tile */}
      <div className="property-tile">
        <div className="tile-header">
          <h3 className="tile-title">Listing Agent</h3>
        </div>
        <div className="tile-body">
          <div className="info-row">
            <label className="field-label">Agent Full Name</label>
            <p className="field-value">{propertyData.agent?.fullName || 'N/A'}</p>
          </div>
          <div className="info-row">
            <label className="field-label">Agent Phone Number</label>
            <p className="field-value">{propertyData.agent?.phone || 'N/A'}</p>
          </div>
          <div className="info-row">
            <label className="field-label">Agent Email</label>
            <p className="field-value">{propertyData.agent?.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      <style>{`
        .property-info-container {
          padding: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          border-radius: 8px;
        }

        /* Tile Styling */
        .property-tile {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .property-tile:hover {
          border-color: #0E6DFF;
          box-shadow: 0 8px 16px rgba(14, 109, 255, 0.1);
        }

        .tile-header {
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          padding: 16px 20px;
        }

        .tile-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--gray-900, #1F2937);
          margin: 0;
          letter-spacing: -0.3px;
        }

        .tile-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Info Row */
        .info-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .info-row.full-width {
          grid-column: 1 / -1;
        }

        .field-label {
          font-size: 10px;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .field-value {
          font-size: 15px;
          font-weight: 500;
          color: #1F2937;
          margin: 0;
          word-break: break-word;
          line-height: 1.5;
        }

        .field-value:empty::before {
          content: 'N/A';
          color: #9CA3AF;
          font-weight: 400;
          font-style: italic;
        }

        /* Seller Sections */
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

        /* Responsive Design */
        @media (max-width: 768px) {
          .property-info-container {
            gap: 12px;
          }

          .tile-header {
            padding: 12px 16px;
          }

          .tile-title {
            font-size: 14px;
          }

          .tile-body {
            padding: 16px;
            gap: 14px;
          }

          .field-label {
            font-size: 9px;
          }

          .field-value {
            font-size: 14px;
          }

          .seller-content {
            gap: 12px;
          }

          .seller-section:not(:first-child) {
            padding-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}
