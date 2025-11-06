import React from 'react';
import { Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { getPipelineStages, getStageLabel, isDraft } from '../../constants/dealStages';

export default function LeadKanban({ deals }) {
  // Get all 12 pipeline stages
  const pipelineStages = getPipelineStages();

  // Group deals by stage
  const dealsByStage = pipelineStages.map(stage => {
    let stageDeals = [];
    
    if (stage.checkDraft) {
      // This is the Draft column - show all draft deals
      stageDeals = deals.filter(d => isDraft(d));
    } else {
      // Normal stage - match by dealstage and ensure NOT draft
      stageDeals = deals.filter(d => 
        d.dealstage === stage.id && !isDraft(d)
      );
    }

    return {
      ...stage,
      deals: stageDeals
    };
  });
  
  const getDaysInStage = (deal) => {
    if (!deal.hs_lastmodifieddate) return 0;
    return differenceInDays(new Date(), new Date(deal.hs_lastmodifieddate));
  };

  // Define colors for each stage
  const stageColors = {
    'draft': '#6B7280', // Gray
    '1923713518': '#F59E0B', // Amber (Client Details Required)
    '1923713520': '#3B82F6', // Blue (Awaiting Questionnaire)
    '1923682791': '#8B5CF6', // Purple (Quote Provided)
    '1923682792': '#EC4899', // Pink (Awaiting Retainer)
    '1924069846': '#F97316', // Orange (Funds Requested)
    '1904359900': '#10B981', // Green (Funds Provided)
    '1995278821': '#14B8A6', // Teal (Awaiting Rates)
    '1904359901': '#06B6D4', // Cyan (Searches Returned)
    '1995356644': '#0EA5E9', // Sky (Form 2 Drafting)
    '1995278813': '#6366F1', // Indigo (Conveyancer Review)
    '1904359902': '#10B981'  // Green (With Client)
  };
  
  return (
    <div className="kanban-container">
      <h2 className="section-title">Deal Pipeline</h2>
      
      <div className="kanban-board kanban-scrollable">
        {dealsByStage.map((column) => (
          <div key={column.id} className="kanban-column kanban-column-narrow">
            <div 
              className="kanban-header" 
              style={{ 
                borderTopColor: stageColors[column.id] || '#6B7280',
                background: `linear-gradient(135deg, ${stageColors[column.id] || '#6B7280'}15 0%, transparent 100%)`
              }}
            >
              <h3 className="kanban-title">{column.label}</h3>
              <span className="deal-count">{column.deals.length}</span>
            </div>
            
            <div className="kanban-cards">
              {column.deals.length === 0 ? (
                <div className="empty-column">No deals</div>
              ) : (
                column.deals.map(deal => (
                  <div key={deal.id} className="kanban-card">
                    <h4 className="card-property">
                      {deal.property_address || deal.dealname || 'N/A'}
                    </h4>
                    <p className="card-client">
                      {deal.primarySeller?.firstname || 'N/A'} {deal.primarySeller?.lastname || ''}
                    </p>
                    {isDraft(deal) && (
                      <div className="draft-badge">Draft</div>
                    )}
                    <div className="card-footer">
                      <Clock size={14} />
                      <span>{getDaysInStage(deal)}d in stage</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pipeline-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#6B7280' }}></div>
          <span>Draft</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#3B82F6' }}></div>
          <span>Active</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#F59E0B' }}></div>
          <span>Pending</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#10B981' }}></div>
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}
