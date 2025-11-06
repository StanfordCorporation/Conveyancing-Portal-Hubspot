import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../../services/api.js';
import SellerInformation from './SellerInformation.jsx';
import PropertyDetails from './PropertyDetails.jsx';
import AgencyDetails from './AgencyDetails.jsx';
import ListingAgent from './ListingAgent.jsx';
import './property-info.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * PropertyInformation Component
 * Container component that fetches property data and renders individual section components
 */
export default function PropertyInformation({ dealId, initialData }) {
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(!initialData); // No loading if we have initial data
  const [error, setError] = useState(null);
  const [reviewingInfo, setReviewingInfo] = useState(false);

  useEffect(() => {
    // Use pre-loaded data if available (no API call needed!)
    if (initialData) {
      console.log(`[PropertyInfo] ⚡ Using pre-loaded data for deal: ${dealId} (no API call)`);

      // Add missing fields that PropertyInformation expects
      const completeData = {
        dealId: dealId,
        dealName: `Deal ${dealId}`,
        propertyAddress: 'Property Address', // This could be enhanced
        dealStage: 'Active',
        numberOfOwners: 1,
        nextStep: 'Complete property questionnaire',
        ...initialData // This has: primarySeller, additionalSeller, agency, agent
      };

      setPropertyData(completeData);
      setLoading(false);
      return;
    }

    // Fallback: fetch from API if no initial data (shouldn't happen after Phase 2)
    console.log(`[PropertyInfo] ⚠️ No pre-loaded data, falling back to API fetch for deal: ${dealId}`);

    const fetchPropertyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/client/property/${dealId}`);
        setPropertyData(response.data);
        console.log(`[PropertyInfo] ✅ Property data loaded from API`);
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
  }, [dealId, initialData]);

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

  // Handle information reviewed - progress to next step
  const handleInformationReviewed = async () => {
    try {
      setReviewingInfo(true);
      console.log(`[PropertyInfo] ✅ Information reviewed for deal: ${dealId}`);

      const token = localStorage.getItem('auth_token');
      
      // Update deal stage to Awaiting Questionnaire (Step 2)
      const response = await axios.patch(
        `${API_BASE_URL}/api/client/property/${dealId}/stage`,
        {
          stage: '1923713520', // AWAITING_QUESTIONNAIRE stage ID
          stepNumber: 2
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        console.log(`[PropertyInfo] 🎉 Information reviewed! Deal progressed to Awaiting Questionnaire`);
        window.location.reload();
      } else {
        throw new Error('Failed to mark information as reviewed');
      }
    } catch (err) {
      console.error('[PropertyInfo] ❌ Error marking information as reviewed:', err);
      alert(err.response?.data?.error || err.message || 'Failed to proceed. Please try again.');
    } finally {
      setReviewingInfo(false);
    }
  };

  // Handle edit - TODO: Implement edit functionality
  const handleEdit = () => {
    alert('Edit functionality coming soon! Please contact your conveyancer to update property information.');
  };

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
          clientResidentialAddress={propertyData.primarySeller?.residentialAddress}
        />
      </div>

      {/* Bottom Row: Agency & Listing Agent */}
      <div className="info-grid-row">
        <AgencyDetails agency={propertyData.agency} />
        <ListingAgent agent={propertyData.agent} />
      </div>

      {/* Action Buttons */}
      <div className="property-info-actions">
        <button
          onClick={handleEdit}
          className="btn-secondary edit-btn"
        >
          Edit
        </button>
        <button
          onClick={handleInformationReviewed}
          className="btn-primary review-btn"
          disabled={reviewingInfo}
        >
          {reviewingInfo ? 'Processing...' : 'Information Reviewed ✓'}
        </button>
      </div>
    </div>
  );
}
