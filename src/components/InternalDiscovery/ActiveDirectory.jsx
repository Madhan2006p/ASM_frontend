import React from 'react';
import { User } from 'lucide-react';
import './InternalDashboard.css';

const ActiveDirectory = () => {
  return (
    <div className="internal-dashboard-container">
      <div className="dashboard-header-modern">
        <div className="header-icon-wrapper">
          <User size={28} className="pulse-icon" />
        </div>
        <div>
          <h2>Active Directory Discovery</h2>
          <p className="subtitle-glow">Enumerate domain controllers, AD domains, and domain-joined assets.</p>
        </div>
      </div>
      <div className="data-section-premium">
        <div className="section-header">
          <h3>Active Directory Assets</h3>
        </div>
        <div className="table-container-modern" style={{ padding: '3rem', textAlign: 'center', color: '#a0aec0', fontSize: '1.1rem' }}>
          No Active Directory data available. Awaiting Internal Agent deployment and sync...
        </div>
      </div>
    </div>
  );
};

export default ActiveDirectory;
