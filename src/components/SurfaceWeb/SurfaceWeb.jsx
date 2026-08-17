import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Activity, 
  RefreshCw, 
  Database,
  Terminal,
  Search,
  Download,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  X,
  Layers,
  Server,
  FileText,
  Shield,
  Radio,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import TargetDomainTabs from '../common/TargetDomainTabs';
import { api } from '../../utils/api';
import './SurfaceWeb.css';

const SurfaceWeb = ({ activeTarget, assignedDomains = [], selectedDomain, setSelectedDomain }) => {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  
  // Table filters & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Payload Modal
  const [modalItem, setModalItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Determine active target
  const currentDomain = selectedDomain || activeTarget || (assignedDomains.length > 0 ? assignedDomains[0] : '');

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0] || '—';
      return d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);
    } catch {
      return '—';
    }
  };

  // Load Spiderfoot Stats & Scans
  const fetchStatsAndScans = async () => {
    try {
      const statsEndpoint = currentDomain && currentDomain !== 'All Domains'
        ? `/api/surface-monitoring/stats/?target=${encodeURIComponent(currentDomain)}`
        : '/api/surface-monitoring/stats/';
      
      const [statsData, scansData] = await Promise.all([
        api.get(statsEndpoint).catch(() => null),
        api.get('/api/surface-monitoring/scans/').catch(() => [])
      ]);

      setStats(statsData);
      
      const scanList = Array.isArray(scansData) ? scansData : (scansData?.results || []);
      setScans(scanList);

      const runningScan = scanList.find(s => s.status === 'running' || s.status === 'pending');
      if (runningScan) {
        setScanning(true);
        setScanStatus(runningScan.status);
      } else {
        setScanning(false);
        setScanStatus(scanList[0]?.status || 'ready');
      }
    } catch (err) {
      console.error("Failed to load Spiderfoot stats/scans", err);
    }
  };

  // Load Spiderfoot OSINT Results
  const fetchResults = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      let endpoint = '/api/surface-monitoring/results/';
      const params = [];
      if (currentDomain && currentDomain !== 'All Domains') {
        params.push(`target=${encodeURIComponent(currentDomain)}`);
      }
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      const data = await api.get(endpoint);
      const list = Array.isArray(data) ? data : (data?.results || []);
      setResults(list);
    } catch (err) {
      console.error("Failed to load Spiderfoot results", err);
      setResults([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndScans();
    fetchResults(true);
  }, [currentDomain]);

  // Polling while scan is running
  useEffect(() => {
    let interval;
    if (scanning) {
      interval = setInterval(() => {
        fetchStatsAndScans();
        fetchResults(false);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanning, currentDomain]);

  // Trigger New Spiderfoot Scan
  const handleTriggerScan = async () => {
    const targetToScan = currentDomain || 'kct.ac.in';
    if (!targetToScan) return;

    try {
      setScanning(true);
      setScanStatus('pending');
      await api.post('/api/surface-monitoring/scans/', {
        target: targetToScan
      });
      // Immediate poll
      await fetchStatsAndScans();
      await fetchResults(false);
    } catch (err) {
      console.error("Failed to trigger Spiderfoot scan", err);
      setScanning(false);
    }
  };

  // Extract distinct data types and modules for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set();
    results.forEach(r => {
      if (r.data_type) types.add(r.data_type);
    });
    return Array.from(types).sort();
  }, [results]);

  const uniqueModules = useMemo(() => {
    const mods = new Set();
    results.forEach(r => {
      if (r.module) mods.add(r.module);
    });
    return Array.from(mods).sort();
  }, [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVal = (item.data_value || '').toLowerCase().includes(q);
        const matchType = (item.data_type || '').toLowerCase().includes(q);
        const matchMod = (item.module || '').toLowerCase().includes(q);
        const matchTarget = (item.target || item.source || '').toLowerCase().includes(q);
        if (!matchVal && !matchType && !matchMod && !matchTarget) return false;
      }

      // Type filter
      if (selectedType !== 'ALL') {
        if (selectedType === 'DNS') {
          if (!item.data_type.startsWith('DNS_')) return false;
        } else if (selectedType === 'WEB') {
          if (!['WEB_SERVER', 'PAGE_TITLE', 'HTTP_HEADERS', 'URL'].includes(item.data_type)) return false;
        } else if (selectedType === 'SSL') {
          if (!item.data_type.startsWith('SSL_')) return false;
        } else if (selectedType === 'IP') {
          if (!['IP_ADDRESS', 'NETBLOCK_MEMBER', 'BGP_AS_OWNER'].includes(item.data_type)) return false;
        } else {
          if (item.data_type !== selectedType) return false;
        }
      }

      // Module filter
      if (selectedModule !== 'ALL' && item.module !== selectedModule) {
        return false;
      }

      return true;
    });
  }, [results, searchQuery, selectedType, selectedModule]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / rowsPerPage));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredResults.slice(start, start + rowsPerPage);
  }, [filteredResults, currentPage, rowsPerPage]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!filteredResults.length) return;
    const headers = ['S.No', 'Target', 'Data Type', 'Discovered Value', 'Module', 'Source', 'Created At', 'Updated At'];
    const rows = filteredResults.map((r, i) => [
      i + 1,
      r.target || currentDomain || '—',
      `"${(r.data_type || '').replace(/"/g, '""')}"`,
      `"${String(r.data_value || '').replace(/"/g, '""')}"`,
      `"${(r.module || '').replace(/"/g, '""')}"`,
      `"${(r.source || '').replace(/"/g, '""')}"`,
      `"${formatDate(r.created_date || r.created_at)}"`,
      `"${formatDate(r.updated_date || r.created_at)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spiderfoot_surface_web_${currentDomain || 'findings'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper badge color for data type
  const getTypeBadgeStyle = (dtype = '') => {
    if (dtype.startsWith('DNS_')) {
      return { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', label: 'DNS' };
    }
    if (dtype === 'IP_ADDRESS' || dtype.includes('NETBLOCK')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', label: 'IP / Network' };
    }
    if (dtype === 'WEB_SERVER' || dtype === 'PAGE_TITLE' || dtype === 'HTTP_HEADERS') {
      return { bg: 'rgba(168, 85, 247, 0.12)', color: '#A855F7', label: 'Web Asset' };
    }
    if (dtype.startsWith('SSL_')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', label: 'SSL / TLS' };
    }
    if (dtype.includes('EMAIL') || dtype.includes('LEAK')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', label: 'Exposure' };
    }
    return { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748B', label: 'OSINT' };
  };

  return (
    <div className="surface-web-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <PageHeaderCard
        title="Spiderfoot Passive Intelligence & OSINT Reconnaissance"
        subtitle="Automated surface web footprinting, DNS records discovery, infrastructure fingerprinting, and asset monitoring."
      />

      {/* Target Domain Switcher */}
      <TargetDomainTabs
        assignedDomains={assignedDomains}
        scansList={scans.map(s => ({ target: s.target, id: s.id }))}
        selectedDomain={currentDomain}
        setSelectedDomain={setSelectedDomain}
      />

      {/* Primary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: '10px' }}>
          <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {stats?.total_results ?? results.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.35rem' }}>
              Discovered OSINT Findings
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: '10px' }}>
          <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {uniqueTypes.length || Object.keys(stats?.type_counts || {}).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.35rem' }}>
              Unique OSINT Types
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: '10px' }}>
          <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
            <Terminal size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {uniqueModules.length || Object.keys(stats?.module_counts || {}).length || 4}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.35rem' }}>
              Active Spiderfoot Modules
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: '10px' }}>
          <div style={{ padding: '0.85rem', borderRadius: '8px', background: scanning ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)', color: scanning ? '#3B82F6' : '#22C55E' }}>
            {scanning ? <RefreshCw className="spin" size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, textTransform: 'capitalize' }}>
              {scanning ? 'Scan Running' : (scanStatus || 'Completed')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.35rem' }}>
              OSINT Engine Status
            </div>
          </div>
        </div>

      </div>

      {/* Action Bar: Search, Filters, Run Scan, CSV Export */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        
        {/* Left: Search & Quick Type Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '320px' }}>
          <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search OSINT values, types, modules..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                fontSize: '0.825rem',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.825rem',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All OSINT Types ({results.length})</option>
            <option value="DNS">DNS Records</option>
            <option value="IP">IP & Network</option>
            <option value="WEB">Web Server & Headers</option>
            <option value="SSL">SSL & Certificates</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.825rem',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Modules ({uniqueModules.length})</option>
            {uniqueModules.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Right: Trigger Scan & Export CSV */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: 6,
              fontSize: '0.825rem',
              fontWeight: 700,
              background: scanning ? 'var(--border-color)' : 'var(--brand-primary, #3b82f6)',
              color: '#ffffff',
              border: 'none',
              cursor: scanning ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            {scanning ? (
              <>
                <RefreshCw className="spin" size={14} />
                Scanning {currentDomain}...
              </>
            ) : (
              <>
                <Play size={14} />
                Run Spiderfoot Scan
              </>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredResults.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: 6,
              fontSize: '0.825rem',
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: filteredResults.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

      </div>

      {/* Main OSINT Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: '1.25rem'
      }}>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Globe size={14} color="var(--brand-primary)" />
            Spiderfoot OSINT Discovered Records ({filteredResults.length})
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing {filteredResults.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} - {Math.min(currentPage * rowsPerPage, filteredResults.length)} of {filteredResults.length}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.75rem', width: '55px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>S.No</th>
                <th style={{ padding: '0.65rem 0.75rem', width: '160px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Target</th>
                <th style={{ padding: '0.65rem 0.75rem', width: '190px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>OSINT Data Type</th>
                <th style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Discovered Value / Payload</th>
                <th style={{ padding: '0.65rem 0.75rem', width: '130px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Module</th>
                <th style={{ padding: '0.65rem 0.75rem', width: '140px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Created Date</th>
                <th style={{ padding: '0.65rem 0.75rem', width: '140px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Updated Date</th>
                <th style={{ padding: '0.65rem 0.75rem', width: '70px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedResults.map((row, idx) => {
                const sNo = (currentPage - 1) * rowsPerPage + idx + 1;
                const typeStyle = getTypeBadgeStyle(row.data_type);
                const isJsonOrMultiline = (row.data_value || '').includes('\n') || (row.data_value || '').startsWith('{') || (row.data_value || '').length > 70;
                const displayVal = (row.data_value || '').length > 80 ? (row.data_value || '').substring(0, 80) + '...' : (row.data_value || '—');

                return (
                  <tr key={row.id || idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {sNo}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {row.target || currentDomain || '—'}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 4,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: typeStyle.bg,
                        color: typeStyle.color
                      }}>
                        {row.data_type || 'OSINT'}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-primary)', fontFamily: isJsonOrMultiline ? 'monospace' : 'inherit', fontSize: isJsonOrMultiline ? '0.75rem' : '0.825rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '500px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isJsonOrMultiline ? 'nowrap' : 'normal' }} title={row.data_value}>
                          {displayVal}
                        </span>
                        {isJsonOrMultiline && (
                          <button
                            onClick={() => setModalItem(row)}
                            style={{
                              padding: '0.15rem 0.4rem',
                              fontSize: '0.65rem',
                              borderRadius: 4,
                              background: 'var(--bg-main)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--brand-primary)',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            View Full
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {row.module || 'sfp_spider'}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDate(row.created_date || row.created_at)}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDate(row.updated_date || row.created_at)}
                    </td>
                    <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleCopy(row.id || idx, row.data_value || '')}
                        title="Copy Value"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedId === (row.id || idx) ? '#22C55E' : 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.25rem'
                        }}
                      >
                        {copiedId === (row.id || idx) ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedResults.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <Globe size={40} style={{ opacity: 0.4 }} />
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {loading ? 'Fetching Spiderfoot OSINT Intelligence...' : 'No Spiderfoot Findings Available'}
                      </div>
                      <div style={{ fontSize: '0.8rem', maxWidth: '400px' }}>
                        {loading
                          ? 'Streaming live intelligence records...'
                          : 'Click "Run Spiderfoot Scan" above to run an automated OSINT reconnaissance scan on this target.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredResults.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: 4,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 4,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              
              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 4,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Payload Modal */}
      {modalItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {modalItem.data_type}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Target: {modalItem.target || currentDomain} | Module: {modalItem.module}
                </div>
              </div>
              <button
                onClick={() => setModalItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <pre style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                padding: '1rem',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {modalItem.data_value}
              </pre>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => handleCopy('modal', modalItem.data_value)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Copy size={13} /> Copy Value
              </button>
              <button
                onClick={() => setModalItem(null)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 6,
                  background: 'var(--brand-primary, #3b82f6)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SurfaceWeb;
