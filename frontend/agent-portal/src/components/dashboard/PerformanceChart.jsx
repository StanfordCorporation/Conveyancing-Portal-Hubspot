import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PerformanceChart({ monthlyData }) {
  // Format month for display
  const formattedData = monthlyData.map(item => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    count: item.count
  }));
  
  return (
    <div className="performance-chart-container">
      <h2 className="chart-title">Performance Overview</h2>
      <p className="chart-subtitle">Deals created over the last 6 months</p>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="month" 
            stroke="#64748b"
            style={{ fontSize: '14px' }}
          />
          <YAxis 
            stroke="#64748b"
            style={{ fontSize: '14px' }}
          />
          <Tooltip 
            contentStyle={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#0E6DFF" 
            strokeWidth={3}
            dot={{ fill: '#0E6DFF', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

