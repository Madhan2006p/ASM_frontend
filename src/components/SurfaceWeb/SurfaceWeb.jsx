import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Activity, 
  RefreshCw, 
  Database,
  Terminal,
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import TargetDomainTabs from '../common/TargetDomainTabs';
import './SurfaceWeb.css';
import { api } from '../../utils/api';

const SurfaceWeb = ({ assignedDomains, selectedDomain, setSelectedDomain }) => {
  const [stats, setStats] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [endpointScanStatus, setEndpointScanStatus] = useState('');

  // Load Spiderfoot stats
  const loadStats = async () => {
    try {
      const statsData = await api.get('/api/surface-monitoring/stats/');
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load Spiderfoot stats", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Load scanned endpoints (URL / domain / page title / http status / webserver / tech)
  const refreshEndpoints = async (showLoader = false) => {
    if (showLoader) setEndpointsLoading(true);
    try {
      const data = await api.get('/api/attacksurface/endpoints/');
      setEndpoints(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load endpoints", err);
      setEndpoints([]);
    } finally {
      if (showLoader) setEndpointsLoading(false);
    }
  };

  useEffect(() => {
    refreshEndpoints(true);
  }, []);

  // Refresh the endpoints table while an attack-surface scan is running so
  // newly discovered URLs appear without a manual page reload.
  useEffect(() => {
    let interval;
    const poll = async () => {
      try {
        const scansData = await api.get('/api/attacksurface/scans/');
        const list = Array.isArray(scansData) ? scansData : (scansData.results || []);
        const latest = list[0];
        setEndpointScanStatus(latest ? latest.status : '');
        const hasRunning = list.some(s => s.status === 'running' || s.status === 'pending');
        if (hasRunning) await refreshEndpoints();
      } catch (err) {
        console.error("Endpoint poll error", err);
      }
    };
    poll();
    interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="surface-web-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeaderCard
        title="Spiderfoot Passive Intelligence Scan"
      />

      <TargetDomainTabs
        assignedDomains={assignedDomains}
        selectedDomain={selectedDomain}
        setSelectedDomain={setSelectedDomain}
      />



      {/* Stats Summary Panel */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Globe size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.total_scans}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>Total OSINT Targets</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Database size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.total_results}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>Discovered OSINT Values</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{Object.keys(stats.type_counts || {}).length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>Unique OSINT Types</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '0.75rem', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <Terminal size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{Object.keys(stats.module_counts || {}).length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>Spiderfoot Modules</div>
            </div>
          </div>
        </div>
      )}

      {/* Endpoints Table */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 12, padding: '1.1rem'
      }}>
        <div style={{
          fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.9rem',
          display: 'flex', alignItems: 'center', gap: '0.35rem'
        }}>
          <Globe size={12} /> Discovered Endpoints
          {(endpointScanStatus === 'running' || endpointScanStatus === 'pending') && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: '#3b82f6',
              background: 'rgba(59,130,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: 5
            }}>
              <RefreshCw className="spin" size={12} /> Scanning...
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['S.No', 'URL', 'Domain', 'Status', 'PageTitle', 'HTTPStatus', 'WebServer', 'Technology'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(endpoints || []).map((ep, i) => (
                <tr key={ep.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{i + 1}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', maxWidth: '280px' }}>{ep.http_url || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{ep.subdomain_name || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: 5, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                      background: ep.is_alive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: ep.is_alive ? '#22C55E' : '#EF4444'
                    }}>
                      {ep.is_alive ? 'Alive' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ep.title || ''}>{ep.title || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{ep.http_status ?? '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{ep.webserver || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>{(Array.isArray(ep.technologies) && ep.technologies.length) ? ep.technologies.join(', ') : '—'}</td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {endpointsLoading ? 'Loading endpoints...' : 'No endpoints found. Run an asset discovery scan to populate this table.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SurfaceWeb;
