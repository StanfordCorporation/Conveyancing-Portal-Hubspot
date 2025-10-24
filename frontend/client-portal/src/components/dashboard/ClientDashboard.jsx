import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import api from '../../services/api.js';
import PropertyInformation from './PropertyInformation.jsx';
import './dashboard.css';

export default function ClientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get stored user data from localStorage
  const storedUser = JSON.parse(localStorage.getItem('user'));

  const [expandedProperty, setExpandedProperty] = useState(0);
  const [activeSection, setActiveSection] = useState('information');
  const [activeQuestionnaireTab, setActiveQuestionnaireTab] = useState('q-section1');
  const [propertyStages, setPropertyStages] = useState({});

  // Client data from login
  const [clientData, setClientData] = useState({
    fullName: storedUser ? `${storedUser.firstname} ${storedUser.lastname}`.trim() : 'Client',
    email: storedUser?.email || '',
    phone: storedUser?.phone || ''
  });

  // Dynamically loaded properties
  const [properties, setProperties] = useState([]);
  const [currentProperty, setCurrentProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    q1_1: '',
    q1_2: '',
    q1_2_details: '',
    q1_3: '',
    q1_3_details: '',
  });

  const [conditionalFields, setConditionalFields] = useState({
    q1_2_details: false,
    q1_3_details: false,
  });

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('[Dashboard] 📊 Fetching dashboard data...');

        const response = await api.get('/client/dashboard-data');

        if (response.data.deals && response.data.deals.length > 0) {
          console.log(`[Dashboard] ✅ Loaded ${response.data.deals.length} deals`);
          setProperties(response.data.deals);
          setCurrentProperty(response.data.deals[0]); // Auto-select first property

          // Initialize stages for each property (start at stage 1)
          const initialStages = {};
          response.data.deals.forEach((deal) => {
            initialStages[deal.id] = 1;
          });
          setPropertyStages(initialStages);
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
    setCurrentProperty(property);
  };

  // Determine if a stage is accessible based on dependencies
  const isStageAccessible = (stageNumber, currentPropertyId) => {
    if (stageNumber === 1) return true; // Stage 1 always accessible
    if (stageNumber === 2) return true; // Stage 2 always accessible
    if (stageNumber === 3) return propertyStages[currentPropertyId] >= 2; // Requires stage 2
    if (stageNumber === 4) return propertyStages[currentPropertyId] >= 3; // Requires stage 3
    if (stageNumber === 5) return propertyStages[currentPropertyId] >= 4; // Requires stage 4
    return false;
  };

  // Get stage status (completed, current, locked)
  const getStageStatus = (stageNumber, currentPropertyId) => {
    const currentStage = propertyStages[currentPropertyId] || 1;
    if (stageNumber < currentStage) return 'completed';
    if (stageNumber === currentStage) return 'current';
    return 'locked';
  };

  // Handle stage click
  const handleStageClick = (stageNumber, currentPropertyId) => {
    if (!isStageAccessible(stageNumber, currentPropertyId)) {
      console.log(`Stage ${stageNumber} is locked`);
      return;
    }

    // Update current stage
    setPropertyStages(prev => ({
      ...prev,
      [currentPropertyId]: stageNumber
    }));

    // Switch to appropriate section based on stage
    const sectionMap = {
      1: 'information',
      2: 'questionnaire',
      3: 'quote',
      4: 'signature',
      5: 'payment'
    };
    setActiveSection(sectionMap[stageNumber]);
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

  return (
    <div className="app-container" id="appContainer">
      <header className="header">
        <div className="header-left">
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
              <p>Client Account</p>
            </div>
          </div>

          <button onClick={handleLogout} className="notification-btn" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <aside className="sidebar" id="sidebar">
        <div className="property-header">
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
                          <div className="progress-fill" style={{ width: `${prop.progressPercentage || 60}%` }}></div>
                        </div>
                        <span className="progress-label">{prop.progressPercentage || 60}%</span>
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
                      >
                        <div className="stage-number">1</div>
                        <div className="stage-content">
                          <h4>Review Property Information</h4>
                          <p>Prefilled by us</p>
                        </div>
                        <div className="stage-indicator">
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
                      >
                        <div className="stage-number">2</div>
                        <div className="stage-content">
                          <h4>Fill in Property Details</h4>
                          <p>Answer questionnaire</p>
                        </div>
                        <div className="stage-indicator">
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
                      >
                        <div className="stage-number">3</div>
                        <div className="stage-content">
                          <h4>Review Your Quote</h4>
                          <p>Review fees and charges</p>
                        </div>
                        <div className="stage-indicator">
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
                      >
                        <div className="stage-number">4</div>
                        <div className="stage-content">
                          <h4>Awaiting Signature</h4>
                          <p>Sign documents</p>
                        </div>
                        <div className="stage-indicator">
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
                      >
                        <div className="stage-number">5</div>
                        <div className="stage-content">
                          <h4>Payment Instructions</h4>
                          <p>Complete payment</p>
                        </div>
                        <div className="stage-indicator">
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="quick-actions">
            <button className="action-btn primary">
              <span className="btn-icon">M</span>
              Contact Agent
            </button>
            <button className="action-btn secondary">
              <span className="btn-icon">T</span>
              View Timeline
            </button>
          </div>

          <div className="property-meta">
            <div className="meta-item">
              <span className="label">Last Updated:</span>
              <span className="value">2 hours ago</span>
            </div>
            <div className="meta-item">
              <span className="label">Agent:</span>
              <span className="value">Stanford Legal</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeSection === 'information' && (
          <section id="information" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Property Information</h1>
              <p className="content-subtitle">Comprehensive property and seller details</p>
            </div>
            <div className="content-card">
              {currentProperty && currentProperty.id ? (
                <PropertyInformation dealId={currentProperty.id} />
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
            </div>

            <div className="content-card">
              <div className="questionnaire-tabs">
                <button className={`questionnaire-tab ${activeQuestionnaireTab === 'q-section1' ? 'active' : ''}`} onClick={() => switchQuestionnaireTab('q-section1')}>
                  Title & Encumbrances (3)
                </button>
                <button className={`questionnaire-tab ${activeQuestionnaireTab === 'q-section2' ? 'active' : ''}`} onClick={() => switchQuestionnaireTab('q-section2')}>
                  Rental Agreement (1)
                </button>
                <button className={`questionnaire-tab ${activeQuestionnaireTab === 'q-section3' ? 'active' : ''}`} onClick={() => switchQuestionnaireTab('q-section3')}>
                  Land Use & Planning (4)
                </button>
                <button className={`questionnaire-tab ${activeQuestionnaireTab === 'q-section4' ? 'active' : ''}`} onClick={() => switchQuestionnaireTab('q-section4')}>
                  Buildings & Structures (4)
                </button>
                <button className={`questionnaire-tab ${activeQuestionnaireTab === 'q-section5' ? 'active' : ''}`} onClick={() => switchQuestionnaireTab('q-section5')}>
                  Rates & Services (5)
                </button>
              </div>

              {activeQuestionnaireTab === 'q-section1' && (
                <div className="questionnaire-subsection active">
                  <h3 style={{ marginBottom: '20px', color: 'var(--gray-900)' }}>Title Details & Encumbrances</h3>

                  <div className="form-group">
                    <label className="form-label required">Is the property part of a body corporate?</label>
                    <div className="radio-group">
                      <label className="radio-item">
                        <input type="radio" name="q1_1" value="yes" checked={formData.q1_1 === 'yes'} onChange={handleFormChange} />
                        <span className="radio-label">Yes</span>
                      </label>
                      <label className="radio-item">
                        <input type="radio" name="q1_1" value="no" checked={formData.q1_1 === 'no'} onChange={handleFormChange} />
                        <span className="radio-label">No</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Are there any Non-Statutory Encumbrances?</label>
                    <div className="radio-group">
                      <label className="radio-item">
                        <input type="radio" name="q1_2" value="yes" checked={formData.q1_2 === 'yes'} onChange={(e) => { handleFormChange(e); toggleConditional('q1_2_details', e.target.value); }} />
                        <span className="radio-label">Yes</span>
                      </label>
                      <label className="radio-item">
                        <input type="radio" name="q1_2" value="no" checked={formData.q1_2 === 'no'} onChange={(e) => { handleFormChange(e); toggleConditional('q1_2_details', e.target.value); }} />
                        <span className="radio-label">No</span>
                      </label>
                      <label className="radio-item">
                        <input type="radio" name="q1_2" value="unsure" checked={formData.q1_2 === 'unsure'} onChange={(e) => { handleFormChange(e); toggleConditional('q1_2_details', e.target.value); }} />
                        <span className="radio-label">Unsure</span>
                      </label>
                    </div>
                    {conditionalFields.q1_2_details && (
                      <div className="conditional-field show">
                        <label className="form-label">If Yes, Give Details</label>
                        <textarea className="form-textarea" name="q1_2_details" value={formData.q1_2_details} onChange={handleFormChange} placeholder="Please detail any agreements"></textarea>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Are there any Statutory Encumbrances?</label>
                    <div className="radio-group">
                      <label className="radio-item">
                        <input type="radio" name="q1_3" value="yes" checked={formData.q1_3 === 'yes'} onChange={(e) => { handleFormChange(e); toggleConditional('q1_3_details', e.target.value); }} />
                        <span className="radio-label">Yes</span>
                      </label>
                      <label className="radio-item">
                        <input type="radio" name="q1_3" value="no" checked={formData.q1_3 === 'no'} onChange={(e) => { handleFormChange(e); toggleConditional('q1_3_details', e.target.value); }} />
                        <span className="radio-label">No</span>
                      </label>
                      <label className="radio-item">
                        <input type="radio" name="q1_3" value="unsure" checked={formData.q1_3 === 'unsure'} onChange={(e) => { handleFormChange(e); toggleConditional('q1_3_details', e.target.value); }} />
                        <span className="radio-label">Unsure</span>
                      </label>
                    </div>
                    {conditionalFields.q1_3_details && (
                      <div className="conditional-field show">
                        <label className="form-label">If Yes, Give Details</label>
                        <textarea className="form-textarea" name="q1_3_details" value={formData.q1_3_details} onChange={handleFormChange} placeholder="Please detail any agencies"></textarea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeQuestionnaireTab === 'q-section2' && <div className="questionnaire-subsection active"><h3>Rental Agreement</h3><p>Coming soon...</p></div>}
              {activeQuestionnaireTab === 'q-section3' && <div className="questionnaire-subsection active"><h3>Land Use & Planning</h3><p>Coming soon...</p></div>}
              {activeQuestionnaireTab === 'q-section4' && <div className="questionnaire-subsection active"><h3>Buildings & Structures</h3><p>Coming soon...</p></div>}
              {activeQuestionnaireTab === 'q-section5' && <div className="questionnaire-subsection active"><h3>Rates & Services</h3><p>Coming soon...</p></div>}
            </div>
          </section>
        )}

        {activeSection === 'quote' && (
          <section id="quote" className="content-section active">
            <div className="content-header">
              <h1 className="content-title">Quote Review</h1>
              <p className="content-subtitle">Review your conveyancing quote</p>
            </div>
            <div className="content-card"><p>Quote details coming soon...</p></div>
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
          <button className="fab primary"><span className="fab-icon">S</span> Save Progress</button>
          <button className="fab secondary"><span className="fab-icon">?</span> Help</button>
        </div>
      </main>
    </div>
  );
}
