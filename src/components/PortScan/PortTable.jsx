import React from 'react';
import { Search, Filter, ArrowRight } from 'lucide-react';
import './PortScan.css';

const portData = [
  { id: 1, host: 'api.acme.com', port: 443, protocol: 'TCP', service: 'HTTPS', state: 'Open', risk: 'LOW' },
  { id: 2, host: 'db-prod.acme.com', port: 3306, protocol: 'TCP', service: 'MySQL', state: 'Open', risk: 'CRITICAL' },
  { id: 3, host: 'vpn.acme.com', port: 1194, protocol: 'UDP', service: 'OpenVPN', state: 'Filtered', risk: 'LOW' },
  { id: 4, host: 'legacy.acme.com', port: 22, protocol: 'TCP', service: 'SSH', state: 'Open', risk: 'HIGH' },
  { id: 5, host: 'shop.acme.com', port: 80, protocol: 'TCP', service: 'HTTP', state: 'Open', risk: 'MEDIUM' },
  { id: 6, host: 'admin.acme.com', port: 3389, protocol: 'TCP', service: 'RDP', state: 'Open', risk: 'CRITICAL' },
];

const PortTable = () => {
  return (
    <div className="port-table-card">
      
      {/* Top Controls */}
      <div className="port-controls-bar">
        <div className="port-search-wrapper">
          <Search className="port-search-icon" size={16} />
          <input 
            type="text" 
            placeholder="Search host, port, or service..." 
            className="port-search-input"
          />
          <button className="port-filter-btn">
            <Filter size={16} />
          </button>
        </div>

        <div className="port-selects">
          <select className="port-select"><option>State: All</option></select>
          <select className="port-select"><option>Protocol: All</option></select>
          <select className="port-select"><option>Risk: All</option></select>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="port-table">
          <thead>
            <tr>
              <th>Host / IP</th>
              <th>Port</th>
              <th>Protocol</th>
              <th>Service</th>
              <th>State</th>
              <th>Risk Level</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {portData.map((row) => (
              <tr key={row.id}>
                <td className="font-bold font-mono">{row.host}</td>
                <td className="font-bold font-mono text-slate-600">{row.port}</td>
                <td className="text-slate-600">{row.protocol}</td>
                <td>
                  <span className="pill-service">
                    {row.service}
                  </span>
                </td>
                <td>
                  <span className={`port-pill pill-${row.state.toLowerCase()}`}>
                    {row.state}
                  </span>
                </td>
                <td>
                  <span className={`port-pill uppercase pill-${row.risk.toLowerCase()}`}>
                    <span className="dot"></span>
                    {row.risk}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="action-link">
                    Analyze <ArrowRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PortTable;
