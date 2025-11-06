import React from 'react';
import PropertyQuestionnaireAgent from './PropertyQuestionnaireAgent';

export default function CreateLeadStep2({ formData, updateFormData }) {
  const handleQuestionnaireUpdate = (dealId, questionnaireData) => {
    // Save questionnaire data to parent form state
    updateFormData({
      questionnaireData
    });
  };

  const clientName = formData.primarySeller.fullName || 'the client';

  return (
    <div className="step-content questionnaire-step">
      <PropertyQuestionnaireAgent
        dealId={null} // No dealId yet (creating new lead)
        clientName={clientName}
        isAgentContext={true}
        initialData={formData.questionnaireData || {}}
        initialFiles={{}} // No files in create mode
        onDataUpdate={handleQuestionnaireUpdate}
        onSubmitSuccess={null} // Wizard handles submission
      />
    </div>
  );
}
