import React, { useState, useEffect } from 'react';
import { Building2, Users, Briefcase, TrendingUp, Search, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LeadDetailsModal from './LeadDetailsModal';
import './agency-dashboard.css';

export default function AgencyDashboard({ onRefresh }) {
  const { user, isAdmin, isViewAll } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Modal states
  const [isLeadDetailsModalOpen, setIsLeadDetailsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loadingDealDetails, setLoadingDealDetails] = useState(false);

  useEffect(() => {
    loadAgencyDashboard();
  }, []);

  const loadAgencyDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/agency-owner/dashboard');
      console.log('[Agency Dashboard] Data loaded:', response.data);

      setDashboardData(response.data);
    } catch (err) {
      console.error('[Agency Dashboard] Error:', err);
      setError(err.response?.data?.message || 'Failed to load agency dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLead = async (deal) => {
    try {
      setLoadingDealDetails(true);
      console.log('[Agency Dashboard] Fetching deal details for:', deal.id);

      // Fetch complete deal details from backend
      const response = await api.get(`/agency-owner/deals/${deal.id}`);
      console.log('[Agency Dashboard] Deal details loaded:', response.data);

      // Set selected lead and open modal
      setSelectedLead(response.data.deal);
      setIsLeadDetailsModalOpen(true);
    } catch (err) {
      console.error('[Agency Dashboard] Error fetching deal details:', err);

      // Show user-friendly error message
      const errorMessage = err.response?.data?.message || 'Failed to load deal details';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoadingDealDetails(false);
    }
  };

  const handleReassignDeal = async (dealId, newAgentId) => {
    if (!confirm('Are you sure you want to reassign this deal?')) {
      return;
    }

    try {
      await api.patch(`/agency-owner/deals/${dealId}/reassign`, {
        newAgentId
      });

      alert('Deal reassigned successfully!');
      loadAgencyDashboard(); // Reload data
      if (onRefresh) onRefresh(); // Also refresh parent dashboard
    } catch (err) {
      console.error('[Agency Dashboard] Reassign error:', err);
      alert(err.response?.data?.message || 'Failed to reassign deal');
    }
  };

  if (loading) {
    return <div className="dashboard-section">Loading agency dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-section error">{error}</div>;
  }

  if (!dashboardData) {
    return <div className="dashboard-section">No data available</div>;
  }

  // Filter deals by selected agent
  const filteredDeals = selectedAgent === 'all'
    ? dashboardData.deals
    : dashboardData.deals.filter(d => d.assignedAgentId === selectedAgent);

  // Search deals
  const searchedDeals = filteredDeals?.filter(deal =>
    deal.dealname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.property_address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <h1>Agency Dashboard</h1>
        <p className="text-muted">Overview of all agents and leads</p>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <Users className="metric-icon" />
          <div className="metric-content">
            <h3>{dashboardData.metrics.totalAgents}</h3>
            <p>Total Agents</p>
            <span className="metric-detail">{dashboardData.metrics.adminAgents} admins</span>
          </div>
        </div>

        <div className="metric-card">
          <Briefcase className="metric-icon" />
          <div className="metric-content">
            <h3>{dashboardData.metrics.totalDeals}</h3>
            <p>Total Leads</p>
            <span className="metric-detail">All time</span>
          </div>
        </div>

        <div className="metric-card">
          <TrendingUp className="metric-icon" />
          <div className="metric-content">
            <h3>{dashboardData.metrics.activeLeads}</h3>
            <p>Active Leads</p>
            <span className="metric-detail">In progress</span>
          </div>
        </div>

        <div className="metric-card">
          <Building2 className="metric-icon" />
          <div className="metric-content">
            <h3>{dashboardData.metrics.conversionRate}%</h3>
            <p>Conversion Rate</p>
            <span className="metric-detail">Closed won</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="agent-filter">Filter by Agent:</label>
          <select
            id="agent-filter"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Agents ({dashboardData.agents.length})</option>
            {dashboardData.agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.firstname} {agent.lastname}
                {agent.permissionLevel === 'admin' && ' (Admin)'}
                {agent.permissionLevel === 'view_all' && ' (View All)'}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="search"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Deals Table */}
      <div className="table-container">
        <table className="deals-table">
          <thead>
            <tr>
              <th>Deal Name</th>
              <th>Property Address</th>
              <th>Stage</th>
              <th>Assigned Agent</th>
              {(isAdmin() || isViewAll()) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {searchedDeals?.length === 0 ? (
              <tr>
                <td colSpan={(isAdmin() || isViewAll()) ? 5 : 4} className="text-center">
                  No deals found
                </td>
              </tr>
            ) : (
              searchedDeals?.map(deal => (
                <tr key={deal.id}>
                  <td>{deal.dealname || 'Untitled'}</td>
                  <td>{deal.property_address || 'N/A'}</td>
                  <td>
                    <span className="deal-stage">{deal.dealstage_name || 'Unknown'}</span>
                  </td>
                  <td>
                    <div className="agent-cell">
                      <span>{deal.assignedAgent?.name || 'Unassigned'}</span>
                      {deal.assignedAgent?.permissionLevel === 'admin' && (
                        <span className="badge badge-admin" title="Admin">🛡️</span>
                      )}
                    </div>
                  </td>
                  {(isAdmin() || isViewAll()) && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view-btn"
                          title="View Details"
                          onClick={() => handleViewLead(deal)}
                          disabled={loadingDealDetails}
                        >
                          <Eye size={16} />
                        </button>

                        {isAdmin() && (
                          <select
                            className="reassign-select"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleReassignDeal(deal.id, e.target.value);
                                e.target.value = ''; // Reset
                              }
                            }}
                          >
                            <option value="" disabled>Reassign to...</option>
                            {dashboardData.agents
                              .filter(a => a.id !== deal.assignedAgentId)
                              .map(agent => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.firstname} {agent.lastname}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={isLeadDetailsModalOpen}
        onClose={() => {
          setIsLeadDetailsModalOpen(false);
          setSelectedLead(null);
        }}
        deal={selectedLead}
      />
    </div>
  );
}
