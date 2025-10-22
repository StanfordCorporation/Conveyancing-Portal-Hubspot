import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Plus, Loader, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter
} from '../ui/Dialog';
import { DuplicateAgentModal } from './DuplicateAgentModal';
import api from '../../services/api';

/**
 * Agency Search Modal Component
 * Displays search results with selection and option to create new
 */
export function AgencySearchModal({
  isOpen,
  onOpenChange,
  businessName,
  suburb,
  onSelectAgency,
  onCreateNew
}) {
  const [results, setResults] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Search agencies when modal opens or search terms change
  useEffect(() => {
    if (isOpen && businessName && suburb) {
      searchAgencies();
    }
  }, [isOpen, businessName, suburb]);

  const searchAgencies = async () => {
    setIsLoading(true);
    setError('');
    setResults([]);
    setSelectedAgency(null);

    try {
      const response = await api.post('/agencies/search', {
        businessName,
        suburb
      });

      const agencies = response.data.agencies || [];
      setResults(agencies);

      if (agencies.length === 0) {
        setError('No agencies found matching your search. You can create a new agency below.');
      }
    } catch (err) {
      console.error('Agency search error:', err);
      setError(err.response?.data?.message || 'Failed to search agencies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAgency = () => {
    if (selectedAgency) {
      onSelectAgency(selectedAgency);
      onOpenChange(false);
    }
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
      onOpenChange(false);
    }
  };

  if (showCreateForm) {
    return (
      <CreateAgencyForm
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onBack={() => setShowCreateForm(false)}
        initialBusinessName={businessName}
        initialSuburb={suburb}
        onSuccess={(agency) => {
          onSelectAgency(agency);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <div>
          <DialogTitle>Find or Create Agency</DialogTitle>
          <DialogDescription>
            Search results for "{businessName}, {suburb}"
          </DialogDescription>
        </div>
      </DialogHeader>

      <DialogContent>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-slate-600">Searching agencies...</p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{error}</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 font-medium">
              Found {results.length} matching agencies:
            </p>
            <div className="space-y-2">
              {results.map((agency) => (
                <div
                  key={agency.id}
                  onClick={() => setSelectedAgency(agency)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAgency?.id === agency.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{agency.name}</h4>
                      {agency.email && (
                        <p className="text-sm text-slate-600">{agency.email}</p>
                      )}
                      {agency.address && (
                        <p className="text-sm text-slate-600">{agency.address}</p>
                      )}
                      {agency.score !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${agency.score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            {(agency.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedAgency?.id === agency.id
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedAgency?.id === agency.id && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && results.length === 0 && !error && (
          <div className="py-8 text-center">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No agencies found</p>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <button
          onClick={() => onOpenChange(false)}
          className="px-6 py-2 rounded-lg border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New
        </button>
        <button
          onClick={handleSelectAgency}
          disabled={!selectedAgency}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Select Agency
        </button>
      </DialogFooter>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </Dialog>
  );
}

/**
 * Create Agency Form Component
 */
export function CreateAgencyForm({
  isOpen,
  onOpenChange,
  onBack,
  initialBusinessName = '',
  initialSuburb = '',
  onSuccess
}) {
  const [formData, setFormData] = useState({
    businessName: initialBusinessName,
    suburb: initialSuburb,
    email: '',
    salespersonName: '',
    salespersonEmail: '',
    salespersonPhone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateAgent, setDuplicateAgent] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const isFormValid = () => {
    return (
      formData.businessName?.trim() &&
      formData.suburb?.trim() &&
      formData.email?.trim() &&
      formData.salespersonName?.trim() &&
      formData.salespersonEmail?.trim() &&
      formData.salespersonPhone?.trim()
    );
  };

  // Parse agent name into first and last name
  const splitAgentName = (fullName) => {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || parts[0];
    return { firstName, lastName };
  };

  // Search for duplicate agent before creating
  const searchForDuplicateAgent = async () => {
    try {
      console.log('🔍 Searching for duplicate agent...');
      const response = await api.post('/agencies/search-agent', {
        email: formData.salespersonEmail,
        phone: formData.salespersonPhone
      });

      if (response.data.agent) {
        console.log('⚠️ Found duplicate agent:', response.data.agent);
        setDuplicateAgent(response.data.agent);
        setShowDuplicateModal(true);
        return true; // Duplicate found
      }

      console.log('✅ No duplicate agent found');
      return false; // No duplicate
    } catch (err) {
      console.error('Error searching for duplicate agent:', err);
      // Continue with creation even if search fails
      return false;
    }
  };

  const handleDuplicateUseExisting = async () => {
    // Use the existing agent to create the agency
    setShowDuplicateModal(false);
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/agencies/create', {
        name: formData.businessName,
        address: formData.suburb,
        email: formData.email,
        phone: formData.salespersonPhone,
        agentFirstName: duplicateAgent.firstname,
        agentLastName: duplicateAgent.lastname,
        agentEmail: duplicateAgent.email,
        agentPhone: duplicateAgent.phone
      });

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error('Agency creation error:', err);
      setError(err.response?.data?.message || 'Failed to create agency. Please try again.');
    } finally {
      setIsLoading(false);
      setDuplicateAgent(null);
    }
  };

  const handleDuplicateCreateNew = () => {
    // Show form again with fields highlighted and error messages
    setShowDuplicateModal(false);
    setHighlightedFields({
      salespersonEmail: true,
      salespersonPhone: true
    });
    setError('Please enter a Unique Value');
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('All fields are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setHighlightedFields({});

    try {
      // Check for duplicate agent before creating
      const hasDuplicate = await searchForDuplicateAgent();

      if (hasDuplicate) {
        // Modal will be shown, return here
        setIsLoading(false);
        return;
      }

      // No duplicate found, proceed with creation
      const agentNames = splitAgentName(formData.salespersonName);

      const response = await api.post('/agencies/create', {
        name: formData.businessName,
        address: formData.suburb,
        email: formData.email,
        phone: formData.salespersonPhone,
        agentFirstName: agentNames.firstName,
        agentLastName: agentNames.lastName,
        agentEmail: formData.salespersonEmail,
        agentPhone: formData.salespersonPhone
      });

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error('Agency creation error:', err);

      // Handle duplicate agency email (409 error)
      if (err.response?.status === 409 && err.response?.data?.duplicateField === 'email') {
        console.log('⚠️ Duplicate agency email found');
        setHighlightedFields({ email: true });
        setError('Please enter a Unique Value');
      } else {
        setError(err.response?.data?.message || 'Failed to create agency. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader onClose={onBack}>
        <div>
          <DialogTitle>Create New Agency</DialogTitle>
          <DialogDescription>
            Fill in the agency details below
          </DialogDescription>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agency Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="ABC Real Estate"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agency Suburb <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="suburb"
              value={formData.suburb}
              onChange={handleChange}
              placeholder="Melbourne"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agency Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="info@abcrealestate.com"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.email
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.email && (
              <p className="text-sm text-red-600 mt-1">Please enter a Unique Value</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Listed Salesperson Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="salespersonName"
              value={formData.salespersonName}
              onChange={handleChange}
              placeholder="Sarah Johnson"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Listed Salesperson Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="salespersonEmail"
              value={formData.salespersonEmail}
              onChange={handleChange}
              placeholder="sarah@abcrealestate.com"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.salespersonEmail
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.salespersonEmail && (
              <p className="text-sm text-red-600 mt-1">Please enter a Unique Value</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Listed Salesperson Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="salespersonPhone"
              value={formData.salespersonPhone}
              onChange={handleChange}
              placeholder="0412 345 678"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.salespersonPhone
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.salespersonPhone && (
              <p className="text-sm text-red-600 mt-1">Please enter a Unique Value</p>
            )}
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          disabled={isLoading}
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isFormValid() || isLoading}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <Loader className="w-4 h-4 animate-spin" />}
          Create Agency
        </button>
      </DialogFooter>

      {/* Duplicate Agent Modal */}
      <DuplicateAgentModal
        isOpen={showDuplicateModal}
        onOpenChange={setShowDuplicateModal}
        existingAgent={duplicateAgent}
        onUseExisting={handleDuplicateUseExisting}
        onCreateNew={handleDuplicateCreateNew}
      />
    </Dialog>
  );
}

export default AgencySearchModal;
