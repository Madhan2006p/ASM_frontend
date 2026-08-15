import React, { useState, useMemo } from 'react';
import {
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
      // 1. Severity Filter (from top cards)
      if (selectedSeverityFilter && selectedSeverityFilter !== 'ALL' && selectedSeverityFilter !== 'overall') {
        const target = selectedSeverityFilter.toUpperCase();
        const itemSev = (item.severity || '').toUpperCase();
        if (target === 'INFO') {
          if (itemSev !== 'INFO' && itemSev !== 'INFORMATIONAL') return false;
        } else if (itemSev !== target) {
          return false;
        }
      }

      // 2. Vulnerability Type Dropdown Filter
      if (selectedVulnType !== 'All' && item.vulnerability !== selectedVulnType) {
        return false;
      }

      return true;
    });
  }, [vulnerabilities, selectedSeverityFilter, selectedVulnType]);

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
    setSelectedVulnType('All');
    setCurrentPage(1);
    setShowFilterPopover(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      


      {/* 3. Vulnerability Data Table */}
      <div className="ssl-table-card">
        <div className="ssl-table-wrapper">
          <table className="ssl-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th>Domain</th>
                <th>IP</th>
                <th>SSL Grade</th>
                <th>Vulnerability</th>
                <th>Severity</th>
                <th>Status</th>
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
                      <span className={`ssl-status-badge ${row.status?.toLowerCase().replace(/\s+/g, '-') || 'unreviewed'}`}>
                        {row.status || 'Unreviewed'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {paginatedVulns.length === 0 && (
                <tr>
                  <td colSpan={7}>
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

      {/* 4. Pagination Controls Footer */}
      <div className="ssl-pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, totalRows)} of {totalRows} vulnerabilities
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ background: 'var(--bg-card-2)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={totalRows > 0 ? totalRows : 1000}>All ({totalRows})</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{ opacity: validPage <= 1 ? 0.4 : 1, cursor: validPage <= 1 ? 'not-allowed' : 'pointer', background: 'var(--bg-card-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center' }}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 0.5rem' }}>
              Page {validPage} of {totalPages}
            </span>
            <button
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{ opacity: validPage >= totalPages ? 0.4 : 1, cursor: validPage >= totalPages ? 'not-allowed' : 'pointer', background: 'var(--bg-card-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center' }}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CertVulnerabilitiesTable;
