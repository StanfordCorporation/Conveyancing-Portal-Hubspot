import React, { useState } from 'react';
import { Search, Filter, Plus, Eye, Edit2, Archive, Send } from 'lucide-react';
import { format } from 'date-fns';
import { getStageLabel, getAgentNextStep, getStageColor, isDraft } from '../../constants/dealStages';
import { agentApi } from '../../services/api';

export default function LeadsManagement({ deals, onCreateLead, onRefresh, onViewLead }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sendingInvitation, setSendingInvitation] = useState(null); // Track which deal is sending invitation

  // Filter deals based on search and filters
  const filteredDeals = deals.filter(deal => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      deal.property_address?.toLowerCase().includes(searchLower) ||
      deal.primarySeller?.firstname?.toLowerCase().includes(searchLower) ||
      deal.primarySeller?.lastname?.toLowerCase().includes(searchLower) ||
      deal.primarySeller?.email?.toLowerCase().includes(searchLower);

    // Stage filter
    const matchesStage = stageFilter === 'all' || 
      (stageFilter === 'draft' && deal.dealstage === 'draft') ||
      (stageFilter === 'active' && !['draft', 'closedwon', 'closedlost'].includes(deal.dealstage?.toLowerCase())) ||
      (stageFilter === 'completed' && deal.dealstage?.toLowerCase() === 'closedwon') ||
      (stageFilter === 'closed' && ['closedwon', 'closedlost'].includes(deal.dealstage?.toLowerCase()));

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all' && deal.createdate) {
      const dealDate = new Date(deal.createdate);
      const now = new Date();
      const daysDiff = Math.floor((now - dealDate) / (1000 * 60 * 60 * 24));
      
      matchesDate = 
        (dateFilter === '7' && daysDiff <= 7) ||
        (dateFilter === '30' && daysDiff <= 30) ||
        (dateFilter === '90' && daysDiff <= 90);
    }

    return matchesSearch && matchesStage && matchesDate;
  });

  // Helper functions now imported from constants

  const handleSendToClient = async (dealId) => {
    if (!window.confirm('Send client portal invitation? This will activate the lead and send an email to the client.')) {
      return;
    }

    try {
      setSendingInvitation(dealId);
      await agentApi.sendClientInvitation(dealId);

      // Refresh deals to show updated status
      await onRefresh();

      alert('Client portal invitation sent successfully!');
    } catch (error) {
      console.error('[LeadsManagement] Error sending invitation:', error);
      alert(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSendingInvitation(null);
    }
  };

  const handleArchive = async (dealId, propertyAddress) => {
    if (!window.confirm(`Archive lead for ${propertyAddress}? This will mark the deal as closed/lost.`)) {
      return;
    }

    try {
      await agentApi.updateLead(dealId, { dealstage: 'closedlost' });

      // Refresh deals
      await onRefresh();

      alert('Lead archived successfully');
    } catch (error) {
      console.error('[LeadsManagement] Error archiving lead:', error);
      alert(error.response?.data?.message || 'Failed to archive lead');
    }
  };

  return (
    <div className="leads-management">
      {/* Header */}
      <div className="leads-header">
        <div>
          <h1 className="leads-title">Leads Management</h1>
          <p className="leads-subtitle">
            Manage all your deals and create new leads
          </p>
        </div>
        <button className="btn-create-lead" onClick={onCreateLead}>
          <Plus size={20} />
          <span>Create New Lead</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="leads-filters">
        {/* Search */}
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by property, client name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Stage Filter */}
        <div className="filter-group">
          <Filter size={16} />
          <select 
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stages</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="filter-group">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>

        {/* Results Count */}
        <div className="results-count">
          {filteredDeals.length} {filteredDeals.length === 1 ? 'lead' : 'leads'}
        </div>
      </div>

      {/* Leads Table */}
      <div className="leads-table-container">
        {filteredDeals.length === 0 ? (
          <div className="no-results">
            <p>No leads found matching your criteria.</p>
            {searchQuery || stageFilter !== 'all' || dateFilter !== 'all' ? (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setSearchQuery('');
                  setStageFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear Filters
              </button>
            ) : (
              <button className="btn-create-lead" onClick={onCreateLead}>
                <Plus size={20} />
                <span>Create Your First Lead</span>
              </button>
            )}
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Property Address</th>
                <th>Client</th>
                <th>Current Stage</th>
                <th>Next Step</th>
                <th>Created</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map(deal => (
                <tr key={deal.id} className="lead-row">
                  <td>
                    <div className="property-cell">
                      {deal.property_address || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className="client-cell">
                      <div className="client-name">
                        {deal.primarySeller?.firstname || 'N/A'} {deal.primarySeller?.lastname || ''}
                      </div>
                      <div className="client-email">
                        {deal.primarySeller?.email || ''}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`stage-badge ${getStageColor(deal.dealstage, isDraft(deal))}`}>
                      {getStageLabel(deal.dealstage, isDraft(deal))}
                    </span>
                    {isDraft(deal) && (
                      <span className="draft-indicator">🔸</span>
                    )}
                  </td>
                  <td>
                    <span className="next-step-text">
                      {getAgentNextStep(deal.dealstage, isDraft(deal)) || '-'}
                    </span>
                  </td>
                  <td>
                    <span className="date-text">
                      {deal.createdate 
                        ? format(new Date(deal.createdate), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </span>
                  </td>
                  <td>
                    <span className="date-text">
                      {deal.hs_lastmodifieddate 
                        ? format(new Date(deal.hs_lastmodifieddate), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn"
                        title="View Details"
                        onClick={() => onViewLead(deal)}
                      >
                        <Eye size={16} />
                      </button>

                      {isDraft(deal) ? (
                        <button
                          className="action-btn action-btn-primary"
                          title="Send to Client Portal"
                          onClick={() => handleSendToClient(deal.id)}
                          disabled={sendingInvitation === deal.id}
                        >
                          {sendingInvitation === deal.id ? (
                            <div className="spinner-tiny" />
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                      ) : (
                        <button
                          className="action-btn"
                          title="Edit"
                          onClick={() => alert('Edit functionality coming soon!')}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      <button
                        className="action-btn action-btn-danger"
                        title="Archive"
                        onClick={() => handleArchive(deal.id, deal.property_address)}
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

