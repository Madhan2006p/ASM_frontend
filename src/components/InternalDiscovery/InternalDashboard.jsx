import React, { useState, useEffect } from 'react';
import { Activity, Server, ShieldAlert, Cpu, HardDrive, Wifi, Network } from 'lucide-react';
import { api } from '../../utils/api';
import './InternalDashboard.css';

const InternalDashboard = () => {
  const [loading, setLoading] = useState(true);

  const [assets, setAssets] = useState([]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await api.get('/api/attacksurface/internal-assets/');
        setAssets(data.results || data);
      } catch (err) {
        console.error("Failed to fetch internal assets", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  return (
    <div className="internal-dashboard-container">
      <div className="dashboard-header-modern">
        <div className="header-icon-wrapper">
          <Network size={28} className="pulse-icon" />
        </div>
        <div>
          <h2>Internal Asset Discovery</h2>
          <p className="subtitle-glow">Real-time visibility into internal network assets and live hosts.</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card-premium">
          <div className="card-icon blue"><Server size={24} /></div>
          <div className="card-info">
            <h4>Total Internal Assets</h4>
            <div className="card-value">{loading ? '...' : assets.length}</div>
          </div>
        </div>
        <div className="metric-card-premium">
          <div className="card-icon green"><Activity size={24} /></div>
          <div className="card-info">
            <h4>Live Hosts</h4>
            <div className="card-value">{loading ? '...' : assets.filter(a => a.is_live).length}</div>
          </div>
        </div>
        <div className="metric-card-premium">
          <div className="card-icon purple"><Wifi size={24} /></div>
          <div className="card-info">
            <h4>Open Ports</h4>
            <div className="card-value">{loading ? '...' : assets.reduce((acc, a) => acc + (Array.isArray(a.ports) ? a.ports.length : 0), 0)}</div>
          </div>
        </div>
        <div className="metric-card-premium">
          <div className="card-icon red"><ShieldAlert size={24} /></div>
          <div className="card-info">
            <h4>Critical Vulns</h4>
            <div className="card-value">{loading ? '...' : assets.reduce((acc, a) => acc + (a.risk_score >= 10 ? 1 : 0), 0)}</div>
          </div>
        </div>
      </div>

      <div className="data-section-premium">
        <div className="section-header">
          <h3>Discovered Assets</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Enter internal IP (e.g. 192.168.1.0/24)" 
              style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #333', background: '#111', color: '#fff', width: '250px' }}
            />
            <button className="scan-btn-premium">Initiate Scan</button>
          </div>
        </div>
        
        <div className="table-container-modern">
          <table className="modern-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Hostname</th>
                <th>OS</th>
                <th>Status</th>
                <th>Open Ports</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center loading-cell">Discovering network assets...</td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center" style={{ color: '#888', padding: '2rem' }}>No internal assets found. Start a scan or deploy your agent!</td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="table-row-animate">
                    <td className="ip-cell"><Cpu size={14}/> {asset.ip_address}</td>
                    <td>{asset.hostname}</td>
                    <td><HardDrive size={14}/> {asset.os}</td>
                    <td>
                      <span className={`status-badge ${asset.is_live ? 'live' : 'offline'}`}>
                        {asset.is_live && <span className="live-dot"></span>}
                        {asset.is_live ? 'Live' : 'Offline'}
                      </span>
                    </td>
                    <td className="ports-cell">{Array.isArray(asset.ports) ? asset.ports.join(', ') : asset.ports}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InternalDashboard;
