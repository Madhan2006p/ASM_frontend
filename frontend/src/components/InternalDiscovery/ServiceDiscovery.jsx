import React from 'react';
import { Search } from 'lucide-react';
import './InternalDashboard.css';

const ServiceDiscovery = () => {
  return (
    <div className="internal-dashboard-container">
      <div className="dashboard-header-modern">
        <div className="header-icon-wrapper">
          <Search size={28} className="pulse-icon" />
        </div>
        <div>
          <h2>Service Discovery</h2>
          <p className="subtitle-glow">Enumerate open ports, running services, and protocol versions on internal assets.</p>
        </div>
      </div>
      <div className="data-section-premium">
        <div className="section-header">
          <h3>Running Services & Ports</h3>
        </div>
        <div className="table-container-modern" style={{ padding: '3rem', textAlign: 'center', color: '#a0aec0', fontSize: '1.1rem' }}>
          No service data available. Awaiting Internal Agent deployment and sync...
        </div>
      </div>
    </div>
  );
};

export default ServiceDiscovery;
