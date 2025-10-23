import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, Building2, User, Mail, Phone, ArrowRight, Send, MapPin } from 'lucide-react';
import api from '../../services/api';
import { AgencySearchModal } from './AgencySearchModal';
import { AgentSelectionModal } from './AgentSelectionModal';

export default function DisclosureForm() {
  const navigate = useNavigate();
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

  // Handle agency selection from search modal
  const handleAgencySelect = (agency) => {
    // Transform the agency data to match our state structure
    let transformedAgency = {
      id: agency.id,
      name: agency.name,
      email: agency.email,
      address: agency.address
    };

    // If agent was already created during agency creation (from /agencies/create endpoint),
    // map it to our state structure and skip agent selection modal
    if (agency.agent && agency.agent.id) {
      console.log('✅ Agent already created with agency, skipping selection modal');
      transformedAgency.agentFirstName = agency.agent.firstname;
      transformedAgency.agentLastName = agency.agent.lastname;
      transformedAgency.agentEmail = agency.agent.email;
      transformedAgency.agentPhone = agency.agent.phone;

      setSelectedAgency(transformedAgency);
      setShowAgencySearch(false);
      // Don't show agent selection modal - agent is already selected
    } else {
      // Agent doesn't exist yet, show selection modal so user can pick/create one
      console.log('🔍 Showing agent selection modal for existing agency');
      setSelectedAgency(transformedAgency);
      setShowAgencySearch(false);
      setShowAgentSelection(true);
    }
  };

  // Handle agent selection and finalize agency with agent
  const handleAgentSelect = (agencyWithAgent) => {
    setSelectedAgency(agencyWithAgent);
    setShowAgentSelection(false);
  };

  // Handle back from agent selection
  const handleBackFromAgent = () => {
    setShowAgentSelection(false);
    setShowAgencySearch(true);
  };

  // Trigger agency search when both business name and suburb are filled
  const handleAgencySearch = () => {
    if (agencyInfo.businessName.trim() && agencyInfo.suburb.trim()) {
      setShowAgencySearch(true);
    }
  };

  const handleNumOwnersChange = (value) => {
    const num = parseInt(value) || 1;
    setNumOwners(value);

    // Adjust additional sellers array
    const currentLength = additionalSellers.length;
    const targetLength = num - 1; // -1 because primary seller is separate

    if (targetLength > currentLength) {
      // Add more sellers
      const newSellers = Array(targetLength - currentLength).fill(null).map(() => ({
        fullName: '',
        mobile: '',
        email: ''
      }));
      setAdditionalSellers([...additionalSellers, ...newSellers]);
    } else if (targetLength < currentLength) {
      // Remove sellers
      setAdditionalSellers(additionalSellers.slice(0, targetLength));
    }
  };

  const updateAdditionalSeller = (index, field, value) => {
    const updated = [...additionalSellers];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalSellers(updated);
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    setSubmitProgress(10);

    try {
      // Split full name into firstname and lastname
      const splitName = (fullName) => {
        const parts = fullName.trim().split(' ');
        const firstname = parts[0] || '';
        const lastname = parts.slice(1).join(' ') || parts[0];
        return { firstname, lastname };
      };

      const primarySellerNames = splitName(primarySeller.fullName);

      // Helper function to clean phone numbers (remove spaces)
      const cleanPhoneNumber = (phone) => phone ? phone.replace(/\s/g, '') : '';

      // Format data for API
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

      // Submit to backend
      const response = await api.post('/workflows/client-disclosure', formData);

      console.log('✅ Disclosure form submitted successfully:', response.data);
      setSubmitProgress(70);

      // Check if agency confirmation is needed
      if (response.data.requiresConfirmation) {
        setSubmitProgress(100);
        // TODO: Show agency selection modal
        console.log('⚠️ Multiple agencies found:', response.data.agencyMatches);
        alert(`Multiple agencies found matching "${agencyInfo.businessName}". Please confirm which agency.`);
        setIsSubmitting(false);
        return;
      }

      // Animate progress to 100%
      setSubmitProgress(100);

      // Wait for animation then redirect to login page
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

  const isFormValid = () => {
    if (!propertyAddress || !numOwners || !primarySeller.fullName || !primarySeller.mobile || !primarySeller.email) {
      return false;
    }

    for (let seller of additionalSellers) {
      if (!seller.fullName || !seller.mobile || !seller.email) {
        return false;
      }
    }

    // Agency and Agent must be selected
    if (!selectedAgency) {
      return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-12 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Submission Animation Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fade-in"></div>

          {/* Animated content */}
          <div className="relative z-10">
            {submitProgress < 100 ? (
              <>
                {/* Pulsing circle loader */}
                <div className="flex items-center justify-center mb-8">
                  <div className="relative w-32 h-32">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping-slow"></div>
                    {/* Middle ring */}
                    <div className="absolute inset-2 rounded-full border-4 border-blue-400/60 animate-pulse-slow"></div>
                    {/* Inner circle with icon */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center animate-float">
                      <Send className="w-12 h-12 text-white" style={{ transform: `rotate(${submitProgress * 3.6}deg)` }} />
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Submitting Your Form</h3>
                  <p className="text-slate-300">Please wait while we process your information...</p>
                </div>

                {/* Modern progress bar */}
                <div className="w-96 max-w-full px-4">
                  <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${submitProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-slate-400">Processing</span>
                    <span className="text-sm font-semibold text-blue-400">{submitProgress}%</span>
                  </div>
                </div>
              </>
            ) : (
              /* Success state */
              <div className="text-center animate-scale-in">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" viewBox="0 0 52 52">
                      <path className="check-path" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" d="M14 27l7 7 16-16"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Submission Successful!</h3>
                <p className="text-slate-300">Redirecting to login...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`max-w-4xl mx-auto transition-all duration-500 relative z-10 ${isSubmitting ? 'scale-98 blur-sm' : 'scale-100 blur-0'}`}>
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Home className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Property Disclosure</h1>
              <p className="text-slate-400 mt-1">Complete all sections accurately to proceed</p>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Property Information */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Home className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Property Information</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="propertyAddress" className="block text-sm font-medium text-slate-300 mb-3">
                Property Address <span className="text-red-400">*</span>
              </label>
              <input
                id="propertyAddress"
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="123 Main Street, Melbourne VIC 3000"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="numOwners" className="block text-sm font-medium text-slate-300 mb-3">
                Number of Registered Owners <span className="text-red-400">*</span>
              </label>
              <input
                id="numOwners"
                type="number"
                min="1"
                max="10"
                value={numOwners}
                onChange={(e) => handleNumOwnersChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Seller Information */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Seller Information</h2>
          </div>

          {/* Primary Seller */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500/30 text-blue-300 text-sm font-medium">1</div>
              <h3 className="text-lg font-semibold text-white">Primary Seller</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="primaryFullName" className="block text-sm font-medium text-slate-300 mb-3">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="primaryFullName"
                  type="text"
                  value={primarySeller.fullName}
                  onChange={(e) => setPrimarySeller({ ...primarySeller, fullName: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="primaryMobile" className="block text-sm font-medium text-slate-300 mb-3">
                    Mobile <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="primaryMobile"
                      type="tel"
                      value={primarySeller.mobile}
                      onChange={(e) => setPrimarySeller({ ...primarySeller, mobile: e.target.value })}
                      placeholder="0412 345 678"
                      className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="primaryEmail" className="block text-sm font-medium text-slate-300 mb-3">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="primaryEmail"
                      type="email"
                      value={primarySeller.email}
                      onChange={(e) => setPrimarySeller({ ...primarySeller, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Sellers */}
          {additionalSellers.map((seller, index) => (
            <div key={index} className="mb-10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500/30 text-blue-300 text-sm font-medium">{index + 2}</div>
                <h3 className="text-lg font-semibold text-white">Seller {index + 2}</h3>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor={`additionalFullName${index}`} className="block text-sm font-medium text-slate-300 mb-3">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id={`additionalFullName${index}`}
                    type="text"
                    value={seller.fullName}
                    onChange={(e) => updateAdditionalSeller(index, 'fullName', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`additionalMobile${index}`} className="block text-sm font-medium text-slate-300 mb-3">
                      Mobile <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        id={`additionalMobile${index}`}
                        type="tel"
                        value={seller.mobile}
                        onChange={(e) => updateAdditionalSeller(index, 'mobile', e.target.value)}
                        placeholder="0412 345 678"
                        className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`additionalEmail${index}`} className="block text-sm font-medium text-slate-300 mb-3">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        id={`additionalEmail${index}`}
                        type="email"
                        value={seller.email}
                        onChange={(e) => updateAdditionalSeller(index, 'email', e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agency Information */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Agency & Agent</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="agencyBusinessName" className="block text-sm font-medium text-slate-300 mb-3">
                Agency Business Name <span className="text-red-400">*</span>
              </label>
              <input
                id="agencyBusinessName"
                type="text"
                value={agencyInfo.businessName}
                onChange={(e) => setAgencyInfo({ ...agencyInfo, businessName: e.target.value })}
                placeholder="ABC Real Estate"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="agencySuburb" className="block text-sm font-medium text-slate-300 mb-3">
                Agency Suburb <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    id="agencySuburb"
                    type="text"
                    value={agencyInfo.suburb}
                    onChange={(e) => setAgencyInfo({ ...agencyInfo, suburb: e.target.value })}
                    placeholder="Melbourne"
                    className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAgencySearch}
                  disabled={!agencyInfo.businessName.trim() || !agencyInfo.suburb.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg"
                >
                  Search
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Enter details and click Search to find existing agencies</p>
            </div>

            {/* Selected Agency Display */}
            {selectedAgency && (
              <div className="space-y-4 mt-6">
                <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                  <p className="text-xs font-semibold text-blue-300 mb-2">SELECTED AGENCY</p>
                  <p className="font-bold text-white text-lg">{selectedAgency.name}</p>
                  {selectedAgency.email && (
                    <p className="text-sm text-slate-400 mt-1">{selectedAgency.email}</p>
                  )}
                </div>

                {/* Selected Agent Display */}
                {selectedAgency.agentFirstName && (
                  <div className="p-5 bg-green-500/10 border border-green-500/30 rounded-2xl">
                    <p className="text-xs font-semibold text-green-300 mb-2">SELECTED AGENT</p>
                    <p className="font-bold text-white text-lg">
                      {selectedAgency.agentFirstName} {selectedAgency.agentLastName}
                    </p>
                    <div className="mt-2 space-y-1">
                      {selectedAgency.agentEmail && (
                        <p className="text-sm text-slate-400">{selectedAgency.agentEmail}</p>
                      )}
                      {selectedAgency.agentPhone && (
                        <p className="text-sm text-slate-400">{selectedAgency.agentPhone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-4 rounded-xl font-semibold focus:ring-4 focus:ring-blue-500/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
          >
            <span>Submit Disclosure Form</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-sm text-slate-400 text-center mt-4">
            <span className="text-red-400">*</span> Required fields
          </p>
        </div>
      </div>

      {/* Agency Search Modal */}
      <AgencySearchModal
        isOpen={showAgencySearch}
        onOpenChange={setShowAgencySearch}
        businessName={agencyInfo.businessName}
        suburb={agencyInfo.suburb}
        onSelectAgency={handleAgencySelect}
      />

      {/* Agent Selection Modal */}
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
