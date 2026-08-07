import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateAssetDiscoveryReportHTML } from '../../utils/generateAssetDiscoveryReport';
import {
  FileText, Download, Shield, AlertTriangle, AlertCircle,
  CheckCircle, RefreshCw, ChevronDown, ChevronRight,
  Globe, Calendar, User, TrendingUp, Eye, X, Upload,
  Settings2, Layers, Server, Lock, Cpu, Search
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import PageHeaderCard from '../common/PageHeaderCard';
import { api } from '../../utils/api';
import './AssetDiscoveryReport.css';

/* ─────────────────────────────────────────────────────────
   Severity helpers — identical to VaptReport.jsx
───────────────────────────────────────────────────────── */
const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4, WARNING: 5 };
const SEV_COLORS = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',  fg: '#EF4444', border: 'rgba(239,68,68,0.3)',  chart: '#EF4444' },
  HIGH:     { bg: 'rgba(249,115,22,0.12)', fg: '#F97316', border: 'rgba(249,115,22,0.3)', chart: '#F97316' },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.3)',  chart: '#EAB308' },
  LOW:      { bg: 'rgba(34,197,94,0.12)',  fg: '#22C55E', border: 'rgba(34,197,94,0.3)',  chart: '#22C55E' },
  INFO:     { bg: 'rgba(59,130,246,0.12)', fg: '#3B82F6', border: 'rgba(59,130,246,0.3)', chart: '#3B82F6' },
  WARNING:  { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.3)',  chart: '#EAB308' },
};
const getSevColor = (sev) => SEV_COLORS[(sev || '').toUpperCase()] || SEV_COLORS.INFO;

const SEV_CVSS = { CRITICAL: 9.5, HIGH: 7.5, MEDIUM: 5.0, LOW: 2.5, INFO: 0.5, WARNING: 5.0 };
const getCVSS = (sev, cvss) => cvss ? parseFloat(cvss) : (SEV_CVSS[(sev || '').toUpperCase()] || 0);

/* ── SeverityBadge — same as VaptReport ── */
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

/* ── CVSSGauge — same as VaptReport ── */
const CVSSGauge = ({ score, severity }) => {
  const c = getSevColor(severity);
  const pct = Math.min(score / 10, 1);
  const circumference = 2 * Math.PI * 16;
  const dash = pct * circumference;
  return (
    <div className="cvss-gauge-wrap" title={`CVSS: ${score.toFixed(1)}`}>
      <svg width="38" height="38" viewBox="0 0 38 38" className="cvss-gauge-svg">
        <circle cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle cx="19" cy="19" r="16" fill="none" stroke={c.fg} strokeWidth="4"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
        <text x="19" y="23" textAnchor="middle" fontSize="8" fontWeight="800" fill={c.fg}>
          {score.toFixed(1)}
        </text>
      </svg>
    </div>
  );
};

/* ── Risk score — same formula as VaptReport ── */
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
  return              { label: 'MINIMAL',  color: '#3B82F6' };
};

/* ── SeverityBar — same as VaptReport ── */
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

/* ── PieTooltip — same as VaptReport ── */
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

/* ── Status badge for assets ── */
const statusCfg = (status) => {
  const s = (status || 'active').toLowerCase();
  if (s === 'live' || s === 'active' || s === 'up')
    return { label: 'Active', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' };
  if (s === 'down' || s === 'inactive')
    return { label: 'Down', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
  return { label: 'Unknown', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)' };
};

/* ── Cert health ── */
const certHealthCfg = (expiryDate, isValid) => {
  if (!isValid) return { label: 'Expired', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
  if (!expiryDate) return { label: 'Unknown', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)' };
  const daysLeft = Math.floor((new Date(expiryDate) - Date.now()) / 86400000);
  if (daysLeft < 0) return { label: 'Expired', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
  if (daysLeft < 30) return { label: 'Expiring Soon', color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' };
  return { label: 'Healthy', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' };
};

/* ═════════════════════════════════════════════════════════
   Main Component
═════════════════════════════════════════════════════════ */
const AssetDiscoveryReport = ({ activeScanId, scansList, selectedDomain, handleSelectScan }) => {

  /* ── State ─────────────────────────────────── */
  const [loading, setLoading]             = useState(false);
  const [subdomains, setSubdomains]       = useState([]);
  const [endpoints, setEndpoints]         = useState([]);
  const [ports, setPorts]                 = useState([]);
  const [technologies, setTechnologies]   = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [certificates, setCertificates]   = useState([]);
  const [scanMeta, setScanMeta]           = useState(null);
  const [localScanId, setLocalScanId]     = useState(activeScanId);

  /* Report config */
  const [reportTitle, setReportTitle]     = useState('Asset Discovery Report');
  const [orgName, setOrgName]             = useState('');
  const [assessorName, setAssessorName]   = useState('');
  const [reportDate, setReportDate]       = useState(() => new Date().toISOString().split('T')[0]);
  const [scope, setScope]                 = useState('');
  const [methodology, setMethodology]     = useState(
    'Automated Attack Surface Management (ASM) scanning using Subfinder, Nmap, Wappalyzer, Wapiti, and Nuclei to discover and assess the full external attack surface.'
  );
  const [showSettings, setShowSettings]   = useState(false);
  const [logoDataUrl, setLogoDataUrl]     = useState(null);
  const logoInputRef                      = useRef(null);

  /* Filters */
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [expandedRows, setExpandedRows]     = useState({});
  const [activeSection, setActiveSection]   = useState('cover');
  const reportRef                           = useRef(null);

  /* ── Resolve the active scan id (prop or local selection) ── */
  const resolvedScanId = localScanId || activeScanId || null;

  /* ── Load all Asset Discovery data ─────────── */
  const loadData = useCallback(async (signal) => {
    /* Guard: don't start loading until we actually have a scan to load */
    if (!resolvedScanId) return;

    setLoading(true);
    try {
      const scanId = resolvedScanId;

      const found = scansList?.find(s => s.id === Number(scanId));
      setScanMeta(found || null);
      if (found?.target && !scope) setScope(found.target);

      /* Fetch all asset discovery endpoints in parallel */
      const [subData, epData, portData, techData, vulnData, certData] = await Promise.all([
        api.get(`/api/attacksurface/subdomains/?scan=${scanId}`).catch(() => []),
        api.get(`/api/attacksurface/endpoints/?scan=${scanId}`).catch(() => []),
        api.get(`/api/attacksurface/open-ports/?scan=${scanId}`).catch(() => []),
        api.get(`/api/attacksurface/technologies/?scan=${scanId}`).catch(() => []),
        api.get(`/api/attacksurface/vulnerabilities/?scan=${scanId}`).catch(() => []),
        api.get(`/api/attacksurface/ssl-certs/?scan=${scanId}`).catch(() => []),
      ]);

      /* Bail if this request was cancelled (user changed scan mid-load) */
      if (signal?.aborted) return;

      setSubdomains(Array.isArray(subData) ? subData : (subData?.results || []));

      setEndpoints(Array.isArray(epData) ? epData : (epData?.results || []));

      /* Flatten ports (same logic as OpenPorts.jsx) */
      const rawPorts = Array.isArray(portData) ? portData : (portData?.results || []);
      const flatPorts = [];
      rawPorts.forEach(item => {
        const portsList = Array.isArray(item.ports) ? item.ports : [];
        portsList.forEach((p, idx) => {
          const portNum = typeof p === 'object' ? p.port : p;
          const proto   = typeof p === 'object' ? (p.protocol || 'tcp') : 'tcp';
          const service = typeof p === 'object' ? (p.service || 'unknown') : 'unknown';
          flatPorts.push({
            id: `${item.id}-${idx}`,
            host: item.domain,
            port: portNum,
            protocol: proto,
            service,
          });
        });
      });
      setPorts(flatPorts);

      /* Flatten technologies (same logic as Technologies.jsx) */
      const rawTech = Array.isArray(techData) ? techData : (techData?.results || []);
      const techMap = {};
      rawTech.forEach(item => {
        const techs = Array.isArray(item.technologies) ? item.technologies : [];
        techs.forEach(tech => {
          let name = tech;
          let version = '';
          const toolMatch = name.match(/\s*\[(.*?)\]$/);
          if (toolMatch) name = name.replace(toolMatch[0], '').trim();
          if (name.includes('/')) { const p = name.split('/'); name = p[0]; version = p[1]; }
          else if (name.includes(' (v')) { const p = name.split(' (v'); name = p[0]; version = p[1]?.replace(')', '') || ''; }
          const key = name.trim();
          if (!techMap[key]) techMap[key] = { name: key, version: '', hosts: [], category: 'Miscellaneous' };
          if (version && !techMap[key].version) techMap[key].version = version;
          if (!techMap[key].hosts.includes(item.domain)) techMap[key].hosts.push(item.domain);
        });
      });
      /* Category inference (same logic as Technologies.jsx) */
      const techList = Object.values(techMap).map(t => {
        const nl = t.name.toLowerCase();
        let category = 'Miscellaneous';
        if (['nginx', 'apache', 'iis', 'caddy', 'gunicorn', 'tomcat', 'litespeed'].some(k => nl.includes(k))) category = 'Web servers';
        else if (['react', 'angular', 'vue', 'jquery', 'next', 'nuxt', 'bootstrap', 'core-js'].some(k => nl.includes(k))) category = 'JavaScript libraries';
        else if (['django', 'flask', 'express', 'laravel', 'php', 'python', 'node', 'ruby', 'spring'].some(k => nl.includes(k))) category = 'Programming languages';
        else if (['cloudflare', 'cloudfront', 'fastly', 'cdn', 'akamai'].some(k => nl.includes(k))) category = 'CDN';
        else if (['google analytics', 'clarity', 'pixel', 'mixpanel', 'hotjar', 'analytics'].some(k => nl.includes(k))) category = 'Analytics';
        else if (['recaptcha', 'captcha', 'waf', 'firewall', 'imperva', 'security'].some(k => nl.includes(k))) category = 'Security';
        else if (['mysql', 'postgres', 'mongodb', 'redis', 'sqlite'].some(k => nl.includes(k))) category = 'Database';
        else if (['wordpress', 'drupal', 'joomla', 'shopify', 'cms'].some(k => nl.includes(k))) category = 'CMS';
        return { ...t, category };
      });
      setTechnologies(techList);

      /* Vulnerabilities sorted by severity */
      const rawVulns = Array.isArray(vulnData) ? vulnData : (vulnData?.results || []);
      rawVulns.sort((a, b) => (SEV_ORDER[(a.severity || 'LOW').toUpperCase()] ?? 9) - (SEV_ORDER[(b.severity || 'LOW').toUpperCase()] ?? 9));
      setVulnerabilities(rawVulns);

      setCertificates(Array.isArray(certData) ? certData : (certData?.results || []));

    } catch (e) {
      console.error('Asset Discovery Report data load error', e);
    } finally {
      setLoading(false);
    }
  }, [localScanId, activeScanId, scansList]);

  useEffect(() => {
    if (!resolvedScanId) return;  // nothing to load yet
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort(); // cancel on scan change / unmount
  }, [resolvedScanId]);

  /* ── Logo upload — same as VaptReport ─────── */
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogoDataUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Vulnerability counts & risk ────────── */
  const sevKeys = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const countBySev = vulnerabilities.reduce((acc, v) => {
    const s = (v.severity || 'LOW').toUpperCase();
    acc[s] = (acc[s] || 0) + 1; return acc;
  }, {});
  const totalVulns   = vulnerabilities.length;
  const riskScore    = parseFloat(calcRiskScore(countBySev));
  const { label: riskLbl, color: riskCol } = riskLabel(riskScore);

  /* ── Pie chart data (severity distribution) ─ */
  const pieData = sevKeys
    .filter(s => (countBySev[s] || 0) > 0)
    .map(s => ({ name: s, value: countBySev[s], fill: getSevColor(s).chart }));

  /* ── Bar chart data (asset type counts) ─── */
  const barData = [
    { name: 'Subdomains', count: subdomains.length, fill: '#3B82F6' },
    { name: 'Endpoints',  count: endpoints.length,  fill: '#8B5CF6' },
    { name: 'Ports',      count: ports.length,       fill: '#F97316' },
    { name: 'Techs',      count: technologies.length, fill: '#06B6D4' },
    { name: 'Certs',      count: certificates.length, fill: '#22C55E' },
  ].filter(d => d.count > 0);

  /* ── Filtered vulnerabilities ────────────── */
  const filteredVulns = vulnerabilities.filter(v => {
    if (severityFilter !== 'ALL' && (v.severity || 'LOW').toUpperCase() !== severityFilter) return false;
    return true;
  });

  /* ── Filtered subdomains ─────────────────── */
  const filteredSubs = subdomains.filter(s => {
    if (statusFilter !== 'ALL') {
      const sc = statusCfg(s.status);
      if (statusFilter === 'ACTIVE' && sc.label !== 'Active') return false;
      if (statusFilter === 'DOWN'   && sc.label !== 'Down')   return false;
    }
    return true;
  });

  /* ── Generate & export professional PDF ──── */
  const handleGenerateReport = () => {
    const html = generateAssetDiscoveryReportHTML({
      reportTitle, orgName, assessorName, reportDate, scope, methodology, logoDataUrl,
      subdomains, endpoints, ports, technologies, vulnerabilities, certificates, scanMeta,
    });
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups for this site to export the report.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 1200);
  };

  /* ── Toggle row ────────────────────────── */
  const toggleRow = id => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  /* ── Scroll nav ────────────────────────── */
  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  /* ── Scan change ───────────────────────── */
  const handleScanChange = e => {
    const id = Number(e.target.value);
    setLocalScanId(id);
    const found = scansList?.find(s => s.id === id);
    if (found?.target) setScope(found.target);
    if (handleSelectScan) handleSelectScan(id, found?.target);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ═════════════════ RENDER ═════════════════ */

  /* ── No scan selected yet — render instantly, zero API calls ── */
  if (!resolvedScanId) {
    return (
      <div className="global-page-container page-animate">
        <PageHeaderCard
          badgeText="REPORT"
          title="Asset Discovery Report"
          subtitle="Comprehensive Attack Surface Management report covering all discovered assets."
          stats={[
            { label: 'Subdomains',      value: '—', subtext: 'discovered' },
            { label: 'Open Ports',      value: '—', subtext: 'exposed' },
            { label: 'Technologies',    value: '—', subtext: 'fingerprinted' },
            { label: 'Vulnerabilities', value: '—', subtext: 'pending' },
          ]}
          actions={
            <div className="vapt-header-actions">
              {scansList?.length > 0 && (
                <div className="vapt-scan-select-wrap">
                  <Layers size={13} />
                  <select className="vapt-scan-select" value="" onChange={handleScanChange}>
                    <option value="">— Select a Scan to Load Report —</option>
                    {scansList.map(s => (
                      <option key={s.id} value={s.id}>
                        #{s.id} · {s.target} · {new Date(s.created_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          }
        />
        <div className="vapt-empty" style={{ marginTop: '3rem' }}>
          <Search size={52} style={{ color: 'var(--brand-primary)', opacity: 0.35 }} />
          <h3>No Scan Selected</h3>
          <p>Select a completed Asset Discovery scan from the dropdown above to generate the report.</p>
        </div>
      </div>
    );
  }

  /* ── Scan selected but still fetching ─────────────────────── */
  if (loading) {
    return (
      <div className="global-page-container page-animate">
        <PageHeaderCard
          badgeText="REPORT"
          title="Asset Discovery Report"
          subtitle="Loading report data…"
          stats={[
            { label: 'Subdomains',      value: '…', subtext: 'loading' },
            { label: 'Open Ports',      value: '…', subtext: 'loading' },
            { label: 'Technologies',    value: '…', subtext: 'loading' },
            { label: 'Vulnerabilities', value: '…', subtext: 'loading' },
          ]}
          actions={null}
        />
        <div className="vapt-loading" style={{ marginTop: '3rem' }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--brand-primary)' }} />
          <span>Fetching asset data from {scansList?.find(s => s.id === Number(resolvedScanId))?.target || `Scan #${resolvedScanId}`}…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="global-page-container page-animate">

      {/* ── Page Header ──────────────────────── */}
      <PageHeaderCard
        badgeText="REPORT"
        title="Asset Discovery Report"
        subtitle="Comprehensive Attack Surface Management report covering all discovered assets."
        stats={[
          { label: 'Subdomains',    value: subdomains.length.toString(),     subtext: 'discovered' },
          { label: 'Open Ports',    value: ports.length.toString(),           subtext: 'exposed' },
          { label: 'Technologies',  value: technologies.length.toString(),    subtext: 'fingerprinted' },
          { label: 'Vulnerabilities', value: totalVulns.toString(),           subtext: riskLbl },
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
          </div>
        }
      />

      {/* ── Settings panel ──────────────────── */}
      {showSettings && (
        <div className="card vapt-settings-panel no-print">
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
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          REPORT BODY
      ════════════════════════════════════════ */}
      <div className="vapt-report-body" ref={reportRef}>

        {/* ── Sticky section nav ── */}
        <div className="vapt-section-nav no-print">
          {[
            { id: 'cover',        label: '📄 Cover'            },
            { id: 'exec',         label: '📊 Executive Summary' },
            { id: 'scope-sec',    label: '🎯 Scope'            },
            { id: 'assets',       label: '🌐 Assets'           },
            { id: 'vulns',        label: '🔍 Vulnerabilities'   },
            ...(technologies.length > 0 ? [{ id: 'tech-sec',  label: '🛠 Technologies'  }] : []),
            ...(certificates.length > 0 ? [{ id: 'cert-sec',  label: '🔒 Certificates'  }] : []),
            { id: 'hardening',    label: '🛡️ Hardening'       },
          ].map(s => (
            <button key={s.id} className={`vapt-nav-btn ${activeSection === s.id ? 'active' : ''}`} onClick={() => scrollTo(s.id)}>
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
                : <Search size={52} style={{ color: '#3B82F6' }} />}
            </div>
            <div className="vapt-cover-watermark">CONFIDENTIAL</div>
          </div>
          <div className="vapt-cover-center">
            <div className="vapt-cover-badge">ATTACK SURFACE MANAGEMENT</div>
            <h1 className="vapt-cover-title">{reportTitle}</h1>
            {orgName && <p className="vapt-cover-org">Prepared for: <strong>{orgName}</strong></p>}
          </div>
          <div className="vapt-cover-meta">
            <div className="vapt-cover-meta-grid">
              <div className="vapt-cover-meta-item"><Calendar size={13}/><span><b>Date:</b> {fmtDate(reportDate)}</span></div>
              {assessorName && <div className="vapt-cover-meta-item"><User size={13}/><span><b>Assessor:</b> {assessorName}</span></div>}
              {scope && <div className="vapt-cover-meta-item"><Globe size={13}/><span><b>Scope:</b> {scope}</span></div>}
              <div className="vapt-cover-meta-item">
                <AlertCircle size={13} style={{ color: riskCol }} />
                <span><b>Risk Score:</b> <span style={{ color: riskCol, fontWeight: 800 }}>{riskLbl}</span> ({riskScore}/10)</span>
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

          {/* Stat row: all asset types */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.7rem', marginBottom: '1.25rem' }}>
            {[
              { icon: <Globe size={16}/>,  label: 'Subdomains',    value: subdomains.length,     color: '#3B82F6' },
              { icon: <Eye size={16}/>,    label: 'Endpoints',     value: endpoints.length,      color: '#8B5CF6' },
              { icon: <Server size={16}/>, label: 'Open Ports',    value: ports.length,          color: '#F97316' },
              { icon: <Cpu size={16}/>,    label: 'Technologies',  value: technologies.length,   color: '#06B6D4' },
              { icon: <Lock size={16}/>,   label: 'SSL Certs',     value: certificates.length,   color: '#22C55E' },
              { icon: <AlertTriangle size={16}/>, label: 'Vulnerabilities', value: totalVulns,   color: riskCol   },
            ].map((stat, i) => (
              <div key={i} className="vapt-sev-stat" style={{ borderLeft: `3px solid ${stat.color}` }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
                <span className="vapt-sev-stat-num" style={{ color: stat.color }}>{stat.value}</span>
                <span className="vapt-sev-stat-lbl">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Top row: risk gauge + vuln severity stats + pie */}
          <div className="vapt-exec-top">
            {/* Risk gauge */}
            <div className="card vapt-risk-card">
              <div className="vapt-risk-gauge" style={{ '--risk-color': riskCol }}>
                <svg viewBox="0 0 120 70" className="vapt-gauge-svg">
                  <path d="M10,65 A55,55 0 0,1 110,65" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round"/>
                  <path d="M10,65 A55,55 0 0,1 110,65" fill="none" stroke={riskCol} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${(riskScore / 10) * 172.7} 172.7`}/>
                </svg>
                <div className="vapt-gauge-label">
                  <span className="vapt-gauge-value" style={{ color: riskCol }}>{riskScore}</span>
                  <span className="vapt-gauge-max">/10</span>
                  <span className="vapt-gauge-risk" style={{ color: riskCol }}>{riskLbl}</span>
                </div>
              </div>
              <p className="vapt-risk-card-footer">Overall Risk Score</p>
            </div>

            {/* Severity stats */}
            <div className="vapt-exec-stats">
              {sevKeys.map(sev => {
                const c = getSevColor(sev);
                return (
                  <div key={sev} className="vapt-sev-stat" style={{ borderLeft: `3px solid ${c.fg}` }}>
                    <span className="vapt-sev-stat-num" style={{ color: c.fg }}>{countBySev[sev] || 0}</span>
                    <span className="vapt-sev-stat-lbl">{sev}</span>
                  </div>
                );
              })}
            </div>

            {/* Pie chart */}
            <div className="card vapt-pie-card">
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="vapt-pie-legend">
                    {pieData.map((d, i) => (
                      <div key={i} className="vapt-pie-legend-item">
                        <span className="vapt-pie-dot" style={{ background: d.fill }}/>
                        <span>{d.name}: <b>{d.value}</b></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="vapt-empty-sm"><CheckCircle size={28} style={{ color: '#22C55E', opacity: .5 }}/><span>No vulnerabilities</span></div>
              )}
            </div>
          </div>

          {/* Sev bars + narrative */}
          <div className="vapt-exec-bottom">
            <div className="vapt-sev-bars-wrap">
              {sevKeys.map(sev => (
                <SeverityBar key={sev} label={sev} count={countBySev[sev] || 0} total={totalVulns} color={getSevColor(sev).fg} />
              ))}
            </div>
            <div className="vapt-exec-narrative">
              <p>
                This assessment was conducted against <strong>{scope || 'the target environment'}</strong> on{' '}
                <strong>{fmtDate(reportDate)}</strong>. A total of <strong>{subdomains.length}</strong> subdomains,{' '}
                <strong>{endpoints.length}</strong> endpoints, and <strong>{ports.length}</strong> open port records were discovered.
              </p>
              {(countBySev.CRITICAL || 0) > 0 && (
                <div className="vapt-exec-alert vapt-alert-critical">
                  <AlertCircle size={14}/><span><strong>{countBySev.CRITICAL} Critical</strong> — require immediate remediation.</span>
                </div>
              )}
              {(countBySev.HIGH || 0) > 0 && (
                <div className="vapt-exec-alert vapt-alert-high">
                  <AlertTriangle size={14}/><span><strong>{countBySev.HIGH} High</strong> — address within 7–14 days.</span>
                </div>
              )}
              {totalVulns === 0 && (
                <div className="vapt-exec-alert vapt-alert-good">
                  <CheckCircle size={14}/><span>No vulnerabilities found. Attack surface appears well-secured.</span>
                </div>
              )}
            </div>
          </div>

          {/* Asset type bar chart */}
          {barData.length > 0 && (
            <div className="vapt-bar-chart-section no-print">
              <p className="vapt-breakdown-title">Discovered Assets by Type</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9', fontWeight: 700 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
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
            <Globe size={18} className="vapt-section-icon"/>
            <h2>2. Scope &amp; Methodology</h2>
          </div>
          <div className="vapt-scope-grid">
            <div className="card vapt-scope-card">
              <h4><Globe size={14}/> Assessment Scope</h4>
              <table className="vapt-meta-table"><tbody>
                <tr><td>Target Domain</td><td>{scope || (scanMeta?.target || '—')}</td></tr>
                <tr><td>Scan ID</td><td>{localScanId || activeScanId || '—'}</td></tr>
                <tr><td>Subdomains Found</td><td>{subdomains.length}</td></tr>
                <tr><td>Date</td><td>{scanMeta?.created_at ? new Date(scanMeta.created_at).toLocaleDateString() : reportDate}</td></tr>
                <tr><td>Assessment Type</td><td>Automated ASM</td></tr>
              </tbody></table>
            </div>
            <div className="card vapt-scope-card">
              <h4><Server size={14}/> Tool Stack</h4>
              <table className="vapt-meta-table"><tbody>
                <tr><td>Subdomain Discovery</td><td>Subfinder</td></tr>
                <tr><td>Port Scanning</td><td>Nmap</td></tr>
                <tr><td>Web Crawling</td><td>Wapiti</td></tr>
                <tr><td>Tech Fingerprint</td><td>Wappalyzer, HTTPX</td></tr>
                <tr><td>Vulnerability Scan</td><td>Nuclei</td></tr>
              </tbody></table>
            </div>
            <div className="card vapt-scope-card vapt-scope-full">
              <h4><Cpu size={14}/> Testing Methodology</h4>
              <p className="vapt-methodology-text">{methodology}</p>
              <div className="vapt-methodology-phases">
                {[
                  { icon: '🔍', phase: 'Subdomain Enumeration',    desc: 'Passive and active subdomain discovery using Subfinder, DNS brute-force, and certificate transparency logs.' },
                  { icon: '🚪', phase: 'Port & Service Scanning',  desc: 'TCP/UDP port scanning with Nmap to identify open services, running versions, and exposed interfaces.' },
                  { icon: '🌐', phase: 'Web Endpoint Discovery',   desc: 'Web crawling and directory enumeration to map all accessible endpoints and APIs.' },
                  { icon: '🛠', phase: 'Technology Fingerprinting',desc: 'Identification of web frameworks, libraries, and backend tech via Wappalyzer and HTTP header analysis.' },
                  { icon: '🔒', phase: 'Certificate Analysis',     desc: 'SSL/TLS inspection for validity, expiry dates, issuer chains, and TLS version configuration.' },
                  { icon: '⚡', phase: 'Vulnerability Assessment', desc: 'Automated scanning with Nuclei templates against all discovered assets to identify known CVEs and misconfigurations.' },
                ].map((p, i) => (
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
            ║  4 — ASSET INVENTORY            ║
            ╚══════════════════════════════════╝ */}
        <div id="assets" className="vapt-page vapt-print-break">
          <div className="vapt-section-title">
            <Globe size={18} className="vapt-section-icon"/>
            <h2>3. Asset Inventory</h2>
          </div>

          {/* Status filter pills */}
          <div className="vapt-filters no-print">
            <div className="vapt-filter-group">
              <label>Status</label>
              <div className="vapt-filter-pills">
                {[['ALL', 'All'], ['ACTIVE', '✅ Active'], ['DOWN', '❌ Down']].map(([v, l]) => (
                  <button key={v} className={`vapt-pill ${statusFilter === v ? 'active' : ''}`} onClick={() => setStatusFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
            <span className="vapt-filter-count">{filteredSubs.length} assets</span>
          </div>

          {loading ? (
            <div className="vapt-loading"><RefreshCw size={28} className="spin"/><span>Loading assets…</span></div>
          ) : subdomains.length === 0 ? (
            <div className="vapt-empty">
              <CheckCircle size={44} style={{ color: '#22C55E', opacity: .4 }}/>
              <h3>No assets discovered</h3><p>Select a scan with discovered subdomains.</p>
            </div>
          ) : (
            <>
              {/* Screen: expandable cards */}
              <div className="vapt-findings-list screen-only">
                {filteredSubs.map((sub, idx) => {
                  const sc = statusCfg(sub.status);
                  const expanded = expandedRows[`sub-${sub.id}`];
                  const subPorts = ports.filter(p => p.host === sub.domain);
                  const subTechs = technologies.filter(t => t.hosts && t.hosts.includes(sub.domain));
                  const subVulns = vulnerabilities.filter(v => v.subdomain === sub.domain || v.domain === sub.domain);
                  const ip = Array.isArray(sub.ip) ? sub.ip.join(', ') : (sub.ip || '—');
                  return (
                    <div key={sub.id} className="card vapt-finding-card" style={{ borderLeft: `4px solid ${sc.color}` }}>
                      <div className="vapt-finding-header" onClick={() => toggleRow(`sub-${sub.id}`)}>
                        <div className="vapt-finding-index" style={{ color: sc.color }}>#{String(idx + 1).padStart(3, '0')}</div>
                        <div className="vapt-finding-main">
                          <div className="vapt-finding-title">{sub.domain}</div>
                          <div className="vapt-finding-meta">
                            <span className="adr-status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                              {sc.label}
                            </span>
                            {ip !== '—' && <span className="vapt-finding-asset">{ip}</span>}
                            {subPorts.slice(0, 4).map((p, pi) => (
                              <span key={pi} className="adr-port-tag">{p.port}/{(p.protocol || 'tcp').toLowerCase()}</span>
                            ))}
                            {subPorts.length > 4 && <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>+{subPorts.length - 4} more</span>}
                          </div>
                        </div>
                        <div className="vapt-finding-chevron">
                          {expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                        </div>
                      </div>
                      {expanded && (
                        <div className="vapt-finding-detail expanded">
                          <div className="vapt-detail-grid">
                            <div className="vapt-detail-block">
                              <h5>Open Ports</h5>
                              {subPorts.length > 0 ? (
                                <p>{subPorts.map(p => `${p.port}/${(p.protocol || 'tcp').toLowerCase()} (${p.service || 'unknown'})`).join(', ')}</p>
                              ) : <p>No open ports detected.</p>}
                            </div>
                            <div className="vapt-detail-block">
                              <h5>Technologies</h5>
                              {subTechs.length > 0 ? (
                                <p>{subTechs.map(t => t.version ? `${t.name} ${t.version}` : t.name).join(', ')}</p>
                              ) : <p>No technologies fingerprinted.</p>}
                            </div>
                          </div>
                          <div className="vapt-detail-attrs">
                            <span><strong>IP:</strong> {ip}</span>
                            <span><strong>Status:</strong> {sc.label}</span>
                            <span><strong>Vulnerabilities:</strong> {subVulns.length}</span>
                            {sub.created_at && <span><strong>Discovered:</strong> {new Date(sub.created_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Print: compact table */}
              <table className="vapt-print-table print-only">
                <thead>
                  <tr><th>#</th><th>Domain</th><th>Status</th><th>IP Address</th><th>Open Ports</th><th>Discovered</th></tr>
                </thead>
                <tbody>
                  {filteredSubs.map((sub, idx) => {
                    const sc = statusCfg(sub.status);
                    const subPorts = ports.filter(p => p.host === sub.domain);
                    const ip = Array.isArray(sub.ip) ? sub.ip[0] : (sub.ip || '—');
                    return (
                      <tr key={sub.id}>
                        <td className="vapt-pt-num">{idx + 1}</td>
                        <td className="vapt-pt-title">{sub.domain}</td>
                        <td><span style={{ color: sc.color, fontWeight: 700 }}>{sc.label}</span></td>
                        <td className="vapt-pt-asset">{ip}</td>
                        <td className="vapt-pt-cve">{subPorts.map(p => `${p.port}`).join(', ') || '—'}</td>
                        <td>{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ╔══════════════════════════════════╗
            ║  5 — VULNERABILITY FINDINGS     ║
            ╚══════════════════════════════════╝ */}
        <div id="vulns" className="vapt-page vapt-print-break">
          <div className="vapt-section-title">
            <Eye size={18} className="vapt-section-icon"/>
            <h2>4. Vulnerability Findings</h2>
          </div>

          {/* Severity filter pills */}
          <div className="vapt-filters no-print">
            <div className="vapt-filter-group">
              <label>Severity</label>
              <div className="vapt-filter-pills">
                {['ALL', ...sevKeys].map(s => (
                  <button key={s}
                    className={`vapt-pill ${severityFilter === s ? 'active' : ''}`}
                    style={severityFilter === s && s !== 'ALL' ? { background: getSevColor(s).bg, color: getSevColor(s).fg, borderColor: getSevColor(s).border } : {}}
                    onClick={() => setSeverityFilter(s)}>
                    {s}{s !== 'ALL' && countBySev[s] ? ` (${countBySev[s]})` : ''}
                  </button>
                ))}
              </div>
            </div>
            <span className="vapt-filter-count">{filteredVulns.length} findings</span>
          </div>

          {loading ? (
            <div className="vapt-loading"><RefreshCw size={28} className="spin"/><span>Loading…</span></div>
          ) : filteredVulns.length === 0 ? (
            <div className="vapt-empty">
              <CheckCircle size={44} style={{ color: '#22C55E', opacity: .4 }}/>
              <h3>No vulnerabilities</h3><p>Adjust filters or run a new scan.</p>
            </div>
          ) : (
            <>
              {/* Screen: expandable cards */}
              <div className="vapt-findings-list screen-only">
                {filteredVulns.map((v, idx) => {
                  const sev = (v.severity || 'LOW').toUpperCase();
                  const c = getSevColor(sev);
                  const expanded = expandedRows[`vuln-${v.id}`];
                  const cvssScore = getCVSS(sev, v.cvss_score);
                  return (
                    <div key={v.id} className="card vapt-finding-card" style={{ borderLeft: `4px solid ${c.fg}` }}>
                      <div className="vapt-finding-header" onClick={() => toggleRow(`vuln-${v.id}`)}>
                        <CVSSGauge score={cvssScore} severity={sev} />
                        <div className="vapt-finding-index" style={{ color: c.fg }}>#{String(idx + 1).padStart(3, '0')}</div>
                        <div className="vapt-finding-main">
                          <div className="vapt-finding-title">{v.finding || v.vulnerability_id || 'Security Finding'}</div>
                          <div className="vapt-finding-meta">
                            <SeverityBadge severity={sev}/>
                            {v.cve && <span className="vapt-finding-cve">{v.cve}</span>}
                            <span className="vapt-finding-asset">{v.subdomain || v.domain || scope || 'Asset'}</span>
                            <span className="vapt-finding-tool">{v.source_tool || 'Nuclei'}</span>
                          </div>
                        </div>
                        <div className="vapt-finding-chevron">
                          {expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                        </div>
                      </div>
                      {expanded && (
                        <div className="vapt-finding-detail expanded">
                          <div className="vapt-detail-grid">
                            {v.description && (
                              <div className="vapt-detail-block">
                                <h5>Description</h5><p>{v.description}</p>
                              </div>
                            )}
                            {v.remediation && (
                              <div className="vapt-detail-block vapt-remediation-block">
                                <h5>Remediation</h5><p>{v.remediation}</p>
                              </div>
                            )}
                          </div>
                          <div className="vapt-detail-attrs">
                            <span><strong>CVSS:</strong> <span style={{ color: c.fg, fontWeight: 700 }}>{cvssScore.toFixed(1)}</span></span>
                            {v.cve && <span><strong>CVE:</strong> {v.cve}</span>}
                            {v.cwe && <span><strong>CWE:</strong> {v.cwe}</span>}
                            {v.category && <span><strong>Category:</strong> {v.category}</span>}
                            {v.discovered_at && <span><strong>Discovered:</strong> {new Date(v.discovered_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Print: compact table */}
              <table className="vapt-print-table print-only">
                <thead>
                  <tr><th>#</th><th>Finding</th><th>Severity</th><th>CVSS</th><th>Asset</th><th>CVE / CWE</th></tr>
                </thead>
                <tbody>
                  {filteredVulns.map((v, idx) => {
                    const sev = (v.severity || 'LOW').toUpperCase();
                    const c = getSevColor(sev);
                    return (
                      <tr key={v.id}>
                        <td className="vapt-pt-num">{idx + 1}</td>
                        <td className="vapt-pt-title">{v.finding || v.vulnerability_id || 'Security Finding'}</td>
                        <td><span className="vapt-pt-badge" style={{ color: c.fg, border: `1px solid ${c.fg}` }}>{sev}</span></td>
                        <td className="vapt-pt-cvss" style={{ color: c.fg }}>{getCVSS(sev, v.cvss_score).toFixed(1)}</td>
                        <td className="vapt-pt-asset">{v.subdomain || v.domain || '—'}</td>
                        <td className="vapt-pt-cve">{[v.cve, v.cwe].filter(Boolean).join(' / ') || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ╔══════════════════════════════════╗
            ║  6 — TECHNOLOGY FINGERPRINT     ║
            ╚══════════════════════════════════╝ */}
        {technologies.length > 0 && (
          <div id="tech-sec" className="vapt-page vapt-print-break">
            <div className="vapt-section-title">
              <Cpu size={18} className="vapt-section-icon"/>
              <h2>5. Technology Fingerprint</h2>
            </div>
            <div className="adr-tech-grid">
              {technologies.map((tech, i) => {
                const iconMap = { 'Web servers': '🌐', 'JavaScript libraries': '📦', 'Programming languages': '⚙️', 'CDN': '🚀', 'Analytics': '📊', 'Security': '🛡️', 'CMS': '📝', 'Database': '🗄️', 'Miscellaneous': '🔧' };
                const icon = iconMap[tech.category] || '🔧';
                return (
                  <div key={i} className="card adr-tech-card">
                    <div className="adr-tech-card-header">
                      <span className="adr-tech-icon">{icon}</span>
                      <div>
                        <div className="adr-tech-name">{tech.name}</div>
                        {tech.version && <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>v{tech.version}</div>}
                      </div>
                    </div>
                    <div className="adr-tech-category">{tech.category}</div>
                    <div className="adr-tech-count">{tech.hosts?.length || 1} host{(tech.hosts?.length || 1) !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════╗
            ║  7 — SSL / TLS OVERVIEW         ║
            ╚══════════════════════════════════╝ */}
        {certificates.length > 0 && (
          <div id="cert-sec" className="vapt-page vapt-print-break">
            <div className="vapt-section-title">
              <Lock size={18} className="vapt-section-icon"/>
              <h2>6. SSL / TLS Overview</h2>
            </div>
            <div className="adr-cert-grid">
              {certificates.map((cert, i) => {
                const h = certHealthCfg(cert.expiry_date || cert.valid_till, cert.is_valid);
                return (
                  <div key={i} className="adr-cert-row">
                    <div className="adr-cert-domain">{cert.domain || '—'}</div>
                    <div className="adr-cert-issuer">{cert.issuer || '—'}</div>
                    <div className="adr-cert-tls">{cert.tls || '—'}</div>
                    <div className="adr-cert-expiry">
                      {cert.expiry_date || cert.valid_till
                        ? new Date(cert.expiry_date || cert.valid_till).toLocaleDateString()
                        : '—'}
                    </div>
                    <span className="adr-health-badge" style={{ background: h.bg, color: h.color, border: `1px solid ${h.border}` }}>
                      {h.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════╗
            ║  8 — HARDENING RECOMMENDATIONS  ║
            ╚══════════════════════════════════╝ */}
        <div id="hardening" className="vapt-page vapt-print-break">
          <div className="vapt-section-title">
            <CheckCircle size={18} className="vapt-section-icon"/>
            <h2>
              {2 + (technologies.length > 0 ? 1 : 0) + (certificates.length > 0 ? 1 : 0) + 4}. Hardening Recommendations
            </h2>
          </div>
          <div className="vapt-remediation-roadmap">
            {[
              { timeline: 'Immediate (0–48 hrs)',    severity: 'CRITICAL', color: '#EF4444', icon: '🚨', count: countBySev.CRITICAL || 0,    guidance: 'Patch or mitigate all Critical vulnerabilities. Isolate affected assets and escalate to security leadership immediately.' },
              { timeline: 'Short-term (7–14 days)',  severity: 'HIGH',     color: '#F97316', icon: '⚠️', count: countBySev.HIGH || 0,         guidance: 'Resolve High severity vulnerabilities and renew any expired SSL certificates. Implement compensating controls where patching is delayed.' },
              { timeline: 'Medium-term (1–3 months)',severity: 'MEDIUM',   color: '#EAB308', icon: '🔶', count: countBySev.MEDIUM || 0,       guidance: 'Address Medium severity issues. Restrict sensitive open ports to VPN/allow-lists. Renew certificates expiring within 30 days.' },
              { timeline: 'Long-term (3–6 months)',  severity: 'LOW / INFO',color: '#22C55E', icon: '📌', count: (countBySev.LOW || 0) + (countBySev.INFO || 0), guidance: 'Update outdated technology stacks, audit third-party components, and incorporate findings into regular security reviews.' },
            ].map((item, i) => (
              <div key={i} className="vapt-roadmap-item" style={{ borderLeft: `4px solid ${item.color}` }}>
                <div className="vapt-roadmap-header">
                  <span className="vapt-roadmap-icon">{item.icon}</span>
                  <div>
                    <h4 style={{ color: item.color }}>{item.timeline}</h4>
                    <span className="vapt-roadmap-sev">{item.severity} — {item.count} items</span>
                  </div>
                </div>
                <p className="vapt-roadmap-guidance">{item.guidance}</p>
              </div>
            ))}
          </div>
          <div className="vapt-best-practices">
            <h3>General Asset Hardening Best Practices</h3>
            <div className="vapt-bp-grid">
              {[
                { icon: '🔒', title: 'Reduce Attack Surface',    desc: 'Decommission unused subdomains, close unnecessary ports, and remove stale endpoints.' },
                { icon: '🔑', title: 'Authentication Controls',  desc: 'Enforce MFA on all exposed management interfaces and admin panels.' },
                { icon: '🛡️', title: 'Security Headers',         desc: 'Deploy HSTS, CSP, X-Frame-Options, and Referrer-Policy on all web assets.' },
                { icon: '📦', title: 'Dependency Management',    desc: 'Audit and update all detected technology stacks. Subscribe to CVE feeds.' },
                { icon: '🔒', title: 'TLS Hygiene',              desc: 'Enforce TLS 1.2+. Disable older protocols. Automate certificate renewal with ACME/Let\'s Encrypt.' },
                { icon: '🔍', title: 'Continuous Monitoring',    desc: 'Schedule recurring ASM scans to detect new assets and configuration drift.' },
              ].map((bp, i) => (
                <div key={i} className="card vapt-bp-card">
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

export default AssetDiscoveryReport;
