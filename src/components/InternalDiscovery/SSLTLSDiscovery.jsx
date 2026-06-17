import React from 'react';
import { ShieldCheck } from 'lucide-react';
import './InternalDashboard.css';

const SSLTLSDiscovery = () => {
  return (
    <div className="internal-dashboard-container">
      <div className="dashboard-header-modern">
        <div className="header-icon-wrapper">
          <ShieldCheck size={28} className="pulse-icon" />
        </div>
        <div>
          <h2>SSL/TLS Discovery</h2>
          <p className="subtitle-glow">Identify expired, self-signed, and weak internal certificates.</p>
        </div>
      </div>
      <div className="data-section-premium">
        <div className="section-header">
          <h3>Internal SSL Certificates</h3>
        </div>
        <div className="table-container-modern" style={{ padding: '3rem', textAlign: 'center', color: '#a0aec0', fontSize: '1.1rem' }}>
          No certificates detected. Awaiting Internal Agent deployment and sync...
        </div>
      </div>
    </div>
  );
};

export default SSLTLSDiscovery;
