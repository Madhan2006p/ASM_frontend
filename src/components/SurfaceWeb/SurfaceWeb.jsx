import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  Activity, 
  Clock, 
  RefreshCw, 
  Eye, 
  Shield, 
  CheckCircle,
  Database,
  Terminal,
  ShieldAlert,
  ArrowRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './SurfaceWeb.css';
import { api } from '../../utils/api';

// Parsers & Renderers for OSINT findings
const RenderWhoisData = ({ rawText }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!rawText) return null;

  // Extremely robust regex lookahead for WHOIS field parsing
  const whoisFieldsLookahead = '(?=\\s*(?:Domain Name|Registry Domain ID|Registrar WHOIS Server|Registrar URL|Updated Date|Creation Date|Registry Expiry Date|Registrar:|Registrar Abuse Contact Email|Registrar Abuse Contact Phone|Domain Status|Name Server|DNSSEC|>>>|NOTICE:|TERMS OF USE:|[\\r\\n]|$))';

  const getField = (fieldName) => {
    const regexStr = fieldName + ':\\s*([\\s\\S]+?)' + whoisFieldsLookahead;
    const regex = new RegExp(regexStr, 'i');
    const match = rawText.match(regex);
    return match && match[1] ? match[1].trim() : '';
  };

  const domainName = getField('Domain Name');
  const registrar = getField('Registrar') || getField('Domain Registrar');
  const creationDate = getField('Creation Date');
  const expiryDate = getField('Registry Expiry Date') || getField('Expiry Date') || getField('Expiration Date');
  const abuseEmail = getField('Registrar Abuse Contact Email');

  // Name servers (could be multiple matches, and single-line/multi-line robust)
  const nsRegexStr = 'Name Server:\\s*([^\\r\\n\\t ]+?)' + whoisFieldsLookahead;
  const nsRegex = new RegExp(nsRegexStr, 'gi');
  const nsMatches = [...rawText.matchAll(nsRegex)];
  const nameServers = Array.from(new Set(nsMatches.map(m => m[1].trim())));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.75rem'
      }}>
        {domainName && (
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Domain Name</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{domainName}</span>
          </div>
        )}
        {registrar && (
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Registrar</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{registrar}</span>
          </div>
        )}
        {creationDate && (
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Creation Date</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {new Date(creationDate).toLocaleString() !== 'Invalid Date' ? new Date(creationDate).toLocaleDateString() : creationDate}
            </span>
          </div>
        )}
        {expiryDate && (
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Expiry Date</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {new Date(expiryDate).toLocaleString() !== 'Invalid Date' ? new Date(expiryDate).toLocaleDateString() : expiryDate}
            </span>
          </div>
        )}
        {abuseEmail && (
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Abuse Contact Email</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>
              <a href={`mailto:${abuseEmail}`} style={{ color: 'inherit', textDecoration: 'none' }}>{abuseEmail}</a>
            </span>
          </div>
        )}
        {nameServers.length > 0 && (
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Name Servers</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {nameServers.join(', ')}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          alignSelf: 'flex-start',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          outline: 'none'
        }}
      >
        {isOpen ? 'Hide Raw WHOIS Data' : 'Show Raw WHOIS Data'}
      </button>

      {isOpen && (
        <pre style={{
          maxHeight: '200px',
          overflowY: 'auto',
          background: '#0d1117',
          color: '#c9d1d9',
          padding: '0.75rem',
          borderRadius: '6px',
          fontSize: '0.7rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          border: '1px solid var(--border-color)',
          marginTop: '0.25rem'
        }}>
          {rawText}
        </pre>
      )}
    </div>
  );
};

const RenderGithubRepo = ({ rawText }) => {
  if (!rawText) return null;

  const nameMatch = rawText.match(/Name:\s*([^\n\r]+?)(?=\s*(URL:|Description:|$))/i);
  const urlMatch = rawText.match(/URL:\s*([^\n\r]+?)(?=\s*(Name:|Description:|$))/i);
  const descMatch = rawText.match(/Description:\s*([\s\S]+)$/i) || rawText.match(/Description:\s*([^\n\r]+)/i);

  const name = nameMatch ? nameMatch[1].trim() : 'Unknown Repository';
  const url = urlMatch ? urlMatch[1].trim() : '';
  const description = descMatch ? descMatch[1].trim() : '';

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      background: 'var(--bg-main)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      maxWidth: '480px',
      width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <Globe size={14} />
          {name}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#ffffff',
              background: '#3b82f6',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            Open Repo <ExternalLink size={12} />
          </a>
        )}
      </div>
      {description && (
        <p style={{
          fontSize: '0.775rem',
          color: 'var(--text-secondary)',
          margin: 0,
          fontStyle: 'italic',
          lineHeight: '1.4'
        }}>
          {description}
        </p>
      )}
    </div>
  );
};

const RenderRegistrar = ({ registrar }) => {
  if (!registrar) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
      <Shield size={14} color="#10b981" />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{registrar}</span>
    </div>
  );
};

const RenderIPAddress = ({ ip }) => {
  const [copied, setCopied] = useState(false);
  if (!ip) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-main)', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
        {ip}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          background: 'none', border: 'none', color: copied ? '#10b981' : 'var(--text-secondary)',
          cursor: 'pointer', padding: '0.25rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          outline: 'none', fontWeight: 600
        }}
      >
        <Copy size={12} />
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

const RenderDomainName = ({ domain }) => {
  if (!domain) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <Globe size={14} color="#3b82f6" />
      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {domain}
      </span>
    </div>
  );
};


const SurfaceWeb = ({ activeTarget }) => {
  const renderDiscoveredValue = (item) => {
    const type = item.data_type ? item.data_type.toLowerCase() : '';
    const val = item.data_value;

    if (type.includes('whois')) {
      return <RenderWhoisData rawText={val} />;
    }
    if (type.includes('code repository') || type.includes('github')) {
      return <RenderGithubRepo rawText={val} />;
    }
    if (type.includes('registrar')) {
      return <RenderRegistrar registrar={val} />;
    }
    if (type.includes('ip address') || type.includes('ipv6') || type.includes('ip_address')) {
      return <RenderIPAddress ip={val} />;
    }
    if (type.includes('domain name') || type.includes('internet name')) {
      return <RenderDomainName domain={val} />;
    }

    return <span>{val}</span>;
  };

  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Load Scan History & Stats
  const loadScansAndStats = async () => {
    setLoading(true);
    try {
      const [scansData, statsData] = await Promise.all([
        api.get('/api/surface-monitoring/scans/'),
        api.get('/api/surface-monitoring/stats/')
      ]);
      const list = Array.isArray(scansData) ? scansData : (scansData.results || []);
      setScans(list);
      setStats(statsData);

      // Auto-select latest scan if nothing is selected yet
      if (list.length > 0 && !selectedScan) {
        handleSelectScan(list[0]);
      }
    } catch (err) {
      console.error("Failed to load Spiderfoot scans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScansAndStats();
  }, []);

  const handleSelectScan = async (scan) => {
    setSelectedScan(scan);
    setLoadingResults(true);
    try {
      const data = await api.get(`/api/surface-monitoring/scans/${scan.id}/results/`);
      setResults(data);
      setSelectedTypeFilter(''); // Reset filter on scan change
    } catch (err) {
      console.error("Failed to load scan results", err);
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };



  // Poll running scans
  useEffect(() => {
    const hasRunning = scans.some(s => s.status === 'running' || s.status === 'pending');
    if (!hasRunning) return;

    const interval = setInterval(async () => {
      try {
        const scansData = await api.get('/api/surface-monitoring/scans/');
        const list = Array.isArray(scansData) ? scansData : (scansData.results || []);
        setScans(list);
        
        // Update selected scan if it was running
        if (selectedScan) {
          const updated = list.find(s => s.id === selectedScan.id);
          if (updated && updated.status !== selectedScan.status) {
            setSelectedScan(updated);
            if (updated.status === 'completed') {
              // Reload results
              const rData = await api.get(`/api/surface-monitoring/scans/${updated.id}/results/`);
              setResults(rData);
            }
          }
        }
        
        // Also refresh overall statistics
        const statsData = await api.get('/api/surface-monitoring/stats/');
        setStats(statsData);
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [scans, selectedScan]);

  // Filtered Findings
  const filteredFindings = results.filter(item => {
    const matchesSearch = searchQuery 
      ? (item.data_value?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         item.data_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.module?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    const matchesType = selectedTypeFilter
      ? item.data_type === selectedTypeFilter
      : true;

    return matchesSearch && matchesType;
  });

  // Extract unique data types from results for local filtering
  const uniqueTypes = Array.from(new Set(results.map(r => r.data_type)));

  return (
    <div className="surface-web-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeaderCard
        badgeText="SURFACE WEB OSINT"
        title="Spiderfoot Passive Intelligence Scan"
        subtitle="Leverage passive OSINT to map internet names, IP addresses, domains, and leak intelligence."
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

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(480px, 2fr)', gap: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* LEFT PANEL: SCAN LIST */}
        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', minHeight: '400px' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
            Scan History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {scans.map((s, idx) => {
              const isSelected = selectedScan?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectScan(s)}
                  style={{
                    padding: '1rem', borderRadius: '8px', border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border-color)'}`,
                    background: isSelected ? 'rgba(59,130,246,0.06)' : 'var(--bg-main)',
                    cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{s.target}</span>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px',
                      background: s.status === 'completed' ? 'rgba(16,185,129,0.1)' : (s.status === 'running' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)'),
                      color: s.status === 'completed' ? '#10b981' : (s.status === 'running' ? '#3b82f6' : '#dc2626')
                    }}>
                      {s.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <strong>{s.results_count}</strong> values found
                    </div>
                  </div>
                </div>
              );
            })}
            {scans.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No OSINT targets scanned yet. Enter a domain above to start.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SELECTED SCAN FINDINGS */}
        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          
          {selectedScan ? (
            <>
              {/* Scan Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={18} color="#3b82f6" /> {selectedScan.target}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Scan ID: #{selectedScan.id}</span>
                    <span>Started: {new Date(selectedScan.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedScan.status === 'running' && (
                    <span style={{ fontSize: '0.8rem', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                      <RefreshCw className="spin" size={14} /> Passive scanning...
                    </span>
                  )}
                </div>
              </div>

              {/* Filtering / Search Bar */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ flex: 1, position: 'relative', minWidth: '180px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Search findings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '0 0.5rem 0 2rem',
                      fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                </div>

                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  style={{
                    height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '0 1rem',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', outline: 'none'
                  }}
                >
                  <option value="">All Data Types</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Findings Table */}
              <div style={{ flex: 1, overflowX: 'auto' }}>
                {loadingResults ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-secondary)' }}>
                    <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Loading scan results...
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Data Type</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Discovered Value</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Module</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFindings.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                              background: 'rgba(59,130,246,0.1)', color: '#3b82f6'
                            }}>
                              {item.data_type}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', wordBreak: 'break-all', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {renderDiscoveredValue(item)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {item.module}
                          </td>
                        </tr>
                      ))}
                      {filteredFindings.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No findings match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-secondary)', gap: '0.5rem' }}>
              <ShieldAlert size={36} style={{ opacity: 0.6 }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No Scan Selected</p>
              <p style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '300px' }}>Select an existing target scan from history or launch a new footprint scan above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurfaceWeb;
