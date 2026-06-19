import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, Printer, Shield, AlertTriangle, AlertCircle,
  CheckCircle, Info, RefreshCw, ChevronDown, ChevronRight,
  BarChart2, Target, Cpu, Smartphone, Globe, Lock, Calendar,
  User, Building, TrendingUp, Eye, X, Filter
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import { api } from '../../utils/api';
import './VaptReport.css';

/* ─────────────────────────────────────────────────────────
   Severity helpers
───────────────────────────────────────────────────────── */
const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4, WARNING: 5 };
const SEV_COLORS = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', fg: '#EF4444', border: 'rgba(239,68,68,0.3)' },
  HIGH:     { bg: 'rgba(249,115,22,0.12)', fg: '#F97316', border: 'rgba(249,115,22,0.3)' },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.3)' },
  LOW:      { bg: 'rgba(34,197,94,0.12)',  fg: '#22C55E', border: 'rgba(34,197,94,0.3)' },
  INFO:     { bg: 'rgba(59,130,246,0.12)', fg: '#3B82F6', border: 'rgba(59,130,246,0.3)' },
  WARNING:  { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.3)' },
};
const getSevColor = (sev) => SEV_COLORS[(sev || '').toUpperCase()] || SEV_COLORS.INFO;

const SeverityBadge = ({ severity }) => {
  const c = getSevColor(severity);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.55rem', borderRadius: '6px',
      fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em',
      textTransform: 'uppercase',
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`
    }}>
      {severity || 'INFO'}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────
   Risk Score (0–10 mapped from severity distribution)
───────────────────────────────────────────────────────── */
const calcRiskScore = (counts) => {
  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0 } = counts;
  const total = CRITICAL + HIGH + MEDIUM + LOW;
  if (total === 0) return 0;
  const weighted = CRITICAL * 10 + HIGH * 7 + MEDIUM * 4 + LOW * 1;
  const raw = weighted / total;
  return Math.min(10, raw).toFixed(1);
};

const riskLabel = (score) => {
  if (score >= 8) return { label: 'CRITICAL', color: '#EF4444' };
  if (score >= 6) return { label: 'HIGH',     color: '#F97316' };
  if (score >= 4) return { label: 'MEDIUM',   color: '#EAB308' };
  if (score >= 2) return { label: 'LOW',      color: '#22C55E' };
  return              { label: 'MINIMAL',   color: '#3B82F6' };
};

/* ─────────────────────────────────────────────────────────
   Mini bar for the summary chart
───────────────────────────────────────────────────────── */
const SeverityBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="vapt-sev-bar-row">
      <span className="vapt-sev-bar-label" style={{ color }}>{label}</span>
      <div className="vapt-sev-bar-track">
        <div className="vapt-sev-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="vapt-sev-bar-count" style={{ color }}>{count}</span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────── */
const VaptReport = ({ activeScanId, scansList, selectedDomain }) => {
  // ── State ──────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [webVulns, setWebVulns]       = useState([]);
  const [mobileScans, setMobileScans] = useState([]);
  const [mobileFindings, setMobileFindings] = useState([]);
  const [scanMeta, setScanMeta]       = useState(null);

  // Report settings
  const [reportTitle, setReportTitle] = useState('VAPT Security Assessment Report');
  const [orgName, setOrgName]         = useState('');
  const [assessorName, setAssessorName] = useState('');
  const [reportDate, setReportDate]   = useState(() => new Date().toISOString().split('T')[0]);
  const [scope, setScope]             = useState('');
  const [methodology, setMethodology] = useState('Automated ASM scanning combined with manual VAPT analysis using industry-standard tools including Nuclei, Wapiti, and MobSF.');
  const [showSettings, setShowSettings] = useState(false);

  // Filters & display
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter]     = useState('ALL');
  const [expandedRows, setExpandedRows]     = useState({});
  const [activeSection, setActiveSection]   = useState('all');

  const reportRef = useRef(null);

  // ── Data Loading ──────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load web vulnerabilities for active scan
      if (activeScanId) {
        const data = await api.get(`/api/attacksurface/vulnerabilities/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        setWebVulns(list);

        // Scan metadata
        const found = scansList?.find(s => s.id === Number(activeScanId));
        setScanMeta(found || null);
        if (found?.target && !scope) setScope(found.target);
      }

      // 2. Load mobile VAPT scans
      const mobileData = await api.get('/api/mobile-vapt/history/?page_size=100');
      const mobileList = mobileData.results || [];
      setMobileScans(mobileList);

      // 3. Load mobile findings for completed scans
      const completedMobileIds = mobileList
        .filter(s => s.status === 'completed')
        .map(s => s.id);

      if (completedMobileIds.length > 0) {
        // Fetch findings for each completed scan (up to 5 most recent)
        const topIds = completedMobileIds.slice(0, 5);
        const findingsArr = await Promise.all(
          topIds.map(id => api.get(`/api/mobile-vapt/scan-detail/${id}/`).catch(() => null))
        );
        const allFindings = [];
        findingsArr.forEach((res, idx) => {
          if (res?.findings) {
            res.findings.forEach(f => {
              allFindings.push({
                ...f,
                scan_id: topIds[idx],
                app_name: mobileList.find(s => s.id === topIds[idx])?.app_name || 'Unknown App',
                source: 'mobile',
              });
            });
          }
        });
        setMobileFindings(allFindings);
      }
    } catch (e) {
      console.error('Failed to load VAPT report data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeScanId]);

  // ── Normalize all findings ─────────────────────────
  const allFindings = [
    ...webVulns.map(v => ({
      id: `web-${v.id}`,
      source: 'web',
      source_label: 'Web / ASM',
      title: v.finding || v.vulnerability_id || 'Security Vulnerability',
      severity: (v.severity || 'LOW').toUpperCase(),
      description: v.description || '',
      remediation: v.remediation || '',
      cve: v.cve || '',
      cwe: v.cwe || '',
      asset: v.subdomain || v.domain || selectedDomain || 'Target',
      tool: v.source_tool || 'Nuclei',
      category: v.category || 'Web Application',
      reference: v.reference || '',
      discovered_at: v.discovered_at,
    })),
    ...mobileFindings.map(f => ({
      id: `mob-${f.id}`,
      source: 'mobile',
      source_label: 'Mobile App',
      title: f.vulnerability || 'Mobile Finding',
      severity: (f.severity || 'MEDIUM').toUpperCase(),
      description: f.description || '',
      remediation: f.recommendation || '',
      cve: '',
      cwe: '',
      asset: f.app_name || 'Mobile App',
      tool: 'MobSF',
      category: f.category || 'Mobile Security',
      reference: '',
      discovered_at: f.created_at,
    })),
  ].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));

  // ── Severity counts ────────────────────────────────
  const countBySev = allFindings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});
  const totalFindings = allFindings.length;
  const riskScore = parseFloat(calcRiskScore(countBySev));
  const { label: riskLbl, color: riskCol } = riskLabel(riskScore);

  // ── Filtered findings ─────────────────────────────
  const filteredFindings = allFindings.filter(f => {
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (sourceFilter === 'WEB' && f.source !== 'web') return false;
    if (sourceFilter === 'MOBILE' && f.source !== 'mobile') return false;
    return true;
  });

  // ── Print / PDF export ────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── Toggle row expand ─────────────────────────────
  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Section navigation ────────────────────────────
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const sevKeys = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  return (
    <div className="vapt-report-container">
      {/* ── Page Header ─────────────────────────────── */}
      <PageHeaderCard
        badgeText="MANAGE"
        title="VAPT Report"
        subtitle="Comprehensive Vulnerability Assessment and Penetration Testing report covering web and mobile attack surfaces."
        stats={[
          { label: 'Total Findings', value: totalFindings.toString(), subtext: 'across all scopes' },
          { label: 'Critical / High', value: ((countBySev.CRITICAL || 0) + (countBySev.HIGH || 0)).toString(), subtext: 'require immediate action' },
          { label: 'Risk Score', value: `${riskScore}/10`, subtext: riskLbl },
          { label: 'Mobile Apps', value: mobileScans.filter(s => s.status === 'completed').length.toString(), subtext: 'audited' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="vapt-btn vapt-btn-secondary" onClick={() => setShowSettings(s => !s)}>
              <Filter size={15} /> Report Settings
            </button>
            <button className="vapt-btn vapt-btn-secondary" onClick={handlePrint}>
              <Printer size={15} /> Print / Export PDF
            </button>
            <button className="vapt-btn vapt-btn-primary" onClick={loadData} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        }
      />

      {/* ── Report Settings Panel ────────────────────── */}
      {showSettings && (
        <div className="vapt-settings-panel">
          <div className="vapt-settings-header">
            <h3><FileText size={16} /> Report Configuration</h3>
            <button className="vapt-close-btn" onClick={() => setShowSettings(false)}><X size={16} /></button>
          </div>
          <div className="vapt-settings-grid">
            <div className="vapt-settings-field">
              <label>Report Title</label>
              <input value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
            </div>
            <div className="vapt-settings-field">
              <label>Organization / Client Name</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="vapt-settings-field">
              <label>Assessor / Team</label>
              <input value={assessorName} onChange={e => setAssessorName(e.target.value)} placeholder="e.g. Security Team Alpha" />
            </div>
            <div className="vapt-settings-field">
              <label>Report Date</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
            </div>
            <div className="vapt-settings-field vapt-settings-full">
              <label>Scope / Target</label>
              <input value={scope} onChange={e => setScope(e.target.value)} placeholder="e.g. *.example.com, 192.168.1.0/24" />
            </div>
            <div className="vapt-settings-field vapt-settings-full">
              <label>Methodology</label>
              <textarea value={methodology} onChange={e => setMethodology(e.target.value)} rows={3} />
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────
          PRINTABLE REPORT BODY
      ──────────────────────────────────────────────── */}
      <div className="vapt-report-body" ref={reportRef}>

        {/* ── Section Nav (screen-only) ─────────────── */}
        <div className="vapt-section-nav no-print">
          {[
            { id: 'cover',     label: 'Cover' },
            { id: 'exec',      label: 'Executive Summary' },
            { id: 'scope-sec', label: 'Scope & Methodology' },
            { id: 'findings',  label: 'Findings' },
            { id: 'mobile-sec',label: 'Mobile VAPT' },
            { id: 'remediation-sec', label: 'Remediation' },
          ].map(s => (
            <button
              key={s.id}
              className={`vapt-nav-btn ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── COVER PAGE ───────────────────────────── */}
        <div id="cover" className="vapt-page vapt-cover-page">
          <div className="vapt-cover-header">
            <div className="vapt-cover-logo">
              <Shield size={56} style={{ color: '#3B82F6' }} />
            </div>
            <div className="vapt-cover-watermark">CONFIDENTIAL</div>
          </div>

          <div className="vapt-cover-center">
            <div className="vapt-cover-badge">VULNERABILITY ASSESSMENT &amp; PENETRATION TEST</div>
            <h1 className="vapt-cover-title">{reportTitle}</h1>
            {orgName && <p className="vapt-cover-org">Prepared for: <strong>{orgName}</strong></p>}
          </div>

          <div className="vapt-cover-meta">
            <div className="vapt-cover-meta-grid">
              <div className="vapt-cover-meta-item">
                <Calendar size={14} />
                <span><strong>Date:</strong> {new Date(reportDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              {assessorName && (
                <div className="vapt-cover-meta-item">
                  <User size={14} />
                  <span><strong>Assessor:</strong> {assessorName}</span>
                </div>
              )}
              {scope && (
                <div className="vapt-cover-meta-item">
                  <Target size={14} />
                  <span><strong>Scope:</strong> {scope}</span>
                </div>
              )}
              <div className="vapt-cover-meta-item">
                <AlertCircle size={14} style={{ color: riskCol }} />
                <span><strong>Overall Risk:</strong> <span style={{ color: riskCol, fontWeight: 800 }}>{riskLbl}</span> ({riskScore}/10)</span>
              </div>
            </div>
          </div>

          <div className="vapt-cover-disclaimer">
            This report is confidential and intended solely for the organization named above. Distribution or reproduction without explicit permission is prohibited.
          </div>
        </div>

        {/* ── EXECUTIVE SUMMARY ────────────────────── */}
        <div id="exec" className="vapt-page">
          <div className="vapt-section-title">
            <TrendingUp size={20} className="vapt-section-icon" />
            <h2>1. Executive Summary</h2>
          </div>

          <div className="vapt-exec-grid">
            {/* Risk Score Gauge */}
            <div className="vapt-risk-card">
              <div className="vapt-risk-gauge" style={{ '--risk-color': riskCol }}>
                <svg viewBox="0 0 120 70" className="vapt-gauge-svg">
                  <path d="M10,65 A55,55 0 0,1 110,65" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round"/>
                  <path
                    d="M10,65 A55,55 0 0,1 110,65"
                    fill="none" stroke={riskCol} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${(riskScore / 10) * 172.7} 172.7`}
                  />
                </svg>
                <div className="vapt-gauge-label">
                  <span className="vapt-gauge-value" style={{ color: riskCol }}>{riskScore}</span>
                  <span className="vapt-gauge-max">/10</span>
                  <span className="vapt-gauge-risk" style={{ color: riskCol }}>{riskLbl}</span>
                </div>
              </div>
              <p className="vapt-risk-card-footer">Overall Risk Score</p>
            </div>

            {/* Severity Breakdown */}
            <div className="vapt-exec-breakdown">
              <h3 className="vapt-breakdown-title">Finding Distribution</h3>
              <div className="vapt-severity-stat-grid">
                {sevKeys.map(sev => {
                  const c = getSevColor(sev);
                  return (
                    <div key={sev} className="vapt-severity-stat-card" style={{ borderLeft: `3px solid ${c.fg}` }}>
                      <span className="vapt-severity-stat-num" style={{ color: c.fg }}>{countBySev[sev] || 0}</span>
                      <span className="vapt-severity-stat-label">{sev}</span>
                    </div>
                  );
                })}
              </div>
              <div className="vapt-sev-bars">
                {sevKeys.map(sev => (
                  <SeverityBar
                    key={sev}
                    label={sev}
                    count={countBySev[sev] || 0}
                    total={totalFindings}
                    color={getSevColor(sev).fg}
                  />
                ))}
              </div>
            </div>

            {/* Summary Text */}
            <div className="vapt-exec-narrative">
              <h3 className="vapt-breakdown-title">Assessment Overview</h3>
              <p>
                This security assessment was conducted against <strong>{scope || 'the target environment'}</strong> on{' '}
                <strong>{new Date(reportDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                The engagement identified a total of <strong>{totalFindings}</strong> security findings across the web application and mobile attack surfaces.
              </p>
              {(countBySev.CRITICAL || 0) > 0 && (
                <div className="vapt-exec-alert vapt-alert-critical">
                  <AlertCircle size={16} />
                  <span>
                    <strong>{countBySev.CRITICAL} Critical</strong> vulnerabilities were identified requiring immediate remediation.
                    These pose a direct risk of system compromise or data breach.
                  </span>
                </div>
              )}
              {(countBySev.HIGH || 0) > 0 && (
                <div className="vapt-exec-alert vapt-alert-high">
                  <AlertTriangle size={16} />
                  <span>
                    <strong>{countBySev.HIGH} High</strong> severity issues require urgent attention within the next 7–14 days.
                  </span>
                </div>
              )}
              {totalFindings === 0 && (
                <div className="vapt-exec-alert vapt-alert-good">
                  <CheckCircle size={16} />
                  <span>No vulnerabilities found. The target environment appears well-secured based on the automated scan coverage.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SCOPE & METHODOLOGY ──────────────────── */}
        <div id="scope-sec" className="vapt-page">
          <div className="vapt-section-title">
            <Target size={20} className="vapt-section-icon" />
            <h2>2. Scope &amp; Methodology</h2>
          </div>

          <div className="vapt-scope-grid">
            <div className="vapt-scope-card">
              <h4><Globe size={16} /> Web / ASM Scope</h4>
              <table className="vapt-meta-table">
                <tbody>
                  <tr><td>Target Domain</td><td>{scope || (scanMeta?.target || '—')}</td></tr>
                  <tr><td>Scan ID</td><td>{activeScanId || '—'}</td></tr>
                  <tr><td>Web Findings</td><td>{webVulns.length}</td></tr>
                  <tr><td>Scanner Tools</td><td>Nuclei, Wapiti, Nmap, Subfinder</td></tr>
                  <tr><td>Scan Date</td><td>{scanMeta?.created_at ? new Date(scanMeta.created_at).toLocaleDateString() : reportDate}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="vapt-scope-card">
              <h4><Smartphone size={16} /> Mobile VAPT Scope</h4>
              <table className="vapt-meta-table">
                <tbody>
                  <tr><td>Apps Audited</td><td>{mobileScans.filter(s => s.status === 'completed').length}</td></tr>
                  <tr><td>Mobile Findings</td><td>{mobileFindings.length}</td></tr>
                  <tr><td>Analysis Tool</td><td>MobSF (Mobile Security Framework)</td></tr>
                  <tr><td>Analysis Type</td><td>Static &amp; Dynamic Analysis (SAST/DAST)</td></tr>
                  <tr><td>Platforms</td><td>
                    {mobileScans.some(s => s.source === 'android') ? 'Android' : ''}
                    {mobileScans.some(s => s.source === 'android') && mobileScans.some(s => s.source === 'ios') ? ' & ' : ''}
                    {mobileScans.some(s => s.source === 'ios') ? 'iOS' : ''}
                    {!mobileScans.length ? '—' : ''}
                  </td></tr>
                </tbody>
              </table>
            </div>

            <div className="vapt-scope-card vapt-scope-full">
              <h4><Cpu size={16} /> Testing Methodology</h4>
              <p className="vapt-methodology-text">{methodology}</p>
              <div className="vapt-methodology-phases">
                {[
                  { icon: '🔍', phase: 'Reconnaissance', desc: 'Subdomain enumeration, port scanning, technology fingerprinting, and attack surface mapping.' },
                  { icon: '🕵️', phase: 'Vulnerability Discovery', desc: 'Automated scanning with Nuclei templates, web fuzzing with Wapiti, and certificate analysis.' },
                  { icon: '📱', phase: 'Mobile Analysis', desc: 'Static and dynamic analysis of Android/iOS binaries using MobSF to detect insecure code patterns, permissions, and API misuse.' },
                  { icon: '📊', phase: 'Risk Assessment', desc: 'All findings are scored by severity (Critical/High/Medium/Low/Info) and mapped to OWASP categories.' },
                  { icon: '📝', phase: 'Reporting', desc: 'Comprehensive report with remediation guidance, CVE/CWE mapping, and risk prioritization.' },
                ].map((p, i) => (
                  <div key={i} className="vapt-phase-item">
                    <span className="vapt-phase-icon">{p.icon}</span>
                    <div>
                      <strong>{p.phase}</strong>
                      <p>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── FINDINGS TABLE ───────────────────────── */}
        <div id="findings" className="vapt-page">
          <div className="vapt-section-title">
            <Eye size={20} className="vapt-section-icon" />
            <h2>3. Detailed Findings</h2>
          </div>

          {/* Filters (screen-only) */}
          <div className="vapt-filters no-print">
            <div className="vapt-filter-group">
              <label>Severity</label>
              <div className="vapt-filter-pills">
                {['ALL', ...sevKeys].map(s => (
                  <button
                    key={s}
                    className={`vapt-pill ${severityFilter === s ? 'active' : ''}`}
                    style={severityFilter === s && s !== 'ALL' ? { background: getSevColor(s).bg, color: getSevColor(s).fg, borderColor: getSevColor(s).border } : {}}
                    onClick={() => setSeverityFilter(s)}
                  >
                    {s} {s !== 'ALL' && countBySev[s] ? `(${countBySev[s]})` : ''}
                  </button>
                ))}
              </div>
            </div>
            <div className="vapt-filter-group">
              <label>Source</label>
              <div className="vapt-filter-pills">
                {['ALL', 'WEB', 'MOBILE'].map(s => (
                  <button key={s} className={`vapt-pill ${sourceFilter === s ? 'active' : ''}`} onClick={() => setSourceFilter(s)}>
                    {s === 'WEB' ? '🌐 Web' : s === 'MOBILE' ? '📱 Mobile' : 'ALL'} 
                  </button>
                ))}
              </div>
            </div>
            <span className="vapt-filter-count">{filteredFindings.length} findings shown</span>
          </div>

          {loading ? (
            <div className="vapt-loading">
              <RefreshCw size={32} className="spin" />
              <span>Loading vulnerability data...</span>
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="vapt-empty">
              <CheckCircle size={48} style={{ color: '#22C55E', opacity: 0.5 }} />
              <h3>No findings match the current filters</h3>
              <p>Try adjusting severity or source filters, or run a new scan.</p>
            </div>
          ) : (
            <div className="vapt-findings-list">
              {filteredFindings.map((finding, idx) => {
                const c = getSevColor(finding.severity);
                const expanded = expandedRows[finding.id];
                return (
                  <div key={finding.id} className="vapt-finding-card" style={{ borderLeft: `4px solid ${c.fg}` }}>
                    {/* ── Row Header ── */}
                    <div className="vapt-finding-header" onClick={() => toggleRow(finding.id)}>
                      <div className="vapt-finding-index" style={{ color: c.fg }}>
                        #{String(idx + 1).padStart(3, '0')}
                      </div>
                      <div className="vapt-finding-main">
                        <div className="vapt-finding-title">{finding.title}</div>
                        <div className="vapt-finding-meta">
                          <SeverityBadge severity={finding.severity} />
                          <span className="vapt-finding-source-badge">
                            {finding.source === 'mobile' ? '📱' : '🌐'} {finding.source_label}
                          </span>
                          {finding.cve && <span className="vapt-finding-cve">{finding.cve}</span>}
                          <span className="vapt-finding-asset">{finding.asset}</span>
                          <span className="vapt-finding-tool">{finding.tool}</span>
                        </div>
                      </div>
                      <div className="vapt-finding-chevron no-print">
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>

                    {/* ── Expanded Details ── */}
                    {(expanded || true) && (
                      <div className={`vapt-finding-detail ${expanded ? 'expanded' : 'collapsed'}`}>
                        <div className="vapt-detail-grid">
                          {finding.description && (
                            <div className="vapt-detail-block">
                              <h5>Description</h5>
                              <p>{finding.description}</p>
                            </div>
                          )}
                          {finding.remediation && (
                            <div className="vapt-detail-block vapt-remediation-block">
                              <h5>Remediation</h5>
                              <p>{finding.remediation}</p>
                            </div>
                          )}
                          <div className="vapt-detail-attrs">
                            {finding.cve && <span><strong>CVE:</strong> {finding.cve}</span>}
                            {finding.cwe && <span><strong>CWE:</strong> {finding.cwe}</span>}
                            {finding.category && <span><strong>Category:</strong> {finding.category}</span>}
                            {finding.discovered_at && (
                              <span><strong>Discovered:</strong> {new Date(finding.discovered_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MOBILE VAPT SECTION ──────────────────── */}
        {mobileScans.length > 0 && (
          <div id="mobile-sec" className="vapt-page">
            <div className="vapt-section-title">
              <Smartphone size={20} className="vapt-section-icon" />
              <h2>4. Mobile Application Security</h2>
            </div>

            <div className="vapt-mobile-apps-grid">
              {mobileScans.filter(s => s.status === 'completed').map(scan => {
                const scanFindings = mobileFindings.filter(f => f.scan_id === scan.id);
                const scanCountBySev = scanFindings.reduce((acc, f) => {
                  acc[f.severity] = (acc[f.severity] || 0) + 1;
                  return acc;
                }, {});
                const score = parseInt(scan.score || 50);

                return (
                  <div key={scan.id} className="vapt-mobile-app-card">
                    <div className="vapt-mobile-app-header">
                      <div className="vapt-mobile-app-info">
                        <span className="vapt-mobile-platform">{scan.source === 'ios' ? '🍏 iOS' : '🤖 Android'}</span>
                        <h4>{scan.app_name || scan.file_name}</h4>
                        <span className="vapt-mobile-pkg">{scan.package_name || scan.version_name || ''}</span>
                      </div>
                      <div className="vapt-mobile-score-circle" style={{
                        borderColor: score >= 80 ? '#22C55E' : score >= 50 ? '#F97316' : '#EF4444',
                        color: score >= 80 ? '#22C55E' : score >= 50 ? '#F97316' : '#EF4444'
                      }}>
                        <span>{score}</span>
                        <small>/100</small>
                      </div>
                    </div>
                    <div className="vapt-mobile-sev-pills">
                      {sevKeys.map(sev => scanCountBySev[sev] ? (
                        <span key={sev} className="vapt-mobile-sev-pill" style={{ background: getSevColor(sev).bg, color: getSevColor(sev).fg }}>
                          {sev}: {scanCountBySev[sev]}
                        </span>
                      ) : null)}
                    </div>
                    {scanFindings.length === 0 && (
                      <p className="vapt-mobile-no-detail">Findings not loaded. View Mobile Security tab for details.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REMEDIATION ROADMAP ──────────────────── */}
        <div id="remediation-sec" className="vapt-page">
          <div className="vapt-section-title">
            <CheckCircle size={20} className="vapt-section-icon" />
            <h2>{mobileScans.length > 0 ? '5' : '4'}. Remediation Roadmap</h2>
          </div>

          <div className="vapt-remediation-roadmap">
            {[
              {
                timeline: 'Immediate (0–48 hrs)',
                severity: 'CRITICAL',
                color: '#EF4444',
                icon: '🚨',
                count: countBySev.CRITICAL || 0,
                guidance: 'Patch or mitigate all critical vulnerabilities immediately. Isolate affected systems if exploitation is likely. Escalate to security leadership.',
              },
              {
                timeline: 'Short-term (7–14 days)',
                severity: 'HIGH',
                color: '#F97316',
                icon: '⚠️',
                count: countBySev.HIGH || 0,
                guidance: 'Plan and deploy patches for all high-severity findings. Implement compensating controls where patching is delayed.',
              },
              {
                timeline: 'Medium-term (1–3 months)',
                severity: 'MEDIUM',
                color: '#EAB308',
                icon: '🔶',
                count: countBySev.MEDIUM || 0,
                guidance: 'Address medium-severity issues as part of the next sprint or maintenance window. Track via security backlog.',
              },
              {
                timeline: 'Long-term (3–6 months)',
                severity: 'LOW / INFO',
                color: '#22C55E',
                icon: '📌',
                count: (countBySev.LOW || 0) + (countBySev.INFO || 0),
                guidance: 'Document and address low-severity items in regular security reviews. Use as inputs to harden security posture over time.',
              },
            ].map((item, i) => (
              <div key={i} className="vapt-roadmap-item" style={{ borderLeft: `4px solid ${item.color}` }}>
                <div className="vapt-roadmap-header">
                  <span className="vapt-roadmap-icon">{item.icon}</span>
                  <div>
                    <h4 style={{ color: item.color }}>{item.timeline}</h4>
                    <span className="vapt-roadmap-sev">{item.severity} — {item.count} findings</span>
                  </div>
                </div>
                <p className="vapt-roadmap-guidance">{item.guidance}</p>
              </div>
            ))}
          </div>

          {/* General best practices */}
          <div className="vapt-best-practices">
            <h3>General Security Recommendations</h3>
            <div className="vapt-bp-grid">
              {[
                { icon: '🔒', title: 'Input Validation', desc: 'Sanitize and validate all user inputs server-side. Use parameterized queries to prevent SQL injection.' },
                { icon: '🔑', title: 'Authentication & Session', desc: 'Enforce MFA, secure session tokens (HttpOnly, Secure flags), and implement proper logout mechanisms.' },
                { icon: '🛡️', title: 'Security Headers', desc: 'Add CSP, X-Frame-Options, X-XSS-Protection, HSTS, and Referrer-Policy headers to all responses.' },
                { icon: '📦', title: 'Dependency Management', desc: 'Regularly audit third-party libraries and mobile SDK dependencies. Subscribe to CVE feeds for critical components.' },
                { icon: '🔍', title: 'Continuous Monitoring', desc: 'Implement SIEM, WAF, and intrusion detection. Schedule recurring VAPT assessments at least quarterly.' },
                { icon: '👩‍💻', title: 'Developer Training', desc: 'Conduct secure coding training (OWASP Top 10, mobile security) for all developers on a regular cadence.' },
              ].map((bp, i) => (
                <div key={i} className="vapt-bp-card">
                  <span className="vapt-bp-icon">{bp.icon}</span>
                  <h5>{bp.title}</h5>
                  <p>{bp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── REPORT FOOTER ────────────────────────── */}
        <div className="vapt-report-footer">
          <div className="vapt-footer-left">
            <Shield size={14} />
            <span>{reportTitle}</span>
          </div>
          <div className="vapt-footer-center">CONFIDENTIAL</div>
          <div className="vapt-footer-right">
            Generated on {new Date(reportDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

      </div> {/* end vapt-report-body */}
    </div>
  );
};

export default VaptReport;
