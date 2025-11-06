import React from 'react';
import { FileText, TrendingUp, CheckCircle, Target } from 'lucide-react';

export default function DashboardMetrics({ metrics }) {
  const cards = [
    {
      label: 'Total Leads',
      value: metrics.totalLeads,
      icon: FileText,
      bgColor: '#E8F1FF', // var(--primary-blue-light)
      iconColor: '#0E6DFF' // var(--primary-blue)
    },
    {
      label: 'Active Leads',
      value: metrics.activeLeads,
      icon: TrendingUp,
      bgColor: '#D1FAE5', // var(--success-light)
      iconColor: '#10B981' // var(--success)
    },
    {
      label: 'Completed This Month',
      value: metrics.completedThisMonth,
      icon: CheckCircle,
      bgColor: '#F3E8FF',
      iconColor: '#9333EA'
    },
    {
      label: 'Conversion Rate',
      value: `${metrics.conversionRate}%`,
      icon: Target,
      bgColor: '#FEF3C7', // var(--warning-light)
      iconColor: '#F59E0B' // var(--warning)
    }
  ];
  
  return (
    <div className="metrics-grid">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="metric-card" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="metric-icon" style={{ background: card.bgColor }}>
              <Icon size={24} style={{ color: card.iconColor }} />
            </div>
            <div className="metric-content">
              <p className="metric-label">{card.label}</p>
              <h2 className="metric-value">{card.value}</h2>
            </div>
          </div>
        );
      })}
    </div>
  );
}

