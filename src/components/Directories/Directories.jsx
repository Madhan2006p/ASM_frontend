import { useState, useEffect } from 'react';
import './Directories.css';
import {
  Folder, FolderOpen, Lock, Database, Globe, RefreshCw,
  ExternalLink, FileText, KeyRound, Code2, ScrollText, GitBranch, Server,
  LogIn, FileQuestion, Bug, ChevronLeft, ChevronRight
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

// Backend categories that are treated as sensitive information disclosures.
const SENSITIVE_CATEGORIES = new Set([
  'Directory Listing', 'Backup File', 'Config File', 'Environment File',
  'Credentials / Secrets', 'Database Dump', 'Source Code', 'Log File',
  'VCS Metadata', 'Internal Path', 'Private Document', 'Sensitive Metadata'
]);

// Categories whose mere 2xx presence is an exposure (used for legacy fallback).
const EXPOSED_CATEGORIES = new Set([
  'Directory Listing', 'Backup File', 'Config File', 'Environment File',
  'Credentials / Secrets', 'Database Dump', 'Source Code', 'Log File',
  'VCS Metadata', 'Internal Path', 'Private Document', 'Sensitive Metadata'
]);

const Directories = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPill, setFilterPill] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch directories
  useEffect(() => {
    const loadDirectories = async () => {
      if (!activeScanId) {
        setDirectories([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/directories/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        setDirectories(list);
      } catch (e) {
        console.error("Failed to load directories", e);
        setDirectories([]);
      } finally {
        setLoading(false);
      }
    };
    loadDirectories();
  }, [activeScanId]);

  // ── Legacy fallbacks (only used for rows stored before the analysis engine) ──
  const getPathFromUrl = (urlStr) => {
    try {
      if (urlStr.startsWith('/') || !urlStr.includes('://')) {
        return urlStr;
      }
      const urlObj = new URL(urlStr);
      return urlObj.pathname;
    } catch {
      return urlStr;
    }
  };

  const getCategory = (path) => {
    const p = path.toLowerCase();
    if (/\.(zip|tar\.gz|sql|bak|old|dump)$/.test(p) || p.includes('backup')) return 'Backup File';
    if (p.includes('.env')) return 'Environment File';
    if (p.includes('.git') || p.includes('.svn') || p.includes('.hg')) return 'VCS Metadata';
    if (p.includes('admin') || p.includes('wp-admin') || p.includes('panel') || p.includes('phpmyadmin')) return 'Admin Panel';
    if (p.includes('login') || p.includes('wp-login') || p.includes('signin')) return 'Login Page';
    if (p.includes('config') || p.includes('secret') || p.includes('private') || p.includes('.htaccess')) return 'Config File';
    if (p.includes('server-status') || p.includes('server-info')) return 'Sensitive Metadata';
    if (p.includes('/api/') || p.includes('/graphql') || p.includes('swagger')) return 'API Endpoint';
    if (p.includes('/log') || p.endsWith('.log')) return 'Log File';
    if (/^(index|default)\.(php|html|aspx|jsp)$/.test(p)) return 'Public File';
    if (/\.(php|py|js|java|rb|go|c|cpp|ts)$/.test(p) && !p.includes('/static/')) return 'Source Code';
    if (/\.(css|js|png|jpe?g|gif|svg|ico|woff2?|ttf|map)$/.test(p) || p.includes('/static/') || p.includes('/assets/')) return 'Static Asset';
    return 'Public File';
  };

  const getRisk = (category, status) => {
    if (status === 403 || status === 401 || status === 404 || status === 0 || status == null || status >= 500) return 'LOW';
    if (category === 'Credentials / Secrets' || category === 'Environment File' || category === 'Database Dump') return 'CRITICAL';
    if (category === 'Backup File' || category === 'VCS Metadata' || category === 'Config File' || category === 'Source Code') return 'HIGH';
    if (category === 'Admin Panel' || category === 'Directory Listing' || category === 'Log File' || category === 'Internal Path' || category === 'Private Document' || category === 'Sensitive Metadata') return 'MEDIUM';
    return 'LOW';
  };

  const getStatus = (status, category) => {
    if (status === 0 || status == null) return 'Unreachable';
    if (status === 401 || status === 407) return 'Protected';
    if (status === 403) return 'Forbidden';
    if (status === 404) return 'Not Found';
    if (status === 405) return 'Restricted';
    if (status >= 500) return 'Error';
    if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) return 'Redirected';
    if (status === 200 || status === 201 || status === 204) {
      // Legacy rows: only flag a 2xx as Exposed when the path itself is sensitive.
      return EXPOSED_CATEGORIES.has(category) ? 'Exposed' : 'Public';
    }
    return 'Public';
  };

  // ── Category presentation ──
  const getIcon = (cat) => {
    switch (cat) {
      case 'Admin Panel': return <Lock size={16} />;
      case 'Backup File': return <Database size={16} />;
      case 'Credentials / Secrets': return <KeyRound size={16} />;
      case 'Environment File': return <FileText size={16} />;
      case 'Database Dump': return <Database size={16} />;
      case 'Source Code': return <Code2 size={16} />;
      case 'Log File': return <ScrollText size={16} />;
      case 'Directory Listing': return <FolderOpen size={16} />;
      case 'VCS Metadata': return <GitBranch size={16} />;
      case 'Internal Path': return <Server size={16} />;
      case 'Sensitive Metadata': return <Bug size={16} />;
      case 'Config File': return <FileText size={16} />;
      case 'Private Document': return <Lock size={16} />;
      case 'API Endpoint': return <Globe size={16} />;
      case 'Login Page': return <LogIn size={16} />;
      case 'Not Found': return <FileQuestion size={16} />;
      case 'Static Asset': return <FileText size={16} />;
      default: return <Folder size={16} />;
    }
  };

  // ── Enrichment: backend classification wins, legacy fallbacks for old rows ──
  // NOTE: the numeric HTTP status is preserved as `httpStatus` so the
  // "HTTP Response" column can render the real code (e.g. "401 Unauthorized")
  // while `status` carries the semantic access status (e.g. "Protected").
  const filteredData = directories.map(item => {
    const path = getPathFromUrl(item.url);
    const httpStatus = item.status;
    const category = item.category || getCategory(path);
    const risk = item.risk || getRisk(category, httpStatus);
    const status = item.access_status || getStatus(httpStatus, category);
    const isSensitive = item.is_sensitive !== undefined
      ? item.is_sensitive
      : (SENSITIVE_CATEGORIES.has(category) || status === 'Exposed');
    const matches = Array.isArray(item.sensitive_matches) ? item.sensitive_matches : [];
    return {
      ...item,
      httpStatus,
      path,
      category,
      risk,
      status,
      isSensitive,
      matches,
      icon: getIcon(category)
    };
  }).filter(item => {
    // Card Filter
    if (filterPill === 'Exposed' && item.status !== 'Exposed') return false;
    if (filterPill === 'Sensitive' && !item.isSensitive) return false;
    if (filterPill === 'High / Critical Risk' && item.risk !== 'HIGH' && item.risk !== 'CRITICAL') return false;

    return true;
  }).sort((a, b) => {
    const riskWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    const riskDiff = (riskWeight[b.risk] || 0) - (riskWeight[a.risk] || 0);
    if (riskDiff !== 0) return riskDiff;
    const statusWeight = { 'Exposed': 5, 'Restricted': 4, 'Protected': 3, 'Forbidden': 2, 'Redirected': 1, 'Error': 0, 'Unreachable': 0, 'Not Found': 0, 'Public': 0 };
    return (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
  });

  // Reset to page 1 on filter or scan changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPill, activeScanId]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const validPage = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const startIndex = (validPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

  const HTTP_LABELS = {
    200: '200 OK', 201: '201 Created', 204: '204 No Content',
    301: '301 Moved', 302: '302 Found', 303: '303 See Other',
    307: '307 Redirect', 308: '308 Redirect',
    401: '401 Unauthorized', 403: '403 Forbidden', 404: '404 Not Found',
    405: '405 Not Allowed', 410: '410 Gone',
    500: '500 Server Error', 501: '501 Not Implemented', 502: '502 Bad Gateway', 503: '503 Unavailable',
  };
  const getHttpLabel = (s) => HTTP_LABELS[s] || (s ? `HTTP ${s}` : 'Unreachable');

  const getStatusClass = (status) => {
    if (status === 'Exposed')     return 'st-exposed';
    if (status === 'Public')      return 'st-public';
    if (status === 'Protected')   return 'st-protected';
    if (status === 'Restricted')  return 'st-restricted';
    if (status === 'Redirected')  return 'st-redirected';
    if (status === 'Forbidden')   return 'st-forbidden';
    if (status === 'Not Found')   return 'st-notfound';
    if (status === 'Error')       return 'st-notfound';
    if (status === 'Unreachable') return 'st-notfound';
    return 'st-notfound';
  };

  const getRiskClass = (risk) => {
    if (risk === 'CRITICAL') return 'risk-crit';
    if (risk === 'HIGH') return 'risk-high';
    if (risk === 'MEDIUM') return 'risk-med';
    return 'risk-low';
  };

  const getHttpStyle = (status) => {
    if (status === 200 || status === '200') return { color: '#4ADE80', backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)' };
    if (status === 403 || status === '403') return { color: '#F87171', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' };
    return { color: '#94A3B8', backgroundColor: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.2)' };
  };

  // Stats — aligned with backend classification
  const totalCount = directories.length;
  const exposedCount = directories.filter(d => (d.access_status || getStatus(d.status, d.category || getCategory(getPathFromUrl(d.url)))) === 'Exposed').length;
  const sensitiveCount = directories.filter(d => {
    if (d.is_sensitive !== undefined) return d.is_sensitive;
    return SENSITIVE_CATEGORIES.has(d.category || getCategory(getPathFromUrl(d.url)));
  }).length;
  const highRiskCount = directories.filter(d => {
    const risk = d.risk || getRisk(d.category || getCategory(getPathFromUrl(d.url)), d.status);
    return risk === 'HIGH' || risk === 'CRITICAL';
  }).length;

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

  return (
    <div className="global-page-container">
      <div className="global-max-width">

        <ScanSelector
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />

        <PageHeaderCard
          title="Directories"
          stats={[
            { label: 'ALL DIRECTORIES', value: totalCount.toString(), subtext: 'Verified accessible paths', onClick: () => setFilterPill('All') },
            { label: 'EXPOSED', value: exposedCount.toString(), subtext: 'Sensitive content accessible', onClick: () => setFilterPill('Exposed') },
            { label: 'SENSITIVE', value: sensitiveCount.toString(), subtext: 'Requires review', onClick: () => setFilterPill('Sensitive') },
            { label: 'CRITICAL / HIGH RISK', value: highRiskCount.toString(), subtext: 'Priority remediation', onClick: () => setFilterPill('High / Critical Risk') }
          ]}
        />

        {/* Table */}
        <div className="card global-table-wrapper">
          <table className="dir-table">
            <thead>
              <tr>
                <th>Directory Path</th>
                <th>Category</th>
                <th>HTTP Response</th>
                <th>Subdomain Scope</th>
                <th>Risk Level</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Updated Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                    Loading directories from scan database...
                  </td>
                </tr>
              ) : currentData.map(item => {
                const createdStr = formatDate(item.created_date || item.created_at || item.created || item.directories_created);
                const updatedStr = formatDate(item.updated_date || item.updated_at || item.updated || item.created);
                return (
                  <tr key={item.id}>
                    <td className="dir-path">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{item.path}</span>
                        <a
                          href={item.url && item.url.includes('://') ? item.url : `http://${item.subdomain_name || selectedDomain || 'localhost'}${item.path.startsWith('/') ? '' : '/'}${item.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', opacity: 0.8, transition: 'opacity 0.2s' }}
                          title="Open resource in new tab"
                          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = 0.8}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      {item.matches.length > 0 && (
                        <div className="dir-match-chips">
                          {item.matches.slice(0, 4).map(m => (
                            <span key={m} className="dir-match-chip" title={`Detected: ${m.replace(/_/g, ' ')}`}>{m.replace(/_/g, ' ')}</span>
                          ))}
                          {item.matches.length > 4 && <span className="dir-match-chip dir-match-more">+{item.matches.length - 4}</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="dir-category" title={item.category}>
                        {item.icon}
                        <span>{item.category}</span>
                      </div>
                    </td>
                    <td>
                      <span className="dir-access" style={getHttpStyle(item.httpStatus)} title={`HTTP ${item.httpStatus}`}>{getHttpLabel(item.httpStatus)}</span>
                    </td>
                    <td>
                      <span className="dir-assets" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{item.subdomain_name || 'root domain'}</span>
                    </td>
                    <td>
                      <span className={`dir-risk-pill ${getRiskClass(item.risk)}`}>
                        <div className="dot"></div> {item.risk}
                      </span>
                    </td>
                    <td>
                      <span className={`dir-status-pill ${getStatusClass(item.status)}`}>{item.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }} title={item.created_date || item.created_at || item.created || item.directories_created}>
                      {createdStr}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }} title={item.updated_date || item.updated_at || item.updated}>
                      {updatedStr}
                    </td>
                  </tr>
                );
              })}
              {!loading && currentData.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    No directories found for this scan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="table-footer">
            <div className="footer-info">
              Showing {filteredData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} directories
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
              <span>Page {totalPages === 0 ? 0 : validPage} of {totalPages}</span>
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
    </div>
  );
};

export default Directories;
