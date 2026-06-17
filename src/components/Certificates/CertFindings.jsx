import React from 'react';
import './Certificates.css';

const CertFindings = ({ certs = [], loading }) => {
  const expiredCount = certs.filter(c => c.days === 0).length;
  const untrustedCount = certs.filter(c => !c.isTrusted).length;
  const weakCount = certs.filter(c => ['C', 'D', 'E', 'F'].includes(c.sslGrade)).length;
  const expiringSoonCount = certs.filter(c => c.days > 0 && c.days <= 30).length;

  const findingsData = [];
  let id = 1;
  if (expiredCount > 0) {
    findingsData.push({ id: id++, finding: 'Expired Certificate', severity: 'CRITICAL', domains: expiredCount, status: 'Open' });
  }
  if (untrustedCount > 0) {
    findingsData.push({ id: id++, finding: 'Self Signed or Untrusted Certificate', severity: 'HIGH', domains: untrustedCount, status: 'Open' });
  }
  if (weakCount > 0) {
    findingsData.push({ id: id++, finding: 'Weak Cipher Suite or Grade', severity: 'HIGH', domains: weakCount, status: 'Open' });
  }
  if (expiringSoonCount > 0) {
    findingsData.push({ id: id++, finding: 'Certificate Expiring Soon', severity: 'MEDIUM', domains: expiringSoonCount, status: 'Open' });
  }
  if (certs.length > 0 && findingsData.length === 0) {
    findingsData.push({ id: id++, finding: 'No SSL vulnerabilities or misconfigurations detected', severity: 'INFO', domains: 0, status: 'Closed' });
  }

  return (
    <div className="cert-table-card">
      <div className="cert-table-header">
        <h2 className="cert-table-title">SSL Security Findings</h2>
        <p className="cert-table-subtitle">Identified misconfigurations or risks in SSL certificates.</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="cert-table">
          <thead>
            <tr>
              <th>Finding</th>
              <th>Severity</th>
              <th>Affected Domains</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {findingsData.map((row) => (
              <tr key={row.id}>
                <td className="font-bold">{row.finding}</td>
                <td>
                  <span className={`cert-pill uppercase pill-${row.severity.toLowerCase()}`}>
                    <span className="dot"></span>
                    {row.severity}
                  </span>
                </td>
                <td className="font-semibold text-slate-600">{row.domains}</td>
                <td>
                  <span className={`cert-pill pill-${row.status.toLowerCase()}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {findingsData.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  {loading ? 'Loading findings...' : 'No SSL findings. Start a scan to discover details.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CertFindings;
