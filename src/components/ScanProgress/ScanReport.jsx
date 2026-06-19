import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../utils/api';
import {
  FileText, Download, ShieldAlert, Shield, AlertTriangle, Info,
  Globe, Server, Lock, Mail, Monitor, RefreshCw, CheckCircle2,
  XCircle, Clock, Wifi, Database, Tag
} from 'lucide-react';

/* ── helpers ── */
const SEV_ORDER  = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const SEV_COLOR  = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#F59E0B', LOW: '#22C55E', INFO: '#60A5FA' };
const SEV_BG     = { CRITICAL: 'rgba(239,68,68,.12)', HIGH: 'rgba(249,115,22,.12)', MEDIUM: 'rgba(245,158,11,.12)', LOW: 'rgba(34,197,94,.12)', INFO: 'rgba(96,165,250,.12)' };

function fmt(v) { return v && v !== '-' ? v : '—'; }
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

/* ── PDF export helper (pure client-side, no deps) ── */
function exportToPDF(reportData, scanData) {
  const { vulnerabilities = [], subdomains = [], endpoints = [], ports = [], ssl = [], technologies = [], email } = reportData;
  const scan = reportData.scan || scanData || {};
  const target = scan.target || 'Unknown Target';
  const generatedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  vulnerabilities.forEach(v => { const s = (v.severity || 'INFO').toUpperCase(); if (counts[s] !== undefined) counts[s]++; });

  const sevBadge = (sev) => {
    const s = (sev || 'INFO').toUpperCase();
    const colors = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#F59E0B', LOW: '#22C55E', INFO: '#60A5FA' };
    return `<span style="background:${colors[s] || '#60A5FA'}22;color:${colors[s] || '#60A5FA'};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;border:1px solid ${colors[s] || '#60A5FA'}44">${s}</span>`;
  };

  const vulnRows = vulnerabilities
    .slice()
    .sort((a, b) => (SEV_ORDER[a.severity?.toUpperCase()] ?? 5) - (SEV_ORDER[b.severity?.toUpperCase()] ?? 5))
    .map(v => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #1E293B;font-weight:600;color:#E2E8F0;max-width:280px">${fmt(v.finding || v.vulnerability_id)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1E293B;text-align:center">${sevBadge(v.severity)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1E293B;color:#94A3B8;font-size:12px">${fmt(v.cve)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1E293B;color:#94A3B8;font-size:12px;max-width:200px">${fmt(v.subdomain || v.domain)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1E293B;color:#64748B;font-size:11px;max-width:200px">${fmt(v.remediation)}</td>
      </tr>`).join('');

  const sslRows = ssl.map(s => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#E2E8F0">${fmt(s.host)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#94A3B8">${fmt(s.issuer)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#94A3B8">${fmt(s.valid_to)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;text-align:center">
        <span style="color:${s.is_valid ? '#22C55E' : '#EF4444'}">${s.is_valid ? '✓ Valid' : '✗ Invalid'}</span>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ASM Report — ${target}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#0A0F1E; color:#E2E8F0; font-size:13px; line-height:1.6; }
  @media print {
    body { background:#fff !important; color:#1E293B !important; }
    .page-break { page-break-before: always; }
  }
  .cover { background:linear-gradient(135deg,#0D1B33 0%,#0A0F1E 60%,#0D1533 100%); min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:60px; border-bottom:1px solid rgba(59,130,246,.2); }
  .cover-logo { font-size:14px; font-weight:700; letter-spacing:.3em; color:#22D3EE; text-transform:uppercase; margin-bottom:60px; }
  .cover-title { font-size:42px; font-weight:800; background:linear-gradient(135deg,#60A5FA,#22D3EE); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:16px; text-align:center; }
  .cover-sub { font-size:20px; color:#94A3B8; margin-bottom:60px; text-align:center; }
  .cover-meta { display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; max-width:600px; }
  .meta-item { background:rgba(59,130,246,.08); border:1px solid rgba(59,130,246,.15); border-radius:10px; padding:16px 20px; }
  .meta-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:#64748B; margin-bottom:4px; }
  .meta-value { font-size:15px; font-weight:600; color:#E2E8F0; }
  .section { padding:40px 60px; border-bottom:1px solid rgba(59,130,246,.1); }
  .section-title { font-size:22px; font-weight:700; color:#E2E8F0; margin-bottom:24px; display:flex; align-items:center; gap:12px; }
  .section-title::before { content:''; display:block; width:4px; height:24px; background:linear-gradient(#3B82F6,#22D3EE); border-radius:2px; }
  .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
  .summary-card { background:rgba(59,130,246,.07); border:1px solid rgba(59,130,246,.12); border-radius:12px; padding:20px; text-align:center; }
  .summary-num { font-size:36px; font-weight:800; }
  .summary-label { font-size:11px; color:#64748B; text-transform:uppercase; letter-spacing:.08em; margin-top:4px; }
  .sev-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:32px; }
  .sev-card { border-radius:10px; padding:16px; text-align:center; }
  .sev-num { font-size:32px; font-weight:800; }
  .sev-label { font-size:10px; text-transform:uppercase; letter-spacing:.08em; margin-top:4px; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; padding:10px; background:rgba(59,130,246,.1); color:#94A3B8; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid rgba(59,130,246,.2); }
  .note-box { background:rgba(34,211,238,.08); border:1px solid rgba(34,211,238,.2); border-radius:8px; padding:16px 20px; color:#94A3B8; font-size:12px; margin-top:24px; }
  .email-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .email-card { background:rgba(59,130,246,.07); border-radius:10px; padding:20px; }
  .email-card h4 { font-size:13px; font-weight:600; color:#E2E8F0; margin-bottom:12px; }
  .email-field { display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; }
  .email-field-label { color:#64748B; }
  .email-field-val { color:#E2E8F0; font-weight:500; max-width:55%; text-align:right; word-break:break-all; }
  .pass { color:#22C55E; } .fail { color:#EF4444; } .warn { color:#F59E0B; }
  footer { text-align:center; padding:30px; color:#334155; font-size:11px; border-top:1px solid rgba(59,130,246,.1); }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-logo">⬡ Attack Surface Manager</div>
  <div class="cover-title">Security Assessment Report</div>
  <div class="cover-sub">${target}</div>
  <div class="cover-meta">
    <div class="meta-item"><div class="meta-label">Target Domain</div><div class="meta-value">${target}</div></div>
    <div class="meta-item"><div class="meta-label">Report Generated</div><div class="meta-value">${generatedAt}</div></div>
    <div class="meta-item"><div class="meta-label">Scan Status</div><div class="meta-value">${(scan.status || 'Completed').toUpperCase()}</div></div>
    <div class="meta-item"><div class="meta-label">Scan Started</div><div class="meta-value">${fmtDate(scan.created_at)}</div></div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="section">
  <div class="section-title">Executive Summary</div>
  <div class="summary-grid">
    <div class="summary-card"><div class="summary-num" style="color:#60A5FA">${subdomains.length}</div><div class="summary-label">Subdomains</div></div>
    <div class="summary-card"><div class="summary-num" style="color:#22D3EE">${endpoints.length}</div><div class="summary-label">Endpoints</div></div>
    <div class="summary-card"><div class="summary-num" style="color:#A78BFA">${ports.length}</div><div class="summary-label">Open Ports</div></div>
    <div class="summary-card"><div class="summary-num" style="color:#EF4444">${vulnerabilities.length}</div><div class="summary-label">Vulnerabilities</div></div>
  </div>
  <div class="sev-grid">
    <div class="sev-card" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2)"><div class="sev-num" style="color:#EF4444">${counts.CRITICAL}</div><div class="sev-label" style="color:#EF4444">Critical</div></div>
    <div class="sev-card" style="background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.2)"><div class="sev-num" style="color:#F97316">${counts.HIGH}</div><div class="sev-label" style="color:#F97316">High</div></div>
    <div class="sev-card" style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2)"><div class="sev-num" style="color:#F59E0B">${counts.MEDIUM}</div><div class="sev-label" style="color:#F59E0B">Medium</div></div>
    <div class="sev-card" style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2)"><div class="sev-num" style="color:#22C55E">${counts.LOW}</div><div class="sev-label" style="color:#22C55E">Low</div></div>
    <div class="sev-card" style="background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2)"><div class="sev-num" style="color:#60A5FA">${counts.INFO}</div><div class="sev-label" style="color:#60A5FA">Info</div></div>
  </div>
</div>

<!-- VULNERABILITIES -->
<div class="section page-break">
  <div class="section-title">Vulnerability Findings (${vulnerabilities.length})</div>
  ${vulnerabilities.length === 0 ? '<p style="color:#64748B;font-style:italic">No vulnerabilities detected for this scan.</p>' : `
  <table>
    <thead><tr>
      <th>Finding</th><th>Severity</th><th>CVE</th><th>Asset</th><th>Remediation</th>
    </tr></thead>
    <tbody>${vulnRows}</tbody>
  </table>`}
</div>

<!-- SSL CERTIFICATES -->
${ssl.length > 0 ? `
<div class="section">
  <div class="section-title">SSL / TLS Certificates (${ssl.length})</div>
  <table>
    <thead><tr><th>Host</th><th>Issuer</th><th>Expires</th><th>Status</th></tr></thead>
    <tbody>${sslRows}</tbody>
  </table>
</div>` : ''}

<!-- EMAIL SECURITY -->
${email ? `
<div class="section">
  <div class="section-title">Email Security Analysis</div>
  <div class="email-grid">
    <div class="email-card">
      <h4>🔒 SPF</h4>
      <div class="email-field"><span class="email-field-label">Valid</span><span class="email-field-val ${email.spf_valid ? 'pass' : 'fail'}">${email.spf_valid ? '✓ Pass' : '✗ Fail'}</span></div>
      <div class="email-field"><span class="email-field-label">Record</span><span class="email-field-val">${fmt(email.spf_record)}</span></div>
    </div>
    <div class="email-card">
      <h4>📧 DMARC</h4>
      <div class="email-field"><span class="email-field-label">Valid</span><span class="email-field-val ${email.dmarc_valid ? 'pass' : 'fail'}">${email.dmarc_valid ? '✓ Pass' : '✗ Fail'}</span></div>
      <div class="email-field"><span class="email-field-label">Policy</span><span class="email-field-val">${fmt(email.dmarc_policy)}</span></div>
    </div>
    <div class="email-card">
      <h4>📬 DKIM</h4>
      <div class="email-field"><span class="email-field-label">Valid</span><span class="email-field-val ${email.dkim_valid ? 'pass' : 'fail'}">${email.dkim_valid ? '✓ Pass' : '✗ Fail'}</span></div>
    </div>
  </div>
</div>` : ''}

<!-- SUBDOMAINS -->
<div class="section page-break">
  <div class="section-title">Discovered Subdomains (${subdomains.length})</div>
  ${subdomains.length === 0 ? '<p style="color:#64748B;font-style:italic">No subdomains discovered.</p>' : `
  <table>
    <thead><tr><th>Domain</th><th>IP</th><th>Status</th><th>CDN</th></tr></thead>
    <tbody>${subdomains.slice(0,100).map(s => `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#E2E8F0">${fmt(s.domain)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#94A3B8">${fmt(s.ip)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B"><span style="color:${s.status==='Active'?'#22C55E':'#F59E0B'}">${fmt(s.status)}</span></td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#64748B">${s.cdn_provider || '—'}</td>
    </tr>`).join('')}
    ${subdomains.length > 100 ? `<tr><td colspan="4" style="padding:10px;color:#64748B;font-style:italic;text-align:center">... and ${subdomains.length - 100} more</td></tr>` : ''}
    </tbody>
  </table>`}
</div>

<!-- OPEN PORTS -->
${ports.length > 0 ? `
<div class="section">
  <div class="section-title">Open Ports (${ports.length})</div>
  <table>
    <thead><tr><th>Host</th><th>Port</th><th>Protocol</th><th>Service</th><th>State</th></tr></thead>
    <tbody>${ports.slice(0,80).map(p => `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#E2E8F0">${fmt(p.host || p.subdomain)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#22D3EE;font-weight:600">${p.port}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#94A3B8">${fmt(p.protocol)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#94A3B8">${fmt(p.service)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1E293B;color:#22C55E">${fmt(p.state)}</td>
    </tr>`).join('')}</tbody>
  </table>
</div>` : ''}

<footer>
  Confidential — Attack Surface Management Report for ${target} — Generated ${generatedAt} — ASM Platform
</footer>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => { win.print(); }, 800);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ═══════════════════════════════════════════════════════
   Main ScanReport component
   ═══════════════════════════════════════════════════════ */
const ScanReport = ({ activeScanId, scanData: externalScanData }) => {
  const [reportData, setReportData]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [autoGenerated, setAutoGenerated] = useState(false);
  const prevPhaseRef = useRef(null);

  const fetchReport = useCallback(async (scanId) => {
    if (!scanId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/api/attacksurface/scan/${scanId}/report/`);
      setReportData(data);
    } catch (e) {
      setError('Failed to load report data. The scan may still be in progress.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-generate when vuln scan completes
  useEffect(() => {
    if (!externalScanData) return;
    const phase = externalScanData.vuln_scan_phase;
    const prev  = prevPhaseRef.current;
    const scanComplete = externalScanData.status === 'completed';
    const vulnJustDone = prev && prev !== 'complete' && phase === 'complete';

    if ((scanComplete || vulnJustDone) && !autoGenerated) {
      setAutoGenerated(true);
      fetchReport(activeScanId);
    }
    prevPhaseRef.current = phase;
  }, [externalScanData?.vuln_scan_phase, externalScanData?.status, activeScanId, autoGenerated, fetchReport]);

  // Reset when scan changes
  useEffect(() => {
    setReportData(null);
    setError(null);
    setAutoGenerated(false);
    prevPhaseRef.current = null;
  }, [activeScanId]);

  const vulns         = reportData?.vulnerabilities || [];
  const subdomains    = reportData?.subdomains || [];
  const endpoints     = reportData?.endpoints || [];
  const ports         = reportData?.ports || [];
  const ssl           = reportData?.ssl || [];
  const techs         = reportData?.technologies || [];
  const email         = reportData?.email;
  const scan          = reportData?.scan || externalScanData || {};

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  vulns.forEach(v => { const s = (v.severity || 'INFO').toUpperCase(); if (counts[s] !== undefined) counts[s]++; });

  const sortedVulns = [...vulns].sort((a, b) =>
    (SEV_ORDER[a.severity?.toUpperCase()] ?? 5) - (SEV_ORDER[b.severity?.toUpperCase()] ?? 5)
  );

  const isVulnDone  = externalScanData?.vuln_scan_phase === 'complete' || externalScanData?.vulnerabilities_done;
  const isScanDone  = externalScanData?.status === 'completed';
  const canGenerate = (isVulnDone || isScanDone || vulns.length > 0);

  return (
    <div className="spr-container">
      {/* Status banner */}
      {!isScanDone && !isVulnDone && (
        <div className="spr-banner spr-banner-warn">
          <RefreshCw size={13} className="spin" />
          <span>Vulnerability scan is still running — report will auto-generate when complete.</span>
        </div>
      )}
      {autoGenerated && reportData && (
        <div className="spr-banner spr-banner-ok">
          <CheckCircle2 size={13} />
          <span>Report auto-generated after vulnerability scan completed.</span>
        </div>
      )}

      {/* Actions */}
      <div className="spr-actions">
        <button
          className="spr-btn spr-btn-primary"
          onClick={() => fetchReport(activeScanId)}
          disabled={loading || !activeScanId}
        >
          {loading ? <RefreshCw size={13} className="spin" /> : <RefreshCw size={13} />}
          {loading ? 'Loading…' : 'Refresh Report'}
        </button>
        {reportData && (
          <button
            className="spr-btn spr-btn-export"
            onClick={() => exportToPDF(reportData, scan)}
          >
            <Download size={13} />
            Export PDF
          </button>
        )}
        {!reportData && canGenerate && !loading && (
          <button
            className="spr-btn spr-btn-primary"
            onClick={() => fetchReport(activeScanId)}
          >
            <FileText size={13} />
            Generate Report
          </button>
        )}
      </div>

      {error && (
        <div className="spr-banner spr-banner-error">
          <XCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="spr-loading">
          <RefreshCw size={20} className="spin" style={{ color: '#22D3EE' }} />
          <span>Aggregating scan data…</span>
        </div>
      )}

      {reportData && !loading && (
        <>
          {/* Summary cards */}
          <div className="spr-summary-grid">
            <div className="spr-sum-card">
              <Globe size={14} className="spr-sum-icon" style={{ color: '#60A5FA' }} />
              <span className="spr-sum-num" style={{ color: '#60A5FA' }}>{subdomains.length}</span>
              <span className="spr-sum-label">Subdomains</span>
            </div>
            <div className="spr-sum-card">
              <Monitor size={14} className="spr-sum-icon" style={{ color: '#22D3EE' }} />
              <span className="spr-sum-num" style={{ color: '#22D3EE' }}>{endpoints.length}</span>
              <span className="spr-sum-label">Endpoints</span>
            </div>
            <div className="spr-sum-card">
              <Server size={14} className="spr-sum-icon" style={{ color: '#A78BFA' }} />
              <span className="spr-sum-num" style={{ color: '#A78BFA' }}>{ports.length}</span>
              <span className="spr-sum-label">Open Ports</span>
            </div>
            <div className="spr-sum-card">
              <ShieldAlert size={14} className="spr-sum-icon" style={{ color: '#EF4444' }} />
              <span className="spr-sum-num" style={{ color: '#EF4444' }}>{vulns.length}</span>
              <span className="spr-sum-label">Vulns</span>
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="spr-sev-row">
            {Object.entries(counts).map(([sev, cnt]) => (
              <div key={sev} className="spr-sev-chip" style={{ background: SEV_BG[sev], borderColor: SEV_COLOR[sev] + '44' }}>
                <span style={{ color: SEV_COLOR[sev], fontWeight: 700 }}>{cnt}</span>
                <span style={{ color: SEV_COLOR[sev], fontSize: '0.6rem', opacity: 0.8 }}>{sev}</span>
              </div>
            ))}
          </div>

          {/* Vulnerability list */}
          {sortedVulns.length > 0 && (
            <div className="spr-section">
              <div className="spr-section-title">
                <ShieldAlert size={12} />
                Vulnerabilities ({sortedVulns.length})
              </div>
              <div className="spr-vuln-list">
                {sortedVulns.slice(0, 20).map((v, i) => {
                  const sev = (v.severity || 'INFO').toUpperCase();
                  return (
                    <div key={i} className="spr-vuln-item" style={{ borderLeft: `3px solid ${SEV_COLOR[sev] || '#60A5FA'}` }}>
                      <div className="spr-vuln-top">
                        <span className="spr-vuln-name">{fmt(v.finding || v.vulnerability_id)}</span>
                        <span className="spr-sev-badge" style={{ background: SEV_BG[sev], color: SEV_COLOR[sev] }}>{sev}</span>
                      </div>
                      <div className="spr-vuln-meta">
                        {v.cve && v.cve !== '-' && <span className="spr-vuln-cve">{v.cve}</span>}
                        <span className="spr-vuln-asset">{fmt(v.subdomain || v.domain)}</span>
                        {v.source_tool && <span className="spr-vuln-tool">{v.source_tool}</span>}
                      </div>
                      {v.remediation && v.remediation !== '-' && (
                        <div className="spr-vuln-fix">💡 {v.remediation}</div>
                      )}
                    </div>
                  );
                })}
                {sortedVulns.length > 20 && (
                  <div className="spr-more">+{sortedVulns.length - 20} more — export PDF to see all</div>
                )}
              </div>
            </div>
          )}

          {/* Email Security */}
          {email && (
            <div className="spr-section">
              <div className="spr-section-title">
                <Mail size={12} />
                Email Security
              </div>
              <div className="spr-email-grid">
                {[
                  { label: 'SPF', valid: email.spf_valid, detail: email.spf_record },
                  { label: 'DMARC', valid: email.dmarc_valid, detail: email.dmarc_policy },
                  { label: 'DKIM', valid: email.dkim_valid, detail: null },
                ].map(({ label, valid, detail }) => (
                  <div key={label} className="spr-email-chip" style={{ borderColor: valid ? '#22C55E44' : '#EF444444', background: valid ? 'rgba(34,197,94,.07)' : 'rgba(239,68,68,.07)' }}>
                    <span style={{ color: valid ? '#22C55E' : '#EF4444', fontWeight: 700 }}>{valid ? '✓' : '✗'}</span>
                    <span className="spr-email-label">{label}</span>
                    {detail && <span className="spr-email-detail">{detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SSL */}
          {ssl.length > 0 && (
            <div className="spr-section">
              <div className="spr-section-title">
                <Lock size={12} />
                SSL Certificates ({ssl.length})
              </div>
              <div className="spr-ssl-list">
                {ssl.slice(0, 8).map((s, i) => (
                  <div key={i} className="spr-ssl-item">
                    <Lock size={10} style={{ color: s.is_valid ? '#22C55E' : '#EF4444', flexShrink: 0 }} />
                    <span className="spr-ssl-host">{fmt(s.host)}</span>
                    <span className="spr-ssl-issuer">{fmt(s.issuer)}</span>
                    <span className="spr-ssl-exp" style={{ color: s.is_valid ? '#22C55E' : '#EF4444' }}>{s.valid_to ? `exp. ${new Date(s.valid_to).toLocaleDateString()}` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!reportData && !loading && !error && (
        <div className="spr-empty">
          <FileText size={28} style={{ color: '#334155', marginBottom: '0.5rem' }} />
          <p>Report will auto-generate once the vulnerability scan finishes.</p>
          <p style={{ fontSize: '0.65rem', color: '#4A5E7A', marginTop: '0.25rem' }}>
            {canGenerate ? 'Or click "Generate Report" above.' : 'Scan is still running…'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ScanReport;
