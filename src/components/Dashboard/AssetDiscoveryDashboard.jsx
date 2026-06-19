import React, { useState, useEffect } from 'react';
import { Activity, Server, ShieldAlert, Cpu, Globe, Search, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import '../InternalDiscovery/InternalDashboard.css';

const AssetDiscoveryDashboard = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [loading, setLoading] = useState(false);
  const [subdomains, setSubdomains] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [openPorts, setOpenPorts] = useState([]);
  const [vulns, setVulns] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!activeScanId) {
        setSubdomains([]); setEndpoints([]); setOpenPorts([]); setVulns([]);
        return;
      }
      try {
        setLoading(true);
        const [subData, endData, portData, vulnData] = await Promise.all([
          api.get(`/api/attacksurface/subdomains/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/endpoints/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/open-ports/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/vulnerabilities/?scan=${activeScanId}`).catch(() => [])
        ]);

        setSubdomains(Array.isArray(subData) ? subData : (subData?.results || []));
        setEndpoints(Array.isArray(endData) ? endData : (endData?.results || []));
        setOpenPorts(Array.isArray(portData) ? portData : (portData?.results || []));
        setVulns(Array.isArray(vulnData) ? vulnData : (vulnData?.results || []));

      } catch (err) {
        console.error("Failed to fetch asset discovery stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [activeScanId]);

  // Derived Stats
  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  vulns.forEach(v => {
    const sev = (v.severity || 'low').toLowerCase();
    if (riskCounts[sev] !== undefined) riskCounts[sev]++;
  });

  const critical = riskCounts.critical;
  const high = riskCounts.high;
  
  const totalAssets = (subdomains.length || 0) + (endpoints.length || 0) + (openPorts.length || 0);
  const riskScore = Math.min(100, (critical * 10) + (high * 5) + (riskCounts.medium * 2) + (riskCounts.low * 1));

  return (
    <div className="internal-dashboard-container">
      <PageHeaderCard
        badgeText="ASSET DISCOVERY"
        title="Asset Discovery Dashboard"
        subtitle="Real-time visibility into your external attack surface, subdomains, and exposed assets."
      />

      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Loading dashboard...
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card-premium">
              <div className="card-icon blue"><Globe size={24} /></div>
              <div className="card-info">
                <h4>Total Assets Discovered</h4>
                <div className="card-value">{totalAssets}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon red"><ShieldAlert size={24} /></div>
              <div className="card-info">
                <h4>Risk Score</h4>
                <div className="card-value">{riskScore}/100</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon purple"><Server size={24} /></div>
              <div className="card-info">
                <h4>Critical Vulnerabilities</h4>
                <div className="card-value">{critical}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon orange"><Activity size={24} /></div>
              <div className="card-info">
                <h4>High Vulnerabilities</h4>
                <div className="card-value">{high}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Subdomains Table */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={18} color="#3B82F6" /> Discovered Subdomains
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Subdomain</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>IP Address</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subdomains.slice(0, 8).map((sub, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#3B82F6' }}>{sub.domain || sub.subdomain || 'Unknown'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{(sub.ip && sub.ip.length > 0 && sub.ip.some(ip => ip && ip !== '—' && ip !== '-')) ? sub.ip.filter(ip => ip && ip !== '—' && ip !== '-').join(', ') : '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ background: sub.status === 'Active' || sub.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', color: sub.status === 'Active' || sub.is_active ? '#22C55E' : '#64748B', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {sub.status || (sub.is_active ? 'Active' : 'Inactive')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {subdomains.length === 0 && (
                      <tr><td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No subdomains found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Open Ports Table */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={18} color="#8B5CF6" /> Exposed Open Ports
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Host / Domain</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Open Ports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPorts.slice(0, 8).map((portData, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)' }}>{portData.domain || portData.host || '—'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#8B5CF6' }}>
                          {(Array.isArray(portData.ports) && portData.ports.length > 0) 
                            ? portData.ports.map(p => typeof p === 'object' ? `${p.port}${p.service ? ` (${p.service})` : ''}` : p).join(', ') 
                            : (portData.port && portData.port !== '—' ? portData.port : '-')}
                        </td>
                      </tr>
                    ))}
                    {openPorts.length === 0 && (
                      <tr><td colSpan="2" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No open ports found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssetDiscoveryDashboard;
