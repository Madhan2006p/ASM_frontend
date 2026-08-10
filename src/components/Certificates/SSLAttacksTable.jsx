import React, { useMemo, useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronRight, ShieldCheck, Bug } from 'lucide-react';
import './Certificates.css';

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6',
  INFO: '#94A3B8',
};

// Known named TLS attacks — used to normalize the finding title.
const ATTACK_NAMES = {
  'SSL-BEAST': 'BEAST (CVE-2011-3389)',
  'SSL-POODLE': 'POODLE (CVE-2014-3566)',
  'SSL-LUCKY13': 'Lucky13 (CVE-2013-0169)',
  'SSL-RC4-WEAKNESS': 'RC4 / Bar Mitzvah (CVE-2013-2566)',
  'SSL-SWEET32-3DES': '3DES / SWEET32 (CVE-2016-2183)',
  'SSL-DES-WEAKNESS': 'DES / 3DES Legacy Ciphers',
  'SSL-DEPRECATED-TLS10': 'Deprecated TLS 1.0',
  'SSL-DEPRECATED-TLS11': 'Deprecated TLS 1.1',
  'SSL-CERT-UNTRUSTED': 'Untrusted / Self-Signed Certificate',
  'OPENSSL-HEARTBLEED': 'OpenSSL Heartbleed (CVE-2014-0160)',
  'SSL-FREAK-EXPORT': 'FREAK / Export Ciphers (CVE-2015-0204)',
  'SSL-NULL-CIPHER': 'Null Cipher Suite',
  'SSL-ANON-AUTH': 'Anonymous Key Exchange (aNULL)',
  'SSL-MD5-HASH': 'MD5 Hash Algorithm',
};

const attackLabel = (v) => {
  const vid = (v.vulnerability_id || '').toUpperCase();
  if (ATTACK_NAMES[vid]) return ATTACK_NAMES[vid];
  return v.finding || vid || 'SSL/TLS Finding';
};

const SSLAttacksTable = ({ certs = [], loading }) => {
  const [expanded, setExpanded] = useState({});

  // Flatten all findings across all scanned hosts.
  const findings = useMemo(() => {
    const flat = [];
    (certs || []).forEach(c => {
      (c.findings || []).forEach(f => {
        flat.push({ ...f, host: c.domain });
      });
    });
    // Dedup identical attacks across hosts (same vuln id + finding), keep host list.
    const byKey = new Map();
    flat.forEach(f => {
      const key = `${f.vulnerability_id || ''}::${(f.finding || '').slice(0, 80)}`;
      if (!byKey.has(key)) byKey.set(key, { ...f, hosts: [f.host] });
      else {
        const ex = byKey.get(key);
        if (f.host && !ex.hosts.includes(f.host)) ex.hosts.push(f.host);
      }
    });
    const rows = Array.from(byKey.values()).sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    );
    return rows;
  }, [certs]);

  const sevCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    findings.forEach(f => {
      const s = (f.severity || 'INFO').toUpperCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [findings]);

  const total = findings.length;
  const maxSev = Math.max(1, ...Object.values(sevCounts));

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="card cert-table-card" style={{ marginTop: '1.5rem' }}>
      <div className="cert-table-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldAlert size={18} color="#F59E0B" />
          <div>
            <h2 className="cert-table-title" style={{ margin: 0 }}>SSL/TLS Protocol Attacks</h2>
            <p className="cert-table-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
              BEAST · POODLE · Lucky13 · RC4/3DES · FREAK · Heartbleed &amp; legacy TLS exposure
            </p>
          </div>
        </div>
        {total > 0 && (
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: total > 0 ? '#F59E0B' : '#10B981', background: total > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
            {total} {total === 1 ? 'finding' : 'findings'}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Loading SSL findings...</div>
      ) : total === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '3rem', color: '#64748B' }}>
          <ShieldCheck size={44} color="#22C55E" strokeWidth={1.5} />
          <span style={{ fontWeight: 600, color: '#0F172A' }}>No TLS protocol attacks detected</span>
          <span style={{ fontSize: '0.85rem' }}>No weak ciphers, deprecated TLS versions, or known SSL/TLS attacks were found on the scanned hosts.</span>
        </div>
      ) : (
        <>
          {/* Severity summary bar chart */}
          <div style={{ padding: '1.25rem 1.5rem 0.5rem', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.1rem', height: '92px' }}>
              {Object.keys(sevCounts).map(sev => (
                <div key={sev} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{sevCounts[sev]}</span>
                  <div
                    style={{
                      width: '100%', maxWidth: '64px', height: `${Math.max(4, (sevCounts[sev] / maxSev) * 52)}px`,
                      background: SEVERITY_COLORS[sev], borderRadius: '6px 6px 2px 2px',
                      opacity: sevCounts[sev] === 0 ? 0.15 : 1,
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: SEVERITY_COLORS[sev] }}>{sev}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Findings table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="cert-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}></th>
                  <th>Attack</th>
                  <th>Severity</th>
                  <th>CVE / CWE</th>
                  <th>Affected Hosts</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, idx) => {
                  const sev = (f.severity || 'INFO').toUpperCase();
                  const key = `${f.vulnerability_id || 'v'}-${idx}`;
                  const isOpen = !!expanded[key];
                  return (
                    <React.Fragment key={key}>
                      <tr onClick={() => toggle(key)} style={{ cursor: 'pointer' }}>
                        <td style={{ textAlign: 'center', color: '#94A3B8' }}>
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#0F172A' }}>
                            <Bug size={13} color={SEVERITY_COLORS[sev]} />
                            {attackLabel(f)}
                          </div>
                        </td>
                        <td>
                          <span className={`cert-pill uppercase pill-${sev.toLowerCase()}`}>
                            <span className="dot"></span> {sev}
                          </span>
                        </td>
                        <td className="font-mono" style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {[f.cve, f.cwe].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {(f.hosts || [f.host]).length > 1
                            ? `${(f.hosts || []).length} hosts (${(f.hosts || []).slice(0, 2).join(', ')}${(f.hosts || []).length > 2 ? '…' : ''})`
                            : (f.hosts || [f.host])[0] || '—'}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan="5" style={{ background: 'rgba(15, 23, 42, 0.02)', padding: '0 1.5rem 1.25rem 2.9rem', borderBottom: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.86rem', lineHeight: '1.55' }}>
                              {f.description && <p style={{ margin: 0, color: '#334155' }}><strong style={{ color: '#0F172A' }}>Description:</strong> {f.description}</p>}
                              {f.remediation && <p style={{ margin: 0, color: '#334155' }}><strong style={{ color: '#0F172A' }}>Remediation:</strong> {f.remediation}</p>}
                              {f.evidence && <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>{f.evidence}</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SSLAttacksTable;
