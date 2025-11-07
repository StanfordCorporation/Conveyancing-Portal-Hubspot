import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentHeader from './AgentHeader';
import AgentSidebar from './AgentSidebar';
import DashboardHome from './DashboardHome';
import LeadsManagement from './LeadsManagement';
import DocumentsTasks from './DocumentsTasks';
import AgentSettings from './AgentSettings';
import AgencyDashboard from './AgencyDashboard';
import TeamManagement from './TeamManagement';
import CreateLeadModal from './CreateLeadModal';
import LeadDetailsModal from './LeadDetailsModal';
import { SkeletonDashboard } from './SkeletonLoaders';
import { agentApi } from '../../services/api';
import './agent-dashboard.css';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const [isLeadDetailsModalOpen, setIsLeadDetailsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('[Dashboard] Loading dashboard data...');
      
      const response = await agentApi.getDashboardComplete();
      console.log('[Dashboard] Dashboard loaded successfully:', response.data);
      
      setDashboardData(response.data);
    } catch (err) {
      console.error('[Dashboard] Error loading dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/agent/login');
  };

  const handleCreateLead = async (formData) => {
    try {
      const isEditMode = !!formData.dealId;
      console.log(`[Dashboard] ${isEditMode ? 'Updating' : 'Creating'} lead:`, formData);

      // Handle file upload if title search file exists
      let titleSearchFileId = null;
      if (formData.agentTitleSearchFile && typeof formData.agentTitleSearchFile !== 'string') {
        try {
          console.log('[Dashboard] Uploading title search file...');
          const uploadResponse = await agentApi.uploadTitleSearchFile(formData.agentTitleSearchFile);
          titleSearchFileId = uploadResponse.data.fileId;
          console.log('[Dashboard] Title search file uploaded:', titleSearchFileId);
        } catch (uploadErr) {
          console.error('[Dashboard] Error uploading title search file:', uploadErr);
          // Continue without file - user can upload later
        }
      }

      if (isEditMode) {
        // Update existing lead
        const updates = {
          property_address: formData.propertyAddress,
          number_of_owners: formData.numberOfOwners,
          agent_title_search: formData.agentTitleSearch,
          ...(titleSearchFileId && { agent_title_search_file: titleSearchFileId }),
          // Include questionnaire data
          ...formData.questionnaireData
        };

        await agentApi.updateLead(formData.dealId, updates);
        console.log('[Dashboard] Lead updated successfully');

        // If sendInvitation is checked, send invitation
        if (formData.sendInvitation) {
          await agentApi.sendClientInvitation(formData.dealId);
          console.log('[Dashboard] Client invitation sent');
        }

        setIsCreateLeadModalOpen(false);
        setLeadToEdit(null);
      } else {
        // Create new lead
        const apiData = {
          client: {
            fullName: formData.primarySeller.fullName,
            email: formData.primarySeller.email,
            mobile: formData.primarySeller.mobile,
            address: formData.primarySeller.address
          },
          additionalSellers: formData.additionalSellers,
          property: {
            address: formData.propertyAddress,
            number_of_owners: formData.numberOfOwners
          },
          questionnaireData: formData.questionnaireData,
          sendInvitation: formData.sendInvitation,
          isDraft: formData.isDraft,
          agentTitleSearch: formData.agentTitleSearch,
          agentTitleSearchFile: titleSearchFileId
        };

        const response = await agentApi.createLead(apiData);
        console.log('[Dashboard] Lead created successfully:', response.data);

        setIsCreateLeadModalOpen(false);
      }

      // Refresh dashboard data
      await loadDashboard();
    } catch (err) {
      console.error('[Dashboard] Error saving lead:', err);
      throw err;
    }
  };

  const handleEditLead = (deal) => {
    setLeadToEdit(deal);
    setIsCreateLeadModalOpen(true);
  };

  const handleViewLead = (deal) => {
    setSelectedLead(deal);
    setIsLeadDetailsModalOpen(true);
  };

  const handleUploadDocument = async (dealId, documentType, file) => {
    try {
      console.log('[Dashboard] Uploading document:', documentType, 'for deal:', dealId);
      
      await agentApi.uploadDocument(dealId, documentType, file);
      console.log('[Dashboard] Document uploaded successfully');
      
      // Refresh dashboard to show updated documents
      await loadDashboard();
    } catch (err) {
      console.error('[Dashboard] Error uploading document:', err);
      throw err;
    }
  };

  const handleSaveProfile = async (profileData) => {
    try {
      console.log('[Dashboard] Saving profile:', profileData);
      
      const response = await agentApi.updateAgentProfile(profileData);
      console.log('[Dashboard] Profile saved successfully');
      
      // Update local agent data
      setDashboardData({
        ...dashboardData,
        agent: {
          ...dashboardData.agent,
          ...response.data.agent
        }
      });
      
      // Update localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({
        ...user,
        ...profileData
      }));
    } catch (err) {
      console.error('[Dashboard] Error saving profile:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="header" style={{ gridColumn: '1 / -1' }}>
          <div className="header-left">
            <div className="logo">
              <img src="/logo.webp" alt="Stanford Corporation" style={{ height: '48px' }} />
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-content">
            <div className="skeleton-box" style={{ width: '100%', height: '100px', marginBottom: '24px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '8px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '8px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '8px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '40px' }} />
          </div>
        </div>

        <main className="main-content">
          <SkeletonDashboard />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">⚠️</div>
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={loadDashboard} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-error">
        <p>No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <AgentHeader
        agent={dashboardData.agent}
        onLogout={handleLogout}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      <AgentSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="main-content">
        {activeSection === 'dashboard' && (
          <DashboardHome
            deals={dashboardData.deals}
            metrics={dashboardData.metrics}
            agent={dashboardData.agent}
          />
        )}

        {activeSection === 'agency' && (
          <AgencyDashboard
            onRefresh={loadDashboard}
          />
        )}

        {activeSection === 'team' && (
          <TeamManagement
            onRefresh={loadDashboard}
          />
        )}

        {activeSection === 'leads' && (
          <LeadsManagement
            deals={dashboardData.deals}
            onCreateLead={() => {
              setLeadToEdit(null);
              setIsCreateLeadModalOpen(true);
            }}
            onRefresh={loadDashboard}
            onViewLead={handleViewLead}
            onEditLead={handleEditLead}
          />
        )}

        {activeSection === 'documents' && (
          <DocumentsTasks
            deals={dashboardData.deals}
            onUploadDocument={handleUploadDocument}
          />
        )}

        {activeSection === 'settings' && (
          <AgentSettings
            agent={dashboardData.agent}
            onSave={handleSaveProfile}
          />
        )}
      </main>

      {/* Modals */}
      <CreateLeadModal
        isOpen={isCreateLeadModalOpen}
        onClose={() => {
          setIsCreateLeadModalOpen(false);
          setLeadToEdit(null);
        }}
        onSubmit={handleCreateLead}
        existingLead={leadToEdit}
      />

      <LeadDetailsModal
        isOpen={isLeadDetailsModalOpen}
        onClose={() => setIsLeadDetailsModalOpen(false)}
        deal={selectedLead}
      />
    </div>
  );
}
