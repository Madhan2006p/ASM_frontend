import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone, CloudUpload, Shield, Activity, Trash2, X,
  RefreshCw, Layers, Lock,
  CheckCircle, Info, ChevronRight, Search,
  Cpu, Eye, ShieldOff, Package, Code,
  Wifi, Binary, BarChart2, Key, Hash
} from 'lucide-react';
import { api } from '../../utils/api';
import './MobileVAPT.css';

/* Severity filter groups (CRITICAL & DANGEROUS share the same pill style; SIGNATURE renders as NORMAL) */
const SEVERITY_GROUPS = {
  CRITICAL: ['CRITICAL', 'DANGEROUS'],
  HIGH: ['HIGH'],
  MEDIUM: ['MEDIUM'],
  WARNING: ['WARNING'],
  LOW: ['LOW'],
  INFO: ['INFO'],
  NORMAL: ['NORMAL', 'SIGNATURE'],
};

/* ── Severity pill (Open Ports style: rounded tab with colored dot) ── */
const SevPill = ({ severity }) => {
  const s = ((severity || 'NORMAL') + '').toUpperCase();
  const cls = ['CRITICAL', 'DANGEROUS'].includes(s) ? 'mv-sev-crit'
    : s === 'HIGH' ? 'mv-sev-high'
    : s === 'MEDIUM' ? 'mv-sev-med'
    : s === 'WARNING' ? 'mv-sev-warn'
    : s === 'LOW' ? 'mv-sev-low'
    : s === 'INFO' ? 'mv-sev-info'
    : 'mv-sev-normal';
  return (
    <span className={`mv-sev-pill ${cls}`}>
      <span className="mv-sev-dot" /> {s}
    </span>
  );
};

const ExpandableCell = ({ text, fallback, maxChars = 60 }) => {
  const [expanded, setExpanded] = useState(false);
  const value = (text && text.trim()) ? text : fallback;
  const truncated = value.length > maxChars;
  return (
    <div className="mv-expandable-cell">
      <span>{expanded ? value : (truncated ? value.slice(0, maxChars) + '…' : value)}</span>
      {truncated && (
        <button
          className="mv-expand-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      )}
    </div>
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
  const [severityFilter, setSeverityFilter] = useState('ALL');

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

  const filteredApps = history.filter(s => s.source === platformFilter && ['completed', 'vt_completed'].includes(s.status));

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
    const appPerms = { count: perms.length, score: pScore, grade: calculateGrade(pScore), items: perms };

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

    return { appPerms, networkSec, certAnalyse, manifestAnalyse };
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

  const isPerm = selectedCategory === 'App Permission';
  const filteredTableData = severityFilter === 'ALL'
    ? tableData
    : tableData.filter(row => {
        const sev = (isPerm ? (row.status || 'Normal') : row.severity || '').toUpperCase();
        const group = SEVERITY_GROUPS[severityFilter] || [];
        return group.includes(sev);
      });

  return (
    <div className="global-page-container page-animate">

      {/* Controls (platform toggles, score & app selector) above the header */}
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
           <div className="mv-app-select-wrapper">
             <span className="mv-app-select-label">Version</span>
             <select 
               className="mv-app-select"
               value={selectedApp?.id || ''}
               onChange={(e) => {
                 const app = filteredApps.find(a => a.id.toString() === e.target.value);
                 if(app) fetchDetail(app);
               }}
             >
               {filteredApps.length === 0 && <option value="">No versions found</option>}
               {filteredApps.map(a => (
                 <option key={a.id} value={a.id}>
                   {a.version_name || a.app_name || a.file_name || 'Unknown'}
                 </option>
               ))}
             </select>
           </div>
        </div>
      </div>

      {loadingDetail && <div style={{padding:'4rem',textAlign:'center', color:'#6b7280'}}><RefreshCw size={32} className="mv-spin"/></div>}

      {!loadingDetail && detail && (
        <div className="mv-content-container">
          
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

          {/* TABLE (Endpoints / Open Ports UI) */}
          <div className="mv-table-area">
            <div className="mv-table-toolbar">
              <div className="mv-table-toolbar-left">
                <span className="mv-table-toolbar-title">{selectedCategory}</span>
                <span className="mv-table-toolbar-count">
                  {filteredTableData.length} / {tableData.length} findings
                </span>
              </div>
              <div className="mv-severity-filter">
                <label htmlFor="mv-sev-filter">Severity</label>
                <select
                  id="mv-sev-filter"
                  className="mv-app-select"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="WARNING">Warning</option>
                  <option value="LOW">Low</option>
                  <option value="INFO">Info</option>
                  <option value="NORMAL">Normal</option>
                </select>
              </div>
            </div>
            <div className="mv-table-wrapper">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>{selectedCategory === 'App Permission' ? 'Permission' : 'Vulnerability'}</th>
                  <th>Severity</th>
                  <th>Information</th>
                  <th>Description</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableData.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:'center', padding:'3rem', color:'#64748B'}}>
                    {tableData.length === 0
                      ? `No items found for ${selectedCategory}.`
                      : 'No findings match the selected severity filter.'}
                  </td></tr>
                )}
                {filteredTableData.map((row, idx) => {
                  const title = isPerm ? row.permission_name : row.vulnerability;
                  const severity = isPerm ? (row.status || 'Normal') : row.severity;

                  // Expandable cells with a working More/Less toggle
                  const info = isPerm ? (row.description || 'Enables Regular Apps to access the device.') : (row.description || '-');
                  const desc = isPerm ? 'See permission details above.' : (row.recommendation || '-');

                  const created = detail.scan?.updated_at
                    ? new Date(detail.scan.updated_at).toLocaleString('en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      }).replace(/\//g, '-')
                    : '30-09-2024';

                  return (
                    <tr key={`${selectedCategory}-${idx}`}>
                      <td>
                        <div className="mv-title">{title}</div>
                        <div className="mv-id-row">
                          <span className="mv-id-badge">F-{idx + 1}</span>
                          {isPerm ? '• Permission' : (row.category ? `• ${row.category}` : '')}
                        </div>
                      </td>
                      <td><SevPill severity={severity} /></td>
                      <td><ExpandableCell text={info} /></td>
                      <td><ExpandableCell text={desc} /></td>
                      <td className="mv-date"><span className="mv-date-inner">{created}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileVAPT;
