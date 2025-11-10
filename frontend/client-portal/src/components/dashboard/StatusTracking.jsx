import React from 'react';
import { CheckCircle, Clock, FileText, Home } from 'lucide-react';
import { getStageName, getClientNextStep, POST_WORKFLOW_STAGES } from '../../constants/dealStages';
import './status-tracking.css';

export default function StatusTracking({ deal }) {
  const stageName = getStageName(deal.status);
  const nextStep = getClientNextStep(deal.status);
  const currentStageIndex = POST_WORKFLOW_STAGES.indexOf(deal.status);

  // Timeline stages for visual display
  const timelineStages = [
    { id: '1904359900', label: 'Funds Provided', icon: CheckCircle },
    { id: '1995278804', label: 'Searches Started', icon: FileText },
    { id: '1995278821', label: 'Awaiting Rates & Water', icon: Clock },
    { id: '1904359901', label: 'Searches Returned', icon: FileText },
    { id: '1995356644', label: 'Form 2 Drafting', icon: FileText },
    { id: '1995278813', label: 'Conveyancer Review', icon: FileText },
    { id: '1904359902', label: 'Form 2 With Client', icon: Home }
  ];

  return (
    <div className="status-tracking-container">
      <div className="status-tracking-header">
        <h2 className="status-title">Your Conveyancing Progress</h2>
        <p className="status-subtitle">
          We're working hard to complete your property transaction
        </p>
      </div>

      {/* Current Status Card */}
      <div className="status-current-card">
        <div className="status-icon-wrapper">
          <CheckCircle className="status-icon" size={48} />
        </div>
        <div className="status-content">
          <h3 className="status-label">Current Stage</h3>
          <p className="status-stage-name">{stageName}</p>
        </div>
      </div>

      {/* Next Step Card */}
      <div className="status-next-step-card">
        <div className="next-step-header">
          <Clock size={24} />
          <h4>What's Next?</h4>
        </div>
        <p className="next-step-text">{nextStep}</p>
      </div>

      {/* Progress Timeline */}
      <div className="status-timeline">
        <h4 className="timeline-title">Journey Progress</h4>
        <div className="timeline-steps">
          {timelineStages.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = POST_WORKFLOW_STAGES[index] === deal.status;
            const Icon = stage.icon;

            return (
              <div 
                key={stage.id} 
                className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="timeline-step-marker">
                  <div className="timeline-marker-inner">
                    {isCompleted ? (
                      <CheckCircle size={20} />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  {index < timelineStages.length - 1 && (
                    <div className={`timeline-connector ${isCompleted ? 'completed' : ''}`} />
                  )}
                </div>
                <div className="timeline-step-content">
                  <p className="timeline-step-label">{stage.label}</p>
                  {isCurrent && (
                    <span className="timeline-step-badge">In Progress</span>
                  )}
                  {isCompleted && (
                    <span className="timeline-step-badge completed">Completed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Message */}
      <div className="status-info-message">
        <div className="info-message-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
        </div>
        <div className="info-message-content">
          <h5>We're on it!</h5>
          <p>
            Our conveyancing team is working on your property transaction. 
            We'll notify you via email when the next action is required from you.
            If you have any questions, feel free to contact us.
          </p>
        </div>
      </div>

      {/* Property Details Card */}
      <div className="status-property-card">
        <h4>Property Details</h4>
        <div className="property-details-grid">
          <div className="property-detail-item">
            <span className="detail-label">Property Address</span>
            <span className="detail-value">{deal.title || 'N/A'}</span>
          </div>
          {deal.subtitle && (
            <div className="property-detail-item">
              <span className="detail-label">Location</span>
              <span className="detail-value">{deal.subtitle}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact Support */}
      <div className="status-contact-card">
        <h4>Need Assistance?</h4>
        <p>Contact our support team for any questions about your conveyancing.</p>
        <button 
          className="contact-button"
          onClick={() => window.open('https://stanfordlegal.com.au/contact/', '_blank')}
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}




