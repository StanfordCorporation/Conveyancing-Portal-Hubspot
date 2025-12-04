import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, ArrowRight, Send, MapPin, ArrowLeft, Check, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import { AgentSearchModal } from './AgentSearchModal';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import AddressAutocomplete from '../../../../src/components/common/AddressAutocomplete';
import { normalizePhoneToInternational, normalizePhoneForComparison } from '../../utils/phone';

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
  const [agentSearchInfo, setAgentSearchInfo] = useState({
    agentName: '',
    agencyName: '',
    agentPhone: '',
    suburb: ''
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [error, setError] = useState('');
  const [showAgentSearch, setShowAgentSearch] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    primarySeller: {
      email: '',
      mobile: ''
    },
    additionalSellers: []
  });
  const [showBenefits, setShowBenefits] = useState(false);

  const steps = [
    { number: 1, name: 'Property Information' },
    { number: 2, name: 'Seller Information' },
    { number: 3, name: 'Agency & Agent' }
  ];

  // Handle agent selection from search modal
  const handleAgentSelect = (agent) => {
    console.log('✅ Agent selected:', agent);
    setSelectedAgent(agent);
    setShowAgentSearch(false);
  };

  const handleAgentSearch = () => {
    if (agentSearchInfo.agentName.trim() && agentSearchInfo.agencyName.trim()) {
      setShowAgentSearch(true);
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
      
      // Update validation errors array
      setValidationErrors({
        ...validationErrors,
        additionalSellers: [
          ...validationErrors.additionalSellers,
          ...newSellers.map(() => ({ email: '', mobile: '' }))
        ]
      });
    } else if (targetLength < currentLength) {
      setAdditionalSellers(additionalSellers.slice(0, targetLength));
      
      // Update validation errors array
      setValidationErrors({
        ...validationErrors,
        additionalSellers: validationErrors.additionalSellers.slice(0, targetLength)
      });
    }
    
    // Re-validate after change
    setTimeout(() => {
      const { errors } = validateSellerUniqueness();
      setValidationErrors(errors);
    }, 100);
  };

  // Normalize email for comparison
  const normalizeEmailForComparison = (email) => {
    if (!email) return '';
    return email.toLowerCase().trim();
  };

  // Check for duplicate emails across sellers
  const hasDuplicateEmails = (primarySeller, additionalSellers) => {
    const primaryEmail = normalizeEmailForComparison(primarySeller.email);
    if (!primaryEmail) return false;
    
    return additionalSellers.some(seller => 
      normalizeEmailForComparison(seller.email) === primaryEmail
    );
  };

  // Check for duplicate phones across sellers
  const hasDuplicatePhones = (primarySeller, additionalSellers) => {
    const primaryPhone = normalizePhoneForComparison(primarySeller.mobile);
    if (!primaryPhone) return false;
    
    return additionalSellers.some(seller => {
      const sellerPhone = normalizePhoneForComparison(seller.mobile);
      return sellerPhone && sellerPhone === primaryPhone;
    });
  };

  // Check for duplicates within additional sellers
  const hasDuplicateWithinAdditional = (additionalSellers) => {
    const emails = new Map();
    const phones = new Map();
    
    for (let i = 0; i < additionalSellers.length; i++) {
      const seller = additionalSellers[i];
      const email = normalizeEmailForComparison(seller.email);
      const phone = normalizePhoneForComparison(seller.mobile);
      
      if (email && emails.has(email)) {
        return { type: 'email', duplicate: true, indices: [emails.get(email), i] };
      }
      if (phone && phones.has(phone)) {
        return { type: 'phone', duplicate: true, indices: [phones.get(phone), i] };
      }
      
      if (email) emails.set(email, i);
      if (phone) phones.set(phone, i);
    }
    
    return { duplicate: false };
  };

  // Validate seller uniqueness
  const validateSellerUniqueness = () => {
    const errors = {
      primarySeller: { email: '', mobile: '' },
      additionalSellers: additionalSellers.map(() => ({ email: '', mobile: '' }))
    };
    
    let hasErrors = false;
    
    // Check primary vs additional sellers - Email
    if (hasDuplicateEmails(primarySeller, additionalSellers)) {
      errors.primarySeller.email = 'Email must be different from additional sellers';
      hasErrors = true;
      
      // Mark matching additional sellers
      const primaryEmail = normalizeEmailForComparison(primarySeller.email);
      additionalSellers.forEach((seller, index) => {
        if (normalizeEmailForComparison(seller.email) === primaryEmail) {
          errors.additionalSellers[index].email = 'Email must be different from primary seller';
        }
      });
    }
    
    // Check primary vs additional sellers - Phone
    if (hasDuplicatePhones(primarySeller, additionalSellers)) {
      errors.primarySeller.mobile = 'Phone number must be different from additional sellers';
      hasErrors = true;
      
      // Mark matching additional sellers
      const primaryPhone = normalizePhoneForComparison(primarySeller.mobile);
      additionalSellers.forEach((seller, index) => {
        if (normalizePhoneForComparison(seller.mobile) === primaryPhone) {
          errors.additionalSellers[index].mobile = 'Phone number must be different from primary seller';
        }
      });
    }
    
    // Check duplicates within additional sellers
    const duplicateCheck = hasDuplicateWithinAdditional(additionalSellers);
    if (duplicateCheck.duplicate) {
      const type = duplicateCheck.type;
      const seen = new Map();
      
      additionalSellers.forEach((seller, index) => {
        const value = type === 'email' 
          ? normalizeEmailForComparison(seller.email)
          : normalizePhoneForComparison(seller.mobile);
        
        if (value && seen.has(value)) {
          const field = type === 'email' ? 'email' : 'mobile';
          const message = `${type === 'email' ? 'Email' : 'Phone number'} must be unique`;
          errors.additionalSellers[index][field] = message;
          errors.additionalSellers[seen.get(value)][field] = message;
          hasErrors = true;
        } else if (value) {
          seen.set(value, index);
        }
      });
    }
    
    return { errors, hasErrors };
  };

  const updateAdditionalSeller = (index, field, value) => {
    const updated = [...additionalSellers];
    
    // If updating mobile field, normalize it
    if (field === 'mobile') {
      updated[index] = { ...updated[index], [field]: normalizePhoneToInternational(value) || value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setAdditionalSellers(updated);
    
    // Trigger validation
    setTimeout(() => {
      const { errors } = validateSellerUniqueness();
      setValidationErrors(errors);
    }, 300);
  };

  // Validation for each step
  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return propertyAddress.trim() !== '' && numOwners !== '';
      case 2:
        // Check required fields
        if (!primarySeller.fullName || !primarySeller.mobile || !primarySeller.email) {
          return false;
        }
        for (let seller of additionalSellers) {
          if (!seller.fullName || !seller.mobile || !seller.email) {
            return false;
          }
        }
        
        // Check uniqueness
        const { hasErrors } = validateSellerUniqueness();
        return !hasErrors;
      case 3:
        // Validate that an agent is selected and has required data
        if (!selectedAgent) {
          return false;
        }
        // Ensure agent has required fields
        if (!selectedAgent.id || !selectedAgent.firstname || !selectedAgent.lastname || !selectedAgent.email) {
          return false;
        }
        // Ensure agent has associated agency
        if (!selectedAgent.agency || !selectedAgent.agency.id || !selectedAgent.agency.name) {
          return false;
        }
        return true;
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
    // Validate step 3 - agent selection
    if (!isStepValid(3)) {
      if (!selectedAgent) {
        setError('Please search for and select an agent before submitting.');
      } else if (!selectedAgent.id || !selectedAgent.firstname || !selectedAgent.lastname || !selectedAgent.email) {
        setError('Selected agent is missing required information. Please select a different agent.');
      } else if (!selectedAgent.agency || !selectedAgent.agency.id || !selectedAgent.agency.name) {
        setError('Selected agent must have an associated agency. Please select a different agent.');
      } else {
        setError('Please complete all required fields.');
      }
      return;
    }
    
    // Double-check uniqueness before submit
    const { errors, hasErrors } = validateSellerUniqueness();
    if (hasErrors) {
      setValidationErrors(errors);
      setError('Please ensure all sellers have unique email addresses and phone numbers.');
      return;
    }
    
    // Final validation: Ensure agent and agency data are complete
    if (!selectedAgent.id || !selectedAgent.agency?.id) {
      setError('Agent and agency information is incomplete. Please search and select an agent again.');
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

      const formData = {
        seller: {
          email: primarySeller.email,
          firstname: primarySellerNames.firstname,
          lastname: primarySellerNames.lastname,
          phone: normalizePhoneToInternational(primarySeller.mobile)
        },
        additionalSellers: additionalSellers.map(seller => {
          const names = splitName(seller.fullName);
          return {
            email: seller.email,
            firstname: names.firstname,
            lastname: names.lastname,
            phone: normalizePhoneToInternational(seller.mobile)
          };
        }),
        agency: {
          id: selectedAgent?.agency?.id || null,
          name: selectedAgent?.agency?.name || '',
          email: selectedAgent?.agency?.email || ''
        },
        agent: {
          id: selectedAgent?.id || null,
          email: selectedAgent?.email || '',
          firstname: selectedAgent?.firstname || '',
          lastname: selectedAgent?.lastname || '',
          phone: normalizePhoneToInternational(selectedAgent?.phone || '')
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
        alert(`Multiple agencies found matching "${agentSearchInfo.agencyName}". Please confirm which agency.`);
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

  const benefits = [
    "No Hidden Costs",
    "No Extension Fees",
    "No Contract Review Fees",
    "No Solicitor Advisory Fees",
    "No Disclosure Fees",
    "One Fixed-Fee charged on Settlement"
  ];

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-gray-50 lg:overflow-hidden">
      <Header />

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

      {/* Mobile: Sticky Quote Banner - Only visible on mobile */}
      <div className="lg:hidden sticky top-16 z-40 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="px-5 py-3 text-center border-b-2 border-blue-500">
          <h1 className="text-xl font-extrabold text-white mb-0.5 tracking-tight">Get Your Instant Quote</h1>
          <p className="text-blue-100 text-sm font-semibold">Ready in hours, not weeks.</p>
        </div>
      </div>

      {/* Main 2-Column Grid Layout */}
      <main className={`flex-1 grid grid-cols-1 lg:grid-cols-[45%_55%] lg:h-[calc(100vh-5rem)] lg:overflow-hidden transition-all duration-500 ${isSubmitting ? 'scale-98 blur-sm' : 'scale-100 blur-0'}`}>

        {/* Left Column: Marketing Sidebar */}
        <div className="lg:h-full lg:overflow-hidden" style={{ backgroundColor: '#273165' }}>
          {/* Mobile: Always visible marketing content */}
          <div className="lg:hidden p-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-2">Sellers Disclosure Statement</h2>
              <span className="inline-block px-3 py-1 text-white text-xs font-bold uppercase rounded-full" style={{ backgroundColor: '#0E6DFF' }}>
                At No Extra Cost
              </span>
            </div>

            {/* Body Text */}
            <p className="text-slate-300 mb-4 text-sm text-left mt-4">
              <strong className="text-white">One Fixed-Fee</strong> for your entire conveyance.
            </p>

            {/* Benefits - Always visible */}
            <div className="space-y-2">
              {benefits.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Full Marketing Content - Center aligned, larger text */}
          <div className="hidden lg:flex lg:flex-col lg:h-full lg:justify-start p-12 lg:p-10 text-center lg:overflow-hidden">
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-6">Sellers Disclosure Statement</h1>
              <span className="inline-block px-5 py-2 text-white text-base font-bold uppercase rounded-full shadow-lg" style={{ backgroundColor: '#0E6DFF' }}>
                At No Extra Cost
              </span>
            </div>

            {/* Body Text */}
            <div className="mt-6 mb-10">
              <p className="text-2xl text-slate-300 leading-relaxed mb-1">
                <strong className="text-white font-bold">One Fixed-Fee</strong> for your <strong className="text-white font-bold">entire conveyance</strong>.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                We handle your <strong className="text-slate-200">Disclosure</strong> and <strong className="text-slate-200">defend it until settlement</strong> so you <strong className="text-slate-200">never have to worry</strong>.
              </p>
            </div>

            {/* Benefits List (Vertical) - Center aligned */}
            <div className="mb-16">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">What's Included</p>
              <div className="space-y-5 inline-block text-left">
                {benefits.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-white font-medium text-lg">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Promise - Prominent Callout Card */}
            <div className="mt-auto pt-6">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 shadow-2xl border-2 border-blue-400 transform hover:scale-105 transition-all duration-300">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-white mb-2 tracking-tight leading-tight">
                    Get Your Instant Quote
                  </p>
                  <p className="text-lg font-bold text-blue-100 mb-1">
                    Ready in hours, not weeks!
                  </p>
                  <p className="text-sm text-blue-200 font-medium">
                    Answer a few quick questions to get your quote.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Action Area */}
        <div className="bg-gray-50 p-6 lg:p-16 lg:px-16 xl:px-32 lg:min-h-0 lg:overflow-y-auto">
          {/* Progress Indicator */}
          <div className="mb-4 lg:mb-16">
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

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Property Information */}
          {currentStep === 1 && (
            <div className="bg-white border border-border rounded-xl shadow-lg mb-8 overflow-hidden p-0">
              {/* Section A: Content Body */}
              <div className="bg-white p-8">
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

              {/* Section B: Unified Footer */}
              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: '#273165' }}>
                {/* Left Side: Motivation Text + Tip */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-white text-base sm:text-lg mb-2">
                    Your Seller Disclosure could be ready in hours!
                  </p>
                  <p className="text-slate-300 font-normal text-sm">
                    💡 Enter the address exactly as it appears on the property title.
                  </p>
                </div>

                {/* Right Side: Next Step Button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid(currentStep)}
                    className="group flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Seller Information */}
          {currentStep === 2 && (
            <div className="bg-white border border-border rounded-xl shadow-lg mb-8 overflow-hidden p-0">
              {/* Section A: Content Body */}
              <div className="bg-white p-8">
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
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Allow user to type freely, but format when complete
                          const formatted = normalizePhoneToInternational(inputValue) || inputValue;
                          setPrimarySeller({ ...primarySeller, mobile: formatted });
                          
                          // Trigger validation after formatting
                          setTimeout(() => {
                            const { errors } = validateSellerUniqueness();
                            setValidationErrors(errors);
                          }, 300);
                        }}
                        onBlur={(e) => {
                          // Format on blur to ensure consistent format
                          const formatted = normalizePhoneToInternational(e.target.value);
                          if (formatted) {
                            setPrimarySeller({ ...primarySeller, mobile: formatted });
                            setTimeout(() => {
                              const { errors } = validateSellerUniqueness();
                              setValidationErrors(errors);
                            }, 100);
                          }
                        }}
                        placeholder="0412 345 678 or +61412345678"
                        className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all ${
                          validationErrors.primarySeller.mobile 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                            : 'border-input focus:border-primary'
                        }`}
                      />
                      {validationErrors.primarySeller.mobile && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.primarySeller.mobile}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="primaryEmail" className="block text-sm font-medium text-foreground mb-3">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="primaryEmail"
                        type="email"
                        value={primarySeller.email}
                        onChange={(e) => {
                          setPrimarySeller({ ...primarySeller, email: e.target.value });
                          // Trigger validation
                          setTimeout(() => {
                            const { errors } = validateSellerUniqueness();
                            setValidationErrors(errors);
                          }, 300);
                        }}
                        placeholder="john@example.com"
                        className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all ${
                          validationErrors.primarySeller.email 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                            : 'border-input focus:border-primary'
                        }`}
                      />
                      {validationErrors.primarySeller.email && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.primarySeller.email}</p>
                      )}
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
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const formatted = normalizePhoneToInternational(inputValue) || inputValue;
                            updateAdditionalSeller(index, 'mobile', formatted);
                          }}
                          onBlur={(e) => {
                            const formatted = normalizePhoneToInternational(e.target.value);
                            if (formatted) {
                              updateAdditionalSeller(index, 'mobile', formatted);
                            }
                          }}
                          placeholder="0412 345 678 or +61412345678"
                          className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all ${
                            validationErrors.additionalSellers[index]?.mobile 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                              : 'border-input focus:border-primary'
                          }`}
                        />
                        {validationErrors.additionalSellers[index]?.mobile && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.additionalSellers[index].mobile}</p>
                        )}
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
                          className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all ${
                            validationErrors.additionalSellers[index]?.email 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                              : 'border-input focus:border-primary'
                          }`}
                        />
                        {validationErrors.additionalSellers[index]?.email && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.additionalSellers[index].email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* Section B: Unified Footer */}
              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: '#273165' }}>
                {/* Left Side: Motivation Text + Tip */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-white text-base sm:text-lg mb-2">
                    Your Seller Disclosure could be ready in hours!
                  </p>
                  <p className="text-slate-300 font-normal text-sm">
                    💡 Each seller must have a valid email and mobile number. All emails and phone numbers must be unique.
                  </p>
                </div>

                {/* Right Side: Back + Next Step Buttons */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="group flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!isStepValid(currentStep)}
                    className="group flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Agency & Agent */}
          {currentStep === 3 && (
            <div className="bg-white border border-border rounded-xl shadow-lg mb-8 overflow-hidden p-0">
              {/* Section A: Content Body */}
              <div className="bg-white p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Agency & Agent</h2>

              <div className="space-y-5">
                <div>
                  <label htmlFor="agentName" className="block text-sm font-medium text-foreground mb-3">
                    Agent Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="agentName"
                    type="text"
                    value={agentSearchInfo.agentName}
                    onChange={(e) => setAgentSearchInfo({ ...agentSearchInfo, agentName: e.target.value })}
                    placeholder="Your Agent Name Here"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="agencyName" className="block text-sm font-medium text-foreground mb-3">
                    Agency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="agencyName"
                    type="text"
                    value={agentSearchInfo.agencyName}
                    onChange={(e) => setAgentSearchInfo({ ...agentSearchInfo, agencyName: e.target.value })}
                    placeholder="Your Agency Name Here"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="agentPhone" className="block text-sm font-medium text-foreground mb-3">
                    Agent Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
                  </label>
                  <input
                    id="agentPhone"
                    type="tel"
                    value={agentSearchInfo.agentPhone}
                    onChange={(e) => setAgentSearchInfo({ ...agentSearchInfo, agentPhone: e.target.value })}
                    placeholder="0412345678/+61412345678"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="agencySuburb" className="block text-sm font-medium text-foreground mb-3">
                    Agency Suburb <span className="text-muted-foreground text-xs">(Optional)</span>
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        id="agencySuburb"
                        type="text"
                        value={agentSearchInfo.suburb}
                        onChange={(e) => setAgentSearchInfo({ ...agentSearchInfo, suburb: e.target.value })}
                        placeholder="Your Agency Suburb Here"
                        className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAgentSearch}
                      disabled={!agentSearchInfo.agentName.trim() || !agentSearchInfo.agencyName.trim()}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg"
                    >
                      Search
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Enter agent name and agency name, then click Search to find existing agents</p>
                </div>

                {selectedAgent && (
                  <div className="space-y-4 mt-6">
                    <div className="p-5 bg-green-50 border border-green-200 rounded-2xl">
                      <p className="text-xs font-semibold text-green-700 mb-2">SELECTED AGENT</p>
                      <p className="font-bold text-foreground text-lg">
                        {selectedAgent.firstname} {selectedAgent.lastname}
                      </p>
                      <div className="mt-2 space-y-1">
                        {selectedAgent.email && (
                          <p className="text-sm text-muted-foreground">{selectedAgent.email}</p>
                        )}
                        {selectedAgent.phone && (
                          <p className="text-sm text-muted-foreground">{selectedAgent.phone}</p>
                        )}
                      </div>
                    </div>

                    {selectedAgent.agency && (
                      <div className="p-5 bg-primary/10 border border-primary/30 rounded-2xl">
                        <p className="text-xs font-semibold text-primary mb-2">AGENCY</p>
                        <p className="font-bold text-foreground text-lg">{selectedAgent.agency.name}</p>
                        {selectedAgent.agency.address && (
                          <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agency.address}</p>
                        )}
                        {selectedAgent.agency.email && (
                          <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agency.email}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>

              {/* Section B: Unified Footer */}
              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: '#273165' }}>
                {/* Left Side: Motivation Text + Tip */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-white text-base sm:text-lg mb-2">
                    Your Seller Disclosure could be ready in hours!
                  </p>
                  <p className="text-slate-300 font-normal text-sm">
                    💡 You can search for your agents if they're registered with us, if not you can create one and they'll get notified to track your application progress with us.
                  </p>
                </div>

                {/* Right Side: Back + Submit Buttons */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="group flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isStepValid(3) || isSubmitting}
                    className="group flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
                  >
                    <span>Request Disclosure Form</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator Bar - Shows progress for all steps */}
          <div className="relative bg-white border border-border rounded-xl shadow-lg mb-8 overflow-hidden">
            <div className="h-2 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer only on mobile */}
      <div className="lg:hidden">
        <Footer />
      </div>

      <AgentSearchModal
        isOpen={showAgentSearch}
        onOpenChange={setShowAgentSearch}
        agentName={agentSearchInfo.agentName}
        agencyName={agentSearchInfo.agencyName}
        agentPhone={agentSearchInfo.agentPhone}
        suburb={agentSearchInfo.suburb}
        onSelectAgent={handleAgentSelect}
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
