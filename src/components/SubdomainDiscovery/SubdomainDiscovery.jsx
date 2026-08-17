import { useState, useEffect, useCallback } from 'react';
import './SubdomainDiscovery.css';
import { Search, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const SubdomainDiscovery = ({ activeScanId, activeTarget, scansList, handleSelectScan, fetchScans, assignedDomains, selectedDomain, setSelectedDomain }) => {
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewModal, setPreviewModal] = useState(null);
  
  const itemsPerPage = 10;

  const getScreenshotUrl = (rawUrl) => {
    if (!rawUrl) return '';
    const s = String(rawUrl).trim();
    const mediaIdx = s.indexOf('/media/');
    if (mediaIdx !== -1) {
      return s.substring(mediaIdx);
    }
    return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/') ? s : `/${s}`;
  };

  // Load subdomains when activeScanId or selectedDomain changes.
  // silent=true skips the loading spinner so background polls don't flicker.
  const loadSubdomains = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      let allData = [];
      const seenIds = new Set();

      if (selectedDomain && activeScanId) {
        // Specific domain: fetch from that scan only
        const data = await api.get(`/api/attacksurface/subdomains/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        list.forEach(item => { if (!seenIds.has(item.id)) { seenIds.add(item.id); allData.push(item); } });
      } else if (!selectedDomain && scansList && scansList.length > 0) {
        // All Domains: fetch from ALL scans and combine
        for (const scan of scansList) {
          try {
            const data = await api.get(`/api/attacksurface/subdomains/?scan=${scan.id}`);
            const list = Array.isArray(data) ? data : (data.results || []);
            list.forEach(item => { if (!seenIds.has(item.id)) { seenIds.add(item.id); allData.push(item); } });
          } catch (e) { /* skip failed */ }
        }
      } else {
        // Fallback: fetch direct domain or all subdomains
        const ep = selectedDomain
          ? `/api/attacksurface/subdomains/?domain=${encodeURIComponent(selectedDomain)}`
          : `/api/attacksurface/subdomains/`;
        const data = await api.get(ep).catch(() => []);
        const list = Array.isArray(data) ? data : (data.results || []);
        list.forEach(item => { if (!seenIds.has(item.id)) { seenIds.add(item.id); allData.push(item); } });
      }

      setSubdomains(allData);
    } catch (e) {
      console.error("Failed to load subdomains", e);
      setSubdomains([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeScanId, selectedDomain, scansList]);

  // Load when the active scan / selected domain changes
  useEffect(() => {
    if (!selectedDomain && (!scansList || scansList.length === 0)) {
      setSubdomains([]);
      setLoading(false);
      return;
    }
    if (selectedDomain && !activeScanId) {
      setSubdomains([]);
      setLoading(false);
      return;
    }

    loadSubdomains();
  }, [activeScanId, selectedDomain, scansList, loadSubdomains]);

  // Auto-refresh while a scan is still running so late-phase results
  // (ports, screenshots, statuses) appear without a manual page reload.
  useEffect(() => {
    if (!activeScanId) return undefined;
    const activeScan = scansList.find(s => s.id === Number(activeScanId));
    if (!activeScan || (activeScan.status !== 'running' && activeScan.status !== 'pending')) return undefined;
    const interval = setInterval(() => loadSubdomains(true), 5000);
    return () => clearInterval(interval);
  }, [activeScanId, scansList, loadSubdomains]);



  const [statusFilter, setStatusFilter] = useState('ALL');

  // Helper to determine active/inactive status from item.status
  const isSubdomainActive = (item) => {
    const s = (item.status || 'active').toLowerCase();
    return s === 'live' || s === 'active' || s === 'up';
  };

  // Counts for tabs
  const allCount = subdomains.length;
  const activeCount = subdomains.filter(isSubdomainActive).length;
  const inactiveCount = subdomains.filter(item => !isSubdomainActive(item)).length;

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const filteredData = subdomains.filter(item => {
    // Status Filter
    if (statusFilter === 'ACTIVE' && !isSubdomainActive(item)) return false;
    if (statusFilter === 'INACTIVE' && isSubdomainActive(item)) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

  const getScanStatus = (item) => {
    const s = (item.status || 'active').toLowerCase();
    if (s === 'live' || s === 'active' || s === 'up') return { label: 'Active', color: '#22C55E', icon: <CheckCircle2 size={13}/> };
    if (s === 'down' || s === 'inactive') return { label: 'Down', color: '#EF4444', icon: <XCircle size={13}/> };
    return { label: 'Unknown', color: '#94A3B8', icon: <AlertCircle size={13}/> };
  };

  const getEmptyStateText = () => {
    if (statusFilter === 'ACTIVE') return 'No active subdomains found.';
    if (statusFilter === 'INACTIVE') return 'No inactive subdomains found.';
    return 'No subdomains found.';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        
        {/* Active Scan Selector */}
        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />

        {/* Banner Area */}
        <PageHeaderCard 
          title="Attack Surface Discovery"
          stats={[
            {
              label: 'DISCOVERED ASSETS',
              value: allCount.toString(),
              subtext: statusFilter === 'ALL' ? 'Showing all assets' : 'Click to view all',
              active: statusFilter === 'ALL',
              onClick: () => handleFilterChange('ALL')
            },
            {
              label: 'ACTIVE SUBDOMAINS',
              value: activeCount.toString(),
              subtext: statusFilter === 'ACTIVE' ? 'Filter: Active only' : 'Live / up assets',
              active: statusFilter === 'ACTIVE',
              onClick: () => handleFilterChange(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')
            },
            {
              label: 'INACTIVE SUBDOMAINS',
              value: inactiveCount.toString(),
              subtext: statusFilter === 'INACTIVE' ? 'Filter: Inactive only' : 'Down / unreachable',
              active: statusFilter === 'INACTIVE',
              onClick: () => handleFilterChange(statusFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE')
            },
            {
              label: 'ACTIVE SCANS',
              value: scansList.filter(s => s.status === 'running' || s.status === 'pending').length.toString(),
              subtext: 'Running background'
            }
          ]}
        />

        {/* Table Container */}
        <div className="card global-table-wrapper" style={{ marginTop: '1.5rem' }}>
          <div className="global-controls-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            <div>
              <div className="t-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Discovered Subdomains</div>
              <div className="t-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {loading ? "Loading from backend..." : `Showing ${currentData.length} of ${filteredData.length} assets`}
              </div>
            </div>
          </div>

          <div className="sub-table-scroll">
          <table className="sub-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>S.No</th>
                <th style={{ width: '16%' }}>Domain</th>
                <th style={{ width: '7%' }}>Status</th>
                <th style={{ width: '10%' }}>Title</th>
                <th style={{ width: '16%' }}>IP Addresses</th>
                <th style={{ width: '12%' }}>Ports</th>
                <th style={{ width: '10%' }}>Screenshot</th>
                <th style={{ width: '8%' }}>Location</th>
                <th style={{ width: '9%' }}>Created Date</th>
                <th style={{ width: '8%' }}>Updated Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                    Fetching subdomain intelligence...
                  </td>
                </tr>
              ) : currentData.map((item, index) => {
                const statusCfg = getScanStatus(item);
                
                const ips = Array.isArray(item.ip) ? item.ip : (typeof item.ip === 'string' ? item.ip.split(',') : []);
                
                const ports = Array.isArray(item.ports) ? item.ports : (typeof item.ports === 'string' ? item.ports.split(',') : []);
                
                const title = item.title && item.title.length > 20 ? item.title.substring(0, 20) + '...' : (item.title || '-');

                return (
                  <tr key={item.id || index}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {startIndex + index + 1}
                    </td>
                    <td className="td-domain">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.domain}</span>
                      </div>
                    </td>
                    <td>
                      <span className="sub-status-pill" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: '4px', background: `${statusCfg.color}15`, color: statusCfg.color, fontWeight: 600, fontSize: '0.75rem' }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} title={item.title}>
                      {title}
                    </td>
                    <td className="td-ip" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>
                      {ips.length > 0 ? (
                        <div className="sub-ip-list">
                          {ips.map((ip, i) => (
                            <span key={i} className="sub-ip-chip" title={String(ip).trim()}>{String(ip).trim()}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          DNS Not Found
                        </span>
                      )}
                    </td>
                    <td className="td-ports" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {ports.length > 0 ? (
                        <div className="sub-port-list">
                          {ports.map((p, i) => (
                            <span key={i} className="sub-port-pill">{String(p).trim()}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {item.screenshot_url ? (
                        <div 
                          className="shot-thumb" 
                          onClick={() => setPreviewModal({ url: getScreenshotUrl(item.screenshot_url), domain: item.domain })}
                          title="Click to preview screenshot"
                          style={{ cursor: 'pointer' }}
                        >
                          <img 
                            src={getScreenshotUrl(item.screenshot_url)} 
                            alt={`Screenshot of ${item.domain}`} 
                            loading="lazy" 
                            className="shot-img" 
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.parentElement) {
                                e.target.parentElement.innerHTML = '<span class="shot-empty">No preview</span>';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <span className="shot-empty">No screenshot</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.location ? item.location : '-'}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }} title={item.created_date}>
                      {formatDate(item.created_date)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }} title={item.updated_date}>
                      {formatDate(item.updated_date)}
                    </td>
                  </tr>
                  );
              })}

              {!loading && currentData.length === 0 && (
                <tr>
                  <td colSpan="10" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                    {getEmptyStateText()}
                  </td>
                </tr>
              )}

                          </tbody>
          </table>
          </div>

          {/* Footer Area */}
          <div className="table-footer">
            <div className="footer-info">
              Showing {filteredData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} subdomains
            </div>
            <div className="footer-pagination">
              <button 
                className="page-btn" 
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                style={{opacity: currentPage <= 1 ? 0.3 : 1}}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span>Page {totalPages === 0 ? 0 : currentPage} of {totalPages}</span>
              <button 
                className="page-btn" 
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || totalPages === 0}
                style={{opacity: (currentPage >= totalPages || totalPages === 0) ? 0.3 : 1}}
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {previewModal && (
        <div 
          className="shot-modal-overlay" 
          onClick={() => setPreviewModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '2rem'
          }}
        >
          <div 
            className="shot-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '92vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📸</span>
                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600 }}>
                  Screenshot: {previewModal.domain}
                </h4>
              </div>
              <button 
                onClick={() => setPreviewModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.6rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '0 0.5rem'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ overflow: 'auto', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--border-color, #334155)', background: '#0b0f19' }}>
              <img 
                src={previewModal.url} 
                alt={`Screenshot of ${previewModal.domain}`} 
                style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <a 
                href={previewModal.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  color: '#fff',
                  textDecoration: 'none',
                  background: 'var(--accent-color, #3b82f6)',
                  fontWeight: 500
                }}
              >
                Open Full Image in New Tab ↗
              </a>
              <button 
                onClick={() => setPreviewModal(null)}
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
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

export default SubdomainDiscovery;
