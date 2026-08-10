import React, { useState, useEffect } from 'react';
import './SubdomainDiscovery.css';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Globe2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const SubdomainDiscovery = ({ activeScanId, activeTarget, scansList, handleSelectScan, fetchScans, assignedDomains, selectedDomain, setSelectedDomain }) => {
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  // Load subdomains when activeScanId or selectedDomain changes
  useEffect(() => {
    const loadSubdomains = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

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
  }, [activeScanId, selectedDomain, scansList]);



  const filteredData = subdomains.filter(item =>
    item.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(item.ip) ? item.ip.join(', ') : item.ip || '').includes(searchTerm)
  );

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
            { label: 'DISCOVERED ASSETS', value: subdomains.length.toString() },
            { label: 'ACTIVE SCANS', value: scansList.filter(s => s.status === 'running' || s.status === 'pending').length.toString() },
            { label: 'NEW THIS WEEK', value: '+18' },
            { label: 'AVG. SCAN TIME', value: '42s' }
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

          <table className="sub-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>S.No</th>
                <th style={{ width: '20%' }}>Domain</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '15%' }}>Title</th>
                <th style={{ width: '15%' }}>IP Addresses</th>
                <th style={{ width: '10%' }}>Ports</th>
                <th style={{ width: '15%' }}>Screenshot</th>
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
                const firstIp = ips.length > 0 ? ips[0].trim() : '-';
                const extraIps = ips.length > 1 ? ips.length - 1 : 0;
                
                const ports = Array.isArray(item.ports) ? item.ports : (typeof item.ports === 'string' ? item.ports.split(',') : []);
                const firstPort = ports.length > 0 ? ports[0].trim() : '-';
                const extraPorts = ports.length > 1 ? ports.length - 1 : 0;
                
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
                    <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {firstIp !== '-' && firstIp}
                        {firstIp === '-' && '-'}
                        {extraIps > 0 && <span className="sub-badge-count">+{extraIps}</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ background: 'var(--bg-main)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>{firstPort !== '-' ? `${firstPort}` : '-'}</span>
                        {extraPorts > 0 && <span className="sub-badge-count">+{extraPorts}</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {item.screenshot_url ? (
                        <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer">
                          <img src={item.screenshot_url} alt="Screenshot" style={{ height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        </a>
                      ) : 'No screenshot'}
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
                    No subdomains found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
