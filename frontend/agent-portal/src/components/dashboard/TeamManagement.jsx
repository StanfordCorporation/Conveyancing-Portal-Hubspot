import React, { useState, useEffect } from 'react';
import { Shield, Eye, User, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './team-management.css';

export default function TeamManagement({ onRefresh }) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/agency-owner/agents');
      console.log('[Team Management] Agents loaded:', response.data);

      setAgents(response.data.agents || []);
    } catch (err) {
      console.error('[Team Management] Error:', err);
      setError(err.response?.data?.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (agentId, agentName) => {
    if (!confirm(`Promote ${agentName} to Admin? This will grant full agency management privileges.`)) {
      return;
    }

    try {
      await api.post(`/agency-owner/agents/${agentId}/promote`);
      alert(`${agentName} promoted to Admin successfully!`);
      loadAgents(); // Reload agents
      if (onRefresh) onRefresh(); // Also refresh parent dashboard
    } catch (err) {
      console.error('[Team Management] Promote error:', err);
      alert(err.response?.data?.message || 'Failed to promote agent');
    }
  };

  const handleDemote = async (agentId, agentName, newLevel) => {
    const levelName = newLevel === 'view_all' ? 'View All' : 'Standard';

    if (!confirm(`Demote ${agentName} to ${levelName}? This will change their access permissions.`)) {
      return;
    }

    try {
      await api.post(`/agency-owner/agents/${agentId}/demote`, {
        permissionLevel: newLevel
      });
      alert(`${agentName} demoted to ${levelName} successfully!`);
      loadAgents(); // Reload agents
      if (onRefresh) onRefresh(); // Also refresh parent dashboard
    } catch (err) {
      console.error('[Team Management] Demote error:', err);
      alert(err.response?.data?.message || 'Failed to demote agent');
    }
  };

  const getPermissionBadge = (permissionLevel) => {
    switch (permissionLevel) {
      case 'admin':
        return (
          <span className="permission-badge admin">
            <Shield size={14} />
            Admin
          </span>
        );
      case 'view_all':
        return (
          <span className="permission-badge view-all">
            <Eye size={14} />
            View All
          </span>
        );
      default:
        return (
          <span className="permission-badge standard">
            <User size={14} />
            Standard
          </span>
        );
    }
  };

  if (loading) {
    return <div className="dashboard-section">Loading team members...</div>;
  }

  if (error) {
    return <div className="dashboard-section error">{error}</div>;
  }

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <h1>Team Management</h1>
        <p className="text-muted">Manage agent permissions and access levels</p>
      </div>

      {/* Permissions Legend */}
      <div className="permissions-legend">
        <h3>Permission Levels</h3>
        <div className="legend-grid">
          <div className="legend-item">
            <Shield className="legend-icon admin" />
            <div className="legend-content">
              <h4>Admin</h4>
              <p>Full agency management: view all deals, reassign, manage team permissions</p>
            </div>
          </div>
          <div className="legend-item">
            <Eye className="legend-icon view-all" />
            <div className="legend-content">
              <h4>View All</h4>
              <p>View all agency deals and metrics, but cannot manage team or reassign</p>
            </div>
          </div>
          <div className="legend-item">
            <User className="legend-icon standard" />
            <div className="legend-content">
              <h4>Standard</h4>
              <p>View and manage only their own assigned deals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="table-container">
        <table className="agents-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Permission Level</th>
              {isAdmin() && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={isAdmin() ? 5 : 4} className="text-center">
                  No agents found
                </td>
              </tr>
            ) : (
              agents.map(agent => (
                <tr key={agent.id}>
                  <td>
                    <div className="agent-name">
                      {agent.firstname} {agent.lastname}
                      {agent.id === user?.id && (
                        <span className="badge badge-self" title="You">👤</span>
                      )}
                    </div>
                  </td>
                  <td>{agent.email || 'N/A'}</td>
                  <td>{agent.phone || 'N/A'}</td>
                  <td>{getPermissionBadge(agent.permissionLevel)}</td>
                  {isAdmin() && (
                    <td>
                      <div className="action-buttons">
                        {agent.id === user?.id ? (
                          <span className="text-muted">Cannot modify self</span>
                        ) : agent.permissionLevel === 'admin' ? (
                          // Demote dropdown for admins
                          <select
                            className="demote-select"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleDemote(
                                  agent.id,
                                  `${agent.firstname} ${agent.lastname}`,
                                  e.target.value
                                );
                                e.target.value = ''; // Reset
                              }
                            }}
                          >
                            <option value="" disabled>Demote to...</option>
                            <option value="view_all">View All</option>
                            <option value="standard">Standard</option>
                          </select>
                        ) : (
                          // Promote button for non-admins
                          <div className="action-group">
                            <button
                              className="btn-promote"
                              onClick={() => handlePromote(agent.id, `${agent.firstname} ${agent.lastname}`)}
                            >
                              <Shield size={14} />
                              Promote to Admin
                            </button>
                            {agent.permissionLevel === 'view_all' && (
                              <button
                                className="btn-demote-secondary"
                                onClick={() => handleDemote(
                                  agent.id,
                                  `${agent.firstname} ${agent.lastname}`,
                                  'standard'
                                )}
                                title="Demote to Standard"
                              >
                                Demote to Standard
                              </button>
                            )}
                            {agent.permissionLevel === 'standard' && (
                              <button
                                className="btn-promote-secondary"
                                onClick={() => handleDemote(
                                  agent.id,
                                  `${agent.firstname} ${agent.lastname}`,
                                  'view_all'
                                )}
                                title="Promote to View All"
                              >
                                Promote to View All
                              </button>
                            )}
                          </div>
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

      {/* Warning for last admin */}
      {agents.filter(a => a.permissionLevel === 'admin').length === 1 && (
        <div className="warning-message">
          <AlertCircle size={16} />
          <span>Warning: This agency has only one admin. Ensure at least one admin remains.</span>
        </div>
      )}
    </div>
  );
}
