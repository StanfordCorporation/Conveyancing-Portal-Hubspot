import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../../services/api.js';
import SellerInformation from './SellerInformation.jsx';
import PropertyDetails from './PropertyDetails.jsx';
import AgencyDetails from './AgencyDetails.jsx';
import ListingAgent from './ListingAgent.jsx';
import { createPrimarySellerTour } from './PrimarySellerTour.js';
import 'shepherd.js/dist/css/shepherd.css';
import './property-info.css';
import './primary-seller-tour.css';

// Phone number formatter - converts Australian numbers to +61 format
const formatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return phone || '';
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If already in international format (+61...), return as-is
  if (cleaned.startsWith('+61')) {
    return cleaned;
  }

  // If starts with 61 (without +), add +
  if (cleaned.startsWith('61')) {
    return '+' + cleaned;
  }

  // If starts with 0 (Australian domestic format), remove 0 and add +61
  if (cleaned.startsWith('0')) {
    return '+61' + cleaned.substring(1);
  }

  // If it's digits without prefix, assume Australian and add +61
  if (cleaned && cleaned.length >= 9) {
    return '+61' + cleaned;
  }

  // Return original if we can't parse it
  return phone;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * PropertyInformation Component
 * Container component that fetches property data and renders individual section components
 */
export default function PropertyInformation({ dealId, initialData, readOnly = false }) {
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(!initialData); // No loading if we have initial data
  const [error, setError] = useState(null);
  const [reviewingInfo, setReviewingInfo] = useState(false);

  // Edit mode state - editable unless read-only
  const [editMode, setEditMode] = useState(!readOnly);
  const [editedData, setEditedData] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Tour state
  const tourRef = useRef(null);
  const [tourStarted, setTourStarted] = useState(false);

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

  // Handle individual field save during tour
  const handleFieldSave = async (fieldName) => {
    if (!editedData?.primarySeller?.id) {
      console.warn('[PropertyInfo] ⚠️ Cannot save field: primary seller ID not found');
      return;
    }

    try {
      console.log(`[PropertyInfo] 💾 Saving field: ${fieldName}`);
      
      // Read the current value directly from the input element to ensure we get the latest value
      const inputElement = document.querySelector(`[data-tour-target="${fieldName}"]`);
      let currentValue = '';
      
      if (inputElement) {
        // Blur the input to ensure any pending changes are committed
        if (document.activeElement === inputElement) {
          inputElement.blur();
          // Small delay to ensure blur event is processed
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Read the value and trim whitespace
        currentValue = (inputElement.value || '').trim();
        console.log(`[PropertyInfo] 📝 Read value from input element:`, {
          elementFound: true,
          rawValue: inputElement.value,
          trimmedValue: currentValue,
          elementType: inputElement.tagName,
          elementId: inputElement.id,
          elementClass: inputElement.className,
          wasFocused: document.activeElement === inputElement
        });
      } else {
        // Fallback to editedData if input not found
        console.warn(`[PropertyInfo] ⚠️ Input element not found for ${fieldName}, using editedData`);
        console.log(`[PropertyInfo] 🔍 Searching for selector: [data-tour-target="${fieldName}"]`);
        console.log(`[PropertyInfo] 🔍 All tour-target elements:`, 
          Array.from(document.querySelectorAll('[data-tour-target]')).map(el => ({
            target: el.getAttribute('data-tour-target'),
            value: el.value,
            tagName: el.tagName
          }))
        );
      }
      
      // Map field names to API payload - use current input value if available, otherwise fallback to editedData
      const fieldMapping = {
        'first-name': { 
          firstname: inputElement ? currentValue : (editedData.primarySeller.firstname || '') 
        },
        'last-name': { 
          lastname: inputElement ? currentValue : (editedData.primarySeller.lastname || '') 
        },
        'middle-name': { 
          middle_name: inputElement ? currentValue : (editedData.primarySeller.middlename || '') 
        },
        'email': { 
          email: inputElement ? currentValue : (editedData.primarySeller.email || '') 
        },
        'mobile': { 
          phone: inputElement ? formatPhoneNumber(currentValue) : formatPhoneNumber(editedData.primarySeller.phone || '') 
        },
        'residential-address': { 
          address: inputElement ? currentValue : (editedData.primarySeller.address || '') 
        }
      };

      const updatePayload = fieldMapping[fieldName];
      if (!updatePayload) {
        console.warn(`[PropertyInfo] ⚠️ Unknown field: ${fieldName}`);
        return;
      }

      console.log(`[PropertyInfo] 📤 Saving payload for ${fieldName}:`, {
        payload: updatePayload,
        inputElementFound: !!inputElement,
        valueFromInput: currentValue,
        valueFromState: editedData.primarySeller[fieldName === 'middle-name' ? 'middlename' : fieldName]
      });

      // Save the field to HubSpot
      await api.patch(`/client/contact/${editedData.primarySeller.id}`, updatePayload);
      console.log(`[PropertyInfo] ✅ Field saved to HubSpot: ${fieldName}`, updatePayload);

      // Update editedData with the saved value to keep it in sync
      const savedValue = Object.values(updatePayload)[0];
      
      // Update editedData state
      setEditedData(prev => {
        const updated = { ...prev };
        if (fieldName === 'first-name') {
          updated.primarySeller = { ...prev.primarySeller, firstname: savedValue };
        } else if (fieldName === 'last-name') {
          updated.primarySeller = { ...prev.primarySeller, lastname: savedValue };
        } else if (fieldName === 'middle-name') {
          updated.primarySeller = { ...prev.primarySeller, middlename: savedValue };
        } else if (fieldName === 'email') {
          updated.primarySeller = { ...prev.primarySeller, email: savedValue };
        } else if (fieldName === 'mobile') {
          updated.primarySeller = { ...prev.primarySeller, phone: savedValue };
        } else if (fieldName === 'residential-address') {
          updated.primarySeller = { ...prev.primarySeller, address: savedValue };
        }
        return updated;
      });

      // Update propertyData to reflect the saved change
      if (propertyData && propertyData.primarySeller) {
        setPropertyData(prev => {
          const updated = { ...prev };
          
          // For first-name and last-name, we need to reconstruct fullName
          // Read both values from inputs to ensure we have the latest
          if (fieldName === 'first-name' || fieldName === 'last-name') {
            const firstnameInput = document.querySelector('[data-tour-target="first-name"]');
            const lastnameInput = document.querySelector('[data-tour-target="last-name"]');
            const currentFirstname = firstnameInput?.value || editedData.primarySeller.firstname || '';
            const currentLastname = lastnameInput?.value || editedData.primarySeller.lastname || '';
            
            updated.primarySeller = {
              ...prev.primarySeller,
              fullName: `${currentFirstname} ${currentLastname}`.trim()
            };
          } else if (fieldName === 'middle-name') {
            updated.primarySeller = { ...prev.primarySeller, middleName: savedValue };
          } else if (fieldName === 'email') {
            updated.primarySeller = { ...prev.primarySeller, email: savedValue };
          } else if (fieldName === 'mobile') {
            updated.primarySeller = { ...prev.primarySeller, phone: savedValue };
          } else if (fieldName === 'residential-address') {
            updated.primarySeller = { ...prev.primarySeller, residentialAddress: savedValue };
          }
          
          return updated;
        });
      }

    } catch (error) {
      console.error(`[PropertyInfo] ❌ Error saving field ${fieldName}:`, error);
      alert(`Failed to save ${fieldName}. Please try again.`);
      throw error; // Re-throw so tour can handle it
    }
  };

  // Initialize editedData when propertyData loads (for always-editable mode)
  useEffect(() => {
    if (propertyData) {
      // Extract middle name - check both middleName and middlename properties
      const middleName = propertyData.primarySeller?.middleName || 
                        propertyData.primarySeller?.middlename || 
                        '';
      
      console.log('[PropertyInfo] 🔍 Initializing editedData:', {
        middleNameFromProperty: propertyData.primarySeller?.middleName,
        middlenameFromProperty: propertyData.primarySeller?.middlename,
        resolvedMiddleName: middleName
      });
      
      setEditedData({
        primarySeller: {
          id: propertyData.primarySeller?.id,
          firstname: propertyData.primarySeller?.fullName?.split(' ')[0] || '',
          lastname: propertyData.primarySeller?.fullName?.split(' ').slice(1).join(' ') || '',
          middlename: middleName,
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
    }
  }, [propertyData]);

  // Initialize and auto-start tour if needed
  useEffect(() => {
    if (propertyData && !tourStarted && editedData) {
      // Check deal stage - tour should always start for "Client Details Required" stage
      const dealStageId = propertyData.dealStageId;
      const dealStageName = propertyData.dealStage;
      const isClientDetailsRequiredStage = dealStageId === '1923713518' || 
                                          dealStageName === 'Client Details Required';
      
      console.log('[PropertyInfo] 🔍 Checking tour conditions:', {
        dealStageId,
        dealStageName,
        isClientDetailsRequiredStage,
        propertyDataKeys: Object.keys(propertyData)
      });
      
      // Check if critical fields are missing
      const residentialAddress = propertyData.primarySeller?.residentialAddress;
      const middleName = propertyData.primarySeller?.middleName || propertyData.primarySeller?.middlename;
      
      const hasResidentialAddress = residentialAddress && 
                                     residentialAddress.trim() !== '' && 
                                     residentialAddress !== 'N/A';
      const hasMiddleName = middleName && 
                            middleName.trim() !== '' && 
                            middleName !== 'N/A';
      
      // Check if tour was already completed for this deal
      // For "Client Details Required" stage, ignore localStorage and always show tour
      const tourCompleted = !isClientDetailsRequiredStage ? localStorage.getItem(`primary-seller-tour-${dealId}`) : null;
      
      // Initialize tour with field save callback
      tourRef.current = createPrimarySellerTour(async (fieldName) => {
        console.log(`[PropertyInfo] ✅ Field confirmed: ${fieldName}`);
        await handleFieldSave(fieldName);
      });
      
      // Handle tour completion
      tourRef.current.on('complete', () => {
        // Only save completion if not in Client Details Required stage (allow re-showing at this stage)
        if (!isClientDetailsRequiredStage) {
          localStorage.setItem(`primary-seller-tour-${dealId}`, 'true');
        }
        setTourStarted(true);
        console.log('[PropertyInfo] ✅ Tour completed');
      });
      
      // Handle tour cancellation
      tourRef.current.on('cancel', () => {
        // Only save cancellation if not in Client Details Required stage
        if (!isClientDetailsRequiredStage) {
          localStorage.setItem(`primary-seller-tour-${dealId}`, 'true');
        }
        setTourStarted(true);
        console.log('[PropertyInfo] ⏭️ Tour cancelled');
      });
      
      // Auto-start tour if:
      // 1. Deal is in "Client Details Required" stage (always show tour at this stage), OR
      // 2. Critical fields are missing AND tour hasn't been completed
      const shouldStartTour = isClientDetailsRequiredStage || ((!hasResidentialAddress || !hasMiddleName) && !tourCompleted);
      
      if (shouldStartTour) {
        console.log('[PropertyInfo] 🎯 Tour conditions met:', {
          isClientDetailsRequiredStage,
          hasResidentialAddress,
          hasMiddleName,
          tourCompleted
        });
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (tourRef.current) {
            tourRef.current.start();
            setTourStarted(true);
            console.log('[PropertyInfo] 🎯 Tour auto-started');
          }
        }, 500);
      } else {
        console.log('[PropertyInfo] ⏭️ Tour not started:', {
          isClientDetailsRequiredStage,
          hasResidentialAddress,
          hasMiddleName,
          tourCompleted,
          reason: tourCompleted ? 'Tour already completed' : 'Conditions not met'
        });
      }
    }
  }, [propertyData, dealId, tourStarted, editedData]);

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

  // Handle cancel - Reset editedData to original propertyData
  const handleCancel = () => {
    if (propertyData) {
      const middleName = propertyData.primarySeller?.middleName || 
                        propertyData.primarySeller?.middlename || 
                        '';
      
      setEditedData({
        primarySeller: {
          id: propertyData.primarySeller?.id,
          firstname: propertyData.primarySeller?.fullName?.split(' ')[0] || '',
          lastname: propertyData.primarySeller?.fullName?.split(' ').slice(1).join(' ') || '',
          middlename: middleName,
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
    }
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
          phone: formatPhoneNumber(editedData.primarySeller.phone || ''),
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
          phone: formatPhoneNumber(editedData.additionalSeller.phone || '')
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

  // Manual tour start handler
  const handleManualTourStart = () => {
    if (tourRef.current) {
      tourRef.current.start();
      setTourStarted(true);
      console.log('[PropertyInfo] 🎯 Tour manually started');
    } else {
      // Re-initialize tour if needed
      tourRef.current = createPrimarySellerTour(async (fieldName) => {
        console.log(`[PropertyInfo] ✅ Field confirmed: ${fieldName}`);
        await handleFieldSave(fieldName);
      });
      
      tourRef.current.on('complete', () => {
        localStorage.setItem(`primary-seller-tour-${dealId}`, 'true');
        setTourStarted(true);
        console.log('[PropertyInfo] ✅ Tour completed');
      });
      
      tourRef.current.on('cancel', () => {
        localStorage.setItem(`primary-seller-tour-${dealId}`, 'true');
        setTourStarted(true);
        console.log('[PropertyInfo] ⏭️ Tour cancelled');
      });
      
      tourRef.current.start();
      setTourStarted(true);
    }
  };

  return (
    <div className="property-info-container">
      {/* Phase 3.5: Read-only notice */}
      {readOnly && (
        <div className="read-only-notice">
          <p>This section is read-only. Payment has been completed.</p>
        </div>
      )}
      {/* Manual Tour Start Button - Show if tour hasn't started and deal is in Client Details Required stage */}
      {propertyData && !tourStarted && (propertyData.dealStageId === '1923713518' || propertyData.dealStage === 'Client Details Required') && !readOnly && (
        <button
          onClick={handleManualTourStart}
          className="btn-tour-manual"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            background: '#0E6DFF',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          🎯 Start Information Review Tour
        </button>
      )}
      
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
            <button
              onClick={handleCancel}
              className="btn-secondary cancel-btn"
              disabled={saving || readOnly}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary save-btn"
              disabled={saving || readOnly}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleInformationReviewed}
              className="btn-primary review-btn"
              disabled={reviewingInfo || readOnly}
          data-tour-target="information-reviewed-btn"
            >
              {reviewingInfo ? 'Processing...' : 'Information Reviewed ✓'}
            </button>
      </div>
    </div>
  );
}
