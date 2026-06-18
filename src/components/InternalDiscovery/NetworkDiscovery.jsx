import React from 'react';
import { Globe } from 'lucide-react';
import './InternalDashboard.css';

const NetworkDiscovery = () => {
  return (
    <div className="internal-dashboard-container">
      <div className="dashboard-header-modern">
        <div className="header-icon-wrapper">
          <Globe size={28} className="pulse-icon" />
        </div>
        <div>
          <h2>Network Discovery</h2>
          <p className="subtitle-glow">Identify live hosts and map internal network topologies.</p>
        </div>
      </div>
      <div className="data-section-premium">
        <div className="section-header">
          <h3>Discovered Subnets & Hosts</h3>
        </div>
        <div className="table-container-modern" style={{ padding: '3rem', textAlign: 'center', color: '#a0aec0', fontSize: '1.1rem' }}>
          No network data available. Awaiting Internal Agent deployment and sync...
        </div>
      </div>
    </div>
  );
};

export default NetworkDiscovery;
