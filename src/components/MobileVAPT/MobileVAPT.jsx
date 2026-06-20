import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone, CloudUpload, Shield, Activity, Trash2, X,
  RefreshCw, Layers, Lock, AlertTriangle, AlertCircle,
  CheckCircle, Info, ChevronRight, Search, FileText,
  Cpu, Eye, ShieldOff, ShieldCheck, Package, Code,
  Wifi, Binary, BarChart2, Key, Hash
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import { api } from '../../utils/api';
import './MobileVAPT.css';

/* ── Severity helpers ─────────────────────────────────────── */
const SEV_CFG = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',  fg: '#EF4444', border: 'rgba(239,68,68,0.25)'  },
  HIGH:     { bg: 'rgba(249,115,22,0.12)', fg: '#F97316', border: 'rgba(249,115,22,0.25)' },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.25)'  },
  LOW:      { bg: 'rgba(34,197,94,0.12)',  fg: '#22C55E', border: 'rgba(34,197,94,0.25)'  },
  INFO:     { bg: 'rgba(59,130,246,0.12)', fg: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
  DANGEROUS:{ bg: 'rgba(239,68,68,0.12)',  fg: '#EF4444', border: 'rgba(239,68,68,0.25)'  },
  NORMAL:   { bg: 'rgba(34,197,94,0.12)',  fg: '#22C55E', border: 'rgba(34,197,94,0.25)'  },
  SIGNATURE:{ bg: 'rgba(59,130,246,0.12)', fg: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
};
const getSev = (s) => SEV_CFG[(s || '').toUpperCase()] || SEV_CFG.INFO;

const SevBadge = ({ severity }) => {
  const c = getSev(severity);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding:'0.15rem 0.55rem', borderRadius:'5px',
      fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase',
      background:c.bg, color:c.fg, border:`1px solid ${c.border}`, whiteSpace:'nowrap',
    }}>
      {severity || 'INFO'}
    </span>
  );
};

/* ── Category icon map ─────────────────────────────────────── */
const CAT_ICON = {
  'Security Analysis':  <Shield size={13} />,
  'Code Analysis':      <Code size={13} />,
  'Manifest Analysis':  <FileText size={13} />,
  'Certificate Analysis': <Key size={13} />,
  'Network Security':   <Wifi size={13} />,
  'Binary Analysis':    <Binary size={13} />,
  'File Analysis':      <Package size={13} />,
};

/* ═══════════════════════════════════════════════════════════
   MobileVAPT  — sidebar app list + detail panel
═══════════════════════════════════════════════════════════ */
const MobileVAPT = () => {
  /* ── Top-level data ─────────────────────────────────────── */
  const [dashboard,      setDashboard]      = useState({ total_scans:0, completed_scans:0, total_findings:0, critical:0, high:0, medium:0, low:0 });
  const [history,        setHistory]        = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState('');
  const [activePollId,   setActivePollId]   = useState(null);
  const [sidebarSearch,  setSidebarSearch]  = useState('');

  /* ── Selected app + detail ──────────────────────────────── */
  const [selectedApp,    setSelectedApp]    = useState(null);   // scan object from history
  const [detail,         setDetail]         = useState(null);   // full detail from API
  const [loadingDetail,  setLoadingDetail]  = useState(false);
  const [activeTab,      setActiveTab]      = useState('overview');

  /* ── Per-tab state ──────────────────────────────────────── */
  const [findingSearch,  setFindingSearch]  = useState('');
  const [sevFilter,      setSevFilter]      = useState('ALL');
  const [catFilter,      setCatFilter]      = useState('ALL');
  const [permSearch,     setPermSearch]     = useState('');
  const [permFilter,     setPermFilter]     = useState('ALL');
  const [expandedFindings, setExpandedFindings] = useState({});

  const fileRef = useRef(null);

  /* ── Load dashboard & history ────────────────────────────── */
  const loadDashboard = async () => {
    try { const d = await api.get('/api/mobile-vapt/dashboard/'); setDashboard(d); }
    catch (e) { console.error(e); }
  };
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const d = await api.get('/api/mobile-vapt/history/?page_size=50');
      const list = d.results || [];
      setHistory(list);
      // Auto-select first completed app if none selected
      if (!selectedApp) {
        const first = list.find(s => s.status === 'completed');
        if (first) fetchDetail(first);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { loadDashboard(); loadHistory(); }, []);

  /* ── Polling ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!activePollId) return;
    const id = setInterval(async () => {
      try {
        const d = await api.get(`/api/mobile-vapt/scan-status/${activePollId}/`);
        if (['completed','scan_failed','report_failed'].includes(d.status)) {
          setActivePollId(null);
          loadDashboard(); loadHistory();
        } else {
          setHistory(prev => prev.map(s => s.id === activePollId ? {...s, status:d.status} : s));
        }
      } catch { setActivePollId(null); }
    }, 3000);
    return () => clearInterval(id);
  }, [activePollId]);

  useEffect(() => {
    const active = history.find(s => ['uploaded','uploaded_to_mobsf','scanning'].includes(s.status));
    if (active) setActivePollId(active.id);
  }, [history]);

  /* ── Fetch detail ────────────────────────────────────────── */
  const fetchDetail = useCallback(async (scan) => {
    setSelectedApp(scan);
    setDetail(null);
    setLoadingDetail(true);
    setActiveTab('overview');
    setFindingSearch(''); setSevFilter('ALL'); setCatFilter('ALL');
    setPermSearch(''); setPermFilter('ALL');
    setExpandedFindings({});
    try {
      const d = await api.get(`/api/mobile-vapt/scan-detail/${scan.id}/`);
      setDetail(d);
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  }, []);

  /* ── Upload ──────────────────────────────────────────────── */
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setUploadError('');
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await api.post('/api/mobile-vapt/upload/', fd);
      setActivePollId(r.id); loadHistory();
    } catch (err) { setUploadError(err.message || 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  /* ── Delete ──────────────────────────────────────────────── */
  const handleDelete = async (scanId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this scan?')) return;
    try {
      await api.delete(`/api/mobile-vapt/delete-scan/${scanId}/`);
      loadDashboard(); loadHistory();
      if (selectedApp?.id === scanId) { setSelectedApp(null); setDetail(null); }
    } catch { alert('Delete failed'); }
  };

  /* ── Derived lists ───────────────────────────────────────── */
  const filteredApps = history.filter(s =>
    !sidebarSearch ||
    (s.app_name || s.file_name || '').toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    (s.package_name || '').toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const allFindings  = detail?.findings || [];
  const allPerms     = detail?.permissions || [];
  const categories   = [...new Set(allFindings.map(f => f.category).filter(Boolean))];
  const sevKeys      = ['CRITICAL','HIGH','MEDIUM','LOW','INFO'];

  const visibleFindings = allFindings.filter(f => {
    const matchSev = sevFilter === 'ALL' || f.severity === sevFilter;
    const matchCat = catFilter === 'ALL' || f.category === catFilter;
    const matchQ   = !findingSearch ||
      (f.vulnerability||'').toLowerCase().includes(findingSearch.toLowerCase()) ||
      (f.description||'').toLowerCase().includes(findingSearch.toLowerCase());
    return matchSev && matchCat && matchQ;
  });

  const visiblePerms = allPerms.filter(p => {
    const matchF   = permFilter === 'ALL' || (p.status||'').toLowerCase() === permFilter.toLowerCase();
    const matchQ   = !permSearch || (p.permission_name||'').toLowerCase().includes(permSearch.toLowerCase());
    return matchF && matchQ;
  });

  /* ── Severity counts for selected app ─────────────────────── */
  const sevCounts = allFindings.reduce((a, f) => {
    a[f.severity] = (a[f.severity] || 0) + 1; return a;
  }, {});

  /* ── Score colour ─────────────────────────────────────────── */
  const scoreColor = (s) => s >= 80 ? '#22C55E' : s >= 50 ? '#F97316' : '#EF4444';

  /* ── Manifest from scan meta ─────────────────────────────── */
  const scan = detail?.scan || {};
  const manifestFields = [
    { label:'App Name',        value: scan.app_name },
    { label:'Package Name',    value: scan.package_name },
    { label:'Version',         value: scan.version_name },
    { label:'Min SDK',         value: scan.min_sdk_version },
    { label:'Target SDK',      value: scan.target_sdk_version },
    { label:'Platform',        value: scan.source === 'ios' ? 'iOS' : 'Android' },
    { label:'File',            value: scan.file_name },
    { label:'Scanned',         value: scan.updated_at ? new Date(scan.updated_at).toLocaleString() : null },
  ].filter(f => f.value);

  const tabs = [
    { id:'overview',    label:'Overview',    icon:<BarChart2 size={14}/> },
    { id:'findings',    label:`Findings (${allFindings.length})`, icon:<AlertCircle size={14}/> },
    { id:'permissions', label:`Permissions (${allPerms.length})`, icon:<Lock size={14}/> },
    { id:'manifest',    label:'Manifest',    icon:<FileText size={14}/> },
    { id:'virustotal',  label:'VirusTotal',  icon:<Shield size={14}/> },
  ];

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="mv-root">

      {/* ── Page Header ───────────────────────────────────── */}
      <PageHeaderCard
        badgeText="MOBILE SECURITY"
        title="Mobile Security"
        subtitle="Automated Static & Dynamic security analysis of iOS and Android binaries via MobSF."
        stats={[
          { label:'Apps Scanned',   value: dashboard.total_scans.toString(),    subtext:'total binaries' },
          { label:'Critical/High',  value: ((dashboard.critical||0)+(dashboard.high||0)).toString(), subtext:'vulnerabilities' },
          { label:'Medium/Low',     value: ((dashboard.medium||0)+(dashboard.low||0)).toString(),   subtext:'warnings' },
          { label:'Avg Score',      value: history.length > 0
              ? (history.reduce((s,h)=>s+parseInt(h.score||50),0)/history.length).toFixed(0)
              : '—',
            subtext:'/ 100 overall' },
        ]}
        actions={
          <div style={{display:'flex',gap:'0.6rem',alignItems:'center'}}>
            <button className="mv-btn mv-btn-primary" onClick={()=>fileRef.current?.click()} disabled={uploading}>
              {uploading
                ? <><RefreshCw size={14} className="mv-spin"/>&nbsp;Uploading…</>
                : <><CloudUpload size={14}/>&nbsp;Upload APK / IPA</>}
            </button>
            <button className="mv-btn mv-btn-ghost" onClick={()=>{loadDashboard();loadHistory();}}>
              <RefreshCw size={14}/>
            </button>
            <input ref={fileRef} type="file" accept=".apk,.ipa,.xapk,.apks" style={{display:'none'}} onChange={handleUpload}/>
          </div>
        }
      />

      {uploadError && (
        <div className="mv-error-banner"><AlertCircle size={14}/> {uploadError}
          <button onClick={()=>setUploadError('')}><X size={12}/></button>
        </div>
      )}

      {/* ── Body: sidebar + detail ────────────────────────── */}
      <div className="mv-body">

        {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
        <aside className="mv-sidebar">
          <div className="mv-sidebar-header">
            <span className="mv-sidebar-title">
              <Smartphone size={14}/> Apps ({history.length})
            </span>
            <div className="mv-sidebar-search">
              <Search size={12}/>
              <input
                placeholder="Search…"
                value={sidebarSearch}
                onChange={e=>setSidebarSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mv-app-list">
            {loadingHistory && (
              <div className="mv-sidebar-loading">
                <RefreshCw size={16} className="mv-spin"/> Loading…
              </div>
            )}
            {!loadingHistory && filteredApps.length === 0 && (
              <div className="mv-sidebar-empty">
                <Smartphone size={28} style={{opacity:.3}}/>
                <span>No apps found.<br/>Upload a binary to begin.</span>
              </div>
            )}
            {filteredApps.map((scan, idx) => {
              const isActive  = selectedApp?.id === scan.id;
              const score     = parseInt(scan.score || 50);
              const sc        = scoreColor(score);
              const isPending = !['completed','scan_failed','report_failed'].includes(scan.status);
              return (
                <div
                  key={scan.id}
                  className={`mv-app-item ${isActive ? 'active' : ''}`}
                  onClick={() => !isPending && fetchDetail(scan)}
                  style={{ cursor: isPending ? 'default' : 'pointer' }}
                >
                  <div className="mv-app-item-icon">
                    {scan.source === 'ios' ? '🍏' : '🤖'}
                  </div>
                  <div className="mv-app-item-info">
                    <div className="mv-app-item-name">
                      {scan.app_name || scan.file_name || `App ${idx + 1}`}
                    </div>
                    <div className="mv-app-item-pkg">
                      {scan.package_name || scan.version_name || scan.source}
                    </div>
                    {isPending ? (
                      <span className="mv-app-item-status pending">
                        <RefreshCw size={9} className="mv-spin"/> {scan.status}
                      </span>
                    ) : scan.status === 'completed' ? (
                      <span className="mv-app-item-score" style={{color:sc}}>
                        Score: {score}/100
                      </span>
                    ) : (
                      <span className="mv-app-item-status failed">⚠ {scan.status}</span>
                    )}
                  </div>
                  <div className="mv-app-item-actions">
                    {scan.status === 'completed' && (
                      <ChevronRight size={14} style={{color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)', flexShrink:0}}/>
                    )}
                    <button className="mv-delete-btn" onClick={(e) => handleDelete(scan.id, e)} title="Delete">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── RIGHT DETAIL PANEL ───────────────────────────── */}
        <main className="mv-detail">

          {/* — No app selected — */}
          {!selectedApp && (
            <div className="mv-detail-empty">
              <Smartphone size={56} style={{opacity:.15}}/>
              <h3>Select an app to view details</h3>
              <p>Choose a scanned app from the sidebar, or upload a new binary to begin analysis.</p>
              <button className="mv-btn mv-btn-primary" onClick={()=>fileRef.current?.click()}>
                <CloudUpload size={14}/> Upload APK / IPA
              </button>
            </div>
          )}

          {selectedApp && (
            <>
              {/* App title bar */}
              <div className="mv-detail-titlebar">
                <div className="mv-detail-app-icon">
                  {selectedApp.source === 'ios' ? '🍏' : '🤖'}
                </div>
                <div>
                  <h2 className="mv-detail-appname">
                    {scan.app_name || selectedApp.app_name || selectedApp.file_name}
                  </h2>
                  <div className="mv-detail-appmeta">
                    {(scan.package_name || selectedApp.package_name) && (
                      <code>{scan.package_name || selectedApp.package_name}</code>
                    )}
                    {(scan.version_name || selectedApp.version_name) && (
                      <span>v{scan.version_name || selectedApp.version_name}</span>
                    )}
                    <span>{selectedApp.source === 'ios' ? 'iOS' : 'Android'}</span>
                  </div>
                </div>
                {selectedApp.status === 'completed' && detail && (
                  <div className="mv-detail-score-wrap" style={{marginLeft:'auto'}}>
                    <div className="mv-detail-score-circle" style={{borderColor:scoreColor(parseInt(scan.score||50))}}>
                      <span style={{color:scoreColor(parseInt(scan.score||50))}}>
                        {scan.score || 50}
                      </span>
                      <small>/100</small>
                    </div>
                    <span style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:4,display:'block',textAlign:'center'}}>Security Score</span>
                  </div>
                )}
              </div>

              {/* Tab nav */}
              <div className="mv-tab-nav">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    className={`mv-tab-btn ${activeTab===t.id?'active':''}`}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Loading */}
              {loadingDetail && (
                <div className="mv-detail-loading">
                  <RefreshCw size={32} className="mv-spin"/>
                  <span>Parsing MobSF report…</span>
                </div>
              )}

              {!loadingDetail && detail && (
                <div className="mv-tab-content">

                  {/* ═══ OVERVIEW TAB ═══ */}
                  {activeTab === 'overview' && (
                    <div className="mv-overview">
                      {/* Sev stat strip */}
                      <div className="mv-sev-strip">
                        {sevKeys.map(sev => {
                          const c = getSev(sev);
                          return (
                            <div key={sev} className="mv-sev-stat" style={{borderTop:`3px solid ${c.fg}`}}>
                              <span className="mv-sev-stat-num" style={{color:c.fg}}>{sevCounts[sev]||0}</span>
                              <span className="mv-sev-stat-lbl">{sev}</span>
                            </div>
                          );
                        })}
                        <div className="mv-sev-stat" style={{borderTop:'3px solid var(--brand-primary)'}}>
                          <span className="mv-sev-stat-num" style={{color:'var(--brand-primary)'}}>{allFindings.length}</span>
                          <span className="mv-sev-stat-lbl">TOTAL</span>
                        </div>
                      </div>

                      {/* Category breakdown */}
                      <div className="mv-overview-grid">
                        <div className="mv-overview-card">
                          <h4 className="mv-card-title"><BarChart2 size={14}/> Findings by Category</h4>
                          {categories.length === 0
                            ? <div className="mv-empty-small">No findings</div>
                            : categories.map(cat => {
                              const cnt  = allFindings.filter(f=>f.category===cat).length;
                              const pct  = allFindings.length > 0 ? (cnt/allFindings.length)*100 : 0;
                              const icon = CAT_ICON[cat] || <Shield size={13}/>;
                              return (
                                <div key={cat} className="mv-cat-row">
                                  <span className="mv-cat-icon">{icon}</span>
                                  <span className="mv-cat-name">{cat}</span>
                                  <div className="mv-cat-bar">
                                    <div className="mv-cat-fill" style={{width:`${pct}%`}}/>
                                  </div>
                                  <span className="mv-cat-count">{cnt}</span>
                                </div>
                              );
                            })}
                        </div>

                        {/* Security scores */}
                        <div className="mv-overview-card">
                          <h4 className="mv-card-title"><ShieldCheck size={14}/> Security Scores</h4>
                          {(detail.scores||[]).length === 0
                            ? <div className="mv-empty-small">No score data</div>
                            : (detail.scores||[]).map((sc,i) => {
                              const pct = sc.max_score > 0 ? (sc.score/sc.max_score)*100 : 0;
                              const col = pct >= 75 ? '#22C55E' : pct >= 40 ? '#F97316' : '#EF4444';
                              return (
                                <div key={i} className="mv-score-row">
                                  <span className="mv-score-label">{sc.category}</span>
                                  <div className="mv-score-bar-wrap">
                                    <div className="mv-score-bar">
                                      <div className="mv-score-fill" style={{width:`${pct}%`,background:col}}/>
                                    </div>
                                    <span style={{color:col,fontWeight:800,fontSize:'0.8rem',minWidth:40,textAlign:'right'}}>
                                      {sc.score}/{sc.max_score}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {/* Top dangerous permissions */}
                        <div className="mv-overview-card">
                          <h4 className="mv-card-title"><ShieldOff size={14}/> Dangerous Permissions</h4>
                          {allPerms.filter(p=>(p.status||'').toLowerCase()==='dangerous').length === 0
                            ? <div className="mv-empty-small">No dangerous permissions</div>
                            : allPerms.filter(p=>(p.status||'').toLowerCase()==='dangerous').slice(0,8).map((p,i) => (
                              <div key={i} className="mv-perm-mini-row">
                                <AlertTriangle size={11} style={{color:'#EF4444',flexShrink:0}}/>
                                <code className="mv-perm-mini-name">{p.permission_name}</code>
                              </div>
                            ))}
                        </div>

                        {/* Quick info */}
                        <div className="mv-overview-card">
                          <h4 className="mv-card-title"><Info size={14}/> App Information</h4>
                          {manifestFields.map((f,i) => (
                            <div key={i} className="mv-info-row">
                              <span className="mv-info-label">{f.label}</span>
                              <span className="mv-info-value">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══ FINDINGS TAB ═══ */}
                  {activeTab === 'findings' && (
                    <div className="mv-findings">
                      {/* Filters */}
                      <div className="mv-findings-toolbar">
                        <div className="mv-search-wrap">
                          <Search size={13}/>
                          <input
                            placeholder="Search findings…"
                            value={findingSearch}
                            onChange={e=>setFindingSearch(e.target.value)}
                          />
                          {findingSearch && <button onClick={()=>setFindingSearch('')}><X size={12}/></button>}
                        </div>
                        <div className="mv-filter-pills">
                          {['ALL',...sevKeys].map(s => (
                            <button
                              key={s}
                              className={`mv-pill ${sevFilter===s?'active':''}`}
                              style={sevFilter===s&&s!=='ALL'?{background:getSev(s).bg,color:getSev(s).fg,borderColor:getSev(s).border}:{}}
                              onClick={()=>setSevFilter(s)}
                            >
                              {s}{s!=='ALL'&&sevCounts[s]?` (${sevCounts[s]})`:s==='ALL'?` (${allFindings.length})`:''}
                            </button>
                          ))}
                        </div>
                        {categories.length > 0 && (
                          <select className="mv-select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
                            <option value="ALL">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        )}
                        <span className="mv-filter-count">{visibleFindings.length} findings</span>
                      </div>

                      {/* Findings cards */}
                      <div className="mv-findings-list">
                        {visibleFindings.length === 0 && (
                          <div className="mv-empty"><CheckCircle size={40} style={{color:'#22C55E',opacity:.4}}/><p>No findings match filters</p></div>
                        )}
                        {visibleFindings.map((f, idx) => {
                          const c = getSev(f.severity);
                          const exp = expandedFindings[f.id];
                          return (
                            <div key={f.id} className="mv-finding-card" style={{borderLeft:`4px solid ${c.fg}`}}>
                              <div className="mv-finding-header" onClick={()=>setExpandedFindings(prev=>({...prev,[f.id]:!prev[f.id]}))}>
                                <SevBadge severity={f.severity}/>
                                <div className="mv-finding-title">{f.vulnerability}</div>
                                <div className="mv-finding-meta-chips">
                                  {f.category && (
                                    <span className="mv-chip">
                                      {CAT_ICON[f.category]||<Shield size={10}/>} {f.category}
                                    </span>
                                  )}
                                  {f.file_path && <code className="mv-chip-code">{f.file_path.split('/').pop()}</code>}
                                </div>
                                <span className="mv-expand-btn">{exp ? '▲' : '▼'}</span>
                              </div>
                              {exp && (
                                <div className="mv-finding-body">
                                  {f.description && (
                                    <div className="mv-finding-section">
                                      <div className="mv-finding-section-label">📋 Description</div>
                                      <p>{f.description}</p>
                                    </div>
                                  )}
                                  {f.recommendation && (
                                    <div className="mv-finding-section mv-finding-section-fix">
                                      <div className="mv-finding-section-label">✅ Recommendation</div>
                                      <p>{f.recommendation}</p>
                                    </div>
                                  )}
                                  {f.file_path && (
                                    <div className="mv-finding-section">
                                      <div className="mv-finding-section-label">📁 File</div>
                                      <code>{f.file_path}</code>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ═══ PERMISSIONS TAB ═══ */}
                  {activeTab === 'permissions' && (
                    <div className="mv-permissions">
                      <div className="mv-perm-toolbar">
                        <div className="mv-search-wrap">
                          <Search size={13}/>
                          <input
                            placeholder="Search permissions…"
                            value={permSearch}
                            onChange={e=>setPermSearch(e.target.value)}
                          />
                          {permSearch && <button onClick={()=>setPermSearch('')}><X size={12}/></button>}
                        </div>
                        <div className="mv-filter-pills">
                          {[['ALL','All'],['dangerous','🔴 Dangerous'],['normal','🟢 Normal'],['signature','🔵 Signature']].map(([v,l]) => (
                            <button
                              key={v}
                              className={`mv-pill ${permFilter===v?'active':''}`}
                              onClick={()=>setPermFilter(v)}
                            >{l}</button>
                          ))}
                        </div>
                        <span className="mv-filter-count">{visiblePerms.length} permissions</span>
                      </div>

                      {/* Summary strip */}
                      <div className="mv-perm-summary">
                        {[
                          {label:'Dangerous', count:allPerms.filter(p=>(p.status||'').toLowerCase()==='dangerous').length, color:'#EF4444'},
                          {label:'Normal',    count:allPerms.filter(p=>(p.status||'').toLowerCase()==='normal').length,    color:'#22C55E'},
                          {label:'Signature', count:allPerms.filter(p=>(p.status||'').toLowerCase()==='signature').length, color:'#3B82F6'},
                          {label:'Unknown',   count:allPerms.filter(p=>!['dangerous','normal','signature'].includes((p.status||'').toLowerCase())).length, color:'#64748b'},
                        ].map(item => (
                          <div key={item.label} className="mv-perm-summary-item" style={{borderLeft:`3px solid ${item.color}`}}>
                            <span className="mv-perm-summary-num" style={{color:item.color}}>{item.count}</span>
                            <span className="mv-perm-summary-lbl">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Permission cards */}
                      <div className="mv-perm-grid">
                        {visiblePerms.length === 0 && (
                          <div className="mv-empty" style={{gridColumn:'1/-1'}}>
                            <Lock size={40} style={{opacity:.3}}/><p>No permission data parsed</p>
                          </div>
                        )}
                        {visiblePerms.map((p, i) => {
                          const status = (p.status || 'unknown').toLowerCase();
                          const c = getSev(p.status || 'INFO');
                          const isD = status === 'dangerous';
                          return (
                            <div key={i} className={`mv-perm-card ${isD?'mv-perm-card-danger':''}`}>
                              <div className="mv-perm-card-header">
                                {isD
                                  ? <AlertTriangle size={14} style={{color:'#EF4444',flexShrink:0}}/>
                                  : <CheckCircle size={14} style={{color:'#22C55E',flexShrink:0}}/>}
                                <SevBadge severity={status.toUpperCase()}/>
                              </div>
                              <code className="mv-perm-name">{p.permission_name}</code>
                              {p.description && <p className="mv-perm-desc">{p.description}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ═══ MANIFEST TAB ═══ */}
                  {activeTab === 'manifest' && (
                    <div className="mv-manifest">
                      {/* Basic info card */}
                      <div className="mv-manifest-card">
                        <h4 className="mv-card-title"><FileText size={14}/> Application Manifest Details</h4>
                        <div className="mv-manifest-grid">
                          {manifestFields.map((f,i) => (
                            <div key={i} className="mv-manifest-field">
                              <span className="mv-manifest-label">{f.label}</span>
                              <span className="mv-manifest-value">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Permissions summary in manifest context */}
                      <div className="mv-manifest-card">
                        <h4 className="mv-card-title"><Lock size={14}/> Declared Permissions ({allPerms.length})</h4>
                        <div className="mv-manifest-perms">
                          {allPerms.length === 0
                            ? <div className="mv-empty-small">No permissions declared</div>
                            : allPerms.map((p,i) => {
                              const status = (p.status||'unknown').toLowerCase();
                              const col = status==='dangerous'?'#EF4444':status==='normal'?'#22C55E':'#3B82F6';
                              return (
                                <div key={i} className="mv-manifest-perm-row">
                                  <span className="mv-manifest-perm-dot" style={{background:col}}/>
                                  <code className="mv-manifest-perm-name">{p.permission_name}</code>
                                  <span className="mv-manifest-perm-status" style={{color:col}}>{p.status||'unknown'}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Manifest security findings */}
                      <div className="mv-manifest-card">
                        <h4 className="mv-card-title"><AlertCircle size={14}/> Manifest Security Issues</h4>
                        {allFindings.filter(f=>f.category==='Manifest Analysis').length === 0
                          ? <div className="mv-empty-small">No manifest issues found</div>
                          : allFindings.filter(f=>f.category==='Manifest Analysis').map((f,i) => {
                            const c = getSev(f.severity);
                            return (
                              <div key={i} className="mv-manifest-issue" style={{borderLeft:`3px solid ${c.fg}`}}>
                                <div className="mv-manifest-issue-header">
                                  <SevBadge severity={f.severity}/>
                                  <span className="mv-manifest-issue-title">{f.vulnerability}</span>
                                </div>
                                {f.description && <p className="mv-manifest-issue-desc">{f.description}</p>}
                                {f.recommendation && <p className="mv-manifest-issue-rec">Rule: {f.recommendation}</p>}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* ═══ VIRUSTOTAL TAB ═══ */}
                  {activeTab === 'virustotal' && (
                    <div className="mv-virustotal">
                      {!detail.virustotal_report ? (
                        <div className="mv-empty">
                          <Shield size={48} style={{opacity:.2}}/>
                          <h3>No VirusTotal Report</h3>
                          <p>VirusTotal analysis was not available for this scan.</p>
                        </div>
                      ) : (
                        <div className="mv-vt-grid">
                          <div className="mv-vt-detection-card">
                            <div className="mv-vt-ratio-header">
                              <span className="mv-card-title"><Eye size={14}/> Detection Ratio</span>
                            </div>
                            <div className="mv-vt-ratio">
                              <span className="mv-vt-num" style={{color:detail.virustotal_report.positives > 0 ? '#EF4444':'#22C55E'}}>
                                {detail.virustotal_report.positives || 0}
                              </span>
                              <span className="mv-vt-denom">/ {detail.virustotal_report.total || 0}</span>
                            </div>
                            <p className="mv-vt-label">
                              {detail.virustotal_report.positives > 0
                                ? `⚠️ ${detail.virustotal_report.positives} antivirus engines flagged this file.`
                                : '✅ No antivirus engine flagged this file.'}
                            </p>
                            {detail.virustotal_report.permalink && (
                              <a href={detail.virustotal_report.permalink} target="_blank" rel="noreferrer" className="mv-vt-link">
                                View Full Report on VirusTotal →
                              </a>
                            )}
                          </div>
                          <div className="mv-vt-details-card">
                            <span className="mv-card-title"><Hash size={14}/> Scan Details</span>
                            <div className="mv-vt-detail-rows">
                              <div className="mv-vt-row"><span>Scan Date</span><span>{detail.virustotal_report.scan_date || 'N/A'}</span></div>
                              <div className="mv-vt-row"><span>SHA256</span><code>{detail.virustotal_report.sha256 || 'N/A'}</code></div>
                              <div className="mv-vt-row"><span>Status</span><span>{detail.virustotal_report.verbose_msg || 'N/A'}</span></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default MobileVAPT;
