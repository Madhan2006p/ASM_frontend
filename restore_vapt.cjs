const fs = require('fs');

const fullJSX = `import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, CloudUpload, ShieldCheck, Activity, Trash2, X, AlertCircle, FileText, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './MobileVAPT.css';
import { api } from '../../utils/api';

const MobileVAPT = () => {
  const [dashboard, setDashboard] = useState({
    total_scans: 0,
    completed_scans: 0,
    total_findings: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  });

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activePollScanId, setActivePollScanId] = useState(null);

  // Detail Modal State
  const [selectedScan, setSelectedScan] = useState(null);
  const [scanDetail, setScanDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  const fileInputRef = useRef(null);

  // Load dashboard & history
  const loadDashboardData = async () => {
    try {
      const data = await api.get('/api/mobile-vapt/dashboard/');
      setDashboard(data);
    } catch (e) {
      console.error("Failed to load VAPT dashboard", e);
    }
  };

  const loadHistoryData = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.get('/api/mobile-vapt/history/?page_size=50');
      setHistory(data.results || []);
    } catch (e) {
      console.error("Failed to load VAPT history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadHistoryData();
  }, []);

  // Poll scan status if a scan is in progress
  useEffect(() => {
    if (!activePollScanId) return;

    let intervalId;
    const checkStatus = async () => {
      try {
        const data = await api.get(\`/api/mobile-vapt/scan-status/\${activePollScanId}/\`);
        if (data.status === 'completed' || data.status === 'scan_failed' || data.status === 'report_failed') {
          setActivePollScanId(null);
          loadDashboardData();
          loadHistoryData();
        } else {
          // Keep polling, update status in the local history array
          setHistory(prev => prev.map(item => item.id === activePollScanId ? { ...item, status: data.status } : item));
        }
      } catch (err) {
        console.error("Failed to check status", err);
        setActivePollScanId(null);
      }
    };

    intervalId = setInterval(checkStatus, 3000);
    return () => clearInterval(intervalId);
  }, [activePollScanId]);

  // Check if any scan in history is still processing on initial load
  useEffect(() => {
    const activeScan = history.find(s => ['uploaded', 'uploaded_to_mobsf', 'scanning'].includes(s.status));
    if (activeScan) {
      setActivePollScanId(activeScan.id);
    }
  }, [history]);

  // Upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.post('/api/mobile-vapt/upload/', formData);
      setActivePollScanId(result.id);
      loadHistoryData();
    } catch (err) {
      console.error("Upload failed", err);
      setUploadError(err.message || "Failed to upload binary.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Delete handler
  const handleDeleteScan = async (scanId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this scan history?")) return;
    try {
      await api.delete(\`/api/mobile-vapt/delete-scan/\${scanId}/\`);
      loadDashboardData();
      loadHistoryData();
      if (selectedScan && selectedScan.id === scanId) {
        setSelectedScan(null);
        setScanDetail(null);
      }
    } catch (err) {
      console.error("Failed to delete scan", err);
      alert("Failed to delete scan.");
    }
  };

  // Click row -> Open Detail
  const handleRowClick = async (scan) => {
    if (selectedScan && selectedScan.id === scan.id) {
      setSelectedScan(null);
      setScanDetail(null);
      return;
    }
    setSelectedScan(scan);
    setLoadingDetail(true);
    setScanDetail(null);
    setActiveTab('Overview');
    try {
      const data = await api.get(\`/api/mobile-vapt/scan-detail/\${scan.id}/\`);
      setScanDetail(data);
    } catch (err) {
      console.error("Failed to load scan details", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="mobile-vapt-container">
      
      <PageHeaderCard
        badgeText="MOBILE SECURITY"
        title="Mobile VAPT"
        subtitle="Automated Static and Dynamic security analysis of iOS and Android binaries."
        stats={[
          { label: 'Apps Scanned', value: dashboard.total_scans.toString(), subtext: 'Total binaries' },
          { label: 'Critical / High', value: ((dashboard.critical || 0) + (dashboard.high || 0)).toString(), subtext: 'Vulnerabilities' },
          { label: 'Medium / Low', value: ((dashboard.medium || 0) + (dashboard.low || 0)).toString(), subtext: 'Warnings' },
          { 
            label: 'Avg Score', 
            value: history.length > 0 ? (history.reduce((sum, h) => sum + parseInt(h.score || 50), 0) / history.length).toFixed(0) : '—', 
            subtext: '/ 100 overall score' 
          },
        ]}
      />

      {/* Bottom Panel: Recent Audits */}
      <div className="mv-panel">
        <div className="mv-panel-header" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
          <Activity size={18} className="text-orange" />
          <h2 className="mv-panel-title">Recent Mobile App Audits</h2>
        </div>
        <div className="mv-table-container">
          <table className="mv-table">
            <thead>
              <tr>
                <th>APP NAME</th>
                <th>PLATFORM</th>
                <th>VERSION</th>
                <th>SCORE</th>
                <th>VULNERABILITY STATUS</th>
                <th>LAST SCANNED</th>
                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((scan) => (
                <React.Fragment key={scan.id}>
                <tr 
                  onClick={() => handleRowClick(scan)} 
                  style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold' }}>
                    {scan.app_name || scan.file_name}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textTransform: 'capitalize' }}>
                    {scan.source === 'android' ? '🤖 Android' : '🍏 iOS'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>
                    {scan.version_name || '—'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span 
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        background: parseInt(scan.score) >= 80 ? 'rgba(34,197,94,0.1)' : parseInt(scan.score) >= 50 ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,110,0.1)',
                        color: parseInt(scan.score) >= 80 ? '#22C55E' : parseInt(scan.score) >= 50 ? '#F97316' : '#EF4444'
                      }}
                    >
                      {scan.score || '50'}/100
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        background: scan.status === 'completed' ? 'rgba(34,197,94,0.1)' : ['scan_failed', 'report_failed'].includes(scan.status) ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                        color: scan.status === 'completed' ? '#22C55E' : ['scan_failed', 'report_failed'].includes(scan.status) ? '#EF4444' : '#3B82F6'
                      }}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(scan.updated_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', paddingRight: '2rem' }}>
                    <button 
                      onClick={(e) => handleDeleteScan(scan.id, e)} 
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
                  {selectedScan && selectedScan.id === scan.id && (
                    <tr className="mv-inline-detail-row">
                      <td colSpan="7" style={{ padding: 0 }}>
                        <div style={{ background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', borderBottom: '2px solid #3B82F6', overflow: 'hidden' }}>
                          
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', padding: '0 1.5rem' }}>
              {['Overview', 'Findings', 'Permissions', 'VirusTotal'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '1rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
                    color: activeTab === tab ? '#3B82F6' : 'var(--text-secondary)',
                    fontWeight: activeTab === tab ? '700' : '600',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', maxHeight: '600px' }}>
              {loadingDetail ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem' }}>
                  <RefreshCw size={36} className="animate-spin text-blue" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Parsing scan findings and reports...</span>
                </div>
              ) : scanDetail ? (
                <div>
                  {/* Overview Tab */}
                  {activeTab === 'Overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem 1rem', background: 'var(--bg-card)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Security Score</span>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
                          <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: \`8px solid \${scanDetail.scan.score >= 80 ? '#22C55E' : scanDetail.scan.score >= 50 ? '#F97316' : '#EF4444'}\`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.75rem', fontWeight: '800', color: scanDetail.scan.score >= 80 ? '#22C55E' : scanDetail.scan.score >= 50 ? '#F97316' : '#EF4444' }}>{scanDetail.scan.score}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem 1rem', background: 'var(--bg-card)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Vulnerabilities</span>
                        <h4 style={{ margin: '1rem 0 0 0', fontSize: '3rem', fontWeight: '800', color: '#EF4444' }}>{scanDetail.total_findings}</h4>
                      </div>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem 1rem', background: 'var(--bg-card)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Permissions Audited</span>
                        <h4 style={{ margin: '1rem 0 0 0', fontSize: '3rem', fontWeight: '800', color: '#3B82F6' }}>{scanDetail.permissions.length}</h4>
                      </div>
                    </div>
                  )}

                  {/* Findings Tab */}
                  {activeTab === 'Findings' && (
                    <>
                      <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <Layers size={18} className="text-orange" />
                        Scan Findings
                      </h4>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '2rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>SEVERITY</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>VULNERABILITY</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>CATEGORY</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>LOCATION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scanDetail.findings.map((f) => (
                              <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <span 
                                    style={{
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: '700',
                                      background: f.severity === 'CRITICAL' ? 'rgba(239,68,110,0.1)' : f.severity === 'HIGH' ? 'rgba(249,115,22,0.1)' : f.severity === 'MEDIUM' ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)',
                                      color: f.severity === 'CRITICAL' ? '#EF4444' : f.severity === 'HIGH' ? '#F97316' : f.severity === 'MEDIUM' ? '#EAB308' : '#3B82F6'
                                    }}
                                  >
                                    {f.severity}
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{f.vulnerability}</div>
                                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>{f.description}</div>
                                  {f.recommendation && (
                                    <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                      Fix: {f.recommendation}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                  {f.category}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                  {f.file_path || '—'}
                                </td>
                              </tr>
                            ))}
                            {scanDetail.findings.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                  No findings recorded for this binary.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Permissions Tab */}
                  {activeTab === 'Permissions' && (
                    <>
                      <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <Smartphone size={18} className="text-blue" />
                        App Permissions Analysis
                      </h4>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>PERMISSION</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>STATUS</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DESCRIPTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scanDetail.permissions.map((p, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                  {p.permission_name}
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <span 
                                    style={{
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: '700',
                                      background: p.status === 'dangerous' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                      color: p.status === 'dangerous' ? '#EF4444' : '#10B981',
                                      textTransform: 'uppercase'
                                    }}
                                  >
                                    {p.status || 'unknown'}
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                  {p.description || '—'}
                                </td>
                              </tr>
                            ))}
                            {scanDetail.permissions.length === 0 && (
                              <tr>
                                <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                  No permission manifest data parsed.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* VirusTotal Tab */}
                  {activeTab === 'VirusTotal' && (
                    <div style={{ padding: '1rem' }}>
                      <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={20} color="#3B82F6" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>VirusTotal APK Validation</h3>
                      </div>
                      
                      {!scanDetail.virustotal_report ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No VirusTotal report available for this APK yet. The scan might still be processing or it was skipped.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-main)' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detection Ratio</h4>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                              <span style={{ fontSize: '3rem', fontWeight: 800, color: scanDetail.virustotal_report?.positives > 0 ? '#EF4444' : '#22C55E', lineHeight: 1 }}>
                                {scanDetail.virustotal_report?.positives || 0}
                              </span>
                              <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', paddingBottom: '0.25rem' }}>
                                / {scanDetail.virustotal_report?.total || 0}
                              </span>
                            </div>
                            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              Antivirus engines detected malicious behavior in this application.
                            </p>
                            {scanDetail.virustotal_report?.permalink && (
                              <a href={scanDetail.virustotal_report.permalink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '1rem', color: '#3B82F6', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                                View Full Report on VirusTotal &rarr;
                              </a>
                            )}
                          </div>
                          
                          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-main)' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scan Details</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Scan Date:</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{scanDetail.virustotal_report?.scan_date || 'N/A'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>SHA256:</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'monospace' }}>{scanDetail.virustotal_report?.sha256 || 'N/A'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Message:</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{scanDetail.virustotal_report?.verbose_msg || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Error loading details.
                </div>
              )}
            </div>
                        </div>
                      </td>
                    </tr>
                  )}
              </React.Fragment>
              ))}
            </tbody>
          </table>
          {history.length === 0 && !loadingHistory && (
            <div className="mv-empty-state-container">
              <div className="mv-empty-state-content">
                <span>No scans found. Upload a binary to begin.</span>
              </div>
            </div>
          )}
          {loadingHistory && (
            <div className="mv-empty-state-container" style={{ padding: '3rem 0' }}>
              <div className="empty-state-content" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={18} className="animate-spin" />
                <span>Loading scans history...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Split Layout */}
      <div className="mv-top-grid">
        
        {/* Left Card: Upload Zone */}
        <div className="mv-panel">
          <div className="mv-panel-header" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            <CloudUpload size={18} className="text-blue" />
            <h2 className="mv-panel-title">Scan Binary (APK / IPA / AAB)</h2>
          </div>
          <div className="mv-upload-zone-wrapper" style={{ paddingTop: '1.5rem' }}>
            <div className="mv-upload-zone">
              <Smartphone size={40} strokeWidth={1} className="mv-upload-icon" />
              <h3 className="mv-upload-title">Drag & drop file here or click to browse</h3>
              <p className="mv-upload-subtitle">Supports .apk, .aab, .ipa (Max 150MB)</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".apk,.aab,.ipa" 
                onChange={handleFileUpload} 
              />
              
              <button 
                className="mv-upload-btn" 
                onClick={triggerFileSelect}
                disabled={uploading || !!activePollScanId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Uploading Binary...
                  </>
                ) : activePollScanId ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Scan Processing...
                  </>
                ) : 'Choose File'}
              </button>

              {uploadError && (
                <div style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}
              
              {activePollScanId && (
                <div style={{ marginTop: '1.5rem', width: '100%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Analyzing Binary...</span>
                    <RefreshCw size={14} className="animate-spin text-blue" />
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg-main)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '60%', height: '100%', background: '#3B82F6', animation: 'pulse 2s infinite' }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Static analysis in progress. This may take a few minutes.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Security Policies */}
        <div className="mv-panel">
          <div className="mv-panel-header" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            <ShieldCheck size={18} className="text-green" />
            <h2 className="mv-panel-title">Security Policies Checked</h2>
          </div>
          <div className="mv-policies-list" style={{ paddingTop: '1.5rem' }}>
            
            <div className="mv-policy-item">
              <ShieldCheck size={18} className="text-green policy-check" />
              <div className="mv-policy-text">
                <h4 className="policy-name">OWASP Mobile Top 10</h4>
                <p className="policy-desc">Checks for insecure data storage, communication, authentication.</p>
              </div>
            </div>

            <div className="mv-policy-item">
              <ShieldCheck size={18} className="text-green policy-check" />
              <div className="mv-policy-text">
                <h4 className="policy-name">Hardcoded Secrets & API Keys</h4>
                <p className="policy-desc">Scans decompiled resource files for private keys and connection strings.</p>
              </div>
            </div>

            <div className="mv-policy-item">
              <ShieldCheck size={18} className="text-green policy-check" />
              <div className="mv-policy-text">
                <h4 className="policy-name">Insecure Permissions & Intents</h4>
                <p className="policy-desc">Audits AndroidManifest.xml & Info.plist flags for access controls.</p>
              </div>
            </div>

            <div className="mv-policy-item">
              <ShieldCheck size={18} className="text-green policy-check" />
              <div className="mv-policy-text">
                <h4 className="policy-name">Network Security Config</h4>
                <p className="policy-desc">Verifies SSL pinning and cleartext traffic policies.</p>
              </div>
            </div>

          </div>
        </div>
        
      </div>

    </div>
  );
};

export default MobileVAPT;
`;

fs.writeFileSync('/home/madhan/Desktop/ASM-New/frontend/src/components/MobileVAPT/MobileVAPT.jsx', fullJSX);
