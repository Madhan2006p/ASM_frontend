import React from 'react';
import './Certificates.css';

const CertFindings = ({ certs = [], loading }) => {
  const expiredCount = certs.filter(c => c.days === 0).length;
  const untrustedCount = certs.filter(c => !c.isTrusted).length;
  const weakGradeCount = certs.filter(c => ['C', 'D', 'E', 'F'].includes(c.sslGrade)).length;
  const expiringSoonCount = certs.filter(c => c.days > 0 && c.days <= 30).length;

  const tls10Count = certs.filter(c => c.tls === 'TLS 1.0' || c.tls === 'TLSv1.0' || c.tls === 'TLSv1').length;
  const tls11Count = certs.filter(c => c.tls === 'TLS 1.1' || c.tls === 'TLSv1.1').length;
  const poodleCount = certs.filter(c => c.tls === 'SSLv3' || c.tls === 'SSL 3.0' || (c.cipher && c.cipher.includes('SSLv3'))).length;
  const sweet32Count = certs.filter(c => c.cipher && (c.cipher.includes('3DES') || c.cipher.includes('DES-CBC3'))).length;
  const rc4Count = certs.filter(c => c.cipher && c.cipher.toUpperCase().includes('RC4')).length;
  const beastCount = certs.filter(c => (c.tls === 'TLS 1.0' || c.tls === 'TLSv1.0') && c.cipher && c.cipher.includes('CBC')).length;
  const lucky13Count = certs.filter(c => (c.tls === 'TLS 1.0' || c.tls === 'TLS 1.1' || c.tls === 'TLS 1.2') && c.cipher && c.cipher.includes('CBC')).length;
  const noPfsCount = certs.filter(c => c.cipher && !c.cipher.includes('ECDHE') && !c.cipher.includes('DHE') && !c.cipher.includes('TLS13') && !c.cipher.includes('1.3')).length;

  const findingsData = [];
  let id = 1;
  if (expiredCount > 0) {
    findingsData.push({ id: id++, finding: 'Expired SSL Certificate', cwe: 'CWE-295', cve: '—', severity: 'CRITICAL', domains: expiredCount, status: 'Open', trigger: 'Certificate validity date passed' });
  }
  if (untrustedCount > 0) {
    findingsData.push({ id: id++, finding: 'Self-Signed or Untrusted Certificate', cwe: 'CWE-295', cve: '—', severity: 'HIGH', domains: untrustedCount, status: 'Open', trigger: 'Self-signed CA or untrusted root chain' });
  }
  if (poodleCount > 0) {
    findingsData.push({ id: id++, finding: 'POODLE SSLv3 / TLS CBC Vulnerability', cwe: 'CWE-326', cve: 'CVE-2014-3566', severity: 'HIGH', domains: poodleCount, status: 'Open', trigger: 'SSL 3.0 or legacy TLS CBC ciphers supported' });
  }
  if (rc4Count > 0) {
    findingsData.push({ id: id++, finding: 'RC4 Weak Stream Cipher Supported (Bar Mitzvah)', cwe: 'CWE-326', cve: 'CVE-2013-2566', severity: 'HIGH', domains: rc4Count, status: 'Open', trigger: 'RC4 stream cipher suite enabled' });
  }
  if (tls10Count > 0) {
    findingsData.push({ id: id++, finding: 'Deprecated TLS 1.0 Protocol Enabled', cwe: 'CWE-326', cve: 'CVE-2011-3389', severity: 'MEDIUM', domains: tls10Count, status: 'Open', trigger: 'Legacy TLS 1.0 protocol allowed by server' });
  }
  if (tls11Count > 0) {
    findingsData.push({ id: id++, finding: 'Deprecated TLS 1.1 Protocol Enabled', cwe: 'CWE-326', cve: '—', severity: 'LOW', domains: tls11Count, status: 'Open', trigger: 'Legacy TLS 1.1 protocol allowed by server' });
  }
  if (sweet32Count > 0) {
    findingsData.push({ id: id++, finding: 'SWEET32 64-bit Block Cipher Attack', cwe: 'CWE-326', cve: 'CVE-2016-2183', severity: 'MEDIUM', domains: sweet32Count, status: 'Open', trigger: '3DES / DES-CBC3 64-bit block ciphers enabled' });
  }
  if (beastCount > 0) {
    findingsData.push({ id: id++, finding: 'BEAST Attack via TLS 1.0 CBC Ciphers', cwe: 'CWE-326', cve: 'CVE-2011-3389', severity: 'MEDIUM', domains: beastCount, status: 'Open', trigger: 'TLS 1.0 protocol enabled with CBC mode ciphers' });
  }
  if (lucky13Count > 0) {
    findingsData.push({ id: id++, finding: 'Lucky13 TLS CBC Timing Side-Channel', cwe: 'CWE-326', cve: 'CVE-2013-0169', severity: 'MEDIUM', domains: lucky13Count, status: 'Open', trigger: 'TLS 1.0-1.2 enabled with CBC mode ciphers' });
  }
  if (noPfsCount > 0) {
    findingsData.push({ id: id++, finding: 'No Perfect Forward Secrecy (PFS)', cwe: 'CWE-327', cve: '—', severity: 'LOW', domains: noPfsCount, status: 'Open', trigger: 'Static RSA cipher suites without ECDHE/DHE' });
  }
  if (weakGradeCount > 0) {
    findingsData.push({ id: id++, finding: 'Weak Cipher Suite or SSL Grade (C/D/F)', cwe: 'CWE-327', cve: '—', severity: 'HIGH', domains: weakGradeCount, status: 'Open', trigger: 'Overall SSL audit grade rated C, D, or F' });
  }
  if (expiringSoonCount > 0) {
    findingsData.push({ id: id++, finding: 'Certificate Expiring Soon', cwe: 'CWE-295', cve: '—', severity: 'MEDIUM', domains: expiringSoonCount, status: 'Open', trigger: 'Expires in less than 30 days' });
  }
  if (certs.length > 0 && findingsData.length === 0) {
    findingsData.push({ id: id++, finding: 'No SSL vulnerabilities or misconfigurations detected', cwe: '—', cve: '—', severity: 'INFO', domains: 0, status: 'Closed', trigger: 'All TLS/SSL security checks passed' });
  }

  return (
    <div className="card cert-table-card">
      <div className="cert-table-header">
        <h2 className="cert-table-title">SSL Security Findings</h2>
        <p className="cert-table-subtitle">Identified misconfigurations, weak ciphers, or protocol risks in SSL/TLS certificates.</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="cert-table">
          <thead>
            <tr>
              <th>Finding</th>
              <th>CWE / CVE</th>
              <th>Configuration Trigger</th>
              <th>Severity</th>
              <th>Affected Domains</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {findingsData.map((row) => (
              <tr key={row.id}>
                <td className="font-bold">{row.finding}</td>
                <td className="font-mono text-slate-400" style={{ fontSize: '0.78rem' }}>
                  {row.cwe !== '—' && <span style={{ background: 'var(--bg-main)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginRight: '0.35rem' }}>{row.cwe}</span>}
                  {row.cve !== '—' && <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{row.cve}</span>}
                  {row.cwe === '—' && row.cve === '—' && '—'}
                </td>
                <td className="text-slate-500 font-mono" style={{ fontSize: '0.8rem' }}>{row.trigger || '—'}</td>
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
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
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
