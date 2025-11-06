import React from 'react';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { getStageLabel, isDraft } from '../../constants/dealStages';

export default function ActiveClientsList({ deals }) {
  const activeDeals = deals
    .filter(d => !['closedwon', 'closedlost'].includes(d.dealstage?.toLowerCase()))
    .sort((a, b) => new Date(b.hs_lastmodifieddate) - new Date(a.hs_lastmodifieddate))
    .slice(0, 10);
  
  if (activeDeals.length === 0) {
    return (
      <div className="active-clients-container">
        <h2 className="section-title">Active Clients</h2>
        <div className="active-clients-empty">
          <p>No active deals yet. Create your first lead to get started!</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="active-clients-container">
      <h2 className="section-title">Active Clients</h2>
      
      <div className="table-responsive">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Property Address</th>
              <th>Stage</th>
              <th>Last Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeDeals.map(deal => (
              <tr key={deal.id}>
                <td>
                  <div className="client-name">
                    {deal.primarySeller?.firstname || 'N/A'} {deal.primarySeller?.lastname || ''}
                  </div>
                </td>
                <td>{deal.property_address || 'N/A'}</td>
                <td>
                  <span className="stage-badge">
                    {getStageLabel(deal.dealstage, isDraft(deal))}
                    {isDraft(deal) && <span className="draft-tag"> (Draft)</span>}
                  </span>
                </td>
                <td className="text-muted">
                  {deal.hs_lastmodifieddate 
                    ? format(new Date(deal.hs_lastmodifieddate), 'MMM dd, yyyy')
                    : 'N/A'
                  }
                </td>
                <td>
                  <button className="action-btn" title="View Details">
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

