import React, { useState, useEffect } from 'react';
import './Endpoints.css';
import { Search, Filter, Lock, ArrowRight, ChevronDown, Check, CheckCircle2, X, RefreshCw } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const Endpoints = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [riskFilter, setRiskFilter] = useState('All Risks');
  
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const [showRiskMenu, setShowRiskMenu] = useState(false);
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch endpoints on mount and when activeScanId changes
  useEffect(() => {
    const loadEndpoints = async () => {
      if (!activeScanId) {
        setEndpoints([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/endpoints/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        list.sort((a, b) => (b.threat_count || 0) - (a.threat_count || 0));
        setEndpoints(list);
      } catch (e) {
        console.error("Failed to load endpoints", e);
        setEndpoints([]);
      } finally {
        setLoading(false);
      }
    };
    loadEndpoints();
  }, [activeScanId]);

  const getPathFromUrl = (urlStr) => {
    try {
      if (urlStr.startsWith('/') || !urlStr.includes('://')) {
        return urlStr;
      }
      const urlObj = new URL(urlStr);
      return urlObj.pathname + urlObj.search;
    } catch (e) {
      return urlStr;
    }
  };

  const getAssetFromUrl = (urlStr, fallback) => {
    try {
      if (!urlStr.includes('://')) return fallback || urlStr;
      const urlObj = new URL(urlStr);
      return urlObj.hostname;
    } catch (e) {
      return fallback || urlStr;
    }
  };

  const mapRisk = (threatCount) => {
    if (threatCount >= 5) return 'CRITICAL';
    if (threatCount >= 3) return 'HIGH';
    if (threatCount >= 1) return 'MEDIUM';
    return 'LOW';
  };

  const mapAuth = (status) => {
    if (status === 401 || status === 403) return 'Authenticated';
    return 'Unauthenticated';
  };

  // Filtering Logic
  const filteredData = endpoints.filter(ep => {
    const path = getPathFromUrl(ep.http_url);
    const asset = ep.subdomain_name || getAssetFromUrl(ep.http_url, '');
    const epId = `EP-${ep.id}`;
    
    const matchesSearch = path.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          epId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === 'All Methods' || ep.method === methodFilter;
    const matchesRisk = riskFilter === 'All Risks' || mapRisk(ep.threat_count) === riskFilter.toUpperCase();

    return matchesSearch && matchesMethod && matchesRisk;
  });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Path', 'Method', 'Status', 'Risk Score', 'Asset', 'Authentication', 'Discovered'];
    
    const csvRows = filteredData.map(ep => [
      `EP-${ep.id}`,
      getPathFromUrl(ep.http_url),
      ep.method,
      ep.http_status || '200',
      mapRisk(ep.threat_count),
      ep.subdomain_name || getAssetFromUrl(ep.http_url, ''),
      mapAuth(ep.http_status),
      ep.discovered_at ? new Date(ep.discovered_at).toLocaleDateString() : 'Recent'
    ].map(val => `"${val}"`).join(','));
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'endpoints_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast(`Successfully exported ${filteredData.length} endpoints to CSV.`);
  };

  const methodOptions = ['All Methods', 'GET', 'POST', 'PUT', 'DELETE'];
  const riskOptions = ['All Risks', 'Critical', 'High', 'Medium', 'Low'];

  // Stats calculation
  const totalRoutes = endpoints.length;
  const unauthHigh = endpoints.filter(ep => mapAuth(ep.http_status) === 'Unauthenticated' && ep.threat_count > 0).length;
  const exposedConfigs = endpoints.filter(ep => ep.http_url.includes('config') || ep.http_url.includes('env') || ep.http_url.includes('.git')).length;
  const failedRequests = endpoints.filter(ep => ep.http_status >= 400).length;

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        
        <PageHeaderCard 
          badgeText="ENDPOINTS"
          title="Endpoints"
          subtitle="Discovered API endpoints and web routes across your assets."
          stats={[
            { label: 'Unauthenticated API', value: unauthHigh.toString(), subtext: 'Threat Detected' },
            { label: 'Exposed Files/Configs', value: exposedConfigs.toString(), subtext: 'Needs review' },
            { label: 'Active Routes', value: totalRoutes.toString(), subtext: 'Total cataloged' },
            { label: 'Failed Requests', value: failedRequests.toString(), subtext: 'Error responses' }
          ]}
        />

        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />

        {/* Filters and Controls */}
        <div className="global-controls-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="global-search-box">
              <Search size={16} color="#94A3B8" />
              <input 
                type="text" 
                placeholder="Search by path, asset, or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Method Dropdown */}
            <div className="global-custom-select">
              <div className="global-custom-select-btn" onClick={() => setShowMethodMenu(!showMethodMenu)}>
                {methodFilter} <ChevronDown size={14} />
              </div>
              {showMethodMenu && (
                <div className="global-custom-dropdown-menu" style={{ width: '150px' }}>
                  {methodOptions.map(opt => (
                    <div 
                      key={opt}
                      className={`global-custom-dropdown-item ${methodFilter === opt ? 'active' : ''}`}
                      onClick={() => { setMethodFilter(opt); setShowMethodMenu(false); }}
                    >
                      <span>{opt}</span>
                      {methodFilter === opt && <Check size={14} color="#2563EB" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk Dropdown */}
            <div className="global-custom-select">
              <div className="global-custom-select-btn" onClick={() => setShowRiskMenu(!showRiskMenu)}>
                {riskFilter} <ChevronDown size={14} />
              </div>
              {showRiskMenu && (
                <div className="global-custom-dropdown-menu" style={{ width: '150px' }}>
                  {riskOptions.map(opt => (
                    <div 
                      key={opt}
                      className={`global-custom-dropdown-item ${riskFilter === opt ? 'active' : ''}`}
                      onClick={() => { setRiskFilter(opt); setShowRiskMenu(false); }}
                    >
                      <span>{opt}</span>
                      {riskFilter === opt && <Check size={14} color="#2563EB" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="global-table-wrapper">
          <table className="ep-table">
            <thead>
              <tr>
                <th>ID / Path</th>
                <th>Method & Status</th>
                <th>Risk Score</th>
                <th>Asset</th>
                <th>Authentication</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                    Loading endpoints from database...
                  </td>
                </tr>
              ) : filteredData.map(ep => {
                const path = getPathFromUrl(ep.http_url);
                const asset = ep.subdomain_name || getAssetFromUrl(ep.http_url, 'Default Asset');
                const risk = mapRisk(ep.threat_count);
                const auth = mapAuth(ep.http_status);
                const dateStr = ep.discovered_at ? new Date(ep.discovered_at).toLocaleDateString() : 'Recent';
                return (
                  <tr key={ep.id}>
                    <td>
                      <div className="ep-path">{path}</div>
                      <div className="ep-id-row">
                        <span className="ep-id-badge">EP-{ep.id}</span> • Discovered {dateStr}
                      </div>
                    </td>
                    <td>
                      <span className={`ep-method-pill method-${(ep.method || 'GET').toLowerCase()}`}>{ep.method || 'GET'}</span>
                      <div className="ep-status-txt">Status: {ep.http_status || '200'}</div>
                    </td>
                    <td>
                      <span className={`ep-risk-pill ${
                        risk === 'CRITICAL' ? 'risk-crit' : 
                        risk === 'HIGH' ? 'risk-high' : 
                        risk === 'MEDIUM' ? 'risk-med' : 'risk-low'
                      }`}>
                        <div className="dot"></div> {risk}
                      </span>
                    </td>
                    <td>
                      <div className="ep-asset-txt">{asset}</div>
                    </td>
                    <td>
                      <span className={`ep-auth-pill ${auth === 'Unauthenticated' ? 'auth-unauth' : 'auth-auth'}`}>
                        {auth}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredData.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    No endpoints found for this scan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="ep-toast">
          <CheckCircle2 size={18} color="#10B981" />
          {toastMessage}
        </div>
      )}



      {/* Investigate Modal */}
      {selectedEndpoint && (
        <div className="ep-modal-overlay">
          <div className="ep-modal-content" style={{ width: '600px' }}>
            <div className="ep-modal-header">
              <div>
                <h2 className="ep-modal-title">Endpoint Details</h2>
                <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.25rem' }}>EP-{selectedEndpoint.id}</div>
              </div>
              <button className="ep-modal-close" onClick={() => setSelectedEndpoint(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="ep-modal-body">
              
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', wordBreak: 'break-all' }}>
                <span className={`ep-method-pill method-${(selectedEndpoint.method || 'GET').toLowerCase()}`} style={{ marginRight: '0.5rem', marginBottom: 0 }}>{selectedEndpoint.method || 'GET'}</span>
                {selectedEndpoint.http_url}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <div className="ep-form-label">Risk Level</div>
                  <span className={`ep-risk-pill ${
                    mapRisk(selectedEndpoint.threat_count) === 'CRITICAL' ? 'risk-crit' : 
                    mapRisk(selectedEndpoint.threat_count) === 'HIGH' ? 'risk-high' : 
                    mapRisk(selectedEndpoint.threat_count) === 'MEDIUM' ? 'risk-med' : 'risk-low'
                  }`}>
                    <div className="dot"></div> {mapRisk(selectedEndpoint.threat_count)}
                  </span>
                </div>
                <div>
                  <div className="ep-form-label">Authentication</div>
                  <span className={`ep-auth-pill ${mapAuth(selectedEndpoint.http_status) === 'Unauthenticated' ? 'auth-unauth' : 'auth-auth'}`}>
                    {mapAuth(selectedEndpoint.http_status)}
                  </span>
                </div>
                <div>
                  <div className="ep-form-label">Status Response</div>
                  <div className="ep-status-txt" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{selectedEndpoint.http_status || '200 (OK)'}</div>
                </div>
                <div>
                  <div className="ep-form-label">Content details</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Type: {selectedEndpoint.content_type || 'application/json'} ({selectedEndpoint.content_length || '0'} bytes)</div>
                </div>
              </div>

            </div>
            <div className="ep-modal-footer">
              <button className="ep-btn-cancel" onClick={() => setSelectedEndpoint(null)}>Close</button>
              <button className="ep-btn-save" onClick={() => { setSelectedEndpoint(null); triggerToast(`Started deep scan on EP-${selectedEndpoint.id}`); }}>Run Deep Scan</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Endpoints;
