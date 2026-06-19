import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import './Overview.css';
import {
  AlertTriangle, ExternalLink, Globe, Monitor,
  Shield, Maximize2, Zap, Clock, Search, XCircle,
  Activity, Server, Wifi, ArrowUpRight, CheckCircle2, Lock, RefreshCw, Play, Check
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const WaveChart = ({ color, points }) => (
  <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="ov-wave-svg">
    <defs>
      <linearGradient id={`wg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.45" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={points.fill} fill={`url(#wg${color.replace('#','')})`} />
    <path d={points.line} fill="none" stroke={color} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ORANGE_WAVE = {
  line: 'M0,60 C30,55 60,30 90,35 C120,40 150,15 180,20 C210,25 240,45 270,40 C285,37 300,36 300,36',
  fill: 'M0,60 C30,55 60,30 90,35 C120,40 150,15 180,20 C210,25 240,45 270,40 C285,37 300,36 300,36 L300,80 L0,80 Z'
};
const BLUE_WAVE = {
  line: 'M0,50 C40,45 70,65 110,50 C150,35 180,55 220,42 C250,32 275,50 300,45',
  fill: 'M0,50 C40,45 70,65 110,50 C150,35 180,55 220,42 C250,32 275,50 300,45 L300,80 L0,80 Z'
};

const RiskBar = ({ label, value, max, color, gradient, delay = 0 }) => {
  const [hovered, setHovered] = useState(false);
  const [animated, setAnimated] = useState(false);
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fullH = Math.round(pct * 1.3);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`ov-risk-bar-row${hovered ? ' ov-risk-bar-hov' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="ov-vbar-tooltip" style={{ borderColor: color, color }}>
          {pct}%
          <span className="ov-vbar-tooltip-count" style={{ color }}>({value})</span>
        </div>
      )}

      <div className="ov-risk-bar-track">
        <div
          className="ov-risk-bar-fill"
          style={{
            height: animated ? `${fullH}px` : '0px',
            background: gradient,
            boxShadow: hovered ? `0 -6px 18px ${color}77` : 'none',
            transition: animated
              ? `height 0.75s cubic-bezier(0.34,1.15,0.64,1), box-shadow 0.25s ease`
              : 'none',
          }}
        />
      </div>

      <span
        className="ov-risk-bar-label"
        style={{ color: hovered ? color : undefined }}
      >
        {label}
      </span>
    </div>
  );
};

const MAP_MARKERS = [
  { coords: [-74.006, 40.7128], label: 'New York',  risk: 'critical', count: 12 },
  { coords: [2.3522,  48.856],  label: 'Paris',     risk: 'medium',   count: 4  },
  { coords: [77.209,  28.614],  label: 'New Delhi', risk: 'medium',   count: 5  },
];
const MARKER_COLORS = { critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#22C55E' };

const GRADE_CFG = {
  A: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   ring: 'rgba(34,197,94,0.3)'   },
  B: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  ring: 'rgba(59,130,246,0.3)'  },
  C: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  ring: 'rgba(245,158,11,0.3)'  },
  D: { color: '#F97316', bg: 'rgba(249,115,22,0.1)',  ring: 'rgba(249,115,22,0.3)'  },
  F: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   ring: 'rgba(239,68,68,0.3)'   },
};

const STATUS_CFG = {
  clean:    { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   label: 'Clean',    icon: <CheckCircle2 size={10}/> },
  warning:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  label: 'Warning',  icon: <AlertTriangle size={10}/> },
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   label: 'Critical', icon: <XCircle size={10}/> },
};

const PILL = { HIGH: 'ov-pill-high', MEDIUM: 'ov-pill-med', LOW: 'ov-pill-low', CRITICAL: 'ov-pill-crit' };

const Overview = ({ setActivePage, activeScanId, activeTarget, scansList = [], handleSelectScan, fetchScans, assignedDomains = [], selectedDomain, setSelectedDomain }) => {
  const [tooltip, setTooltip] = useState(null);
  const [subdomains, setSubdomains] = useState([]);
  const [vulns, setVulns] = useState([]);
  const [techs, setTechs] = useState([]);
  const [monitoredDomains, setMonitoredDomains] = useState([]);
  const [loading, setLoading] = useState(false);

  // Scan control state
  const [scanDomain, setScanDomain] = useState(activeTarget || 'acme.com');
  const [scanning, setScanning] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // Sync domain with activeTarget
  useEffect(() => {
    if (activeTarget) setScanDomain(activeTarget);
  }, [activeTarget]);

  const pollScanStatus = (scanId) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/attacksurface/scan/${scanId}/`);
        if (res.status === 'completed' || res.status === 'failed') {
          clearInterval(interval);
          setScanning(false);
          if (fetchScans) await fetchScans(true);
          alert(res.status === 'completed' ? 'Scan completed successfully!' : 'Scan failed.');
        }
      } catch (e) {
        clearInterval(interval);
        setScanning(false);
      }
    }, 4000);
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleTime) {
      alert('Please select a date and time.');
      return;
    }
    try {
      await api.post('/api/attacksurface/domains/', {
        domain: scanDomain,
        morning_time: scheduleTime.split('T')[1]?.slice(0, 5) || "09:00",
        morning_enabled: true,
        scan_now: false
      });
      setScheduleSuccess(true);
      setTimeout(() => {
        setScheduleSuccess(false);
        setShowScheduleMenu(false);
      }, 2500);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to schedule scan");
    }
  };

  // Fetch dashboard stats for the active scan — runs once on scan select
  // and polls every 5 seconds while the scan is running
  useEffect(() => {
    if (!activeScanId) return;

    const loadOverviewData = async () => {
      try {
        const [subList, vulnList, techList] = await Promise.all([
          api.get(`/api/attacksurface/subdomains/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/vulnerabilities/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/technologies/?scan=${activeScanId}`).catch(() => []),
        ]);

        setSubdomains(Array.isArray(subList) ? subList : (subList.results || []));
        setVulns(Array.isArray(vulnList) ? vulnList : (vulnList.results || []));
        
        // Flatten technologies
        const flatTechs = [];
        const tList = Array.isArray(techList) ? techList : (techList.results || []);
        tList.forEach(item => {
          (item.technologies || []).forEach(techName => {
            flatTechs.push({ name: techName, domain: item.domain });
          });
        });
        setTechs(flatTechs);
      } catch (e) {
        // Silent fail on polling — don't spam console
      }
    };

    // Initial load
    loadOverviewData();

    // Poll every 5 seconds while activeScanId is set — updates counters in real time
    // regardless of whether the scan is already in scansList (handles fresh scans)
    const interval = setInterval(loadOverviewData, 5000);
    return () => clearInterval(interval);
  }, [activeScanId]);

  // Fetch monitored domains independently — always show assigned domains
  useEffect(() => {
    const loadMonitoredDomains = async () => {
      try {
        const domainsList = await api.get('/api/attacksurface/domains/').catch(() => []);
        const fetched = Array.isArray(domainsList) ? domainsList : (domainsList.results || []);

        // Merge with admin-assigned domains so every assigned domain gets a card
        // even if it hasn't been added to MonitoredDomain table yet
        const mergedMap = {};
        fetched.forEach(d => { mergedMap[d.domain] = d; });
        assignedDomains.forEach(domainStr => {
          if (!mergedMap[domainStr]) {
            mergedMap[domainStr] = { id: `assigned-${domainStr}`, domain: domainStr, morning_time: '—', night_time: '—', morning_enabled: false, night_enabled: false };
          }
        });
        setMonitoredDomains(Object.values(mergedMap));
      } catch (e) {
        console.error('Failed to load monitored domains', e);
        // Fallback: build cards from assignedDomains prop alone
        setMonitoredDomains(assignedDomains.map(d => ({ id: `assigned-${d}`, domain: d, morning_time: '—', night_time: '—' })));
      }
    };
    loadMonitoredDomains();
  }, [assignedDomains]);

  const navigate = (page) => {
    if (setActivePage) setActivePage(page);
  };

  const safeScansList = Array.isArray(scansList) ? scansList : (scansList?.results || []);

  // Group vulnerabilities by severity
  const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  vulns.forEach(v => {
    const sev = (v.severity || 'LOW').toUpperCase();
    if (riskCounts[sev] !== undefined) riskCounts[sev]++;
  });

  const RISK_BARS = [
    { label: 'Low',      value: riskCounts.LOW, color: '#22C55E', gradient: 'linear-gradient(90deg,#16A34A,#4ADE80)' },
    { label: 'Medium',   value: riskCounts.MEDIUM, color: '#F59E0B', gradient: 'linear-gradient(90deg,#D97706,#FCD34D)' },
    { label: 'High',     value: riskCounts.HIGH, color: '#F97316', gradient: 'linear-gradient(90deg,#EA580C,#FB923C)' },
    { label: 'Critical', value: riskCounts.CRITICAL, color: '#EF4444', gradient: 'linear-gradient(90deg,#DC2626,#F87171)' },
  ];

  const maxRiskValue = Math.max(...RISK_BARS.map(b => b.value), 10);

  // Map activities from scan history
  const RECENT_ACTIVITIES = safeScansList.slice(0, 5).map((s, idx) => {
    let action = 'Full scan execution';
    let color = '#3B82F6';
    let icon = <Activity size={13} />;
    
    if (s.status === 'completed') {
      action = 'Scan completed successfully';
      color = '#22C55E';
      icon = <CheckCircle2 size={13} />;
    } else if (s.status === 'failed') {
      action = 'Scan execution failed';
      color = '#EF4444';
      icon = <XCircle size={13} />;
    }

    return {
      id: idx,
      icon,
      color,
      action,
      target: s.target,
      time: new Date(s.created_at).toLocaleDateString()
    };
  });

  // Recently Scanned Domains
  const SCANNED_DOMAINS = safeScansList.slice(0, 5).map(s => {
    let grade = 'A';
    let status = 'clean';
    if (s.vulnerability_count > 5) { grade = 'F'; status = 'critical'; }
    else if (s.vulnerability_count > 3) { grade = 'D'; status = 'critical'; }
    else if (s.vulnerability_count > 1) { grade = 'C'; status = 'warning'; }
    else if (s.vulnerability_count > 0) { grade = 'B'; status = 'warning'; }

    return {
      domain: s.target,
      ip: '—',
      status,
      vulns: s.vulnerability_count,
      subdomains: s.subdomain_count,
      lastScan: new Date(s.created_at).toLocaleDateString(),
      grade,
      score: Math.max(100 - (s.vulnerability_count * 8), 10)
    };
  });

  const getGlobalScore = () => {
    if (!activeScanId) return 0;
    if (vulns.length === 0) return 98;
    return Math.max(100 - (vulns.length * 5), 32);
  };

  const getGlobalRiskLabel = () => {
    if (!activeScanId) return 'N/A';
    const score = getGlobalScore();
    if (score >= 85) return 'Low';
    if (score >= 60) return 'Medium';
    return 'High';
  };

  return (
    <div className="ov-root">

      {/* Page header */}
      <div className="ov-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="ov-header-badge"><Zap size={11} /> Live Dashboard</div>
          <h1 className="ov-page-title">Dashboard Overview</h1>
          <p className="ov-page-sub">Real-time visibility into your external attack surface</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Scan selector */}
          <ScanSelector 
            assignedDomains={assignedDomains}
            selectedDomain={selectedDomain}
            setSelectedDomain={setSelectedDomain}
            scansList={safeScansList}
            activeScanId={activeScanId}
            handleSelectScan={handleSelectScan}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ margin: '0 auto 1rem auto', display: 'block' }} />
          Calculating security intelligence overview...
        </div>
      ) : (
        <>
          {/* ═══ ROW 1 — Metric cards (clickable) ══════ */}
          <div className="ov-row ov-row-4">

            {/* Total Assets */}
            <div className="ov-metric-card ov-card-orange ov-clickable"
              onClick={() => navigate('Subdomain Discovery')}
              title="Go to Subdomain Discovery">
              <div className="ov-metric-top">
                <div>
                  <div className="ov-metric-num ov-orange">{subdomains.length}</div>
                  <div className="ov-metric-lbl">TOTAL ASSETS</div>
                </div>
                <div className="ov-card-arrow"><ArrowUpRight size={14}/></div>
              </div>
              <div className="ov-metric-trend ov-trend-up">Active subdomains scope</div>
              <div className="ov-wave-wrap">
                <WaveChart color="#F97316" points={ORANGE_WAVE} />
              </div>
            </div>

            {/* Vulnerabilities */}
            <div className="ov-metric-card ov-card-blue ov-clickable"
              onClick={() => navigate('Vulnerabilities')}
              title="Go to Vulnerabilities">
              <div className="ov-metric-top">
                <div>
                  <div className="ov-metric-num ov-blue">{vulns.length}</div>
                  <div className="ov-metric-lbl">VULNERABILITIES</div>
                </div>
                <div className="ov-card-arrow"><ArrowUpRight size={14}/></div>
              </div>
              <div className="ov-metric-trend ov-trend-down">{riskCounts.CRITICAL + riskCounts.HIGH} critical/high</div>
              <div className="ov-wave-wrap">
                <WaveChart color="#3B82F6" points={BLUE_WAVE} />
              </div>
            </div>

            {/* Overall Risk */}
            <div className="ov-metric-card ov-card-center ov-card-amber ov-clickable"
              onClick={() => navigate('Vulnerabilities')}
              title="Go to Vulnerabilities">
              <div className="ov-status-icon ov-icon-amber"><AlertTriangle size={20} /></div>
              <div className="ov-risk-word">{getGlobalRiskLabel()}</div>
              <div className="ov-metric-lbl">OVERALL RISK</div>
              <div className="ov-card-arrow-center"><ArrowUpRight size={13}/></div>
            </div>

            {/* Security Score */}
            <div className="ov-metric-card ov-card-center ov-card-green ov-clickable"
              onClick={() => navigate('SSL Certificates')}
              title="Go to SSL Certificates">
              <div className="ov-status-icon ov-icon-green"><Shield size={20} /></div>
              <div className="ov-score-num">{getGlobalScore()}</div>
              <div className="ov-metric-lbl">SECURITY SCORE</div>
              <svg viewBox="0 0 64 64" width="52" height="52" className="ov-score-ring">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(34,197,94,0.12)" strokeWidth="5" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#22C55E" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*26*(getGlobalScore()/100)} ${2*Math.PI*26*(1 - getGlobalScore()/100)}`}
                  strokeDashoffset={2*Math.PI*26*0.25} strokeLinecap="round" />
              </svg>
            </div>

          </div>

          {/* ═══ ROW 1.5 — User Assigned Domains ══════ */}
          <div className="ov-row">
            <div className="ov-panel ov-assigned-domains-panel">
              <div className="ov-panel-hdr">
                <div className="ov-panel-title">
                  <Globe size={14} color="#3B82F6"/>
                  MONITORED DOMAINS SCOPE
                </div>
                <span className="ov-panel-hint">{monitoredDomains.length} Assigned Domains</span>
              </div>
              <div className="ov-domains-grid">
                {monitoredDomains.map(d => (
                  <div key={d.id} className="ov-domain-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="ov-dc-header" style={{ marginBottom: 0 }}>
                        <span className="ov-dc-status-dot verified"></span>
                        <span className="ov-dc-status-text">Active Monitoring</span>
                      </div>
                      <div className="ov-dc-meta" style={{ marginTop: 0 }}>
                        <span>Schedule: <strong>{d.morning_time} / {d.night_time}</strong></span>
                      </div>
                    </div>
                    
                    <div className="ov-dc-name" style={{ fontSize: '1.25rem' }}>{d.domain}</div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>

                      <div style={{ position: 'relative', flex: 1 }}>
                        <button
                          onClick={() => {
                            setScanDomain(d.domain);
                            setShowScheduleMenu(showScheduleMenu === d.domain ? null : d.domain);
                          }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Clock size={12} /> Schedule
                        </button>

                        {showScheduleMenu === d.domain && (
                          <div style={{ position: 'absolute', bottom: 'calc(100% + 0.5rem)', right: 0, width: '220px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 100 }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>Schedule {d.domain}</div>
                            <input
                              type="datetime-local"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              min={new Date().toISOString().slice(0, 16)}
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.8rem' }}
                            />
                            {scheduleSuccess ? (
                              <div style={{ color: '#22C55E', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>
                                <Check size={12} /> Scheduled!
                              </div>
                            ) : (
                              <button onClick={() => handleConfirmSchedule(d.domain)} style={{ width: '100%', padding: '0.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                                Confirm Schedule
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {monitoredDomains.length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>No domains assigned. Please contact the admin.</div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ ROW 2 — Vulns + Risk chart ════════════ */}
          <div className="ov-row ov-row-split">

            <div className="ov-panel">
              <div className="ov-panel-hdr">
                <div className="ov-panel-title"><AlertTriangle size={14} color="#F97316"/>RECENT FINDINGS</div>
                <button className="ov-icon-btn" onClick={() => navigate('Vulnerabilities')}><ExternalLink size={13}/></button>
              </div>
              <table className="ov-table">
                <thead><tr>
                  <th>Vulnerability</th>
                  <th style={{width:'150px',textAlign:'center'}}>Source Tool</th>
                  <th style={{width:'90px'}}>Risk</th>
                </tr></thead>
                <tbody>
                  {vulns.slice(0, 6).map((v, i) => (
                    <tr key={i}>
                      <td><span className="ov-link">{v.finding || v.vulnerability_id}</span></td>
                      <td className="ov-td-center" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v.source_tool || 'Nuclei'}</td>
                      <td><span className={`ov-pill ${PILL[(v.severity || 'LOW').toUpperCase()]}`}>{v.severity}</span></td>
                    </tr>
                  ))}
                  {vulns.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Your website is secure now</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Risks — vertical bar chart */}
            <div className="ov-panel ov-panel-flex">
              <div className="ov-panel-hdr">
                <div className="ov-panel-title"><AlertTriangle size={14} color="#EF4444"/>RISK SEVERITY BREAKDOWN</div>
                <span className="ov-hbar-total">Total Findings: <strong>{vulns.length}</strong></span>
              </div>
              <div className="ov-bar-chart">
                {RISK_BARS.map((b, i) => (
                  <RiskBar key={i} label={b.label} value={b.value} max={maxRiskValue}
                    color={b.color} gradient={b.gradient}
                    delay={120 + i * 100}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* ═══ ROW 3 — Techs + World Map ══════════════ */}
          <div className="ov-row ov-row-split">

            <div className="ov-panel">
              <div className="ov-panel-hdr">
                <div className="ov-panel-title"><Monitor size={14} color="#3B82F6"/>RECENT TECHNOLOGIES</div>
                <button className="ov-icon-btn" onClick={() => navigate('Technologies')}><ExternalLink size={13}/></button>
              </div>
              <table className="ov-table">
                <thead><tr>
                  <th>Component</th>
                  <th style={{width:'200px'}}>Detected Scope</th>
                </tr></thead>
                <tbody>
                  {techs.slice(0, 6).map((t, i) => (
                    <tr key={i}>
                      <td><span className="ov-link">{t.name}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.domain}</td>
                    </tr>
                  ))}
                  {techs.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No technologies fingerprinted yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Interactive World Map */}
            <div className="ov-panel ov-panel-flex">
              <div className="ov-panel-hdr">
                <div className="ov-panel-title"><Globe size={14} color="#3B82F6"/>ASSET LOCATION</div>
                <div className="ov-map-legend-row">
                  {Object.entries(MARKER_COLORS).map(([k, c]) => (
                    <span key={k} className="ov-map-legend-pill" style={{ color: c }}>
                      <span className="ov-legend-dot" style={{ background: c }}/>{k}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ov-map-wrap" style={{ position: 'relative' }}>
                <ComposableMap projectionConfig={{ scale: 130, center: [10, 10] }} style={{ width: '100%', height: '100%' }}>
                  <ZoomableGroup>
                    <Geographies geography={GEO_URL}>
                      {({ geographies }) => geographies.map(geo => (
                        <Geography key={geo.rsmKey} geography={geo} className="ov-map-geo"/>
                      ))}
                    </Geographies>
                    {MAP_MARKERS.map((m, i) => (
                      <Marker key={i} coordinates={m.coords}
                        onMouseEnter={() => setTooltip(m)}
                        onMouseLeave={() => setTooltip(null)}>
                        <circle r={6} fill={MARKER_COLORS[m.risk]} opacity={0.9} className="ov-map-dot"/>
                        <circle r={11} fill={MARKER_COLORS[m.risk]} opacity={0.2} className="ov-map-pulse"/>
                      </Marker>
                    ))}
                  </ZoomableGroup>
                </ComposableMap>
                {tooltip && (
                  <div className="ov-map-tooltip">
                    <strong>{tooltip.label}</strong>
                    <span style={{ color: MARKER_COLORS[tooltip.risk] }}>{tooltip.risk.toUpperCase()}</span>
                    <span>{tooltip.count} assets</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ═══ ROW 4 — Activities + Scanned Domains ═══ */}
          <div className="ov-row ov-row-split">

            {/* Recent Activities */}
            <div className="ov-panel">
              <div className="ov-panel-hdr">
                <div className="ov-panel-title"><Activity size={14} color="#10B981"/>RECENT ACTIVITIES</div>
                <span className="ov-panel-hint">Live log</span>
              </div>
              <div className="ov-activities-list">
                {RECENT_ACTIVITIES.map(a => (
                  <div key={a.id} className="ov-activity-item">
                    <div className="ov-act-icon" style={{ color: a.color, background: `${a.color}15` }}>{a.icon}</div>
                    <div className="ov-act-text">
                      <span className="ov-act-action">{a.action}</span>
                      <span className="ov-act-target">{a.target}</span>
                    </div>
                    <div className="ov-act-time">{a.time}</div>
                  </div>
                ))}
                {RECENT_ACTIVITIES.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No recent activities found.</div>
                )}
              </div>
            </div>

            {/* Recently Scanned Domains */}
            <div className="ov-panel ov-panel-flex">
              <div className="ov-panel-hdr">
                <div className="ov-panel-title"><Search size={14} color="#06B6D4"/>RECENTLY SCANNED DOMAINS</div>
                <span className="ov-panel-hint">{SCANNED_DOMAINS.length} domains</span>
              </div>
              <div className="ov-domains-list">
                {SCANNED_DOMAINS.map((d, i) => {
                  const sc = STATUS_CFG[d.status];
                  const gc = GRADE_CFG[d.grade];
                  return (
                    <div key={i} className="ov-domain-row" style={{ '--accent': gc.color }}>
                      <div className="ov-dr-grade" style={{ color: gc.color, background: gc.bg }}>
                        {d.grade}
                      </div>

                      <div className="ov-dr-info">
                        <div className="ov-dr-name">{d.domain}</div>
                        <div className="ov-dr-ip">{d.subdomains} Assets • {d.vulns} Vulns</div>
                      </div>

                      <div className="ov-dr-status" style={{ color: sc.color, background: sc.bg }}>
                        {sc.icon}<span>{sc.label}</span>
                      </div>

                      <div className="ov-dr-time"><Clock size={10}/>{d.lastScan}</div>
                    </div>
                  );
                })}
                {SCANNED_DOMAINS.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No domains scanned.</div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};

export default Overview;
