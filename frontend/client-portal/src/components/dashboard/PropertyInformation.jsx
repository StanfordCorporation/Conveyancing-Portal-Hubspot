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
        console.log(`[PropertyInfo] 📋 Fetching property details for deal: ${dealId}`);

        const response = await api.get(`/client/property/${dealId}`);
        setPropertyData(response.data);
        console.log(`[PropertyInfo] ✅ Property data loaded successfully`);
      } catch (err) {
        console.error(`[PropertyInfo] ❌ Error fetching property data:`, err.message);
        setError(err.message || 'Failed to load property information');
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

  return (
    <div className="property-info-container">
      {/* Section 1: Seller Information */}
      <div className="property-info-section">
        <h2 className="section-title">Seller Information</h2>
        <div className="section-divider"></div>

        <div className="info-grid">
          {/* Primary Seller */}
          <div className="info-group">
            <h3 className="group-title">Primary Seller</h3>
            <div className="info-fields">
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

          {/* Additional Seller */}
          <div className="info-group">
            <h3 className="group-title">Additional Seller</h3>
            <div className="info-fields">
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
        </div>
      </div>

      {/* Section 2: Property Details */}
      <div className="property-info-section">
        <h2 className="section-title">Property Details</h2>
        <div className="section-divider"></div>

        <div className="info-grid">
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

      {/* Section 3: Agency Details */}
      <div className="property-info-section">
        <h2 className="section-title">Agency Details</h2>
        <div className="section-divider"></div>

        <div className="info-grid">
          {/* Agency Information */}
          <div className="info-group">
            <h3 className="group-title">Agency</h3>
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

          {/* Agent Information */}
          <div className="info-group">
            <h3 className="group-title">Listing Agent</h3>
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
        }

        .property-info-section {
          margin-bottom: 32px;
        }

        .property-info-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 12px 0;
          letter-spacing: -0.3px;
        }

        .section-divider {
          height: 2px;
          background: linear-gradient(90deg, var(--primary, #3b82f6) 0%, transparent 100%);
          margin-bottom: 20px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 24px;
          margin-bottom: 20px;
        }

        .info-field.full-width {
          grid-column: 1 / -1;
        }

        .info-group {
          background: var(--card-bg, #f9fafb);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .info-group:hover {
          border-color: var(--primary, #3b82f6);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        .group-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary, #3b82f6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
        }

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
          font-size: 12px;
          font-weight: 500;
          color: var(--gray-600);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .field-value {
          font-size: 15px;
          color: var(--gray-900);
          margin: 0;
          word-break: break-word;
          font-weight: 500;
        }

        .field-value:empty::before {
          content: 'N/A';
          color: var(--gray-400);
          font-weight: 400;
          font-style: italic;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .info-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .section-title {
            font-size: 16px;
          }

          .property-info-section {
            margin-bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
}
