import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../../services/api.js';
import SellerInformation from './SellerInformation.jsx';
import PropertyDetails from './PropertyDetails.jsx';
import AgencyDetails from './AgencyDetails.jsx';
import ListingAgent from './ListingAgent.jsx';
import './property-info.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * PropertyInformation Component
 * Container component that fetches property data and renders individual section components
 */
export default function PropertyInformation({ dealId, initialData }) {
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(!initialData); // No loading if we have initial data
  const [error, setError] = useState(null);
  const [reviewingInfo, setReviewingInfo] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Use pre-loaded data if available (no API call needed!)
    if (initialData) {
      console.log(`[PropertyInfo] ⚡ Using pre-loaded data for deal: ${dealId} (no API call)`);

      // Add missing fields that PropertyInformation expects
      // Note: ...initialData is spread AFTER defaults, so it overrides them if present
      const completeData = {
        dealId: dealId,
        dealName: `Deal ${dealId}`,
        propertyAddress: 'Property Address',  // Default placeholder
        dealStage: 'In Progress',  // Default placeholder (will be overridden by initialData)
        numberOfOwners: 1,
        nextStep: 'Complete property questionnaire',
        ...initialData // This has: primarySeller, additionalSeller, agency, agent, propertyAddress, dealStage, etc.
      };

      // Log what we got
      console.log(`[PropertyInfo] 📋 Property data:`, {
        propertyAddress: completeData.propertyAddress,
        dealName: completeData.dealName,
        dealStage: completeData.dealStage,
        primarySeller: completeData.primarySeller?.fullName
      });

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
    // Validate Client Residential Address is filled in (REQUIRED - blocks if missing)
    const residentialAddress = propertyData.primarySeller?.residentialAddress;
    if (!residentialAddress || residentialAddress.trim() === '' || residentialAddress === 'N/A') {
      alert('⚠️ Client Residential Address is required.\n\nPlease click "Edit" to add the client\'s residential address before proceeding.');
      console.log('[PropertyInfo] ⚠️ Validation failed: Client Residential Address is missing');
      return; // Stop execution
    }

    // Prompt about Middle Name (OPTIONAL - reminder only, does not block)
    const middleName = propertyData.primarySeller?.middleName || propertyData.primarySeller?.middlename;
    if (!middleName || middleName.trim() === '' || middleName === 'N/A') {
      alert('ℹ️ Please also check if your middle name is put in.\n\nYou can click "Edit" to add it, or continue without it.');
      console.log('[PropertyInfo] ℹ️ Middle Name reminder shown (optional field)');
      // Continue execution - don't block
    }

    try {
      setReviewingInfo(true);
      console.log(`[PropertyInfo] ✅ Information reviewed for deal: ${dealId}`);

      // Update deal stage to Awaiting Questionnaire (Step 2)
      // Using api instance which automatically adds Authorization header
      const response = await api.patch(
        `/client/property/${dealId}/stage`,
        {
          stage: '1923713520', // AWAITING_QUESTIONNAIRE stage ID
          stepNumber: 2
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

  // Handle edit - Enter edit mode
  const handleEdit = () => {
    setEditMode(true);
    setEditedData({
      primarySeller: {
        id: propertyData.primarySeller?.id,
        firstname: propertyData.primarySeller?.fullName?.split(' ')[0] || '',
        lastname: propertyData.primarySeller?.fullName?.split(' ').slice(1).join(' ') || '',
        middlename: propertyData.primarySeller?.middleName || propertyData.primarySeller?.middlename || '',
        email: propertyData.primarySeller?.email || '',
        phone: propertyData.primarySeller?.phone || '',
        address: propertyData.primarySeller?.residentialAddress || ''
      },
      additionalSeller: propertyData.additionalSeller?.id ? {
        id: propertyData.additionalSeller?.id,
        firstname: propertyData.additionalSeller?.fullName?.split(' ')[0] || '',
        lastname: propertyData.additionalSeller?.fullName?.split(' ').slice(1).join(' ') || '',
        middlename: propertyData.additionalSeller?.middleName || propertyData.additionalSeller?.middlename || '',
        email: propertyData.additionalSeller?.email || '',
        phone: propertyData.additionalSeller?.phone || ''
      } : null,
      propertyAddress: propertyData.propertyAddress || '',
      agentTitleSearch: propertyData.agentTitleSearch || 'No'
    });
  };

  // Handle cancel - Exit edit mode without saving
  const handleCancel = () => {
    setEditMode(false);
    setEditedData(null);
  };

  // Handle save - Save all changes
  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('[PropertyInfo] 💾 Saving changes...');

      // Update primary seller contact
      if (editedData.primarySeller?.id) {
        await api.patch(`/client/contact/${editedData.primarySeller.id}`, {
          firstname: editedData.primarySeller.firstname,
          lastname: editedData.primarySeller.lastname,
          middle_name: editedData.primarySeller.middlename || '',
          email: editedData.primarySeller.email,
          phone: editedData.primarySeller.phone,
          address: editedData.primarySeller.address
        });
        console.log('[PropertyInfo] ✅ Primary seller updated');
      }

      // Update additional seller if exists
      if (editedData.additionalSeller?.id) {
        await api.patch(`/client/contact/${editedData.additionalSeller.id}`, {
          firstname: editedData.additionalSeller.firstname,
          lastname: editedData.additionalSeller.lastname,
          middle_name: editedData.additionalSeller.middlename || '',
          email: editedData.additionalSeller.email,
          phone: editedData.additionalSeller.phone
        });
        console.log('[PropertyInfo] ✅ Additional seller updated');
      }

      // Update deal (property address, agent title search)
      await api.patch(`/client/property/${dealId}/info`, {
        property_address: editedData.propertyAddress,
        agent_title_search: editedData.agentTitleSearch
      });
      console.log('[PropertyInfo] ✅ Deal info updated');

      // Reload to show fresh data
      window.location.reload();

    } catch (error) {
      console.error('[PropertyInfo] ❌ Error saving:', error);
      alert(error.response?.data?.error || 'Failed to save changes. Please try again.');
      setSaving(false);
    }
  };

  // Handle field changes
  const handleFieldChange = (section, field, value) => {
    console.log(`[PropertyInfo] 🔄 Field change: ${section}.${field} =`, value);
    setEditedData(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
      console.log(`[PropertyInfo] 📝 Updated editedData:`, updated);
      return updated;
    });
  };

  // Handle direct property changes (not nested)
  const handlePropertyChange = (field, value) => {
    console.log(`[PropertyInfo] 🔄 Property change: ${field} =`, value);
    setEditedData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      console.log(`[PropertyInfo] 📝 Updated editedData:`, updated);
      return updated;
    });
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
          primarySeller={editMode ? editedData?.primarySeller : propertyData.primarySeller}
          additionalSeller={editMode ? editedData?.additionalSeller : propertyData.additionalSeller}
          hasAdditional={hasAdditionalSellerData()}
          editMode={editMode}
          onChange={handleFieldChange}
        />
        <PropertyDetails
          dealId={dealId}
          propertyAddress={editMode ? editedData?.propertyAddress : propertyData.propertyAddress}
          dealStage={propertyData.dealStage}
          nextStep={propertyData.nextStep}
          clientResidentialAddress={editMode ? editedData?.primarySeller?.address : propertyData.primarySeller?.residentialAddress}
          agentTitleSearch={editMode ? editedData?.agentTitleSearch : propertyData.agentTitleSearch}
          agentTitleSearchFile={propertyData.agentTitleSearchFile}
          editMode={editMode}
          onChangePropertyAddress={(value) => handlePropertyChange('propertyAddress', value)}
          onChangeResidentialAddress={(value) => handleFieldChange('primarySeller', 'address', value)}
          onChangeAgentTitleSearch={(value) => handlePropertyChange('agentTitleSearch', value)}
        />
      </div>

      {/* Bottom Row: Agency & Listing Agent */}
      <div className="info-grid-row">
        <AgencyDetails agency={propertyData.agency} />
        <ListingAgent agent={propertyData.agent} />
      </div>

      {/* Action Buttons */}
      <div className="property-info-actions">
        {editMode ? (
          <>
            <button
              onClick={handleCancel}
              className="btn-secondary cancel-btn"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary save-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
