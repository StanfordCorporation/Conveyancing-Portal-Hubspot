import React, { useState, useEffect } from 'react';
import { Plus, Loader, AlertCircle, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter
} from '../ui/Dialog';
import api from '../../services/api';

/**
 * Agent Selection Modal Component
 * Displays agents associated with selected agency
 * Allows user to select existing agent or create new one
 */
export function AgentSelectionModal({
  isOpen,
  onOpenChange,
  agency,
  onSelectAgent,
  onBack
}) {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch agents when modal opens
  useEffect(() => {
    if (isOpen && agency?.id) {
      fetchAgents();
    }
  }, [isOpen, agency?.id]);

  const fetchAgents = async () => {
    setIsLoading(true);
    setError('');
    setAgents([]);
    setSelectedAgent(null);

    try {
      const response = await api.get(`/agencies/${agency.id}/agents`);
      const agentList = response.data.agents || [];
      setAgents(agentList);

      if (agentList.length === 0) {
        setError('No agents found for this agency. You can create a new agent below.');
      }
    } catch (err) {
      console.error('Agents fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch agents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAgent = () => {
    if (selectedAgent) {
      const agentData = {
        ...agency,
        agentId: selectedAgent.id,
        agentEmail: selectedAgent.email,
        agentFirstName: selectedAgent.firstname,
        agentLastName: selectedAgent.lastname,
        agentPhone: selectedAgent.phone
      };
      onSelectAgent(agentData);
      onOpenChange(false);
    }
  };

  if (showCreateForm) {
    return (
      <CreateAgentForm
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onBack={() => setShowCreateForm(false)}
        agency={agency}
        onSuccess={(agentData) => {
          onSelectAgent(agentData);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader onClose={onBack}>
        <div>
          <DialogTitle>Select Agent</DialogTitle>
          <DialogDescription>
            Choose an agent from {agency?.name}
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
              <p className="text-slate-600">Fetching agents...</p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{error}</p>
          </div>
        )}

        {!isLoading && agents.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 font-medium">
              Found {agents.length} agents:
            </p>
            <div className="space-y-2">
              {agents.map((agent) => (
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

        {!isLoading && agents.length === 0 && !error && (
          <div className="py-8 text-center">
            <p className="text-slate-600">No agents available</p>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Back
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
  agency,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [highlightedFields, setHighlightedFields] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear highlighted error for this field when user starts typing
    if (highlightedFields[name]) {
      setHighlightedFields((prev) => ({ ...prev, [name]: false }));
    }
    // Clear error message when user starts typing
    if (error) {
      setError('');
    }
  };

  const isFormValid = () => {
    return (
      formData.firstName?.trim() &&
      formData.lastName?.trim() &&
      formData.email?.trim() &&
      formData.phone?.trim()
    );
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
      const response = await api.post(`/agencies/${agency.id}/agents/create`, {
        firstname: formData.firstName,
        lastname: formData.lastName,
        email: formData.email,
        phone: formData.phone
      });

      const agentData = {
        ...agency,
        agentId: response.data.id,
        agentEmail: response.data.email,
        agentFirstName: response.data.firstname,
        agentLastName: response.data.lastname,
        agentPhone: response.data.phone
      };

      if (onSuccess) {
        onSuccess(agentData);
      }
    } catch (err) {
      console.error('Agent creation error:', err);

      // Handle duplicate agent error (409)
      if (err.response?.status === 409 && err.response?.data?.duplicateField) {
        const duplicateField = err.response.data.duplicateField;
        setHighlightedFields({ [duplicateField]: true });
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
            Add a new agent to {agency?.name}
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
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="John"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Smith"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john.smith@agency.com"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.email
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.email && (
              <p className="text-sm text-red-600 mt-1">Please enter a unique value</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0412 345 678"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:border-blue-600 focus:ring-4 outline-none transition-all ${
                highlightedFields.phone
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:ring-blue-100'
              }`}
            />
            {highlightedFields.phone && (
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
    </Dialog>
  );
}

export default AgentSelectionModal;
