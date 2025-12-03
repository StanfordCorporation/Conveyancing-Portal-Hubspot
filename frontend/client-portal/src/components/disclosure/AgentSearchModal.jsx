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
 * Agent Search Modal Component
 * Displays search results for agents with their agency information
 * Allows user to select existing agent or create new one
 */
export function AgentSearchModal({
  isOpen,
  onOpenChange,
  agentName,
  agencyName,
  agentPhone,
  suburb,
  onSelectAgent,
  onCreateNew
}) {
  const [results, setResults] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Search agents when modal opens or search terms change
  useEffect(() => {
    if (isOpen && agentName && agencyName) {
      searchAgents();
    }
  }, [isOpen, agentName, agencyName, agentPhone, suburb]);

  const searchAgents = async () => {
    setIsLoading(true);
    setError('');
    setResults([]);
    setSelectedAgent(null);

    try {
      const response = await api.post('/agents/search', {
        agentName,
        agencyName,
        agentPhone: agentPhone || null,
        suburb: suburb || null
      });

      const agents = response.data.agents || [];
      setResults(agents);

      if (agents.length === 0) {
        setError('No agents found matching your search. You can create a new agent below.');
      }
    } catch (err) {
      console.error('Agent search error:', err);
      setError(err.response?.data?.message || 'Failed to search agents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAgent = () => {
    if (selectedAgent) {
      onSelectAgent(selectedAgent);
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
      <CreateAgentForm
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onBack={() => setShowCreateForm(false)}
        initialAgentName={agentName}
        initialAgencyName={agencyName}
        initialSuburb={suburb}
        onSuccess={(agent) => {
          onSelectAgent(agent);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <div>
          <DialogTitle>Find or Create Agent</DialogTitle>
          <DialogDescription>
            Search results for agents matching "{agentName}" @ "{agencyName}"
            {suburb && ` in "${suburb}"`}
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
              <p className="text-slate-600">Searching agents...</p>
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
              Found {results.length} matching agents:
            </p>
            <div className="space-y-2">
              {results.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAgent?.id === agent.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">
                        {agent.firstname} {agent.lastname}
                      </h4>
                      {agent.email && (
                        <p className="text-sm text-slate-600">{agent.email}</p>
                      )}
                      {agent.phone && (
                        <p className="text-sm text-slate-600">{agent.phone}</p>
                      )}
                      {agent.agency && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-sm font-medium text-slate-700">
                            {agent.agency.name}
                          </p>
                          {agent.agency.address && (
                            <p className="text-xs text-slate-500">{agent.agency.address}</p>
                          )}
                        </div>
                      )}
                      {agent.score !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${agent.score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            {(agent.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedAgent?.id === agent.id
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedAgent?.id === agent.id && (
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
            <p className="text-slate-600">No agents found</p>
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
          onClick={handleSelectAgent}
          disabled={!selectedAgent}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Select Agent
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
 * Create Agent Form Component
 */
export function CreateAgentForm({
  isOpen,
  onOpenChange,
  onBack,
  initialAgentName = '',
  initialAgencyName = '',
  initialSuburb = '',
  onSuccess
}) {
  const [formData, setFormData] = useState({
    agentFirstName: '',
    agentLastName: '',
    agentEmail: '',
    agentPhone: '',
    agencyName: initialAgencyName,
    agencySuburb: initialSuburb,
    agencyEmail: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateAgent, setDuplicateAgent] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState({});

  // Parse agent name if provided
  useEffect(() => {
    if (initialAgentName) {
      const parts = initialAgentName.trim().split(' ');
      setFormData(prev => ({
        ...prev,
        agentFirstName: parts[0] || '',
        agentLastName: parts.slice(1).join(' ') || parts[0] || ''
      }));
    }
  }, [initialAgentName]);

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
      formData.agentFirstName?.trim() &&
      formData.agentLastName?.trim() &&
      formData.agentEmail?.trim() &&
      formData.agentPhone?.trim() &&
      formData.agencyName?.trim() &&
      formData.agencyEmail?.trim()
    );
  };

  // Helper function to clean phone numbers (remove spaces)
  const cleanPhoneNumber = (phone) => phone ? phone.replace(/\s/g, '') : '';

  // Search for duplicate agent before creating
  const searchForDuplicateAgent = async () => {
    try {
      console.log('🔍 Searching for duplicate agent...');
      const response = await api.post('/agencies/search-agent', {
        email: formData.agentEmail,
        phone: cleanPhoneNumber(formData.agentPhone)
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
    // Use the existing agent
    setShowDuplicateModal(false);
    setIsLoading(true);
    setError('');

    try {
      // Return the existing agent with agency info
      const agentData = {
        id: duplicateAgent.id,
        firstname: duplicateAgent.firstname,
        lastname: duplicateAgent.lastname,
        email: duplicateAgent.email,
        phone: duplicateAgent.phone,
        agency: {
          name: formData.agencyName,
          email: formData.agencyEmail,
          address: formData.agencySuburb
        }
      };

      if (onSuccess) {
        onSuccess(agentData);
      }
    } catch (err) {
      console.error('Error using existing agent:', err);
      setError(err.response?.data?.message || 'Failed to use existing agent. Please try again.');
    } finally {
      setIsLoading(false);
      setDuplicateAgent(null);
    }
  };

  const handleDuplicateCreateNew = () => {
    // Show form again with fields highlighted and error messages
    setShowDuplicateModal(false);
    setHighlightedFields({
      agentEmail: true,
      agentPhone: true
    });
    setError('Please enter a unique value');
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
      // First create agency, then create agent
      const agencyResponse = await api.post('/agencies/create', {
        name: formData.agencyName,
        address: formData.agencySuburb,
        email: formData.agencyEmail,
        phone: cleanPhoneNumber(formData.agentPhone),
        agentFirstName: formData.agentFirstName,
        agentLastName: formData.agentLastName,
        agentEmail: formData.agentEmail,
        agentPhone: cleanPhoneNumber(formData.agentPhone)
      });

      // Format agent data for return
      const agentData = {
        id: agencyResponse.data.agency.agent?.id || null,
        firstname: formData.agentFirstName,
        lastname: formData.agentLastName,
        email: formData.agentEmail,
        phone: cleanPhoneNumber(formData.agentPhone),
        agency: {
          id: agencyResponse.data.agency.id,
          name: formData.agencyName,
          email: formData.agencyEmail,
          address: formData.agencySuburb
        }
      };

      if (onSuccess) {
        onSuccess(agentData);
      }
    } catch (err) {
      console.error('Agent creation error:', err);

      // Handle duplicate agency email (409 error)
      if (err.response?.status === 409 && err.response?.data?.duplicateField === 'email') {
        console.log('⚠️ Duplicate agency email found');
        setHighlightedFields({ agencyEmail: true });
        setError('Please enter a unique value');
      } else {
        setError(err.response?.data?.message || 'Failed to create agent. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader onClose={onBack}>
        <div>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Fill in the agent and agency details below
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
              Agent First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="agentFirstName"
              value={formData.agentFirstName}
              onChange={handleChange}
              placeholder="Steve"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agent Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="agentLastName"
              value={formData.agentLastName}
              onChange={handleChange}
              placeholder="Athanates"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agent Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="agentEmail"
              value={formData.agentEmail}
              onChange={handleChange}
              placeholder="steve@example.com"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.agentEmail
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.agentEmail && (
              <p className="text-sm text-red-600 mt-1">Please enter a unique value</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agent Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="agentPhone"
              value={formData.agentPhone}
              onChange={handleChange}
              placeholder="0412 345 678"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.agentPhone
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.agentPhone && (
              <p className="text-sm text-red-600 mt-1">Please enter a unique value</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agency Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="agencyName"
              value={formData.agencyName}
              onChange={handleChange}
              placeholder="NGU Real Estate"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agency Suburb
            </label>
            <input
              type="text"
              name="agencySuburb"
              value={formData.agencySuburb}
              onChange={handleChange}
              placeholder="Logan"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agency Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="agencyEmail"
              value={formData.agencyEmail}
              onChange={handleChange}
              placeholder="info@example.com"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.agencyEmail
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.agencyEmail && (
              <p className="text-sm text-red-600 mt-1">Please enter a unique value</p>
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
          Create Agent
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

export default AgentSearchModal;

