import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import SellerInformation from './SellerInformation.jsx';
import PropertyDetails from './PropertyDetails.jsx';
import AgencyDetails from './AgencyDetails.jsx';
import ListingAgent from './ListingAgent.jsx';
import './property-info.css';

/**
 * PropertyInformation Component
 * Container component that fetches property data and renders individual section components
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
      {/* Top Row: Seller Information & Property Details */}
      <div className="info-grid-row">
        <SellerInformation
          primarySeller={propertyData.primarySeller}
          additionalSeller={propertyData.additionalSeller}
          hasAdditional={hasAdditionalSellerData()}
        />
        <PropertyDetails
          propertyAddress={propertyData.propertyAddress}
          dealStage={propertyData.dealStage}
          nextStep={propertyData.nextStep}
        />
      </div>

      {/* Bottom Row: Agency & Listing Agent */}
      <div className="info-grid-row">
        <AgencyDetails agency={propertyData.agency} />
        <ListingAgent agent={propertyData.agent} />
      </div>
    </div>
  );
}
