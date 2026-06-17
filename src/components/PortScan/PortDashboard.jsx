import React from 'react';
import { Filter } from 'lucide-react';
import './PortScan.css';

const PortDashboard = () => {
  return (
    <div>
      {/* Header Area */}
      <div className="port-dash-header">
        <div>
          <h1 className="port-page-title">Port Scan</h1>
          <p className="port-page-subtitle">Real-time network exposure and port discovery mapping.</p>
        </div>
        <div className="port-header-actions">
          <button className="port-btn-outline">
            <Filter size={16} /> Filters
          </button>
          <button className="port-btn-primary">
            Configure Scans
          </button>
        </div>
      </div>

      {/* The Scanner Ribbon (Light Theme) */}
      <div className="port-scanner-ribbon">
        <div className="ribbon-metrics" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div className="ribbon-metric">
            <span className="ribbon-lbl">Total Open Ports</span>
            <span className="ribbon-val">1,420</span>
          </div>
          <div className="ribbon-metric">
            <span className="ribbon-lbl">High Risk Exposed</span>
            <span className="ribbon-val" style={{color: '#EF4444'}}>18</span>
          </div>
          <div className="ribbon-metric">
            <span className="ribbon-lbl">Scan Coverage</span>
            <span className="ribbon-val val-green">100%</span>
          </div>
          <div className="ribbon-metric">
            <span className="ribbon-lbl">Last Sweep</span>
            <span className="ribbon-val" style={{color: '#64748B', fontWeight: 600, fontFamily: 'sans-serif'}}>2 mins ago</span>
          </div>
        </div>
      </div>

      {/* Grid Layout (Replaced Radar Map with Clean Data Cards) */}
      <div className="port-radar-grid">
        
        {/* Left: Top Riskiest Services */}
        <div className="port-side-card">
           <h3 className="side-card-title">Riskiest Services</h3>
           <p className="side-card-subtitle">Top exposed vectors across all monitored hosts.</p>
           
           <div className="risk-services-list">
             <div className="risk-service-row">
               <span className="risk-lbl">SSH</span>
               <div className="risk-track">
                 <div className="risk-fill fill-red" style={{width: '85%'}}></div>
               </div>
               <span className="risk-val">180</span>
             </div>
             <div className="risk-service-row">
               <span className="risk-lbl">MySQL</span>
               <div className="risk-track">
                 <div className="risk-fill fill-orange" style={{width: '45%'}}></div>
               </div>
               <span className="risk-val">45</span>
             </div>
             <div className="risk-service-row">
               <span className="risk-lbl">RDP</span>
               <div className="risk-track">
                 <div className="risk-fill fill-yellow" style={{width: '12%'}}></div>
               </div>
               <span className="risk-val">12</span>
             </div>
             <div className="risk-service-row">
               <span className="risk-lbl">HTTP</span>
               <div className="risk-track">
                 <div className="risk-fill fill-blue" style={{width: '95%'}}></div>
               </div>
               <span className="risk-val">940</span>
             </div>
           </div>
        </div>

        {/* Right: Protocol Breakdown & New Ports */}
        <div className="port-side-card" style={{ gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <h3 className="side-card-title">Protocol Breakdown</h3>
              <p className="side-card-subtitle">TCP vs UDP distribution.</p>
              
              <div className="protocol-dist-wrapper">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#8B5CF6" strokeWidth="16" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="16" strokeDasharray="251" strokeDashoffset="50" strokeLinecap="butt" style={{transform: 'rotate(-90deg)', transformOrigin: 'center'}} />
                </svg>
                
                <div className="protocol-legend">
                  <div className="protocol-legend-item">
                    <div className="legend-dot dot-tcp"></div> TCP (80%)
                  </div>
                  <div className="protocol-legend-item">
                    <div className="legend-dot dot-udp"></div> UDP (20%)
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-color)' }}>
               <h3 className="side-card-title">
                 <span style={{color: '#EF4444'}}>●</span> Recently Opened
               </h3>
               <p className="side-card-subtitle">Last 24 hours.</p>
               
               <div className="new-ports-list">
                 <div className="new-port-item">
                   <div className="port-item-info">
                     <span className="port-host">db-backup.acme.com</span>
                     <span className="port-details">Port 3306</span>
                   </div>
                   <span className="new-badge">NEW</span>
                 </div>
                 <div className="new-port-item">
                   <div className="port-item-info">
                     <span className="port-host">legacy.acme.com</span>
                     <span className="port-details">Port 22</span>
                   </div>
                   <span className="new-badge">NEW</span>
                 </div>
               </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PortDashboard;
