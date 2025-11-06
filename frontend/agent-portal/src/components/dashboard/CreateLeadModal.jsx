import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import CreateLeadStep1 from './CreateLeadStep1';
import CreateLeadStep2 from './CreateLeadStep2';
import CreateLeadStep3 from './CreateLeadStep3';

export default function CreateLeadModal({ isOpen, onClose, onSubmit, existingLead = null }) {
  const isEditMode = !!existingLead;
  const [currentStep, setCurrentStep] = useState(1);

  // Initialize form data from existing lead or with defaults
  const getInitialFormData = () => {
    if (existingLead) {
      return {
        dealId: existingLead.id,
        propertyAddress: existingLead.property_address || '',
        numberOfOwners: existingLead.number_of_owners || '1',
        primarySeller: {
          fullName: existingLead.primarySeller
            ? `${existingLead.primarySeller.firstname || ''} ${existingLead.primarySeller.lastname || ''}`.trim()
            : '',
          email: existingLead.primarySeller?.email || '',
          mobile: existingLead.primarySeller?.phone || '',
          address: existingLead.primarySeller?.address || ''
        },
        additionalSellers: existingLead.additionalSellers || [],
        agentTitleSearch: existingLead.agent_title_search || null,
        agentTitleSearchFile: existingLead.agent_title_search_file || null,
        questionnaireData: extractQuestionnaireData(existingLead),
        sendInvitation: false // Don't auto-send when editing
      };
    }

    return {
      propertyAddress: '',
      numberOfOwners: '1',
      primarySeller: {
        fullName: '',
        email: '',
        mobile: '',
        address: ''
      },
      additionalSellers: [],
      agentTitleSearch: null,
      agentTitleSearchFile: null,
      questionnaireData: {},
      sendInvitation: true
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Extract questionnaire data from existing lead
  const extractQuestionnaireData = (lead) => {
    if (!lead) return {};

    const questionnaireFields = [
      'body_corporate', 'body_corporate_details', 'registered_encumbrances',
      'tenancy_agreement', 'formal_tenancy_agreement', 'tenancy_end_date',
      'weekly_rent', 'rental_agreement_post_settlement', 'resume_notice',
      'swimming_pool', 'owner_builder', 'contaminated_land', 'tree_disputes',
      'environmental_management', 'unauthorised_works', 'non_statutory_encumbrances'
    ];

    const data = {};
    questionnaireFields.forEach(field => {
      if (lead[field]) {
        data[field] = lead[field];
      }
    });

    return data;
  };

  // Reset form when modal opens/closes or when existingLead changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setCurrentStep(1);
      setError('');
    }
  }, [isOpen, existingLead]);

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
      case 3: return isEditMode ? 'Review & Save' : 'Review & Send';
      default: return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container create-lead-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{isEditMode ? 'Edit Lead' : 'Create New Lead'}</h2>
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
                    <span>
                      {isEditMode
                        ? 'Save Changes'
                        : (formData.sendInvitation ? 'Send to Client Portal' : 'Create Lead')
                      }
                    </span>
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

