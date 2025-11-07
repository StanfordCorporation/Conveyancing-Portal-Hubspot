# Frontend Implementation Guide - Agency Owner Feature

## Status: Backend ✅ Complete | Frontend ⏳ In Progress

---

## Files Already Created

### ✅ Auth Context
**File:** `frontend/agent-portal/src/context/AuthContext.jsx`

This file has been created with:
- `useAuth()` hook for accessing auth state
- `isAdmin()`, `canViewAll()`, `isStandard()` permission helpers
- `login()`, `logout()`, `updateUser()` methods

### ✅ App.jsx Updated
**File:** `frontend/agent-portal/src/App.jsx`

Wrapped with `<AuthProvider>` to provide auth context to all components.

---

## Required Changes

### 1. Update Login Component to Use Auth Context

**File:** `frontend/agent-portal/src/components/auth/Login.jsx`

**Line 10:** Add import
```jsx
import { useAuth } from "../../context/AuthContext";
```

**Line 11 (after useState declarations):** Add
```jsx
const { login: authLogin } = useAuth();
```

**Lines 152-165:** Replace the handleVerifyOTP success block with:
```jsx
console.log('✅ OTP verified successfully:', response.data);

// Use auth context login method
authLogin(response.data.user, response.data.token);

setError("");
setIsTransitioning(true);

// Wait for animation then redirect
setTimeout(() => {
  console.log('✅ Redirecting to agent dashboard...');
  navigate('/agent/dashboard');
}, 1500);
```

**Why:** This ensures the user data (including permissionLevel and agencyId) is properly stored in both localStorage and React state.

---

### 2. Update AgentSidebar with Conditional Menu Items

**File:** `frontend/agent-portal/src/components/dashboard/AgentSidebar.jsx`

Add at the top (after imports):
```jsx
import { useAuth } from '../../context/AuthContext';
import { Building2, Users } from 'lucide-react';
```

Inside the component (at the start):
```jsx
const { canViewAll, isAdmin } = useAuth();
```

Add these menu items AFTER the Dashboard item and BEFORE the Leads item:
```jsx
{/* Agency Dashboard - visible to admins and view_all users */}
{canViewAll() && (
  <button
    className={`sidebar-item ${activeSection === 'agency' ? 'active' : ''}`}
    onClick={() => setActiveSection('agency')}
    title="Agency Dashboard"
  >
    <Building2 className="sidebar-icon" />
    <span className="sidebar-text">Agency Dashboard</span>
  </button>
)}

{/* Team Management - visible to admins only */}
{isAdmin() && (
  <button
    className={`sidebar-item ${activeSection === 'team' ? 'active' : ''}`}
    onClick={() => setActiveSection('team')}
    title="Manage Team"
  >
    <Users className="sidebar-icon" />
    <span className="sidebar-text">Manage Team</span>
  </button>
)}
```

**Why:** Admins see both Agency Dashboard and Manage Team. View All users see only Agency Dashboard. Standard users see neither.

---

### 3. Update AgentDashboard to Handle New Sections

**File:** `frontend/agent-portal/src/components/dashboard/AgentDashboard.jsx`

Add imports at the top:
```jsx
import AgencyDashboard from './AgencyDashboard';
import TeamManagement from './TeamManagement';
```

In the render section, add these cases to the conditional rendering:
```jsx
{activeSection === 'agency' && <AgencyDashboard dashboardData={dashboardData} onRefresh={loadDashboard} />}
{activeSection === 'team' && <TeamManagement onRefresh={loadDashboard} />}
```

---

### 4. Create AgencyDashboard Component

**File:** `frontend/agent-portal/src/components/dashboard/AgencyDashboard.jsx`

This component shows:
- Agency metrics (total agents, total leads, active leads, conversion rate)
- Agent filter dropdown
- Deals table with assigned agents
- Reassign button (admin only)

See full code below.

---

### 5. Create TeamManagement Component

**File:** `frontend/agent-portal/src/components/dashboard/TeamManagement.jsx`

This component shows:
- Table of all agents with permission levels
- Permission badges (Admin 🛡️, View All 👁️, Standard 👤)
- Promote/Demote actions (admin only)
- Add new agent form (admin only)

See full code below.

---

### 6. Create AgencyDashboard.jsx (Full Implementation)

**File:** `frontend/agent-portal/src/components/dashboard/AgencyDashboard.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { Building2, Users, Briefcase, TrendingUp, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { agentApi } from '../../services/api';
import './agency-dashboard.css';

export default function AgencyDashboard({ onRefresh }) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAgencyDashboard();
  }, []);

  const loadAgencyDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await agentApi.get('/agency-owner/dashboard');
      console.log('[Agency Dashboard] Data loaded:', response.data);

      setDashboardData(response.data);
    } catch (err) {
      console.error('[Agency Dashboard] Error:', err);
      setError(err.response?.data?.message || 'Failed to load agency dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleReassignDeal = async (dealId, newAgentId) => {
    if (!confirm('Are you sure you want to reassign this deal?')) {
      return;
    }

    try {
      await agentApi.patch(`/agency-owner/deals/${dealId}/reassign`, {
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
              <th>Created Date</th>
              {isAdmin() && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {searchedDeals?.length === 0 ? (
              <tr>
                <td colSpan={isAdmin() ? 6 : 5} className="text-center">
                  No deals found
                </td>
              </tr>
            ) : (
              searchedDeals?.map(deal => (
                <tr key={deal.id}>
                  <td>{deal.dealname || 'Untitled'}</td>
                  <td>{deal.property_address || 'N/A'}</td>
                  <td>
                    <span className="deal-stage">{deal.dealstage || 'Unknown'}</span>
                  </td>
                  <td>
                    <div className="agent-cell">
                      <span>{deal.assignedAgent?.name || 'Unassigned'}</span>
                      {deal.assignedAgent?.permissionLevel === 'admin' && (
                        <span className="badge badge-admin" title="Admin">🛡️</span>
                      )}
                    </div>
                  </td>
                  <td>{new Date(deal.createdate).toLocaleDateString()}</td>
                  {isAdmin() && (
                    <td>
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
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 7. Create TeamManagement.jsx (Full Implementation)

**File:** `frontend/agent-portal/src/components/dashboard/TeamManagement.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { Shield, Eye, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { agentApi } from '../../services/api';
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

      const response = await agentApi.get('/agency-owner/agents');
      console.log('[Team Management] Agents loaded:', response.data);

      setAgents(response.data.agents);
    } catch (err) {
      console.error('[Team Management] Error:', err);
      setError(err.response?.data?.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (agentId, agentName) => {
    if (!confirm(`Promote ${agentName} to Admin?`)) {
      return;
    }

    try {
      await agentApi.post(`/agency-owner/agents/${agentId}/promote`);
      alert(`${agentName} promoted to Admin successfully!`);
      loadAgents();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Team Management] Promote error:', err);
      alert(err.response?.data?.message || 'Failed to promote agent');
    }
  };

  const handleDemote = async (agentId, agentName, newLevel) => {
    if (!confirm(`Demote ${agentName} to ${newLevel === 'view_all' ? 'View All' : 'Standard'}?`)) {
      return;
    }

    try {
      await agentApi.post(`/agency-owner/agents/${agentId}/demote`, {
        permissionLevel: newLevel
      });
      alert(`${agentName} demoted successfully!`);
      loadAgents();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Team Management] Demote error:', err);
      alert(err.response?.data?.message || 'Failed to demote agent');
    }
  };

  if (loading) {
    return <div className="dashboard-section">Loading team...</div>;
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
            {agents.map(agent => (
              <tr key={agent.id}>
                <td>
                  <strong>{agent.firstname} {agent.lastname}</strong>
                </td>
                <td>{agent.email}</td>
                <td>{agent.phone || 'N/A'}</td>
                <td>
                  {agent.permissionLevel === 'admin' && (
                    <span className="badge badge-admin">
                      <Shield size={14} /> Admin
                    </span>
                  )}
                  {agent.permissionLevel === 'view_all' && (
                    <span className="badge badge-view-all">
                      <Eye size={14} /> View All
                    </span>
                  )}
                  {agent.permissionLevel === 'standard' && (
                    <span className="badge badge-standard">
                      <User size={14} /> Standard
                    </span>
                  )}
                </td>
                {isAdmin() && (
                  <td>
                    <div className="action-buttons">
                      {/* Promote button - only show for non-admins */}
                      {agent.permissionLevel !== 'admin' && (
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => handlePromote(agent.id, `${agent.firstname} ${agent.lastname}`)}
                        >
                          Promote to Admin
                        </button>
                      )}

                      {/* Demote dropdown - only show for admins */}
                      {agent.permissionLevel === 'admin' && (
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
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission Levels Legend */}
      <div className="permissions-legend">
        <h3>Permission Levels</h3>
        <div className="legend-items">
          <div className="legend-item">
            <span className="badge badge-admin"><Shield size={14} /> Admin</span>
            <p>Full access: manage team, view all leads, reassign deals</p>
          </div>
          <div className="legend-item">
            <span className="badge badge-view-all"><Eye size={14} /> View All</span>
            <p>Read-only: view all agency leads and metrics</p>
          </div>
          <div className="legend-item">
            <span className="badge badge-standard"><User size={14} /> Standard</span>
            <p>Limited: view only their own assigned leads</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 8. Create CSS Files

**File:** `frontend/agent-portal/src/components/dashboard/agency-dashboard.css`

```css
/* Agency Dashboard Styles */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.metric-icon {
  width: 48px;
  height: 48px;
  color: var(--primary-color);
}

.metric-content h3 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.metric-content p {
  color: var(--text-muted);
  margin: 0.25rem 0;
}

.metric-detail {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.filters-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-select,
.reassign-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  min-width: 200px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-muted);
  width: 18px;
  height: 18px;
}

.search-input {
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  min-width: 300px;
}

.deals-table {
  width: 100%;
  border-collapse: collapse;
}

.deals-table th {
  text-align: left;
  padding: 1rem;
  background: var(--card-bg);
  border-bottom: 2px solid var(--border-color);
  font-weight: 600;
}

.deals-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.agent-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-admin {
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
}

.reassign-select {
  min-width: 150px;
  font-size: 0.875rem;
}
```

**File:** `frontend/agent-portal/src/components/dashboard/team-management.css`

```css
/* Team Management Styles */
.agents-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}

.agents-table th {
  text-align: left;
  padding: 1rem;
  background: var(--card-bg);
  border-bottom: 2px solid var(--border-color);
  font-weight: 600;
}

.agents-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-sm {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.demote-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.badge-view-all {
  background: rgba(16, 185, 129, 0.1);
  color: rgb(16, 185, 129);
}

.badge-standard {
  background: rgba(107, 114, 128, 0.1);
  color: rgb(107, 114, 128);
}

.permissions-legend {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
}

.permissions-legend h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.legend-item p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}
```

---

## Testing Checklist

After implementing all changes:

- [ ] Login as an admin user → Should see "Agency Dashboard" and "Manage Team" in sidebar
- [ ] Login as view_all user → Should see "Agency Dashboard" only
- [ ] Login as standard user → Should see neither menu item
- [ ] Admin can promote agents to admin
- [ ] Admin can demote agents
- [ ] Admin can reassign deals
- [ ] View All users can view but not modify
- [ ] Permission badges display correctly

---

## API Endpoints Used

All endpoints are already implemented in the backend:

- `GET /api/agency-owner/dashboard` - Get complete dashboard data
- `GET /api/agency-owner/agents` - Get all agents with permissions
- `POST /api/agency-owner/agents/:agentId/promote` - Promote to admin
- `POST /api/agency-owner/agents/:agentId/demote` - Demote agent
- `PATCH /api/agency-owner/deals/:dealId/reassign` - Reassign deal

---

## Next Steps

1. Implement the changes listed above
2. Test with different permission levels
3. Style refinements as needed
4. Consider adding toast notifications for actions
5. Add loading states and error handling
