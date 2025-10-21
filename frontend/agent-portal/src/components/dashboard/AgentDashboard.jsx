import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, FileText, Users } from 'lucide-react';
import { Button } from '../ui/Button';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load agent data from localStorage
    const agentData = localStorage.getItem('user');
    if (agentData) {
      setAgent(JSON.parse(agentData));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!agent) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting to login...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Home className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Agent Dashboard</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {agent.firstname || 'Agent'}!
          </h2>
          <p className="text-muted-foreground">
            Manage your deals and client relationships
          </p>
        </div>

        {/* Agent Info Card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="text-foreground font-medium">
                {agent.firstname} {agent.lastname || ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="text-foreground font-medium">{agent.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <p className="text-foreground font-medium">{agent.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Role</p>
              <p className="text-foreground font-medium capitalize">{agent.contact_type}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Deals Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <FileText className="w-8 h-8 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">My Deals</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage all your active deals
            </p>
            <Button variant="secondary" className="w-full">
              View Deals
            </Button>
          </div>

          {/* Clients Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <Users className="w-8 h-8 text-accent" />
              <h3 className="text-lg font-semibold text-foreground">My Clients</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your client relationships and contacts
            </p>
            <Button variant="secondary" className="w-full">
              View Clients
            </Button>
          </div>

          {/* Settings Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <Home className="w-8 h-8 text-secondary" />
              <h3 className="text-lg font-semibold text-foreground">Settings</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Update your profile and preferences
            </p>
            <Button variant="secondary" className="w-full">
              Go to Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
