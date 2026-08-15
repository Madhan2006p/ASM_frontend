import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone, CloudUpload, Shield, Activity, Trash2, X,
  RefreshCw, Layers, Lock, AlertCircle, FileText,
  CheckCircle, Info, ChevronRight, Search, Plus,
  Cpu, Eye, ShieldOff, Package, Code, Apple,
  Wifi, Binary, BarChart2, Key, Hash, UploadCloud
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

/* ── Severity pill ── */
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
  const truncated = value && value.length > maxChars;
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
  const [activePollId, setActivePollId] = useState(null);

  const [platformFilter, setPlatformFilter] = useState('android');
  const [selectedApp, setSelectedApp] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('App Permission');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSource, setUploadSource] = useState('android');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const d = await api.get('/api/mobile-vapt/history/?page_size=50');
      const list = d.results || d || [];
      setHistory(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
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
        if (['completed', 'scan_failed', 'report_failed', 'upload_failed', 'vt_completed'].includes(d.status)) {
          setActivePollId(null);
          loadHistory();
        } else {
          setHistory(prev => prev.map(s => s.id === activePollId ? { ...s, status: d.status } : s));
        }
      } catch {
        setActivePollId(null);
      }
    }, 2500);
    return () => clearInterval(id);
  }, [activePollId]);

  useEffect(() => {
    const active = history.find(s => ['uploaded', 'uploaded_to_mobsf', 'scanning', 'vt_scanning'].includes(s.status));
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleDeleteScan = async (scanId) => {
    if (!window.confirm('Are you sure you want to delete this mobile application scan?')) return;
    try {
      await api.delete(`/api/mobile-vapt/delete-scan/${scanId}/`);
      await loadHistory();
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setUploadError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (['ipa', 'app'].includes(ext)) {
      setUploadSource('ios');
    } else if (['apk', 'xapk', 'aab'].includes(ext)) {
      setUploadSource('android');
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setUploadError('Please select an APK or IPA file to scan.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadProgressText('Uploading binary package...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('source', uploadSource);

    try {
      setUploadProgressText('Analyzing application security...');
      const res = await api.post('/api/mobile-vapt/upload/', formData);
      setUploadProgressText('Generating security audit report...');
      
      // Auto-poll and switch platform filter
      setPlatformFilter(uploadSource);
      setActivePollId(res.id);
      
      setTimeout(async () => {
        await loadHistory();
        setUploading(false);
        setShowUploadModal(false);
        setSelectedFile(null);
      }, 1500);

    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload and analyze mobile package.');
      setUploading(false);
    }
  };

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
      const st = (p.status || '').toLowerCase();
      if (st === 'dangerous') d++; else if (st === 'signature') s++; else n++;
    });
    let pScore = Math.max(0, 100 - (d * 5));
    const appPerms = { count: perms.length, score: pScore, grade: calculateGrade(pScore), items: perms };

    // Common findings helper
    const summarizeFindings = (cats) => {
      const items = (detail.findings || []).filter(f => cats.some(c => (f.category || '').toLowerCase().includes(c)));
      let h = 0, w = 0, i = 0;
      items.forEach(f => {
        const sev = (f.severity || '').toUpperCase();
        if (['CRITICAL', 'HIGH'].includes(sev)) h++;
        else if (['MEDIUM', 'WARNING'].includes(sev)) w++;
        else i++;
      });
      let sc = Math.max(0, 100 - (h * 20) - (w * 5));
      if (items.length === 0) sc = 100;
      return { count: items.length, score: sc, grade: calculateGrade(sc), high: h, warning: w, info: i, items };
    };

    const networkSec = summarizeFindings(['network', 'ats', 'transport']);
    const certAnalyse = summarizeFindings(['certificate', 'signing', 'provisioning']);
    const manifestAnalyse = summarizeFindings(['manifest', 'code', 'security', 'binary', 'plist']);

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

      {/* TOP CONTROLS & ACTION BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-card)',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div className="mv-platform-toggles">
          <button
            className={`mv-pt-btn ${platformFilter === 'android' ? 'active' : ''}`}
            onClick={() => setPlatformFilter('android')}
          >
            <Smartphone size={16} style={{ marginRight: 6 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>ANDROID</span>
          </button>
          <button
            className={`mv-pt-btn ${platformFilter === 'ios' ? 'active' : ''}`}
            onClick={() => setPlatformFilter('ios')}
          >
            <Apple size={16} style={{ marginRight: 6 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>IOS</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {filteredApps.length > 0 && (
            <div className="mv-app-select-wrapper">
              <span className="mv-app-select-label">Version</span>
              <select
                className="mv-app-select"
                value={selectedApp?.id || ''}
                onChange={(e) => {
                  const app = filteredApps.find(a => a.id.toString() === e.target.value);
                  if (app) fetchDetail(app);
                }}
              >
                {filteredApps.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.app_name || a.version_name || a.file_name} (v{a.version_name || '1.0.0'})
                  </option>
                ))}
              </select>

              {selectedApp && (
                <button
                  className="mv-icon-btn-danger"
                  title="Delete this scan"
                  onClick={() => handleDeleteScan(selectedApp.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}

          <button
            className="mv-action-btn-primary"
            onClick={() => {
              setUploadSource(platformFilter);
              setSelectedFile(null);
              setUploadError('');
              setShowUploadModal(true);
            }}
          >
            <UploadCloud size={16} />
            <span>Upload Application</span>
          </button>
        </div>
      </div>

      {/* SCANNING IN PROGRESS BANNER */}
      {activePollId && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: 10,
          padding: '0.9rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          color: '#93C5FD'
        }}>
          <RefreshCw size={18} className="mv-spin" color="#3B82F6" />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
            Security analysis is currently scanning binary package in background. Results will automatically update.
          </span>
        </div>
      )}

      {/* APP METADATA BANNER */}
      {selectedApp && detail && !loadingDetail && (
        <div className="mv-app-meta-banner">
          <div className="mv-app-meta-info">
            <div className="mv-app-icon-badge">
              {platformFilter === 'ios' ? <Apple size={22} /> : <Smartphone size={22} />}
            </div>
            <div>
              <div className="mv-app-meta-title">
                {selectedApp.app_name || selectedApp.file_name}
              </div>
              <div className="mv-app-meta-sub">
                <span>Bundle / Package:</span>
                <span className="mv-meta-tag">{selectedApp.package_name || 'com.app.mobile'}</span>
                <span>•</span>
                <span>Version:</span>
                <span className="mv-meta-tag">v{selectedApp.version_name || '1.0.0'}</span>
                <span>•</span>
                <span>Platform:</span>
                <span className="mv-meta-tag">{platformFilter.toUpperCase()}</span>
              </div>
            </div>
          </div>
          {/* Right side Score and Grade Box */}
          <div className="mv-score-grade-cluster">
            <div className="mv-score-block">
              <span className="mv-score-caption">SECURITY SCORE</span>
              <div className="mv-score-number">
                {selectedApp.score || 85}
                <span className="mv-score-total"> / 100</span>
              </div>
            </div>
            <div className="mv-grade-divider" />
            <div className="mv-grade-block">
              <span className="mv-grade-caption">GRADE</span>
              <div className={`mv-grade-pill grade-${calculateGrade(parseInt(selectedApp.score) || 85).charAt(0)}`}>
                {calculateGrade(parseInt(selectedApp.score) || 85)}
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingDetail && (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
          <RefreshCw size={32} className="mv-spin" />
        </div>
      )}

      {/* EMPTY STATE */}
      {!loadingDetail && filteredApps.length === 0 && (
        <div className="mv-empty-state-card">
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60A5FA'
          }}>
            {platformFilter === 'ios' ? <Apple size={28} /> : <Smartphone size={28} />}
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            No {platformFilter.toUpperCase()} Applications Scanned Yet
          </div>
          <p style={{ color: 'var(--text-muted)', maxWidth: 460, fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
            Upload an {platformFilter === 'ios' ? 'iOS application package (.ipa, .zip, .app)' : 'Android APK package (.apk)'} to execute comprehensive static vulnerability and permission security analysis.
          </p>
          <button
            className="mv-action-btn-primary"
            style={{ marginTop: '0.5rem' }}
            onClick={() => {
              setUploadSource(platformFilter);
              setSelectedFile(null);
              setUploadError('');
              setShowUploadModal(true);
            }}
          >
            <UploadCloud size={16} />
            <span>Upload {platformFilter.toUpperCase()} Package</span>
          </button>
        </div>
      )}

      {/* CONTENT WITH METRICS AND FINDINGS */}
      {!loadingDetail && detail && (
        <div className="mv-content-container">

          {/* 4 INTERACTIVE METRIC CARDS */}
          <div className="mv-cards-row">
            <div
              className={`mv-stat-card ${selectedCategory === 'App Permission' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('App Permission')}
            >
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

            <div
              className={`mv-stat-card ${selectedCategory === 'Network Security' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Network Security')}
            >
              <div className="mv-sc-title mv-sc-title-blue">Network Security (ATS)</div>
              <div className="mv-sc-body">
                <div className="mv-sc-count">{stats.networkSec.count}</div>
                <div className="mv-sc-grade-wrap">
                  <div className="mv-sc-grade-label">Grade</div>
                  <div className={`mv-sc-badge badge-${stats.networkSec.grade.charAt(0)}`}>{stats.networkSec.grade}</div>
                </div>
                <div className="mv-sc-score mv-sc-score-success">{stats.networkSec.score}</div>
              </div>
            </div>

            <div
              className={`mv-stat-card ${selectedCategory === 'Certificate Analyse' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Certificate Analyse')}
            >
              <div className="mv-sc-title mv-sc-title-blue">Certificate & Signing</div>
              <div className="mv-sc-body" style={{ alignItems: 'center' }}>
                <div className="mv-sc-count">{stats.certAnalyse.count}</div>
                <div className="mv-sc-substats">
                  <div className="mv-sc-grade-label" style={{ textAlign: 'center', width: '100%', marginBottom: 4 }}>Grade</div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
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

            <div
              className={`mv-stat-card ${selectedCategory === 'Manifest Analyse' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Manifest Analyse')}
            >
              <div className="mv-sc-title mv-sc-title-blue">
                {platformFilter === 'ios' ? 'Info.plist & Binary' : 'Manifest & Code'}
              </div>
              <div className="mv-sc-body" style={{ alignItems: 'center' }}>
                <div className="mv-sc-count">{stats.manifestAnalyse.count}</div>
                <div className="mv-sc-substats">
                  <div className="mv-sc-grade-label" style={{ textAlign: 'center', width: '100%', marginBottom: 4 }}>Grade</div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
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

          {/* TABLE AREA */}
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
                    <th>Description / Recommendation</th>
                    <th>Scanned</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                        {tableData.length === 0
                          ? `No items found for ${selectedCategory}.`
                          : 'No findings match the selected severity filter.'}
                      </td>
                    </tr>
                  )}
                  {filteredTableData.map((row, idx) => {
                    const title = isPerm ? row.permission_name : row.vulnerability;
                    const severity = isPerm ? (row.status || 'Normal') : row.severity;

                    const info = isPerm ? (row.description || 'Permission required by mobile application.') : (row.description || '-');
                    const desc = isPerm ? 'Review necessity of this permission in app build settings.' : (row.recommendation || '-');

                    const created = detail.scan?.updated_at
                      ? new Date(detail.scan.updated_at).toLocaleString('en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      }).replace(/\//g, '-')
                      : 'Active';

                    return (
                      <tr key={`${selectedCategory}-${idx}`}>
                        <td>
                          <div className="mv-title">{title}</div>
                          <div className="mv-id-row">
                            <span className="mv-id-badge">F-{idx + 1}</span>
                            {isPerm ? '• Permission' : (row.category ? `• ${row.category}` : '')}
                            {row.file_path ? ` • ${row.file_path}` : ''}
                          </div>
                        </td>
                        <td><SevPill severity={severity} /></td>
                        <td><ExpandableCell text={info} /></td>
                        <td><ExpandableCell text={desc} /></td>
                        <td className="mv-date"><span className="mv-date-inner">{created}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal && (
        <div className="mv-modal-backdrop" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="mv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mv-modal-header">
              <div className="mv-modal-title">
                <UploadCloud size={20} color="#3B82F6" />
                <span>Upload & Scan Mobile Application</span>
              </div>
              <button
                className="mv-modal-close"
                disabled={uploading}
                onClick={() => setShowUploadModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mv-modal-body">
              {/* Platform Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Target Mobile Platform
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: 8,
                      border: `1px solid ${uploadSource === 'android' ? '#3B82F6' : 'rgba(255,255,255,0.1)'}`,
                      background: uploadSource === 'android' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: uploadSource === 'android' ? '#60A5FA' : 'var(--text-secondary)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() => setUploadSource('android')}
                  >
                    <Smartphone size={16} />
                    <span>Android (.apk)</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: 8,
                      border: `1px solid ${uploadSource === 'ios' ? '#3B82F6' : 'rgba(255,255,255,0.1)'}`,
                      background: uploadSource === 'ios' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: uploadSource === 'ios' ? '#60A5FA' : 'var(--text-secondary)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() => setUploadSource('ios')}
                  >
                    <Apple size={16} />
                    <span>iOS (.ipa, .zip, .app)</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept={uploadSource === 'ios' ? '.ipa,.zip,.app' : '.apk,.xapk,.aab'}
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />

              <div
                className={`mv-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <div className="mv-dropzone-icon">
                  <CloudUpload size={24} />
                </div>
                {selectedFile ? (
                  <div>
                    <div style={{ fontWeight: 700, color: '#38BDF8', fontSize: '0.95rem' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop new file to replace
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      Drop your {uploadSource === 'ios' ? 'iOS (.ipa, .zip, .app)' : 'Android (.apk)'} file here
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      or click to browse from local computer
                    </div>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {uploadError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: '0.65rem 0.9rem',
                  color: '#F87171',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <AlertCircle size={15} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Progress message */}
              {uploading && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 8,
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#93C5FD',
                  fontSize: '0.82rem'
                }}>
                  <RefreshCw size={16} className="mv-spin" color="#3B82F6" />
                  <span>{uploadProgressText}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: 8,
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                  disabled={uploading}
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="mv-action-btn-primary"
                  disabled={uploading || !selectedFile}
                  style={{ opacity: (uploading || !selectedFile) ? 0.6 : 1 }}
                  onClick={handleUploadSubmit}
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={15} className="mv-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Shield size={15} />
                      <span>Start Security Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MobileVAPT;
