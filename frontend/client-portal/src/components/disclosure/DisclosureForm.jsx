import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, ArrowRight, Send, MapPin, ArrowLeft, Check } from 'lucide-react';
import api from '../../services/api';
import { AgencySearchModal } from './AgencySearchModal';
import { AgentSelectionModal } from './AgentSelectionModal';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import AddressAutocomplete from '../../../../src/components/common/AddressAutocomplete';

export default function DisclosureForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [numOwners, setNumOwners] = useState('1');
  const [primarySeller, setPrimarySeller] = useState({
    fullName: '',
    mobile: '',
    email: ''
  });
  const [additionalSellers, setAdditionalSellers] = useState([]);
  const [agencyInfo, setAgencyInfo] = useState({
    businessName: '',
    suburb: ''
  });
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [error, setError] = useState('');
  const [showAgencySearch, setShowAgencySearch] = useState(false);
  const [showAgentSelection, setShowAgentSelection] = useState(false);

  const steps = [
    { number: 1, name: 'Property Information' },
    { number: 2, name: 'Seller Information' },
    { number: 3, name: 'Agency & Agent' }
  ];

  // Handle agency selection from search modal
  const handleAgencySelect = (agency) => {
    let transformedAgency = {
      id: agency.id,
      name: agency.name,
      email: agency.email,
      address: agency.address
    };

    if (agency.agent && agency.agent.id) {
      console.log('✅ Agent already created with agency, skipping selection modal');
      transformedAgency.agentFirstName = agency.agent.firstname;
      transformedAgency.agentLastName = agency.agent.lastname;
      transformedAgency.agentEmail = agency.agent.email;
      transformedAgency.agentPhone = agency.agent.phone;

      setSelectedAgency(transformedAgency);
      setShowAgencySearch(false);
    } else {
      console.log('🔍 Showing agent selection modal for existing agency');
      setSelectedAgency(transformedAgency);
      setShowAgencySearch(false);
      setShowAgentSelection(true);
    }
  };

  const handleAgentSelect = (agencyWithAgent) => {
    setSelectedAgency(agencyWithAgent);
    setShowAgentSelection(false);
  };

  const handleBackFromAgent = () => {
    setShowAgentSelection(false);
    setShowAgencySearch(true);
  };

  const handleAgencySearch = () => {
    if (agencyInfo.businessName.trim() && agencyInfo.suburb.trim()) {
      setShowAgencySearch(true);
    }
  };

  const handleNumOwnersChange = (value) => {
    const num = parseInt(value) || 1;
    setNumOwners(value);

    const currentLength = additionalSellers.length;
    const targetLength = num - 1;

    if (targetLength > currentLength) {
      const newSellers = Array(targetLength - currentLength).fill(null).map(() => ({
        fullName: '',
        mobile: '',
        email: ''
      }));
      setAdditionalSellers([...additionalSellers, ...newSellers]);
    } else if (targetLength < currentLength) {
      setAdditionalSellers(additionalSellers.slice(0, targetLength));
    }
  };

  const updateAdditionalSeller = (index, field, value) => {
    const updated = [...additionalSellers];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalSellers(updated);
  };

  // Validation for each step
  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return propertyAddress.trim() !== '' && numOwners !== '';
      case 2:
        if (!primarySeller.fullName || !primarySeller.mobile || !primarySeller.email) {
          return false;
        }
        for (let seller of additionalSellers) {
          if (!seller.fullName || !seller.mobile || !seller.email) {
            return false;
          }
        }
        return true;
      case 3:
        return selectedAgency !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setError('');
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError('Please fill in all required fields before continuing.');
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!isStepValid(3)) {
      setError('Please complete all required fields.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    setSubmitProgress(10);

    try {
      const splitName = (fullName) => {
        const parts = fullName.trim().split(' ');
        const firstname = parts[0] || '';
        const lastname = parts.slice(1).join(' ') || parts[0];
        return { firstname, lastname };
      };

      const primarySellerNames = splitName(primarySeller.fullName);
      const cleanPhoneNumber = (phone) => phone ? phone.replace(/\s/g, '') : '';

      const formData = {
        seller: {
          email: primarySeller.email,
          firstname: primarySellerNames.firstname,
          lastname: primarySellerNames.lastname,
          phone: cleanPhoneNumber(primarySeller.mobile)
        },
        additionalSellers: additionalSellers.map(seller => {
          const names = splitName(seller.fullName);
          return {
            email: seller.email,
            firstname: names.firstname,
            lastname: names.lastname,
            phone: cleanPhoneNumber(seller.mobile)
          };
        }),
        agency: {
          name: selectedAgency?.name || '',
          email: selectedAgency?.email || ''
        },
        agent: {
          email: selectedAgency?.agentEmail || '',
          firstname: selectedAgency?.agentFirstName || 'Agent',
          lastname: selectedAgency?.agentLastName || 'Default',
          phone: cleanPhoneNumber(selectedAgency?.agentPhone || '')
        },
        property: {
          address: propertyAddress
        }
      };

      console.log('📤 Submitting disclosure form:', formData);
      setSubmitProgress(30);

      const response = await api.post('/workflows/client-disclosure', formData);

      console.log('✅ Disclosure form submitted successfully:', response.data);
      setSubmitProgress(70);

      if (response.data.requiresConfirmation) {
        setSubmitProgress(100);
        console.log('⚠️ Multiple agencies found:', response.data.agencyMatches);
        alert(`Multiple agencies found matching "${agencyInfo.businessName}". Please confirm which agency.`);
        setIsSubmitting(false);
        return;
      }

      setSubmitProgress(100);

      setTimeout(() => {
        console.log('✅ Redirecting to client portal login...');
        navigate('/login', {
          state: {
            dealId: response.data.data.dealId,
            message: 'Disclosure form submitted successfully! Please log in with your email or phone number to access the client portal.',
            email: primarySeller.email,
            phone: primarySeller.mobile
          }
        });
      }, 1500);

    } catch (err) {
      console.error('❌ Disclosure form submission error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit form. Please try again.');
      setIsSubmitting(false);
      setSubmitProgress(0);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <Header />

      <main className="flex-1 py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        </div>

        {/* Submission Animation Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md animate-fade-in"></div>
            <div className="relative z-10">
              {submitProgress < 100 ? (
                <>
                  <div className="flex items-center justify-center mb-8">
                    <div className="relative w-32 h-32">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping-slow"></div>
                      <div className="absolute inset-2 rounded-full border-4 border-primary/60 animate-pulse-slow"></div>
                      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center animate-float">
                        <Send className="w-12 h-12 text-primary-foreground" style={{ transform: `rotate(${submitProgress * 3.6}deg)` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-foreground mb-2">Submitting Your Form</h3>
                    <p className="text-muted-foreground">Please wait while we process your information...</p>
                  </div>
                  <div className="w-96 max-w-full px-4">
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${submitProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-muted-foreground">Processing</span>
                      <span className="text-sm font-semibold text-primary">{submitProgress}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center animate-scale-in">
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" viewBox="0 0 52 52">
                        <path className="check-path" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" d="M14 27l7 7 16-16"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Submission Successful!</h3>
                  <p className="text-muted-foreground">Redirecting to login...</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`max-w-3xl mx-auto transition-all duration-500 relative z-10 ${isSubmitting ? 'scale-98 blur-sm' : 'scale-100 blur-0'}`}>
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep > step.number
                        ? 'bg-primary text-primary-foreground'
                        : currentStep === step.number
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                    </div>
                    <span className={`text-xs mt-2 text-center hidden sm:block ${
                      currentStep >= step.number ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 rounded transition-all ${
                      currentStep > step.number ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-xl border border-border rounded-3xl shadow-xl p-8 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Property Disclosure</h1>
              <p className="text-muted-foreground mt-2">Step {currentStep} of {steps.length}: {steps[currentStep - 1].name}</p>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Step 1: Property Information */}
          {currentStep === 1 && (
            <div className="bg-white/80 backdrop-blur-xl border border-border rounded-3xl shadow-xl p-8 mb-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Property Information</h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="propertyAddress" className="block text-sm font-medium text-foreground mb-3">
                    Property Address <span className="text-red-500">*</span>
                  </label>
                  <AddressAutocomplete
                    id="propertyAddress"
                    value={propertyAddress}
                    onChange={setPropertyAddress}
                    placeholder="123 Main Street, Brisbane QLD 4000"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="numOwners" className="block text-sm font-medium text-foreground mb-3">
                    Number of Registered Owners <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="numOwners"
                    type="number"
                    min="1"
                    max="10"
                    value={numOwners}
                    onChange={(e) => handleNumOwnersChange(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Seller Information */}
          {currentStep === 2 && (
            <div className="bg-white/80 backdrop-blur-xl border border-border rounded-3xl shadow-xl p-8 mb-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Seller Information</h2>

              {/* Primary Seller */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/30 text-primary text-sm font-medium">1</div>
                  <h3 className="text-lg font-semibold text-foreground">Primary Seller</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="primaryFullName" className="block text-sm font-medium text-foreground mb-3">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="primaryFullName"
                      type="text"
                      value={primarySeller.fullName}
                      onChange={(e) => setPrimarySeller({ ...primarySeller, fullName: e.target.value })}
                      placeholder="John Smith"
                      className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="primaryMobile" className="block text-sm font-medium text-foreground mb-3">
                        Mobile <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="primaryMobile"
                        type="tel"
                        value={primarySeller.mobile}
                        onChange={(e) => setPrimarySeller({ ...primarySeller, mobile: e.target.value })}
                        placeholder="0412 345 678"
                        className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="primaryEmail" className="block text-sm font-medium text-foreground mb-3">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="primaryEmail"
                        type="email"
                        value={primarySeller.email}
                        onChange={(e) => setPrimarySeller({ ...primarySeller, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Sellers */}
              {additionalSellers.map((seller, index) => (
                <div key={index} className="mb-10">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/30 text-primary text-sm font-medium">{index + 2}</div>
                    <h3 className="text-lg font-semibold text-foreground">Seller {index + 2}</h3>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label htmlFor={`additionalFullName${index}`} className="block text-sm font-medium text-foreground mb-3">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`additionalFullName${index}`}
                        type="text"
                        value={seller.fullName}
                        onChange={(e) => updateAdditionalSeller(index, 'fullName', e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`additionalMobile${index}`} className="block text-sm font-medium text-foreground mb-3">
                          Mobile <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`additionalMobile${index}`}
                          type="tel"
                          value={seller.mobile}
                          onChange={(e) => updateAdditionalSeller(index, 'mobile', e.target.value)}
                          placeholder="0412 345 678"
                          className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor={`additionalEmail${index}`} className="block text-sm font-medium text-foreground mb-3">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`additionalEmail${index}`}
                          type="email"
                          value={seller.email}
                          onChange={(e) => updateAdditionalSeller(index, 'email', e.target.value)}
                          placeholder="jane@example.com"
                          className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Agency & Agent */}
          {currentStep === 3 && (
            <div className="bg-white/80 backdrop-blur-xl border border-border rounded-3xl shadow-xl p-8 mb-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Agency & Agent</h2>

              <div className="space-y-5">
                <div>
                  <label htmlFor="agencyBusinessName" className="block text-sm font-medium text-foreground mb-3">
                    Agency Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="agencyBusinessName"
                    type="text"
                    value={agencyInfo.businessName}
                    onChange={(e) => setAgencyInfo({ ...agencyInfo, businessName: e.target.value })}
                    placeholder="ABC Real Estate"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="agencySuburb" className="block text-sm font-medium text-foreground mb-3">
                    Agency Suburb <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        id="agencySuburb"
                        type="text"
                        value={agencyInfo.suburb}
                        onChange={(e) => setAgencyInfo({ ...agencyInfo, suburb: e.target.value })}
                        placeholder="Melbourne"
                        className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAgencySearch}
                      disabled={!agencyInfo.businessName.trim() || !agencyInfo.suburb.trim()}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg"
                    >
                      Search
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Enter details and click Search to find existing agencies</p>
                </div>

                {selectedAgency && (
                  <div className="space-y-4 mt-6">
                    <div className="p-5 bg-primary/10 border border-primary/30 rounded-2xl">
                      <p className="text-xs font-semibold text-primary mb-2">SELECTED AGENCY</p>
                      <p className="font-bold text-foreground text-lg">{selectedAgency.name}</p>
                      {selectedAgency.email && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedAgency.email}</p>
                      )}
                    </div>

                    {selectedAgency.agentFirstName && (
                      <div className="p-5 bg-green-50 border border-green-200 rounded-2xl">
                        <p className="text-xs font-semibold text-green-700 mb-2">SELECTED AGENT</p>
                        <p className="font-bold text-foreground text-lg">
                          {selectedAgency.agentFirstName} {selectedAgency.agentLastName}
                        </p>
                        <div className="mt-2 space-y-1">
                          {selectedAgency.agentEmail && (
                            <p className="text-sm text-muted-foreground">{selectedAgency.agentEmail}</p>
                          )}
                          {selectedAgency.agentPhone && (
                            <p className="text-sm text-muted-foreground">{selectedAgency.agentPhone}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Footer with Enhancements */}
          <div className="relative bg-gradient-to-b from-white to-slate-50/30 backdrop-blur-xl border border-border rounded-3xl shadow-xl overflow-hidden">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>

            <div className="p-8 pt-10">
              {/* Contextual Help Text - Left aligned above buttons */}
              <div className="mb-4 animate-fade-in">
                {currentStep === 1 && (
                  <p className="text-sm text-slate-500">
                    💡 Enter the address exactly as it appears on the property title.
                  </p>
                )}
                {currentStep === 2 && (
                  <p className="text-sm text-slate-500">
                    💡 Each seller must have a valid email and mobile number.
                  </p>
                )}
                {currentStep === 3 && (
                  <p className="text-sm text-slate-500">
                    💡 You can search for your agents if they're registered with us, if not you can create one and they'll get notified to track your application progress with us.
                  </p>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-4">
                {currentStep > 1 && (
                  <button
                    onClick={handleBack}
                    className="group flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                  </button>
                )}

                {currentStep < steps.length ? (
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid(currentStep)}
                    className="group flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none ml-auto"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!isStepValid(3) || isSubmitting}
                    className="group flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none ml-auto"
                  >
                    <span>Request Disclosure Form</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <AgencySearchModal
        isOpen={showAgencySearch}
        onOpenChange={setShowAgencySearch}
        businessName={agencyInfo.businessName}
        suburb={agencyInfo.suburb}
        onSelectAgency={handleAgencySelect}
      />

      <AgentSelectionModal
        isOpen={showAgentSelection}
        onOpenChange={setShowAgentSelection}
        agency={selectedAgency}
        onSelectAgent={handleAgentSelect}
        onBack={handleBackFromAgent}
      />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ping-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes check-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .check-path {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: check-draw 0.5s ease-out 0.2s forwards;
        }

        .scale-98 {
          transform: scale(0.98);
        }

        .blur-sm {
          filter: blur(4px);
        }

        .blur-0 {
          filter: blur(0);
        }
      `}</style>
    </div>
  );
}
