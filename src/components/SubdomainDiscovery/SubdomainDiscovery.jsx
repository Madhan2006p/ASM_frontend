import { useState, useEffect, useCallback } from 'react';
import './SubdomainDiscovery.css';
import { Search, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const SubdomainDiscovery = ({ activeScanId, activeTarget, scansList, handleSelectScan, fetchScans, assignedDomains, selectedDomain, setSelectedDomain }) => {
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

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

    // Search Term Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const domainMatch = (item.domain || '').toLowerCase().includes(term);
      const ipMatch = (Array.isArray(item.ip) ? item.ip.join(', ') : item.ip || '').toLowerCase().includes(term);
      const titleMatch = (item.title || '').toLowerCase().includes(term);
      if (!domainMatch && !ipMatch && !titleMatch) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };

  const getScanStatus = (item) => {
    const s = (item.status || 'active').toLowerCase();
    if (s === 'live' || s === 'active' || s === 'up') return { label: 'Active', color: '#22C55E', icon: <CheckCircle2 size={13}/> };
    if (s === 'down' || s === 'inactive') return { label: 'Down', color: '#EF4444', icon: <XCircle size={13}/> };
    return { label: 'Unknown', color: '#94A3B8', icon: <AlertCircle size={13}/> };
  };

  const getEmptyStateText = () => {
    if (searchTerm) return `No subdomains found matching "${searchTerm}".`;
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
          badgeText="DISCOVERY"
          title="Attack Surface Discovery"
          subtitle="Monitor and enumerate every external-facing asset across your perimeter."
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
            <div className="global-search-box">
              <Search size={16} color="#94A3B8" />
              <input 
                type="text" 
                placeholder="Filter domains or IPs..." 
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <div className="sub-table-scroll">
          <table className="sub-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>S.No</th>
                <th style={{ width: '18%' }}>Domain</th>
                <th style={{ width: '8%' }}>Status</th>
                <th style={{ width: '12%' }}>Title</th>
                <th style={{ width: '21%' }}>IP Addresses</th>
                <th style={{ width: '15%' }}>Ports</th>
                <th style={{ width: '12%' }}>Screenshot</th>
                <th style={{ width: '10%' }}>Location</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
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
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
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
                        <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" className="shot-thumb" title="Open full screenshot">
                          <img src={item.screenshot_url} alt={`Screenshot of ${item.domain}`} loading="lazy" className="shot-img" />
                        </a>
                      ) : (
                        <span className="shot-empty">No screenshot</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.location ? item.location : '-'}
                      </div>
                    </td>
                  </tr>
                  );
              })}

              {!loading && currentData.length === 0 && (
                <tr>
                  <td colSpan="8" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                    {getEmptyStateText()}
                  </td>
                </tr>
              )}

                          </tbody>
          </table>
          </div>

          {/* Footer Area */}
          <div className="table-footer">
            <div className="footer-sync">
              <RefreshCw size={14} color="#94A3B8" /> Realtime sync enabled
            </div>
            <div className="footer-pagination">
              <button 
                className="page-btn" 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                style={{opacity: currentPage === 1 ? 0.3 : 1}}
              >
                <ChevronLeft size={16} />
              </button>
              <span>Page {totalPages === 0 ? 0 : currentPage} of {totalPages}</span>
              <button 
                className="page-btn" 
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{opacity: (currentPage === totalPages || totalPages === 0) ? 0.3 : 1}}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SubdomainDiscovery;
