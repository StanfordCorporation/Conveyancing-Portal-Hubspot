import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Lock, Eye } from 'lucide-react';
import api from '../../services/api.js';
import { getStepFromStage, getStageFromStep } from '../../constants/dealStages.js';
import PropertyInformation from './PropertyInformation.jsx';
import PropertyQuestionnaire from './PropertyQuestionnaire.jsx';
import DynamicQuote from './DynamicQuote.jsx';
import SigningStatus from './SigningStatus.jsx';
import PaymentInstructions from './PaymentInstructions.jsx';
import StatusTracking from './StatusTracking.jsx';
import './dashboard.css';

export default function ClientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get stored user data from localStorage
  const storedUser = JSON.parse(localStorage.getItem('user'));

  // Prevent StrictMode double-execution
  const hasFetchedDashboardRef = useRef(false);

  const [expandedProperty, setExpandedProperty] = useState(0);
  const [activeSection, setActiveSection] = useState('information');
  const [activeQuestionnaireTab, setActiveQuestionnaireTab] = useState('q-section1');
  const [propertyStages, setPropertyStages] = useState({});
  const [quoteRefreshKey, setQuoteRefreshKey] = useState(Date.now());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if user is additional seller
  const isAdditionalSeller = storedUser?.sellerType === 'additional';

  // Client data from login
  const [clientData, setClientData] = useState({
    fullName: storedUser ? `${storedUser.firstname} ${storedUser.lastname}`.trim() : 'Client',
    email: storedUser?.email || '',
    phone: storedUser?.phone || '',
    sellerType: storedUser?.sellerType || 'primary'
  });

  // Dynamically loaded properties
  const [properties, setProperties] = useState([]);
  const [currentProperty, setCurrentProperty] = useState(null);
  const [questionnaireDataByDeal, setQuestionnaireDataByDeal] = useState({}); // { dealId: { questionnaire data } }
  const [propertyDetailsByDeal, setPropertyDetailsByDeal] = useState({}); // { dealId: { full property info } }
  const [filesByDeal, setFilesByDeal] = useState({}); // { dealId: { fieldName: [file objects] } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [envelopeStatus, setEnvelopeStatus] = useState({}); // { dealId: { status, signers, etc } }
  const [quoteAmounts, setQuoteAmounts] = useState({}); // { dealId: amount }
  const [paymentStatusByDeal, setPaymentStatusByDeal] = useState({}); // { dealId: paymentStatus } - Phase 2.1

  // Handle signing completion query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const signingComplete = params.get('signing');
    const step = params.get('step');
    const envelopeId = params.get('envelopeId');

    if (signingComplete === 'complete') {
      console.log('[Dashboard] 🎉 Signing completed!', { envelopeId, step });
      
      // Move to step 5 (payment)
      if (step === '5' && currentProperty) {
        setPropertyStages(prev => ({
          ...prev,
          [currentProperty.id]: 5
        }));
        setActiveSection('payment');
      }

      // Store envelope ID for this property
      if (envelopeId && currentProperty) {
        setEnvelopeStatus(prev => ({
          ...prev,
          [currentProperty.id]: { envelopeId, status: 'signed' }
        }));
      }

      // Clear query parameters
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [location.search, currentProperty]);

  // Handle payment completion query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('payment');
    const dealIdParam = params.get('dealId');

    if (paymentStatus === 'success' && dealIdParam) {
      console.log('[Dashboard] 💳 Payment completed! Verifying with backend...', { dealId: dealIdParam });
      
      // Poll backend to verify payment status (webhook should have updated the deal)
      const verifyPayment = async () => {
        try {
          const response = await api.get(`/client/property/${dealIdParam}`);
          const updatedDeal = response.data;
          
          console.log('[Dashboard] ✅ Deal status verified:', updatedDeal.status);
          
          // Update to step 6 (tracking)
          setPropertyStages(prev => ({
            ...prev,
            [dealIdParam]: 6
          }));
          setActiveSection('tracking');
          
          console.log('[Dashboard] 🎯 Progressed to Step 6 (Status Tracking)');
        } catch (error) {
          console.error('[Dashboard] ❌ Error verifying payment:', error);
          // Still show step 6 even if verification fails
          setPropertyStages(prev => ({
            ...prev,
            [dealIdParam]: 6
          }));
          setActiveSection('tracking');
        }
      };

      // Small delay to allow webhook to process
      setTimeout(verifyPayment, 1000);

      // Clear query parameters
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [location.search]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasFetchedDashboardRef.current) {
      console.log('[Dashboard] ⏭️ Skipping duplicate dashboard fetch (StrictMode prevention)');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('[Dashboard] 🚀 Fetching COMPLETE dashboard data (all in one call)...');

        const response = await api.get('/client/dashboard-complete');
        hasFetchedDashboardRef.current = true; // Mark as fetched

        if (response.data.deals && response.data.deals.length > 0) {
          console.log(`[Dashboard] ✅ Loaded ${response.data.deals.length} deals with ALL data (questionnaire + property details)`);
          setProperties(response.data.deals);
          setCurrentProperty(response.data.deals[0]); // Auto-select first property

          // Store questionnaire data by dealId for quick lookup
          const questionnaireDataLookup = {};
          const propertyDetailsLookup = {};
          const filesLookup = {};
          const paymentStatusLookup = {}; // Phase 2.2

          response.data.deals.forEach((deal) => {
            if (deal.questionnaire) {
              questionnaireDataLookup[deal.id] = deal.questionnaire;
              console.log(`[Dashboard] 📋 Stored ${Object.keys(deal.questionnaire).length} questionnaire fields for deal ${deal.id}`);
            }
            if (deal.propertyDetails) {
              propertyDetailsLookup[deal.id] = deal.propertyDetails;
              console.log(`[Dashboard] 🏠 Stored property details for deal ${deal.id}`);
            }
            if (deal.files) {
              filesLookup[deal.id] = deal.files;
              const fileCount = Object.values(deal.files).reduce((sum, files) => sum + files.length, 0);
              console.log(`[Dashboard] 📎 Stored ${fileCount} file(s) for deal ${deal.id}`);
            }
            // Phase 2.2: Store payment status
            if (deal.paymentStatus) {
              paymentStatusLookup[deal.id] = deal.paymentStatus;
              console.log(`[Dashboard] 💳 Stored payment status for deal ${deal.id}: ${deal.paymentStatus}`);
            }
          });

          setQuestionnaireDataByDeal(questionnaireDataLookup);
          setPropertyDetailsByDeal(propertyDetailsLookup);
          setFilesByDeal(filesLookup);
          setPaymentStatusByDeal(paymentStatusLookup); // Phase 2.2
          setPaymentStatusByDeal(paymentStatusLookup); // Phase 2.2

          // Initialize stages for each property from HubSpot dealstage
          const initialStages = {};
          response.data.deals.forEach((deal) => {
            console.log(`[Dashboard] 🔍 Raw deal data:`, {
              id: deal.id,
              title: deal.title,
              status: deal.status,
              statusType: typeof deal.status
            });

            // Convert HubSpot stage ID to step number (1-5)
            const stepNumber = getStepFromStage(deal.status);
            initialStages[deal.id] = stepNumber;
            console.log(`[Dashboard] 📊 Deal ${deal.id} is at step ${stepNumber} (HubSpot stage: ${deal.status})`);
          });
          setPropertyStages(initialStages);

          // Set initial section based on first property's stage
          if (response.data.deals.length > 0) {
            const firstDeal = response.data.deals[0];
            const firstDealStage = initialStages[firstDeal.id] || 1;

            const sectionMap = {
              1: 'information',
              2: 'questionnaire',
              3: 'quote',
              4: 'signature',
              5: 'payment',
              6: 'tracking'  // Step 6: Status Tracking
            };

            const initialSection = sectionMap[firstDealStage];
            setActiveSection(initialSection);
            console.log(`[Dashboard] 📍 Initial section set to "${initialSection}" for step ${firstDealStage}`);
          }
        } else {
          console.log('[Dashboard] ℹ️ No deals found');
          setProperties([]);
          setError('No properties found');
        }
      } catch (err) {
        console.error('[Dashboard] ❌ Error fetching data:', err.message);
        setError(err.message || 'Failed to load dashboard data');
        // Fallback: show empty state
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const switchProperty = (property) => {
    console.log(`[Dashboard] 🔄 Switching to property: ${property.id}`);
    setCurrentProperty(property);
    
    // Reset to the appropriate section based on property's current stage
    const currentStage = propertyStages[property.id] || 1;
    const hasSigned = envelopeStatus[property.id]?.status === 'signed';
    const paymentStatus = paymentStatusByDeal[property.id];
    
    const sectionMap = {
      1: 'information',
      2: 'questionnaire',
      3: 'quote',
      4: 'signature',
      5: 'payment',
      6: 'tracking'  // Add step 6 mapping
    };
    
    // If payment is paid or stage is 6, go to tracking
    if (paymentStatus === 'Paid' || currentStage === 6) {
      setActiveSection('tracking');
      console.log(`[Dashboard] 📍 Property stage: ${currentStage}, Section: tracking, Payment: ${paymentStatus}`);
      return;
    }
    
    // If signed, go to payment, otherwise go to property's current stage
    const targetSection = hasSigned ? 'payment' : sectionMap[currentStage];
    
    // Fallback to tracking if targetSection is undefined (shouldn't happen, but safety check)
    if (!targetSection) {
      console.warn(`[Dashboard] ⚠️ No section mapping for stage ${currentStage}, defaulting to tracking`);
      setActiveSection('tracking');
    } else {
      setActiveSection(targetSection);
    }
    
    console.log(`[Dashboard] 📍 Property stage: ${currentStage}, Section: ${targetSection || 'tracking'}, Signed: ${hasSigned}`);
  };

  // Determine if a stage is accessible based on dependencies
  const isStageAccessible = (stageNumber, currentPropertyId) => {
    const currentStage = propertyStages[currentPropertyId] || 1;
    const hasSigned = envelopeStatus[currentPropertyId]?.status === 'signed';
    const paymentStatus = paymentStatusByDeal[currentPropertyId]; // Phase 2.3

    // Phase 2.3: If payment is paid, only allow Stage 6
    if (paymentStatus === 'Paid') {
      return stageNumber === 6; // Only Stage 6 is accessible after payment
    }

    // If document is signed, lock all stages before Stage 5
    if (hasSigned && stageNumber < 5) {
      return false; // Lock editing after signing
    }

    // Progression rules: Can only access current stage or previous stages
    // Cannot skip ahead - must complete stages in order
    if (stageNumber === 1) return true; // Stage 1 always accessible (unless signed)
    if (stageNumber === 2) return currentStage >= 1; // Can access if at stage 1 or higher
    if (stageNumber === 3) return currentStage >= 2; // Can access if at stage 2 or higher
    if (stageNumber === 4) return currentStage >= 3; // Can access if at stage 3 or higher
    if (stageNumber === 5) return currentStage >= 4; // Can access if at stage 4 or higher

    // Cannot skip stages - must unlock them in order
    return stageNumber <= currentStage;
  };

  // Get stage status (completed, current, locked, read-only)
  const getStageStatus = (stageNumber, currentPropertyId) => {
    const currentStage = propertyStages[currentPropertyId] || 1;
    const hasSigned = envelopeStatus[currentPropertyId]?.status === 'signed';
    const paymentStatus = paymentStatusByDeal[currentPropertyId]; // Phase 2.4
    
    // Phase 2.4: After payment, stages 1-5 are read-only
    if (paymentStatus === 'Paid') {
      if (stageNumber === 6) {
        return 'current'; // Stage 6 is active
      }
      return 'read-only'; // Stages 1-5 are read-only (viewable but not editable)
    }
    
    // After signing, mark stages 1-4 as completed and locked
    if (hasSigned && stageNumber < 5) {
      return 'completed-locked';
    }
    
    if (stageNumber < currentStage) return 'completed';
    if (stageNumber === currentStage) return 'current';
    return 'locked';
  };

  // Handle stage click
  const handleStageClick = async (stageNumber, currentPropertyId) => {
    const paymentStatus = paymentStatusByDeal[currentPropertyId]; // Phase 2.5

    // Phase 2.5: After payment, only allow viewing Stage 6 or read-only viewing of stages 1-5
    if (paymentStatus === 'Paid') {
      if (stageNumber === 6) {
        // Allow navigation to Stage 6
        setPropertyStages(prev => ({
          ...prev,
          [currentPropertyId]: 6
        }));
        setActiveSection('tracking');
        setIsMobileMenuOpen(false);
        console.log(`[Dashboard] ✅ Navigated to Stage 6 (Status Tracking) - payment completed`);
        return;
      } else {
        // Allow viewing stages 1-5 but show read-only (no API calls)
        setPropertyStages(prev => ({
          ...prev,
          [currentPropertyId]: stageNumber
        }));
        const sectionMap = {
          1: 'information',
          2: 'questionnaire',
          3: 'quote',
          4: 'signature',
          5: 'payment',
          6: 'tracking'
        };
        setActiveSection(sectionMap[stageNumber]);
        setIsMobileMenuOpen(false);
        console.log(`[Dashboard] 👁️ Viewing Stage ${stageNumber} in read-only mode - payment completed`);
        return; // Don't make API calls for read-only stages
      }
    }

    if (!isStageAccessible(stageNumber, currentPropertyId)) {
      console.log(`[Dashboard] 🔒 Stage ${stageNumber} is locked`);
      alert('Please complete the previous steps before accessing this stage.');
      return;
    }

    const currentStage = propertyStages[currentPropertyId] || 1;

    // Only allow progression forward (not backward to prevent data loss)
    if (stageNumber > currentStage) {
      // Moving forward - update HubSpot stage
      try {
        console.log(`[Dashboard] 📊 Progressing to step ${stageNumber} for deal ${currentPropertyId}`);

        await api.patch(`/client/property/${currentPropertyId}/stage`, {
          stepNumber: stageNumber
        });

        console.log(`[Dashboard] ✅ Deal stage updated in HubSpot to step ${stageNumber}`);

        // Update local state
        setPropertyStages(prev => ({
          ...prev,
          [currentPropertyId]: stageNumber
        }));
      } catch (error) {
        console.error('[Dashboard] ❌ Error updating deal stage:', error);
        // Phase 2.5: Handle payment completed error from backend
        if (error.response?.status === 403 && error.response?.data?.paymentCompleted) {
          alert('Payment has been completed. Stages 1-5 are now read-only. Please use Status Tracking (Stage 6) to view progress.');
          // Update payment status in local state
          setPaymentStatusByDeal(prev => ({
            ...prev,
            [currentPropertyId]: 'Paid'
          }));
        } else {
          alert('Failed to update progress. Please try again.');
        }
        return;
      }
    } else {
      // Moving backward or staying - just update local UI
      console.log(`[Dashboard] ⬅️ Navigating back to step ${stageNumber}`);
      setPropertyStages(prev => ({
        ...prev,
        [currentPropertyId]: stageNumber
      }));
    }

    // Switch to appropriate section based on stage
    const sectionMap = {
      1: 'information',
      2: 'questionnaire',
      3: 'quote',
      4: 'signature',
      5: 'payment',
      6: 'tracking'  // Step 6: Status Tracking
    };
    setActiveSection(sectionMap[stageNumber]);
    
    // Auto-close mobile menu after selection
    setIsMobileMenuOpen(false);
  };

  const switchSection = (section) => {
    setActiveSection(section);
  };

  const switchQuestionnaireTab = (tabId) => {
    setActiveQuestionnaireTab(tabId);
  };

  const toggleConditional = (fieldId, value) => {
    setConditionalFields(prev => ({ ...prev, [fieldId]: value === 'yes' }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle questionnaire data updates (after save)
  const handleQuestionnaireDataUpdate = (dealId, updatedData) => {
    console.log(`[Dashboard] 🔄 Updating cached questionnaire data for deal ${dealId}`);
    setQuestionnaireDataByDeal(prev => ({
      ...prev,
      [dealId]: updatedData
    }));
  };

  // Handle Save Progress button click
  const handleSaveProgress = async () => {
    if (!currentProperty?.id) {
      console.warn('[Dashboard] No property selected');
      alert('Please select a property first');
      return;
    }

    try {
      console.log(`[Dashboard] 💾 Saving progress for deal: ${currentProperty.id}`);

      // Get current stage for this property
      const currentStage = propertyStages[currentProperty.id] || 1;

      // Only trigger save for editable sections
      if (activeSection === 'questionnaire') {
        // Trigger save on PropertyQuestionnaire component
        const event = new CustomEvent('saveQuestionnaire', { detail: { dealId: currentProperty.id } });
        window.dispatchEvent(event);

        // Update deal stage in HubSpot to ensure it's at least at step 2
        if (currentStage < 2) {
          try {
            await api.patch(`/client/property/${currentProperty.id}/stage`, {
              stepNumber: 2
            });
            setPropertyStages(prev => ({
              ...prev,
              [currentProperty.id]: 2
            }));
            console.log(`[Dashboard] 📊 Updated deal stage to step 2 (questionnaire in progress)`);
          } catch (error) {
            console.error('[Dashboard] ⚠️ Error updating stage:', error);
            // Continue even if stage update fails
          }
        }

        console.log(`[Dashboard] ✅ Save progress triggered for questionnaire`);
      } else {
        // For non-editable sections, show info message
        alert('This section is view-only. Progress is automatically saved when you complete the questionnaire.');
        console.log(`[Dashboard] ℹ️ Section "${activeSection}" is view-only`);
      }
    } catch (error) {
      console.error('[Dashboard] ❌ Error saving progress:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  // Handle Help button click
  const handleHelp = () => {
    window.open('https://stanfordlegal.com.au/contact/', '_blank');
  };

  return (
    <div className="app-container" id="appContainer">
      <header className="header">
        <div className="header-left">
          <button 
            className="hamburger-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="logo">
            <img src="/logo (1).webp" alt="Property Logo" className="logo-image" />
          </div>
        </div>

        <div className="header-actions">
          <div className="search-bar">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" placeholder="Search documents, questions..." />
          </div>

          <button className="notification-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>

          <div className="user-menu">
            <div className="user-avatar">
              {clientData.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="user-info">
              <h4>{clientData.fullName}</h4>
              <p>{isAdditionalSeller ? 'Additional Seller' : 'Client Account'}</p>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile backdrop overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} id="sidebar">
        <div className="property-header">
          {isAdditionalSeller && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#856404'
            }}>
              <strong>Additional Seller Access:</strong> You can view information and sign documents. Only the primary seller can modify property details.
            </div>
          )}
          <div className="properties-section">
            <div className="properties-header">
              <h2>Properties</h2>
              <p>Select a property to view details</p>
            </div>

            <div className="properties-list">
              {properties.map((prop, idx) => (
                <div
                  key={prop.index}
                  className={`property-card ${currentProperty?.index === prop.index ? 'active' : ''}`}
                >
                  <button
                    className="property-card-header"
                    onClick={() => {
                      switchProperty(prop);
                      setExpandedProperty(expandedProperty === idx ? -1 : idx);
                    }}
                  >
                    <div className="property-card-content">
                      <h3 className="property-card-title">{prop.title}</h3>
                      <p className="property-card-address">{prop.subtitle}</p>
                      <div className="property-card-status">
                        <span className="status-badge">In Progress</span>
                      </div>
                      <div className="property-progress">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${prop.progressPercentage || 0}%` }}></div>
                        </div>
                        <span className="progress-label">{prop.progressPercentage || 0}%</span>
                      </div>
                    </div>
                    <svg className={`chevron-icon ${expandedProperty === idx ? 'open' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {expandedProperty === idx && (
                    <div className="property-card-details">
                      {/* Stage 1: Review Property Information */}
                      <button
                        className={`stage-item stage-${getStageStatus(1, prop.id)} ${!isStageAccessible(1, prop.id) ? 'stage-locked' : ''}`}
                        onClick={() => handleStageClick(1, prop.id)}
                        title={getStageStatus(1, prop.id) === 'read-only' ? "Click to view (Read-Only)" : ""}
                      >
                        <div className="stage-number">
                          {getStageStatus(1, prop.id) === 'read-only' ? <Lock size={14} /> : '1'}
                        </div>
                        <div className="stage-content">
                          <h4>Review Property Information</h4>
                          <p>Prefilled by us</p>
                        </div>
                        <div className="stage-indicator">
                          {getStageStatus(1, prop.id) === 'read-only' && (
                            <Eye size={16} className="text-gray-400" />
                          )}
                          {getStageStatus(1, prop.id) === 'completed' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          )}
                          {getStageStatus(1, prop.id) === 'current' && (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          {getStageStatus(1, prop.id) === 'locked' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Stage 2: Fill in Property Details */}
                      <button
                        className={`stage-item stage-${getStageStatus(2, prop.id)} ${!isStageAccessible(2, prop.id) ? 'stage-locked' : ''}`}
                        onClick={() => handleStageClick(2, prop.id)}
                        title={getStageStatus(2, prop.id) === 'read-only' ? "Click to view (Read-Only)" : ""}
                      >
                        <div className="stage-number">
                          {getStageStatus(2, prop.id) === 'read-only' ? <Lock size={14} /> : '2'}
                        </div>
                        <div className="stage-content">
                          <h4>Fill in Property Details</h4>
                          <p>Answer questionnaire</p>
                        </div>
                        <div className="stage-indicator">
                          {getStageStatus(2, prop.id) === 'read-only' && (
                            <Eye size={16} className="text-gray-400" />
                          )}
                          {getStageStatus(2, prop.id) === 'completed' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          )}
                          {getStageStatus(2, prop.id) === 'current' && (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          {getStageStatus(2, prop.id) === 'locked' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Stage 3: Review Your Quote */}
                      <button
                        className={`stage-item stage-${getStageStatus(3, prop.id)} ${!isStageAccessible(3, prop.id) ? 'stage-locked' : ''}`}
                        onClick={() => handleStageClick(3, prop.id)}
                        title={getStageStatus(3, prop.id) === 'read-only' ? "Click to view (Read-Only)" : ""}
                      >
                        <div className="stage-number">
                          {getStageStatus(3, prop.id) === 'read-only' ? <Lock size={14} /> : '3'}
                        </div>
                        <div className="stage-content">
                          <h4>Review Your Quote</h4>
                          <p>Review fees and charges</p>
                        </div>
                        <div className="stage-indicator">
                          {getStageStatus(3, prop.id) === 'read-only' && (
                            <Eye size={16} className="text-gray-400" />
                          )}
                          {getStageStatus(3, prop.id) === 'completed' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          )}
                          {getStageStatus(3, prop.id) === 'current' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                          {getStageStatus(3, prop.id) === 'locked' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Stage 4: Awaiting Signature */}
                      <button
                        className={`stage-item stage-${getStageStatus(4, prop.id)} ${!isStageAccessible(4, prop.id) ? 'stage-locked' : ''}`}
                        onClick={() => handleStageClick(4, prop.id)}
                        title={getStageStatus(4, prop.id) === 'read-only' ? "Click to view (Read-Only)" : ""}
                      >
                        <div className="stage-number">
                          {getStageStatus(4, prop.id) === 'read-only' ? <Lock size={14} /> : '4'}
                        </div>
                        <div className="stage-content">
                          <h4>Awaiting Signature</h4>
                          <p>Sign documents</p>
                        </div>
                        <div className="stage-indicator">
                          {getStageStatus(4, prop.id) === 'read-only' && (
                            <Eye size={16} className="text-gray-400" />
                          )}
                          {getStageStatus(4, prop.id) === 'completed' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          )}
                          {getStageStatus(4, prop.id) === 'current' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                          {getStageStatus(4, prop.id) === 'locked' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Stage 5: Payment Instructions */}
                      <button
                        className={`stage-item stage-${getStageStatus(5, prop.id)} ${!isStageAccessible(5, prop.id) ? 'stage-locked' : ''}`}
                        onClick={() => handleStageClick(5, prop.id)}
                        title={getStageStatus(5, prop.id) === 'read-only' ? "Click to view (Read-Only)" : ""}
                      >
                        <div className="stage-number">
                          {getStageStatus(5, prop.id) === 'read-only' ? <Lock size={14} /> : '5'}
                        </div>
                        <div className="stage-content">
                          <h4>Payment Instructions</h4>
                          <p>Complete payment</p>
                        </div>
                        <div className="stage-indicator">
                          {getStageStatus(5, prop.id) === 'read-only' && (
                            <Eye size={16} className="text-gray-400" />
                          )}
                          {getStageStatus(5, prop.id) === 'completed' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          )}
                          {getStageStatus(5, prop.id) === 'current' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                          {getStageStatus(5, prop.id) === 'locked' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Stage 6: Status Tracking */}
                      <button
                        className={`stage-item stage-${getStageStatus(6, prop.id)} ${!isStageAccessible(6, prop.id) ? 'stage-locked' : ''}`}
                        onClick={() => handleStageClick(6, prop.id)}
                      >
                        <div className="stage-number">6</div>
                        <div className="stage-content">
                          <h4>Status Tracking</h4>
                          <p>Track your progress</p>
                        </div>
                        <div className="stage-indicator">
                          {getStageStatus(6, prop.id) === 'completed' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                          )}
                          {getStageStatus(6, prop.id) === 'current' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                          {getStageStatus(6, prop.id) === 'locked' && (
                            <svg fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {/* Phase 3.2: Payment Completed Banner */}
        {currentProperty && paymentStatusByDeal[currentProperty.id] === 'Paid' && activeSection !== 'tracking' && (
          <div className="payment-completed-banner">
            <div className="banner-content">
              <div className="banner-icon">✓</div>
              <div className="banner-text">
                <strong>Payment Completed!</strong>
                <span>Stages 1-5 are now read-only. View your progress in <button onClick={() => handleStageClick(6, currentProperty.id)} className="banner-link">Status Tracking (Stage 6)</button>.</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'information' && (
          <section id="information" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Property Information</h1>
              <p className="content-subtitle">Comprehensive property and seller details</p>
              {currentProperty && paymentStatusByDeal[currentProperty.id] === 'Paid' && (
                <span className="read-only-badge">Read-Only</span>
              )}
            </div>
            <div className="content-card">
              {currentProperty && currentProperty.id ? (
                <PropertyInformation
                  dealId={currentProperty.id}
                  initialData={propertyDetailsByDeal[currentProperty.id]}
                  readOnly={paymentStatusByDeal[currentProperty.id] === 'Paid'}
                />
              ) : (
                <div className="empty-state">
                  <p>Select a property to view detailed information</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeSection === 'questionnaire' && (
          <section id="questionnaire" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Property Questionnaire</h1>
              <p className="content-subtitle">Answer comprehensive disclosure questions about your property</p>
              {currentProperty && paymentStatusByDeal[currentProperty.id] === 'Paid' && (
                <span className="read-only-badge">Read-Only</span>
              )}
            </div>

            <div className="content-card">
              {currentProperty && currentProperty.id ? (
                <PropertyQuestionnaire
                  dealId={currentProperty.id}
                  initialData={questionnaireDataByDeal[currentProperty.id] || {}}
                  initialFiles={filesByDeal[currentProperty.id] || {}}
                  onSubmitSuccess={() => {
                    setQuoteRefreshKey(Date.now()); // Force quote to refresh with new data
                    handleStageClick(3, currentProperty.id);
                  }}
                  onDataUpdate={handleQuestionnaireDataUpdate}
                  readOnly={paymentStatusByDeal[currentProperty.id] === 'Paid'}
                />
              ) : (
                <div className="empty-state">
                  <p>Select a property to view the questionnaire</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeSection === 'quote' && (
          <section id="quote" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Your Property Search Quote</h1>
              <p className="content-subtitle">Review the calculated search costs based on your questionnaire answers</p>
              {currentProperty && paymentStatusByDeal[currentProperty.id] === 'Paid' && (
                <span className="read-only-badge">Read-Only</span>
              )}
            </div>
            <div className="content-card">
              {currentProperty && currentProperty.id ? (
                <DynamicQuote
                  key={quoteRefreshKey}
                  dealId={currentProperty.id}
                  onBack={() => handleStageClick(2, currentProperty.id)}
                  onUpdate={(quote) => {
                    // Store quote amount for payment step
                    setQuoteAmounts(prev => ({
                      ...prev,
                      [currentProperty.id]: quote.grandTotal
                    }));
                    console.log(`[Dashboard] 💰 Quote amount stored: $${quote.grandTotal}`);
                  }}
                  readOnly={paymentStatusByDeal[currentProperty.id] === 'Paid'}
                />
              ) : (
                <div className="empty-state">
                  <p>Select a property to view the quote</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeSection === 'signature' && (
          <section id="signature" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Sign Your Documents</h1>
              <p className="content-subtitle">Review and electronically sign your property disclosure forms</p>
              {currentProperty && paymentStatusByDeal[currentProperty.id] === 'Paid' && (
                <span className="read-only-badge">Read-Only</span>
              )}
            </div>
            <div className="content-card">
              {currentProperty && currentProperty.id ? (
                <SigningStatus 
                  dealId={currentProperty.id}
                  contactEmail={clientData.email}
                  sellers={propertyDetailsByDeal[currentProperty.id]}
                  envelopeStatusFromHubSpot={{
                    envelope_status: currentProperty.envelopeStatus,
                    recipient_status: currentProperty.recipientStatus
                  }}
                  onComplete={(envelopeId) => {
                    console.log('[Dashboard] 🎉 Signing completed for deal:', currentProperty.id);
                    console.log('[Dashboard] 📋 Envelope ID:', envelopeId);
                    
                    // Mark as signed and move to Step 5
                    setEnvelopeStatus(prev => ({
                      ...prev,
                      [currentProperty.id]: { status: 'signed', envelopeId }
                    }));
                    setPropertyStages(prev => ({
                      ...prev,
                      [currentProperty.id]: 5
                    }));
                    
                    // Switch to payment section
                    setActiveSection('payment');
                    
                    console.log('[Dashboard] ✅ Redirected to Step 5 (Payment)');
                  }}
                  readOnly={paymentStatusByDeal[currentProperty.id] === 'Paid'}
                />
              ) : (
                <div className="empty-state">
                  <p>Select a property to proceed with document signing</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeSection === 'payment' && (
          <section id="payment" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Payment Instructions</h1>
              <p className="content-subtitle">Complete your conveyancing search payment</p>
              {currentProperty && paymentStatusByDeal[currentProperty.id] === 'Paid' && (
                <span className="read-only-badge">Read-Only</span>
              )}
            </div>
            <div className="content-card">
              {currentProperty && currentProperty.id ? (
                <PaymentInstructions
                  dealId={currentProperty.id}
                  quoteAmount={quoteAmounts[currentProperty.id] || '0.00'}
                  propertyAddress={currentProperty.subtitle || currentProperty.title}
                  isActive={activeSection === 'payment'}
                  onComplete={async () => {
                    console.log('[Dashboard] 💳 Payment completed for deal:', currentProperty.id);
                    
                    // Verify payment with backend
                    try {
                      const response = await api.get(`/client/property/${currentProperty.id}`);
                      console.log('[Dashboard] ✅ Deal status verified after payment');
                    } catch (error) {
                      console.error('[Dashboard] ⚠️ Could not verify deal status:', error);
                    }
                    
                    // Progress to step 6 (tracking)
                    setPropertyStages(prev => ({
                      ...prev,
                      [currentProperty.id]: 6
                    }));
                    setActiveSection('tracking');
                    
                    console.log('[Dashboard] 🎯 Progressed to Step 6 (Status Tracking)');
                  }}
                  readOnly={paymentStatusByDeal[currentProperty.id] === 'Paid'}
                />
              ) : (
                <div className="empty-state">
                  <p>Select a property to proceed with payment</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeSection === 'tracking' && (
          <section id="tracking" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Status Tracking</h1>
              <p className="content-subtitle">Monitor the progress of your conveyancing transaction</p>
            </div>
            <div className="content-card">
              {currentProperty && currentProperty.id ? (
                <StatusTracking deal={currentProperty} />
              ) : (
                <div className="empty-state">
                  <p>Loading tracking information...</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeSection === 'documents' && (
          <section id="documents" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Documents</h1>
              <p className="content-subtitle">View and manage your documents</p>
            </div>
            <div className="content-card"><p>Your documents will appear here...</p></div>
          </section>
        )}

        <div className="floating-actions">
          <button className="fab primary" onClick={handleSaveProgress}>Save Progress</button>
          <button className="fab secondary" onClick={handleHelp}>Help</button>
        </div>
      </main>
    </div>
  );
}
