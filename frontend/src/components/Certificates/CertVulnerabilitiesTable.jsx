import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert
} from 'lucide-react';
import './CertDashboard.css';

const CertVulnerabilitiesTable = ({
  vulnerabilities = [],
  loading = false,
  selectedSeverityFilter = 'ALL'
}) => {
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVulnType, setSelectedVulnType] = useState('All');
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState('sNo');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination state
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Unique vulnerability names for dropdown
  const vulnOptions = useMemo(() => {
    const set = new Set(vulnerabilities.map((v) => v.vulnerability).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [vulnerabilities]);

  // Filtering logic
  const filteredVulns = useMemo(() => {
    return vulnerabilities.filter((item) => {
      // 1. Status / Severity Filter (from top cards)
      if (selectedSeverityFilter && selectedSeverityFilter !== 'ALL' && selectedSeverityFilter !== 'overall') {
        const target = selectedSeverityFilter.toLowerCase();
        const matchesStatus = (item.status || '').toLowerCase() === target;
        const matchesSev = (item.severity || '').toLowerCase() === target;
        if (!matchesStatus && !matchesSev) {
          return false;
        }
      }

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesVuln = item.vulnerability?.toLowerCase().includes(q);
        const matchesDomain = item.domain?.toLowerCase().includes(q);
        const matchesIp = item.ip?.toLowerCase().includes(q);
        const matchesStatus = item.status?.toLowerCase().includes(q);
        if (!matchesVuln && !matchesDomain && !matchesIp && !matchesStatus) {
          return false;
        }
      }

      // 3. Vulnerability Type Dropdown Filter
      if (selectedVulnType !== 'All' && item.vulnerability !== selectedVulnType) {
        return false;
      }

      return true;
    });
  }, [vulnerabilities, selectedSeverityFilter, searchQuery, selectedVulnType]);

  // Sorting logic
  const sortedVulns = useMemo(() => {
    return [...filteredVulns].sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredVulns, sortField, sortDirection]);

  // Pagination slice
  const totalRows = sortedVulns.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedVulns = sortedVulns.slice(startIndex, startIndex + pageSize);

  // Sorting toggle handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters handler
  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedVulnType('All');
    setCurrentPage(1);
    setShowFilterPopover(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Toolbar (Search, Vulnerability Dropdown, Add Filters, Clear All, Rows per page, Pagination) */}
      <div className="ssl-toolbar-container">
        
        {/* Left Toolbar Controls */}
        <div className="ssl-toolbar-left">
          
          {/* Search Box */}
          <div className="ssl-search-box">
            <Search size={16} className="ssl-search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="ssl-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Vulnerability Dropdown */}
          <select
            className="ssl-dropdown-btn"
            value={selectedVulnType}
            onChange={(e) => {
              setSelectedVulnType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">Vulner... ∨ (All Vulnerabilities)</option>
            {vulnOptions.filter((v) => v !== 'All').map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          {/* Add Filters Button & Popover */}
          <div style={{ position: 'relative' }}>
            <button
              className="ssl-btn-add-filter"
              onClick={() => setShowFilterPopover(!showFilterPopover)}
            >
              <Plus size={14} /> + Add Filters <ChevronDown size={14} />
            </button>

            {showFilterPopover && (
              <div className="ssl-filter-popover">
                <div className="ssl-filter-title">Filter Vulnerabilities</div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    className="ssl-btn-clear-all"
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => setShowFilterPopover(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear All Button */}
          {(searchQuery || selectedVulnType !== 'All' || (selectedSeverityFilter && selectedSeverityFilter !== 'ALL')) && (
            <button className="ssl-btn-clear-all" onClick={handleClearAll}>
              Clear All <X size={14} />
            </button>
          )}

        </div>

        {/* Right Toolbar Controls (Rows Per Page & Pagination) */}
        <div className="ssl-toolbar-right">
          
          <div className="ssl-pagination-rows">
            <span>Show by</span>
            <select
              className="ssl-rows-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10 Rows</option>
              <option value={20}>20 Rows</option>
              <option value={50}>50 Rows</option>
              <option value={100}>100 Rows</option>
            </select>
          </div>

          <div className="ssl-pagination-controls">
            <button
              className="ssl-page-btn"
              disabled={validPage <= 1 || totalRows === 0}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {totalRows === 0 ? '0 - 0 of 0' : `${startIndex + 1} - ${Math.min(startIndex + pageSize, totalRows)} of ${totalRows}`}
            </span>
            <button
              className="ssl-page-btn"
              disabled={validPage >= totalPages || totalRows === 0}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>

        </div>

      </div>

      {/* 3. Vulnerability Data Table */}
      <div className="ssl-table-card">
        <div className="ssl-table-wrapper">
          <table className="ssl-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>
                  <div className="ssl-th-content" onClick={() => handleSort('sNo')}>
                    S.No <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('domain')}>
                    Domain <Filter size={12} /> <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('ip')}>
                    IP <Filter size={12} />
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('sslGrade')}>
                    SSL Grade <Filter size={12} /> <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('vulnerability')}>
                    Vulnerability <Filter size={12} /> <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('severity')}>
                    Severity <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content">
                    Action
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('status')}>
                    Status <span>⇅</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedVulns.map((row, index) => {
                const globalIndex = startIndex + index + 1;
                const sevKey = (row.severity || 'LOW').toLowerCase();
                const gradeKey = (row.sslGrade || 'B').charAt(0).toLowerCase();

                return (
                  <tr key={row.id || index}>
                    <td style={{ fontWeight: '600' }}>{row.sNo || globalIndex}</td>
                    <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      {row.domain}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {row.ip || '103.243.32.9'}
                    </td>
                    <td>
                      <span className={`ssl-grade-badge grade-${gradeKey}`}>
                        {row.sslGrade || 'B'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--brand-primary)', maxWidth: '240px' }}>
                      {row.vulnerability}
                    </td>
                    <td>
                      <span className={`ssl-severity-pill ${sevKey}`}>
                        {row.severity || 'LOW'}
                      </span>
                    </td>
                    <td>
                      <select
                        className="ssl-action-select"
                        value={row.action || 'Remediate'}
                        onChange={(e) => {
                          row.action = e.target.value;
                        }}
                      >
                        <option value="Remediate">Remediate</option>
                        <option value="Re-scan">Re-scan</option>
                        <option value="Mark False Positive">Mark False Positive</option>
                        <option value="Mute">Mute</option>
                      </select>
                    </td>
                    <td>
                      <span className={`ssl-status-badge ${row.status?.toLowerCase().replace(/\s+/g, '-') || 'unreviewed'}`}>
                        {row.status || 'Unreviewed'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {paginatedVulns.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="ssl-empty-container">
                      <ShieldAlert size={44} color="#94A3B8" />
                      <div className="ssl-empty-title">
                        {loading ? 'Loading SSL Vulnerabilities...' : 'No Data Available'}
                      </div>
                      <div className="ssl-empty-desc">
                        {loading
                          ? 'Please wait while we perform vulnerability audits.'
                          : 'No SSL security vulnerabilities detected for the active filters.'}
                      </div>
                    </div>
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

export default CertVulnerabilitiesTable;
