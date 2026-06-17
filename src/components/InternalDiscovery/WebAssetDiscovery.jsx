import React from 'react';
import { FileText } from 'lucide-react';
import './InternalDashboard.css';

const WebAssetDiscovery = () => {
  return (
    <div className="internal-dashboard-container">
      <div className="dashboard-header-modern">
        <div className="header-icon-wrapper">
          <FileText size={28} className="pulse-icon" />
        </div>
        <div>
          <h2>Web Asset Discovery</h2>
          <p className="subtitle-glow">Detect internal web applications, admin panels, and login portals.</p>
        </div>
      </div>
      <div className="data-section-premium">
        <div className="section-header">
          <h3>Internal Web Applications</h3>
        </div>
        <div className="table-container-modern" style={{ padding: '3rem', textAlign: 'center', color: '#a0aec0', fontSize: '1.1rem' }}>
          No web applications detected. Awaiting Internal Agent deployment and sync...
        </div>
      </div>
    </div>
  );
};

export default WebAssetDiscovery;
