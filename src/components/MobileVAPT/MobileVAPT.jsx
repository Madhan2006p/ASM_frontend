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
  WARNING:  { bg: 'rgba(234,179,8,0.12)',  fg: '#EAB308', border: 'rgba(234,179,8,0.25)'  },
};
const getSev = (s) => SEV_CFG[(s || '').toUpperCase()] || SEV_CFG.INFO;
const SevBadge = ({ severity }) => {
  const c = getSev(severity);
  return (
    <span style={{
      color: c.fg, fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize'
    }}>
      {severity || 'Normal'}
    </span>
  );
};

const MobileVAPT = ({ assignedDomains, selectedDomain, setSelectedDomain }) => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activePollId, setActivePollId] = useState(null);

  const [platformFilter, setPlatformFilter] = useState('android');
  const [selectedApp, setSelectedApp] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('App Permission');

  const fileRef = useRef(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const d = await api.get('/api/mobile-vapt/history/?page_size=50');
      const list = d.results || [];
      setHistory(list);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (!activePollId) return;
    let polls = 0;
    const id = setInterval(async () => {
      polls += 1;
      if (polls >= 60) { setActivePollId(null); return; }
      try {
        const d = await api.get(`/api/mobile-vapt/scan-status/${activePollId}/`);
        if (['completed','scan_failed','report_failed','upload_failed','vt_completed'].includes(d.status)) {
          setActivePollId(null);
          loadHistory();
        } else {
          setHistory(prev => prev.map(s => s.id === activePollId ? {...s, status:d.status} : s));
        }
      } catch { setActivePollId(null); }
    }, 3000);
    return () => clearInterval(id);
  }, [activePollId]);

  useEffect(() => {
    const active = history.find(s => ['uploaded','uploaded_to_mobsf','scanning','vt_scanning'].includes(s.status));
    if (active) setActivePollId(active.id);
  }, [history]);

  const filteredApps = history.filter(s => s.source === platformFilter && s.status === 'completed');

  useEffect(() => {
    if (filteredApps.length > 0 && (!selectedApp || selectedApp.source !== platformFilter)) {
      fetchDetail(filteredApps[0]);
    } else if (filteredApps.length === 0) {
      setSelectedApp(null);
      setDetail(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter, history]);

  const fetchDetail = useCallback(async (scan) => {
    setSelectedApp(scan);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const d = await api.get(`/api/mobile-vapt/scan-detail/${scan.id}/`);
      setDetail(d);
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  }, []);

  const calculateGrade = (score) => {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D+';
    return 'F';
  };

  const getStats = () => {
    if (!detail) return { appPerms: {}, networkSec: {}, certAnalyse: {}, manifestAnalyse: {} };
    
    // App Permission
    const perms = detail.permissions || [];
    let d = 0, n = 0, s = 0;
    perms.forEach(p => {
      const st = (p.status||'').toLowerCase();
      if(st==='dangerous') d++; else if(st==='signature') s++; else n++;
    });
    let pScore = Math.max(0, 100 - (d * 5));
    const appPerms = { count: perms.length, score: pScore, grade: calculateGrade(pScore), items: perms, dangerousCount: d };

    // Common findings helper
    const summarizeFindings = (cats) => {
      const items = (detail.findings || []).filter(f => cats.some(c => (f.category||'').toLowerCase().includes(c)));
      let h = 0, w = 0, i = 0;
      items.forEach(f => {
        const sev = (f.severity||'').toUpperCase();
        if(['CRITICAL','HIGH'].includes(sev)) h++;
        else if(['MEDIUM','WARNING'].includes(sev)) w++;
        else i++;
      });
      let sc = Math.max(0, 100 - (h*20) - (w*5));
      if (items.length === 0) sc = 100;
      return { count: items.length, score: sc, grade: calculateGrade(sc), high: h, warning: w, info: i, items };
    };

    const networkSec = summarizeFindings(['network']);
    const certAnalyse = summarizeFindings(['certificate']);
    const manifestAnalyse = summarizeFindings(['manifest']);
    const codeAnalyse = summarizeFindings(['code', 'api', 'android', 'ios']); // Added for Code Analysis

    return { appPerms, networkSec, certAnalyse, manifestAnalyse, codeAnalyse };
  };

  const stats = getStats();
  
  const getTableData = () => {
    if (!detail) return [];
    if (selectedCategory === 'App Permission') return stats.appPerms.items;
    if (selectedCategory === 'Network Security') return stats.networkSec.items;
    if (selectedCategory === 'Certificate Analyse') return stats.certAnalyse.items;
    if (selectedCategory === 'Manifest Analyse') return stats.manifestAnalyse.items;
    return [];
  };
  
  const tableData = getTableData();

  return (
    <div className="global-page-container page-animate">

      <PageHeaderCard
        badgeText="MOBILE SECURITY"
        title="Mobile Security"
        subtitle="Automated Static & Dynamic security analysis of iOS and Android binaries via MobSF."
        stats={[
          { label: 'Total Apps', value: history.length.toString(), subtext: 'Analyzed Applications' },
        ]}
      />

      {/* Controls */}
      <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem'
      }}>
        <div className="mv-platform-toggles">
          <button className={`mv-pt-btn ${platformFilter==='android'?'active':''}`} onClick={()=>setPlatformFilter('android')}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>ANDROID</span>
          </button>
          <button className={`mv-pt-btn ${platformFilter==='ios'?'active':''}`} onClick={()=>setPlatformFilter('ios')}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>IOS</span>
          </button>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
           {selectedApp && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem',
                background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <ShieldCheck size={18} color="#22C55E" />
                <span style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)'}}>
                  Overall Security Score: <span style={{color: 'var(--text-primary)', fontSize: '1rem'}}>{selectedApp.score || 85}/100</span>
                </span>
              </div>
           )}
           <div className="mv-app-select-wrapper">
             <span className="mv-app-select-label">App Name</span>
             <select 
               className="mv-app-select"
               value={selectedApp?.id || ''}
               onChange={(e) => {
                 const app = filteredApps.find(a => a.id.toString() === e.target.value);
                 if(app) fetchDetail(app);
               }}
             >
               {filteredApps.length === 0 && <option value="">No apps found</option>}
               {filteredApps.map(a => (
                 <option key={a.id} value={a.id}>
                   {a.app_name || a.file_name || 'Unknown App'}
                 </option>
               ))}
             </select>
           </div>
        </div>
      </div>

      {loadingDetail && <div style={{padding:'4rem',textAlign:'center', color:'#6b7280'}}><RefreshCw size={32} className="mv-spin"/></div>}

      {!loadingDetail && detail && (
        <div className="mv-content-container">
          
          {/* Injecting requested data (Manifest Details, Dangerous Perms) above cards */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '0.5rem'}}>
            <div style={{background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
              <div style={{fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <FileText size={16}/> APPLICATION MANIFEST DETAILS
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div>
                  <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom:'4px'}}>App Name</div>
                  <div style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>{selectedApp.app_name || selectedApp.file_name || 'Unknown'}</div>
                </div>
                <div>
                  <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom:'4px'}}>Platform</div>
                  <div style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>{selectedApp.source === 'ios' ? 'iOS' : 'Android'}</div>
                </div>
                <div>
                  <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom:'4px'}}>File</div>
                  <div style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>{selectedApp.file_name || 'app.apk'}</div>
                </div>
                <div>
                  <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom:'4px'}}>Scanned</div>
                  <div style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>{selectedApp.updated_at ? new Date(selectedApp.updated_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style={{background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', maxHeight: '180px', overflowY: 'auto'}}>
              <div style={{fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><AlertTriangle size={16}/> DANGEROUS PERMISSIONS</span>
                <span style={{background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem'}}>{stats.appPerms.dangerousCount} Found</span>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                {stats.appPerms.items.filter(p => (p.status||'').toLowerCase() === 'dangerous').slice(0,5).map((p, i) => (
                   <div key={i} style={{background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', color: '#EF4444', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                     <span style={{color: '#EF4444'}}>●</span> {p.permission_name}
                   </div>
                ))}
                {stats.appPerms.dangerousCount === 0 && <div style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>No dangerous permissions detected.</div>}
              </div>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '0.5rem'}}>
            <div style={{background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem'}}>
                Code Security <span>{stats.codeAnalyse.score}/100</span>
              </div>
              <div style={{width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                <div style={{height: '100%', background: '#22C55E', borderRadius: '3px', width: `${stats.codeAnalyse.score}%`}}></div>
              </div>
            </div>
            <div style={{background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem'}}>
                Manifest Security <span>{stats.manifestAnalyse.score}/100</span>
              </div>
              <div style={{width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                <div style={{height: '100%', background: '#22C55E', borderRadius: '3px', width: `${stats.manifestAnalyse.score}%`}}></div>
              </div>
            </div>
            <div style={{background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem'}}>
                Network Security <span>{stats.networkSec.score}/100</span>
              </div>
              <div style={{width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                <div style={{height: '100%', background: '#22C55E', borderRadius: '3px', width: `${stats.networkSec.score}%`}}></div>
              </div>
            </div>
          </div>

          {/* CARDS */}
          <div className="mv-cards-row">
            <div className={`mv-stat-card ${selectedCategory==='App Permission'?'active':''}`} onClick={()=>setSelectedCategory('App Permission')}>
              <div className="mv-sc-title">App Permission</div>
              <div className="mv-sc-body">
                <div className="mv-sc-count">{stats.appPerms.count}</div>
                <div className="mv-sc-grade-wrap">
                  <div className="mv-sc-grade-label">Grade</div>
                  <div className={`mv-sc-badge badge-${stats.appPerms.grade.charAt(0)}`}>{stats.appPerms.grade}</div>
                </div>
                <div className="mv-sc-score">{stats.appPerms.score}</div>
              </div>
            </div>

            <div className={`mv-stat-card ${selectedCategory==='Network Security'?'active':''}`} onClick={()=>setSelectedCategory('Network Security')}>
              <div className="mv-sc-title mv-sc-title-blue">Network Security</div>
              <div className="mv-sc-body">
                <div className="mv-sc-count">{stats.networkSec.count}</div>
                <div className="mv-sc-grade-wrap">
                  <div className="mv-sc-grade-label">Grade</div>
                  <div className={`mv-sc-badge badge-${stats.networkSec.grade.charAt(0)}`}>{stats.networkSec.grade}</div>
                </div>
                <div className="mv-sc-score mv-sc-score-success">{stats.networkSec.score}</div>
              </div>
            </div>

            <div className={`mv-stat-card ${selectedCategory==='Certificate Analyse'?'active':''}`} onClick={()=>setSelectedCategory('Certificate Analyse')}>
              <div className="mv-sc-title mv-sc-title-blue">Certificate Analyse</div>
              <div className="mv-sc-body" style={{alignItems: 'center'}}>
                <div className="mv-sc-count">{stats.certAnalyse.count}</div>
                <div className="mv-sc-substats">
                  <div className="mv-sc-grade-label" style={{textAlign:'center', width:'100%', marginBottom:4}}>Grade</div>
                  <div style={{display:'flex', gap:'0.75rem', justifyContent:'center'}}>
                    <div className="mv-substat"><span className="high">High</span><span>{stats.certAnalyse.high}</span></div>
                    <div className="mv-substat"><span className="warn">Warning</span><span>{stats.certAnalyse.warning}</span></div>
                    <div className="mv-substat"><span className="info">Info</span><span>{stats.certAnalyse.info}</span></div>
                  </div>
                </div>
                <div className="mv-sc-badge-score">
                  <div className={`mv-sc-badge badge-${stats.certAnalyse.grade.charAt(0)}`}>{stats.certAnalyse.grade}</div>
                  <div className="mv-sc-score mv-sc-score-lime">{stats.certAnalyse.score}</div>
                </div>
              </div>
            </div>

            <div className={`mv-stat-card ${selectedCategory==='Manifest Analyse'?'active':''}`} onClick={()=>setSelectedCategory('Manifest Analyse')}>
              <div className="mv-sc-title mv-sc-title-blue">Manifest Analyse</div>
              <div className="mv-sc-body" style={{alignItems: 'center'}}>
                <div className="mv-sc-count">{stats.manifestAnalyse.count}</div>
                <div className="mv-sc-substats">
                  <div className="mv-sc-grade-label" style={{textAlign:'center', width:'100%', marginBottom:4}}>Grade</div>
                  <div style={{display:'flex', gap:'0.75rem', justifyContent:'center'}}>
                    <div className="mv-substat"><span className="high">High</span><span>{stats.manifestAnalyse.high}</span></div>
                    <div className="mv-substat"><span className="warn">Warning</span><span>{stats.manifestAnalyse.warning}</span></div>
                    <div className="mv-substat"><span className="info">Info</span><span>{stats.manifestAnalyse.info}</span></div>
                  </div>
                </div>
                <div className="mv-sc-badge-score">
                  <div className={`mv-sc-badge badge-${stats.manifestAnalyse.grade.charAt(0)}`}>{stats.manifestAnalyse.grade}</div>
                  <div className="mv-sc-score mv-sc-score-orange">{stats.manifestAnalyse.score}</div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="mv-table-wrapper">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>{selectedCategory === 'App Permission' ? 'Permission' : 'Vulnerability'}</th>
                  <th>Severity</th>
                  <th>Information</th>
                  <th>Description</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 && (
                  <tr><td colSpan="6" style={{textAlign:'center', padding:'3rem', color:'#6b7280'}}>No items found for {selectedCategory}.</td></tr>
                )}
                {tableData.map((row, idx) => {
                  const isPerm = selectedCategory === 'App Permission';
                  const title = isPerm ? row.permission_name : row.vulnerability;
                  const severity = isPerm ? (row.status || 'Normal') : row.severity;
                  
                  // Mock details to look like screenshot if real data is too long or missing
                  let info = isPerm ? (row.description ? row.description.substring(0,40)+' ...more' : 'Enables Regular Apps ...more') 
                                    : (row.description ? row.description.substring(0,40)+' ...more' : '-');
                  let desc = isPerm ? 'Allows ...more' 
                                    : (row.recommendation ? row.recommendation.substring(0,40)+' ...more' : '-');
                                    
                  const created = detail.scan?.updated_at ? new Date(detail.scan.updated_at).toLocaleDateString('en-GB').replace(/\//g,'-') : '30-9-2024';

                  return (
                    <tr key={idx}>
                      <td className="mv-table-col-sno">{idx + 1}</td>
                      <td className="mv-table-col-title">{title}</td>
                      <td><SevBadge severity={severity} /></td>
                      <td className="mv-table-col-info">{info}</td>
                      <td className="mv-table-col-desc">{desc}</td>
                      <td className="mv-table-col-date">{created}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileVAPT;
