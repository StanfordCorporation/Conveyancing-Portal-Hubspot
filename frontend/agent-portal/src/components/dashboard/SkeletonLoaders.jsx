import React from 'react';

/**
 * Skeleton Loaders for Agent Dashboard
 * Provides smooth loading states for all components
 */

// Generic skeleton box
export function SkeletonBox({ width = '100%', height = '20px', borderRadius = '8px' }) {
  return (
    <div
      className="skeleton-box"
      style={{ width, height, borderRadius }}
    />
  );
}

// Skeleton for metric cards
export function SkeletonMetricCard() {
  return (
    <div className="metric-card skeleton-pulse">
      <div className="metric-icon skeleton-box" style={{ width: '56px', height: '56px', borderRadius: '12px' }} />
      <div className="metric-content">
        <SkeletonBox width="80px" height="14px" />
        <SkeletonBox width="60px" height="28px" style={{ marginTop: '8px' }} />
      </div>
    </div>
  );
}

// Skeleton for metrics grid
export function SkeletonMetricsGrid() {
  return (
    <div className="metrics-grid">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>
  );
}

// Skeleton for performance chart
export function SkeletonChart() {
  return (
    <div className="performance-chart-container skeleton-pulse">
      <div className="chart-header">
        <SkeletonBox width="200px" height="20px" />
        <SkeletonBox width="300px" height="14px" style={{ marginTop: '8px' }} />
      </div>
      <div className="skeleton-chart-area" style={{ height: '300px', marginTop: '24px', borderRadius: '8px' }} />
    </div>
  );
}

// Skeleton for table row
export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr className="skeleton-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <SkeletonBox width={i === 0 ? '150px' : '120px'} height="16px" />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for clients table
export function SkeletonClientsTable() {
  return (
    <div className="active-clients-container skeleton-pulse">
      <SkeletonBox width="180px" height="22px" style={{ marginBottom: '24px' }} />

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
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonTableRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Skeleton for kanban column
export function SkeletonKanbanColumn() {
  return (
    <div className="kanban-column skeleton-pulse">
      <div className="kanban-header">
        <SkeletonBox width="150px" height="16px" />
        <SkeletonBox width="30px" height="24px" borderRadius="999px" />
      </div>
      <div className="kanban-cards">
        {[1, 2, 3].map((i) => (
          <div key={i} className="kanban-card" style={{ marginBottom: '12px' }}>
            <SkeletonBox width="100%" height="14px" />
            <SkeletonBox width="80%" height="13px" style={{ marginTop: '8px' }} />
            <SkeletonBox width="120px" height="12px" style={{ marginTop: '12px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton for kanban board
export function SkeletonKanbanBoard() {
  return (
    <div className="kanban-container">
      <SkeletonBox width="180px" height="22px" style={{ marginBottom: '24px' }} />

      <div className="kanban-board">
        {[1, 2, 3].map((i) => (
          <SkeletonKanbanColumn key={i} />
        ))}
      </div>
    </div>
  );
}

// Skeleton for document card
export function SkeletonDocumentCard() {
  return (
    <div className="document-card skeleton-pulse">
      <div className="document-card-header">
        <SkeletonBox width="200px" height="18px" />
        <SkeletonBox width="60px" height="60px" borderRadius="50%" />
      </div>
      <div className="document-checklist" style={{ marginTop: '16px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="document-item" style={{ marginBottom: '12px' }}>
            <SkeletonBox width="24px" height="24px" borderRadius="4px" />
            <SkeletonBox width="150px" height="16px" />
            <SkeletonBox width="100px" height="32px" borderRadius="8px" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton for lead details modal
export function SkeletonLeadDetails() {
  return (
    <div className="skeleton-pulse">
      <SkeletonBox width="300px" height="28px" style={{ marginBottom: '24px' }} />

      <div className="property-sections">
        {[1, 2, 3].map((i) => (
          <div key={i} className="property-section" style={{ marginBottom: '24px' }}>
            <SkeletonBox width="200px" height="20px" style={{ marginBottom: '16px' }} />
            <div className="form-grid">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="form-group" style={{ marginBottom: '16px' }}>
                  <SkeletonBox width="120px" height="14px" style={{ marginBottom: '8px' }} />
                  <SkeletonBox width="100%" height="40px" borderRadius="8px" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Full dashboard skeleton
export function SkeletonDashboard() {
  return (
    <div className="dashboard-skeleton">
      <SkeletonMetricsGrid />
      <SkeletonChart />
      <SkeletonClientsTable />
      <SkeletonKanbanBoard />
    </div>
  );
}

// Loading button with spinner
export function LoadingButton({ loading, children, onClick, className = '', disabled = false, ...props }) {
  return (
    <button
      className={`${className} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="loading-spinner-sm" />}
      <span style={{ opacity: loading ? 0.7 : 1 }}>{children}</span>
    </button>
  );
}

// Loading overlay for sections
export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}
