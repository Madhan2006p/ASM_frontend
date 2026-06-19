import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateVaptReportHTML } from '../../utils/generateVaptReport';
import {
  FileText, Download, Printer, Shield, AlertTriangle, AlertCircle,
  CheckCircle, RefreshCw, ChevronDown, ChevronRight,
  Target, Cpu, Smartphone, Globe, Calendar,
  User, TrendingUp, Eye, X, Upload,
  Settings2, Layers
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import PageHeaderCard from '../common/PageHeaderCard';
import { api } from '../../utils/api';
import './VaptReport.css';

/* ─────────────────────────────────────────────────────────
   Severity helpers
───────────────────────────────────────────────────────── */
const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4, WARNING: 5 };
const SEV_COLORS = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',  fg: '#EF4444', border: 'rgba(239,68,68,0.3)',  chart: '#EF4444',  print: '#dc2626' },
  HIGH:     { bg: 'rgba(249,115,22,0.12)', fg: '#F97316', border: 'rgba(249,115,22,0.3)', chart: '#F97316',  print: '#ea580c' },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.3)',  chart: '#EAB308',  print: '#ca8a04' },
  LOW:      { bg: 'rgba(34,197,94,0.12)',  fg: '#22C55E', border: 'rgba(34,197,94,0.3)',  chart: '#22C55E',  print: '#16a34a' },
  INFO:     { bg: 'rgba(59,130,246,0.12)', fg: '#3B82F6', border: 'rgba(59,130,246,0.3)', chart: '#3B82F6',  print: '#2563eb' },
  WARNING:  { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.3)',  chart: '#EAB308',  print: '#ca8a04' },
};
const getSevColor = (sev) => SEV_COLORS[(sev || '').toUpperCase()] || SEV_COLORS.INFO;

/* CVSS score mapping */
const SEV_CVSS = { CRITICAL: 9.5, HIGH: 7.5, MEDIUM: 5.0, LOW: 2.5, INFO: 0.5, WARNING: 5.0 };
const getCVSS = (sev, cvss) => cvss ? parseFloat(cvss) : (SEV_CVSS[(sev || '').toUpperCase()] || 0);

const SeverityBadge = ({ severity }) => {
  const c = getSevColor(severity);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.15rem 0.5rem', borderRadius: '5px',
      fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`
    }}>
      {severity || 'INFO'}
    </span>
  );
};

/* ── CVSS Mini Gauge ─────────────────────────── */
const CVSSGauge = ({ score, severity }) => {
  const c = getSevColor(severity);
  const pct = Math.min(score / 10, 1);
  const circumference = 2 * Math.PI * 16;
  const dash = pct * circumference;
  return (
    <div className="cvss-gauge-wrap" title={`CVSS: ${score.toFixed(1)}`}>
      <svg width="38" height="38" viewBox="0 0 38 38" className="cvss-gauge-svg">
        <circle cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle
          cx="19" cy="19" r="16" fill="none"
          stroke={c.fg} strokeWidth="4"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        <text x="19" y="23" textAnchor="middle" fontSize="8" fontWeight="800" fill={c.fg}>
          {score.toFixed(1)}
        </text>
      </svg>
    </div>
  );
};

/* ── Risk Score ───────────────────────────────── */
const calcRiskScore = (counts) => {
  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0 } = counts;
  const total = CRITICAL + HIGH + MEDIUM + LOW;
  if (total === 0) return 0;
  return Math.min(10, (CRITICAL * 10 + HIGH * 7 + MEDIUM * 4 + LOW * 1) / total).toFixed(1);
};
const riskLabel = (score) => {
  if (score >= 8) return { label: 'CRITICAL', color: '#EF4444' };
  if (score >= 6) return { label: 'HIGH',     color: '#F97316' };
  if (score >= 4) return { label: 'MEDIUM',   color: '#EAB308' };
  if (score >= 2) return { label: 'LOW',      color: '#22C55E' };
  return              { label: 'MINIMAL',   color: '#3B82F6' };
};

/* ── Severity bar ──────────────────────────────── */
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

/* ── Pie chart tooltip ─────────────────────────── */
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const c = getSevColor(name);
  return (
    <div className="vapt-chart-tooltip">
      <span style={{ color: c.fg, fontWeight: 700 }}>{name}</span>: {value}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════
   Main Component
═════════════════════════════════════════════════════════ */
const VaptReport = ({ activeScanId, scansList, selectedDomain, handleSelectScan }) => {

  /* ── State ─────────────────────────────────── */
  const [loading, setLoading]               = useState(false);
  const [webVulns, setWebVulns]             = useState([]);
  const [mobileScans, setMobileScans]       = useState([]);
  const [mobileFindings, setMobileFindings] = useState([]);
  const [scanMeta, setScanMeta]             = useState(null);
  const [localScanId, setLocalScanId]       = useState(activeScanId);

  /* Report config */
  const [reportTitle, setReportTitle]       = useState('VAPT Security Assessment Report');
  const [orgName, setOrgName]               = useState('');
  const [assessorName, setAssessorName]     = useState('');
  const [reportDate, setReportDate]         = useState(() => new Date().toISOString().split('T')[0]);
  const [scope, setScope]                   = useState('');
  const [methodology, setMethodology]       = useState(
    'Automated ASM scanning combined with manual VAPT analysis using industry-standard tools including Nuclei, Wapiti, and MobSF.'
  );
  const [showSettings, setShowSettings]     = useState(false);
  const [logoDataUrl, setLogoDataUrl]       = useState(null);
  const logoInputRef                        = useRef(null);

  /* Filters */
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter]     = useState('ALL');
  const [expandedRows, setExpandedRows]     = useState({});
  const [activeSection, setActiveSection]   = useState('cover');
  const reportRef                           = useRef(null);

  /* ── Sync scan id ──────────────────────────── */
  useEffect(() => { if (activeScanId && !localScanId) setLocalScanId(activeScanId); }, [activeScanId]);

  /* ── Load data ─────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const scanId = localScanId || activeScanId;
      if (scanId) {
        const data = await api.get(`/api/attacksurface/vulnerabilities/?scan=${scanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        setWebVulns(list);
        const found = scansList?.find(s => s.id === Number(scanId));
        setScanMeta(found || null);
        if (found?.target && !scope) setScope(found.target);
      }
      const mobileData = await api.get('/api/mobile-vapt/history/?page_size=100');
      const mobileList = mobileData.results || [];
      setMobileScans(mobileList);
      const completedIds = mobileList.filter(s => s.status === 'completed').map(s => s.id);
      if (completedIds.length > 0) {
        const topIds = completedIds.slice(0, 5);
        const results = await Promise.all(
          topIds.map(id => api.get(`/api/mobile-vapt/scan-detail/${id}/`).catch(() => null))
        );
        const all = [];
        results.forEach((res, idx) => {
          if (res?.findings) {
            res.findings.forEach(f => all.push({
              ...f, scan_id: topIds[idx],
              app_name: mobileList.find(s => s.id === topIds[idx])?.app_name || 'Unknown',
              source: 'mobile',
            }));
          }
        });
        setMobileFindings(all);
      }
    } catch (e) { console.error('VAPT data load error', e); }
    finally { setLoading(false); }
  }, [localScanId, activeScanId, scansList]);

  useEffect(() => { loadData(); }, [localScanId]);

  /* ── Logo upload ───────────────────────────── */
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogoDataUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Normalize findings ────────────────────── */
  const allFindings = [
    ...webVulns.map(v => ({
      id: `web-${v.id}`, source: 'web', source_label: 'Web / ASM',
      title: v.finding || v.vulnerability_id || 'Security Vulnerability',
      severity: (v.severity || 'LOW').toUpperCase(),
      description: v.description || '', remediation: v.remediation || '',
      cve: v.cve || '', cwe: v.cwe || '', cvss: v.cvss_score || null,
      asset: v.subdomain || v.domain || selectedDomain || 'Target',
      tool: v.source_tool || 'Nuclei', category: v.category || 'Web Application',
      discovered_at: v.discovered_at,
    })),
    ...mobileFindings.map(f => ({
      id: `mob-${f.id}`, source: 'mobile', source_label: 'Mobile App',
      title: f.vulnerability || 'Mobile Finding',
      severity: (f.severity || 'MEDIUM').toUpperCase(),
      description: f.description || '', remediation: f.recommendation || '',
      cve: '', cwe: '', cvss: null,
      asset: f.app_name || 'Mobile App', tool: 'MobSF',
      category: f.category || 'Mobile Security', discovered_at: f.created_at,
    })),
  ].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));

  /* ── Counts & risk ─────────────────────────── */
  const countBySev = allFindings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1; return acc;
  }, {});
  const totalFindings = allFindings.length;
  const riskScore = parseFloat(calcRiskScore(countBySev));
  const { label: riskLbl, color: riskCol } = riskLabel(riskScore);

  /* ── Chart data ─────────────────────────────── */
  const sevKeys = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const pieData = sevKeys
    .filter(s => (countBySev[s] || 0) > 0)
    .map(s => ({ name: s, value: countBySev[s], fill: getSevColor(s).chart }));
  const barData = [
    { name: 'Web', ...webVulns.reduce((a, v) => { const s = (v.severity||'LOW').toUpperCase(); a[s]=(a[s]||0)+1; return a; }, {}) },
    { name: 'Mobile', ...mobileFindings.reduce((a, f) => { const s = (f.severity||'MEDIUM').toUpperCase(); a[s]=(a[s]||0)+1; return a; }, {}) },
  ].filter(d => Object.keys(d).length > 1);

  /* ── Filtered findings ─────────────────────── */
  const filteredFindings = allFindings.filter(f => {
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (sourceFilter === 'WEB' && f.source !== 'web') return false;
    if (sourceFilter === 'MOBILE' && f.source !== 'mobile') return false;
    return true;
  });

  /* ── Generate & export professional PDF report ───────── */
  const handleGenerateReport = () => {
    const html = generateVaptReportHTML({
      reportTitle, orgName, assessorName, reportDate, scope, methodology, logoDataUrl,
      allFindings, webVulns, mobileFindings, mobileScans,
      countBySev, totalFindings, riskScore, riskLbl, riskCol,
    });
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups for this site to export the report.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Small delay so fonts/styles load before print dialog
    setTimeout(() => win.print(), 1200);
  };

  /* ── Toggle row ────────────────────────────── */
  const toggleRow = id => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  /* ── Scroll nav ────────────────────────────── */
  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  /* ── Scan change ───────────────────────────── */
  const handleScanChange = e => {
    const id = Number(e.target.value);
    setLocalScanId(id);
    const found = scansList?.find(s => s.id === id);
    if (found?.target) setScope(found.target);
    if (handleSelectScan) handleSelectScan(id, found?.target);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ═════════════════ RENDER ═════════════════ */
  return (
    <div className="vapt-report-container">

      {/* ── Page Header ──────────────────────── */}
      <PageHeaderCard
        badgeText="REPORT"
        title="VAPT Report"
        subtitle="Comprehensive Vulnerability Assessment & Penetration Testing report."
        stats={[
          { label: 'Total Findings',  value: totalFindings.toString(), subtext: 'all scopes' },
          { label: 'Critical / High', value: ((countBySev.CRITICAL||0)+(countBySev.HIGH||0)).toString(), subtext: 'immediate action' },
          { label: 'Risk Score',      value: `${riskScore}/10`, subtext: riskLbl },
          { label: 'Mobile Apps',     value: mobileScans.filter(s=>s.status==='completed').length.toString(), subtext: 'audited' },
        ]}
        actions={
          <div className="vapt-header-actions no-print">
            {scansList?.length > 0 && (
              <div className="vapt-scan-select-wrap">
                <Layers size={13} />
                <select className="vapt-scan-select" value={localScanId || ''} onChange={handleScanChange}>
                  <option value="">— Select Scan —</option>
                  {scansList.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.id} · {s.target} · {new Date(s.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="vapt-btn vapt-btn-ghost" onClick={() => setShowSettings(s => !s)}>
              <Settings2 size={14} /> Settings
            </button>
            <button className="vapt-btn vapt-btn-primary" onClick={handleGenerateReport}>
              <Download size={14} /> Export Report PDF
            </button>
            <button className="vapt-btn vapt-btn-primary" onClick={loadData} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        }
      />

      {/* ── Settings panel ──────────────────── */}
      {showSettings && (
        <div className="vapt-settings-panel no-print">
          <div className="vapt-settings-header">
            <h3><FileText size={15} /> Report Configuration</h3>
            <button className="vapt-close-btn" onClick={() => setShowSettings(false)}><X size={15} /></button>
          </div>
          <div className="vapt-settings-grid">
            <div className="vapt-field"><label>Report Title</label>
              <input value={reportTitle} onChange={e => setReportTitle(e.target.value)} /></div>
            <div className="vapt-field"><label>Organisation / Client</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corp" /></div>
            <div className="vapt-field"><label>Assessor / Team</label>
              <input value={assessorName} onChange={e => setAssessorName(e.target.value)} placeholder="e.g. Security Team Alpha" /></div>
            <div className="vapt-field"><label>Report Date</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} /></div>
            <div className="vapt-field vapt-field-full"><label>Scope / Target</label>
              <input value={scope} onChange={e => setScope(e.target.value)} placeholder="e.g. *.example.com" /></div>
            <div className="vapt-field vapt-field-full"><label>Methodology</label>
              <textarea value={methodology} onChange={e => setMethodology(e.target.value)} rows={2} /></div>
            <div className="vapt-field vapt-field-full">
              <label>Cover Page Logo</label>
              <div className="vapt-logo-upload" onClick={() => logoInputRef.current?.click()}>
                {logoDataUrl ? (
                  <div className="vapt-logo-preview-row">
                    <img src={logoDataUrl} alt="Logo" />
                    <button className="vapt-logo-remove" onClick={e => { e.stopPropagation(); setLogoDataUrl(null); }}>
                      <X size={12} /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="vapt-logo-placeholder"><Upload size={18} /><span>Click to upload PNG / JPG / SVG</span></div>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          REPORT BODY  (this div is what gets printed)
      ════════════════════════════════════════ */}
      <div className="vapt-report-body" ref={reportRef}>

        {/* ── Sticky section nav (screen only) ── */}
        <div className="vapt-section-nav no-print">
          {[
            { id:'cover',          label:'📄 Cover'            },
            { id:'exec',           label:'📊 Executive Summary' },
            { id:'scope-sec',      label:'🎯 Scope'            },
            { id:'findings',       label:'🔍 Findings'          },
            ...(mobileScans.length > 0 ? [{ id:'mobile-sec', label:'📱 Mobile' }] : []),
            { id:'remediation-sec',label:'🛡️ Remediation'      },
          ].map(s => (
            <button key={s.id} className={`vapt-nav-btn ${activeSection===s.id?'active':''}`} onClick={()=>scrollTo(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ╔══════════════════════════════════╗
            ║  1 — COVER PAGE                 ║
            ╚══════════════════════════════════╝ */}
        <div id="cover" className="vapt-page vapt-cover-page">
          <div className="vapt-cover-header">
            <div className="vapt-cover-logo">
              {logoDataUrl
                ? <img src={logoDataUrl} alt="Logo" className="vapt-org-logo" />
                : <Shield size={52} style={{ color:'#3B82F6' }} />}
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
              <div className="vapt-cover-meta-item"><Calendar size={13}/><span><b>Date:</b> {fmtDate(reportDate)}</span></div>
              {assessorName && <div className="vapt-cover-meta-item"><User size={13}/><span><b>Assessor:</b> {assessorName}</span></div>}
              {scope && <div className="vapt-cover-meta-item"><Target size={13}/><span><b>Scope:</b> {scope}</span></div>}
              <div className="vapt-cover-meta-item">
                <AlertCircle size={13} style={{color:riskCol}}/>
                <span><b>Overall Risk:</b> <span style={{color:riskCol,fontWeight:800}}>{riskLbl}</span> ({riskScore}/10)</span>
              </div>
            </div>
          </div>
          <div className="vapt-cover-disclaimer">
            This report is confidential and intended solely for the named organisation. Redistribution is prohibited.
          </div>
        </div>

        {/* ╔══════════════════════════════════╗
            ║  2 — EXECUTIVE SUMMARY          ║
            ╚══════════════════════════════════╝ */}
        <div id="exec" className="vapt-page vapt-print-break">
          <div className="vapt-section-title">
            <TrendingUp size={18} className="vapt-section-icon" />
            <h2>1. Executive Summary</h2>
          </div>

          {/* Top row: gauge + stats + pie */}
          <div className="vapt-exec-top">
            {/* Risk gauge */}
            <div className="vapt-risk-card">
              <div className="vapt-risk-gauge" style={{'--risk-color': riskCol}}>
                <svg viewBox="0 0 120 70" className="vapt-gauge-svg">
                  <path d="M10,65 A55,55 0 0,1 110,65" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round"/>
                  <path d="M10,65 A55,55 0 0,1 110,65" fill="none" stroke={riskCol} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${(riskScore/10)*172.7} 172.7`}/>
                </svg>
                <div className="vapt-gauge-label">
                  <span className="vapt-gauge-value" style={{color:riskCol}}>{riskScore}</span>
                  <span className="vapt-gauge-max">/10</span>
                  <span className="vapt-gauge-risk" style={{color:riskCol}}>{riskLbl}</span>
                </div>
              </div>
              <p className="vapt-risk-card-footer">Overall Risk Score</p>
            </div>

            {/* Severity stat grid */}
            <div className="vapt-exec-stats">
              {sevKeys.map(sev => {
                const c = getSevColor(sev);
                return (
                  <div key={sev} className="vapt-sev-stat" style={{borderLeft:`3px solid ${c.fg}`}}>
                    <span className="vapt-sev-stat-num" style={{color:c.fg}}>{countBySev[sev]||0}</span>
                    <span className="vapt-sev-stat-lbl">{sev}</span>
                  </div>
                );
              })}
            </div>

            {/* Pie chart */}
            <div className="vapt-pie-card">
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                        paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="vapt-pie-legend">
                    {pieData.map((d,i) => (
                      <div key={i} className="vapt-pie-legend-item">
                        <span className="vapt-pie-dot" style={{background:d.fill}}/>
                        <span>{d.name}: <b>{d.value}</b></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="vapt-empty-sm"><CheckCircle size={28} style={{color:'#22C55E',opacity:.5}}/><span>No findings</span></div>
              )}
            </div>
          </div>

          {/* Sev bars + narrative */}
          <div className="vapt-exec-bottom">
            <div className="vapt-sev-bars-wrap">
              {sevKeys.map(sev => (
                <SeverityBar key={sev} label={sev} count={countBySev[sev]||0} total={totalFindings} color={getSevColor(sev).fg} />
              ))}
            </div>
            <div className="vapt-exec-narrative">
              <p>
                This assessment was conducted against <strong>{scope||'the target environment'}</strong> on{' '}
                <strong>{fmtDate(reportDate)}</strong>. A total of <strong>{totalFindings}</strong> security findings were
                identified across web and mobile attack surfaces.
              </p>
              {(countBySev.CRITICAL||0) > 0 && (
                <div className="vapt-exec-alert vapt-alert-critical">
                  <AlertCircle size={14}/>
                  <span><strong>{countBySev.CRITICAL} Critical</strong> — require immediate remediation.</span>
                </div>
              )}
              {(countBySev.HIGH||0) > 0 && (
                <div className="vapt-exec-alert vapt-alert-high">
                  <AlertTriangle size={14}/>
                  <span><strong>{countBySev.HIGH} High</strong> — address within 7–14 days.</span>
                </div>
              )}
              {totalFindings === 0 && (
                <div className="vapt-exec-alert vapt-alert-good">
                  <CheckCircle size={14}/>
                  <span>No vulnerabilities found. Target appears well-secured.</span>
                </div>
              )}
            </div>
          </div>

          {/* Bar chart (source breakdown) */}
          {barData.length > 1 && (
            <div className="vapt-bar-chart-section no-print">
              <p className="vapt-breakdown-title">Findings by Source &amp; Severity</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} margin={{top:4,right:16,left:0,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} />
                  <YAxis tick={{fill:'#94a3b8',fontSize:10}} allowDecimals={false} />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8}} labelStyle={{color:'#f1f5f9',fontWeight:700}} />
                  <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}} />
                  {sevKeys.filter(s=>(countBySev[s]||0)>0).map(s => (
                    <Bar key={s} dataKey={s} fill={getSevColor(s).chart} radius={[3,3,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ╔══════════════════════════════════╗
            ║  3 — SCOPE & METHODOLOGY        ║
            ╚══════════════════════════════════╝ */}
        <div id="scope-sec" className="vapt-page vapt-print-break">
          <div className="vapt-section-title">
            <Target size={18} className="vapt-section-icon"/>
            <h2>2. Scope &amp; Methodology</h2>
          </div>
          <div className="vapt-scope-grid">
            <div className="vapt-scope-card">
              <h4><Globe size={14}/> Web / ASM Scope</h4>
              <table className="vapt-meta-table"><tbody>
                <tr><td>Target</td><td>{scope||(scanMeta?.target||'—')}</td></tr>
                <tr><td>Scan ID</td><td>{localScanId||activeScanId||'—'}</td></tr>
                <tr><td>Web Findings</td><td>{webVulns.length}</td></tr>
                <tr><td>Tools</td><td>Nuclei, Wapiti, Nmap, Subfinder</td></tr>
                <tr><td>Date</td><td>{scanMeta?.created_at ? new Date(scanMeta.created_at).toLocaleDateString() : reportDate}</td></tr>
              </tbody></table>
            </div>
            <div className="vapt-scope-card">
              <h4><Smartphone size={14}/> Mobile VAPT Scope</h4>
              <table className="vapt-meta-table"><tbody>
                <tr><td>Apps Audited</td><td>{mobileScans.filter(s=>s.status==='completed').length}</td></tr>
                <tr><td>Mobile Findings</td><td>{mobileFindings.length}</td></tr>
                <tr><td>Tool</td><td>MobSF (Mobile Security Framework)</td></tr>
                <tr><td>Analysis Type</td><td>SAST / DAST</td></tr>
                <tr><td>Platforms</td><td>
                  {[mobileScans.some(s=>s.source==='android')&&'Android', mobileScans.some(s=>s.source==='ios')&&'iOS']
                    .filter(Boolean).join(' & ') || '—'}
                </td></tr>
              </tbody></table>
            </div>
            <div className="vapt-scope-card vapt-scope-full">
              <h4><Cpu size={14}/> Testing Methodology</h4>
              <p className="vapt-methodology-text">{methodology}</p>
              <div className="vapt-methodology-phases">
                {[
                  { icon:'🔍', phase:'Reconnaissance',         desc:'Subdomain enumeration, port scanning, technology fingerprinting.' },
                  { icon:'🕵️', phase:'Vulnerability Discovery', desc:'Automated scanning with Nuclei, web fuzzing with Wapiti, certificate analysis.' },
                  { icon:'📱', phase:'Mobile Analysis',         desc:'SAST/DAST of Android/iOS binaries via MobSF.' },
                  { icon:'📊', phase:'Risk Assessment',         desc:'Findings scored by severity and mapped to OWASP categories.' },
                  { icon:'📝', phase:'Reporting',               desc:'Comprehensive report with remediation guidance and CVE/CWE mapping.' },
                ].map((p,i) => (
                  <div key={i} className="vapt-phase-item">
                    <span className="vapt-phase-icon">{p.icon}</span>
                    <div><strong>{p.phase}</strong><p>{p.desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ╔══════════════════════════════════╗
            ║  4 — DETAILED FINDINGS          ║
            ╚══════════════════════════════════╝ */}
        <div id="findings" className="vapt-page vapt-print-break">
          <div className="vapt-section-title">
            <Eye size={18} className="vapt-section-icon"/>
            <h2>3. Detailed Findings</h2>
          </div>

          {/* Filters — screen only */}
          <div className="vapt-filters no-print">
            <div className="vapt-filter-group">
              <label>Severity</label>
              <div className="vapt-filter-pills">
                {['ALL', ...sevKeys].map(s => (
                  <button key={s}
                    className={`vapt-pill ${severityFilter===s?'active':''}`}
                    style={severityFilter===s&&s!=='ALL'?{background:getSevColor(s).bg,color:getSevColor(s).fg,borderColor:getSevColor(s).border}:{}}
                    onClick={()=>setSeverityFilter(s)}>
                    {s}{s!=='ALL'&&countBySev[s]?` (${countBySev[s]})`:''}</button>
                ))}
              </div>
            </div>
            <div className="vapt-filter-group">
              <label>Source</label>
              <div className="vapt-filter-pills">
                {[['ALL','ALL'],['WEB','🌐 Web'],['MOBILE','📱 Mobile']].map(([v,l]) => (
                  <button key={v} className={`vapt-pill ${sourceFilter===v?'active':''}`} onClick={()=>setSourceFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
            <span className="vapt-filter-count">{filteredFindings.length} findings</span>
          </div>

          {loading ? (
            <div className="vapt-loading"><RefreshCw size={28} className="spin"/><span>Loading…</span></div>
          ) : filteredFindings.length === 0 ? (
            <div className="vapt-empty">
              <CheckCircle size={44} style={{color:'#22C55E',opacity:.4}}/>
              <h3>No findings</h3><p>Adjust filters or run a new scan.</p>
            </div>
          ) : (
            <>
              {/* ── Screen view: expandable cards ── */}
              <div className="vapt-findings-list screen-only">
                {filteredFindings.map((finding, idx) => {
                  const c = getSevColor(finding.severity);
                  const expanded = expandedRows[finding.id];
                  const cvssScore = getCVSS(finding.severity, finding.cvss);
                  return (
                    <div key={finding.id} className="vapt-finding-card" style={{borderLeft:`4px solid ${c.fg}`}}>
                      <div className="vapt-finding-header" onClick={() => toggleRow(finding.id)}>
                        <CVSSGauge score={cvssScore} severity={finding.severity} />
                        <div className="vapt-finding-index" style={{color:c.fg}}>#{String(idx+1).padStart(3,'0')}</div>
                        <div className="vapt-finding-main">
                          <div className="vapt-finding-title">{finding.title}</div>
                          <div className="vapt-finding-meta">
                            <SeverityBadge severity={finding.severity}/>
                            <span className="vapt-finding-source-badge">{finding.source==='mobile'?'📱':'🌐'} {finding.source_label}</span>
                            {finding.cve && <span className="vapt-finding-cve">{finding.cve}</span>}
                            <span className="vapt-finding-asset">{finding.asset}</span>
                            <span className="vapt-finding-tool">{finding.tool}</span>
                          </div>
                        </div>
                        <div className="vapt-finding-chevron">
                          {expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                        </div>
                      </div>
                      {expanded && (
                        <div className="vapt-finding-detail expanded">
                          <div className="vapt-detail-grid">
                            {finding.description && (
                              <div className="vapt-detail-block">
                                <h5>Description</h5><p>{finding.description}</p>
                              </div>
                            )}
                            {finding.remediation && (
                              <div className="vapt-detail-block vapt-remediation-block">
                                <h5>Remediation</h5><p>{finding.remediation}</p>
                              </div>
                            )}
                          </div>
                          <div className="vapt-detail-attrs">
                            <span><strong>CVSS:</strong> <span style={{color:c.fg,fontWeight:700}}>{cvssScore.toFixed(1)}</span></span>
                            {finding.cve && <span><strong>CVE:</strong> {finding.cve}</span>}
                            {finding.cwe && <span><strong>CWE:</strong> {finding.cwe}</span>}
                            {finding.category && <span><strong>Category:</strong> {finding.category}</span>}
                            {finding.discovered_at && <span><strong>Discovered:</strong> {new Date(finding.discovered_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Print view: compact table ── */}
              <table className="vapt-print-table print-only">
                <thead>
                  <tr>
                    <th>#</th><th>Finding</th><th>Severity</th><th>CVSS</th>
                    <th>Source</th><th>Asset</th><th>CVE / CWE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((f, idx) => {
                    const c = getSevColor(f.severity);
                    return (
                      <tr key={f.id}>
                        <td className="vapt-pt-num">{idx+1}</td>
                        <td className="vapt-pt-title">{f.title}</td>
                        <td><span className="vapt-pt-badge" style={{color:c.print,border:`1px solid ${c.print}`}}>{f.severity}</span></td>
                        <td className="vapt-pt-cvss" style={{color:c.print}}>{getCVSS(f.severity,f.cvss).toFixed(1)}</td>
                        <td>{f.source_label}</td>
                        <td className="vapt-pt-asset">{f.asset}</td>
                        <td className="vapt-pt-cve">{[f.cve,f.cwe].filter(Boolean).join(' / ')||'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ╔══════════════════════════════════╗
            ║  5 — MOBILE VAPT               ║
            ╚══════════════════════════════════╝ */}
        {mobileScans.length > 0 && (
          <div id="mobile-sec" className="vapt-page vapt-print-break">
            <div className="vapt-section-title">
              <Smartphone size={18} className="vapt-section-icon"/>
              <h2>4. Mobile Application Security</h2>
            </div>
            <div className="vapt-mobile-apps-grid">
              {mobileScans.filter(s=>s.status==='completed').map(scan => {
                const scanFindings = mobileFindings.filter(f=>f.scan_id===scan.id);
                const scanCounts = scanFindings.reduce((a,f)=>{ a[(f.severity||'LOW').toUpperCase()]=(a[(f.severity||'LOW').toUpperCase()]||0)+1; return a; }, {});
                const score = parseInt(scan.score||50);
                return (
                  <div key={scan.id} className="vapt-mobile-app-card">
                    <div className="vapt-mobile-app-header">
                      <div className="vapt-mobile-app-info">
                        <span className="vapt-mobile-platform">{scan.source==='ios'?'🍏 iOS':'🤖 Android'}</span>
                        <h4>{scan.app_name||scan.file_name}</h4>
                        <span className="vapt-mobile-pkg">{scan.package_name||scan.version_name||''}</span>
                      </div>
                      <div className="vapt-mobile-score-circle" style={{
                        borderColor: score>=80?'#22C55E':score>=50?'#F97316':'#EF4444',
                        color:        score>=80?'#22C55E':score>=50?'#F97316':'#EF4444',
                      }}>
                        <span>{score}</span><small>/100</small>
                      </div>
                    </div>
                    <div className="vapt-mobile-sev-pills">
                      {sevKeys.map(sev => scanCounts[sev] ? (
                        <span key={sev} className="vapt-mobile-sev-pill"
                          style={{background:getSevColor(sev).bg,color:getSevColor(sev).fg}}>
                          {sev}: {scanCounts[sev]}
                        </span>
                      ) : null)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════╗
            ║  6 — REMEDIATION ROADMAP        ║
            ╚══════════════════════════════════╝ */}
        <div id="remediation-sec" className="vapt-page vapt-print-break">
          <div className="vapt-section-title">
            <CheckCircle size={18} className="vapt-section-icon"/>
            <h2>{mobileScans.length>0?'5':'4'}. Remediation Roadmap</h2>
          </div>
          <div className="vapt-remediation-roadmap">
            {[
              { timeline:'Immediate (0–48 hrs)',    severity:'CRITICAL', color:'#EF4444', icon:'🚨', count:countBySev.CRITICAL||0, guidance:'Patch or mitigate immediately. Isolate affected systems and escalate to security leadership.' },
              { timeline:'Short-term (7–14 days)',  severity:'HIGH',     color:'#F97316', icon:'⚠️', count:countBySev.HIGH||0,     guidance:'Plan and deploy patches. Implement compensating controls where patching is delayed.' },
              { timeline:'Medium-term (1–3 months)',severity:'MEDIUM',   color:'#EAB308', icon:'🔶', count:countBySev.MEDIUM||0,   guidance:'Address in the next sprint or maintenance window. Track via security backlog.' },
              { timeline:'Long-term (3–6 months)',  severity:'LOW / INFO',color:'#22C55E', icon:'📌', count:(countBySev.LOW||0)+(countBySev.INFO||0), guidance:'Document and address in regular security reviews.' },
            ].map((item,i) => (
              <div key={i} className="vapt-roadmap-item" style={{borderLeft:`4px solid ${item.color}`}}>
                <div className="vapt-roadmap-header">
                  <span className="vapt-roadmap-icon">{item.icon}</span>
                  <div>
                    <h4 style={{color:item.color}}>{item.timeline}</h4>
                    <span className="vapt-roadmap-sev">{item.severity} — {item.count} findings</span>
                  </div>
                </div>
                <p className="vapt-roadmap-guidance">{item.guidance}</p>
              </div>
            ))}
          </div>
          <div className="vapt-best-practices">
            <h3>General Security Recommendations</h3>
            <div className="vapt-bp-grid">
              {[
                { icon:'🔒', title:'Input Validation',      desc:'Sanitize all inputs server-side. Use parameterized queries.' },
                { icon:'🔑', title:'Auth & Session',        desc:'Enforce MFA, secure cookies (HttpOnly, Secure), proper logout.' },
                { icon:'🛡️', title:'Security Headers',      desc:'Add CSP, X-Frame-Options, HSTS, Referrer-Policy.' },
                { icon:'📦', title:'Dependency Management', desc:'Audit third-party libraries. Subscribe to CVE feeds.' },
                { icon:'🔍', title:'Continuous Monitoring', desc:'Implement SIEM, WAF, IDS. Schedule recurring VAPT.' },
                { icon:'👩‍💻', title:'Developer Training',   desc:'Conduct OWASP Top 10 & mobile security training regularly.' },
              ].map((bp,i) => (
                <div key={i} className="vapt-bp-card">
                  <span className="vapt-bp-icon">{bp.icon}</span>
                  <h5>{bp.title}</h5><p>{bp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Report footer ─────────────────── */}
        <div className="vapt-report-footer">
          <div className="vapt-footer-left"><Shield size={13}/> {reportTitle}</div>
          <div className="vapt-footer-center">CONFIDENTIAL</div>
          <div className="vapt-footer-right">Generated {fmtDate(reportDate)}</div>
        </div>

      </div>{/* end vapt-report-body */}
    </div>
  );
};

export default VaptReport;
