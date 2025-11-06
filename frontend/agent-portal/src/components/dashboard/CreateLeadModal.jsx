import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import CreateLeadStep1 from './CreateLeadStep1';
import CreateLeadStep2 from './CreateLeadStep2';
import CreateLeadStep3 from './CreateLeadStep3';

export default function CreateLeadModal({ isOpen, onClose, onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Client Information
    propertyAddress: '',
    numberOfOwners: '1',
    primarySeller: {
      fullName: '',
      email: '',
      mobile: '',
      address: ''
    },
    additionalSellers: [],
    
    // Title Search
    agentTitleSearch: null, // 'Yes' or 'No'
    agentTitleSearchFile: null,
    
    // Step 2: Property Questionnaire
    questionnaireData: {},
    
    // Step 3: Review & Send
    sendInvitation: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.propertyAddress) {
        setError('Property address is required');
        return;
      }
      if (!formData.primarySeller.fullName || !formData.primarySeller.email) {
        setError('Primary seller name and email are required');
        return;
      }
    }
    
    setError('');
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleSaveAsDraft = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      await onSubmit({ ...formData, isDraft: true });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      await onSubmit({ ...formData, isDraft: false });
      onClose();
      // Reset form
      setCurrentStep(1);
      setFormData({
        propertyAddress: '',
        numberOfOwners: '1',
        primarySeller: { fullName: '', email: '', mobile: '', address: '' },
        additionalSellers: [],
        agentTitleSearch: null,
        agentTitleSearchFile: null,
        questionnaireData: {},
        sendInvitation: true
      });
    } catch (err) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (updates) => {
    setFormData({ ...formData, ...updates });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Client Information';
      case 2: return 'Property Questionnaire';
      case 3: return 'Review & Send';
      default: return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container create-lead-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Create New Lead</h2>
            <p className="modal-subtitle">Step {currentStep} of 3: {getStepTitle()}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="modal-error">
            <span>{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="modal-body">
          {currentStep === 1 && (
            <CreateLeadStep1 
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 2 && (
            <CreateLeadStep2 
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 3 && (
            <CreateLeadStep3 
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <div className="footer-left">
            <button 
              className="btn-secondary"
              onClick={handleSaveAsDraft}
              disabled={isSaving}
            >
              <Save size={18} />
              <span>Save as Draft</span>
            </button>
          </div>
          
          <div className="footer-right">
            {currentStep > 1 && (
              <button 
                className="btn-secondary"
                onClick={handleBack}
                disabled={isSaving}
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            )}
            
            {currentStep < 3 ? (
              <button 
                className="btn-primary"
                onClick={handleNext}
                disabled={isSaving}
              >
                <span>Next</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                className="btn-primary"
                onClick={handleFinalSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="spinner-small" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>{formData.sendInvitation ? 'Send to Client Portal' : 'Create Lead'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

