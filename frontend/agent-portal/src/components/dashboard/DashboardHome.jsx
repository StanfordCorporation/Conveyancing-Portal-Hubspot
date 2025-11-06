import React from 'react';
import DashboardMetrics from './DashboardMetrics';
import PerformanceChart from './PerformanceChart';
import ActiveClientsList from './ActiveClientsList';
import LeadKanban from './LeadKanban';

export default function DashboardHome({ deals, metrics, agent }) {
  return (
    <div className="dashboard-home">
      <div className="dashboard-header">
        <h1>Welcome back, {agent.firstname}!</h1>
        <p className="text-muted">Here's what's happening with your deals today</p>
      </div>
      
      <DashboardMetrics metrics={metrics} />
      <PerformanceChart monthlyData={metrics.monthlyBreakdown} />
      <ActiveClientsList deals={deals} />
      <LeadKanban deals={deals} />
    </div>
  );
}

