import React from 'react';
import { ExternalLink, Bug, RefreshCw, Shield } from 'lucide-react';

const getSeverityClass = (severity) => (severity || 'low').toLowerCase();
const getStatusClass = (status) => (status || 'open').toLowerCase();

const VulnerabilitiesTable = ({ data, activeFilter, setActiveFilter, allData, loading, showScanningState, isVulnScanRunning }) => {
  const getCount = (sev) => {
    if (!allData) return 0;
    return allData.filter(d => (d.severity || '').toUpperCase() === sev.toUpperCase()).length;
  };

  return (
    <div className="vuln-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
      <div className="global-filter-row">
        <div 
          className={`global-filter-pill ${activeFilter === 'All' ? 'active' : ''}`}
          onClick={() => setActiveFilter('All')}
        >
          All ({allData?.length || 0})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'Critical' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Critical')}
        >
          Critical ({getCount('Critical')})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'High' ? 'active' : ''}`}
          onClick={() => setActiveFilter('High')}
        >
          High ({getCount('High')})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'Medium' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Medium')}
        >
          Medium ({getCount('Medium')})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'Low' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Low')}
        >
          Low ({getCount('Low')})
        </div>
      </div>

      <div className="global-table-wrapper">
        <table className="vuln-table">
          <thead>
            <tr>
              <th>TITLE</th>
              <th>CVE</th>
              <th>SEVERITY</th>
              <th>STATUS</th>
              <th>CVSS</th>
              <th>ASSET</th>
              <th>AGE</th>
              <th className="action-col"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  Loading vulnerabilities list...
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="vuln-title-cell">
                      <span className="vuln-title-text">{row.title}</span>
                      {row.exploit && (
                        <span className="exploit-badge">
                          <Bug size={10} className="exploit-icon" /> Exploit
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-secondary">{row.cve}</td>
                  <td>
                    <span className={`severity-badge sev-${getSeverityClass(row.severity)}`}>
                      <span className="badge-dot"></span> {row.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge stat-${getStatusClass(row.status)}`}>
                      <span className="badge-dot"></span> {row.status}
                    </span>
                  </td>
                  <td>
                    <div className="cvss-cell">
                      <div className={`cvss-bar cvss-${getSeverityClass(row.severity)}`}></div>
                      <span className="cvss-score">{row.cvss.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="font-mono text-secondary">{row.asset}</td>
                  <td className="text-secondary">{row.age}</td>
                  <td className="action-col">
                    <ExternalLink size={16} className="text-muted hover:text-primary cursor-pointer" onClick={() => alert(`Details:\nCWE: ${row.cwe || 'N/A'}\nCVE: ${row.cve || 'N/A'}\nFindings: ${row.title}`)} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748B' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: showScanningState ? 'rgba(34, 211, 238, 0.1)' : 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                      {showScanningState ? (
                        <RefreshCw size={48} color="#22D3EE" strokeWidth={1.5} className="spin" />
                      ) : (
                        <Shield size={48} color="#22C55E" strokeWidth={1.5} />
                      )}
                    </div>
                    <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.25rem', fontWeight: '600' }}>
                      {showScanningState ? "Scanning in progress..." : "Your website is secure now"}
                    </h3>
                    <p style={{ margin: 0, maxWidth: '400px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {showScanningState 
                        ? (isVulnScanRunning 
                            ? "The Python vulnerability scanner found 0 results. Nuclei is currently running deep scans in the background to uncover complex vulnerabilities."
                            : "The scan is still in its early discovery phases (like subdomains and ports). Vulnerability payload testing has not started yet. Please wait.")
                        : "No vulnerabilities were found during the scan. Great job keeping your attack surface secure!"}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VulnerabilitiesTable;
