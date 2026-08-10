import React, { useState, useEffect } from 'react';
import { 
  Play, RefreshCw, AlertTriangle, ShieldCheck, ShieldAlert, 
  ChevronDown, ChevronRight, FileText, Bug, ExternalLink, Download, 
  CheckCircle2, Clock, Activity, Search, Shield, Zap, Database, Key, Terminal,
  XCircle, Filter, Sparkles, AlertCircle, Cpu, Globe
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';
import './Vulnerabilities.css';

const OWASP_CATEGORIES = [
  { id: 'A01', name: 'A01: Broken Access Control', icon: <Key size={16} />, color: '#EF4444', desc: 'IDOR, Directory Traversal, Forced Browsing, Admin Exposure' },
  { id: 'A02', name: 'A02: Cryptographic Failures', icon: <Shield size={16} />, color: '#F97316', desc: 'Weak SSL/TLS, Cleartext HTTP, Sensitive Data Leak, Missing HSTS' },
  { id: 'A03', name: 'A03: Injection', icon: <Terminal size={16} />, color: '#DC2626', desc: 'SQLi, Command Injection, SSTI, XXE, Reflected XSS, CRLF' },
  { id: 'A04', name: 'A04: Insecure Design', icon: <Zap size={16} />, color: '#F59E0B', desc: 'Mass Assignment, Rate Limiting, GraphQL Introspection' },
  { id: 'A05', name: 'A05: Security Misconfiguration', icon: <AlertTriangle size={16} />, color: '#EAB308', desc: 'Exposed .env/.git, Debug Mode, Missing Security Headers' },
  { id: 'A06', name: 'A06: Vulnerable Components', icon: <Database size={16} />, color: '#3B82F6', desc: 'Outdated Libraries, NVD/CPE Matching, CISA KEV Exploits' },
  { id: 'A07', name: 'A07: Authentication Failures', icon: <Key size={16} />, color: '#EC4899', desc: 'Default Credentials, JWT Weaknesses, Missing Lockout' },
  { id: 'A08', name: 'A08: Software & Data Integrity', icon: <Activity size={16} />, color: '#8B5CF6', desc: 'Missing SRI, Insecure Deserialization, Exposed Manifests' },
  { id: 'A09', name: 'A09: Logging & Monitoring', icon: <FileText size={16} />, color: '#64748B', desc: 'Exposed Log Files, Missing Audit Trails, Debug Info' },
  { id: 'A10', name: 'A10: Server-Side Request Forgery', icon: <Search size={16} />, color: '#0EA5E9', desc: 'Cloud Metadata Theft, Internal Network Probing, SSRF APIs' },
];

const SCAN_PHASES = [
  { id: 'Initializing', label: 'Initializing', step: 1 },
  { id: 'Asset Discovery', label: '1. Asset Discovery', step: 2 },
  { id: 'External Tool Scanning', label: '2. Tool Integration', step: 3 },
  { id: 'Vulnerability Detection', label: '3. OWASP Auditing', step: 4 },
  { id: 'CVE Enrichment', label: '4. CVE Enrichment', step: 5 },
  { id: 'Completed', label: '5. Finished', step: 6 }
];

const OWASPScanUI = ({ assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startingScan, setStartingScan] = useState(false);
  const [cancellingScan, setCancellingScan] = useState(false);
  
  // Filtering & UI states
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyExploitable, setOnlyExploitable] = useState(false);
  const [onlyKev, setOnlyKev] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [notification, setNotification] = useState(null);

  const targetUrl = selectedDomain 
    ? (selectedDomain.startsWith('http') ? selectedDomain : `https://${selectedDomain}`)
    : '';

  const showNotice = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch scan sessions list & find match for targetUrl
  const fetchOwaspSessions = async (autoStartIfEmpty = false) => {
    try {
      setLoading(true);
      const res = await api.get('/api/owasp-scanner/sessions/');
      const sessions = Array.isArray(res) ? res : (res.results || []);
      setSessionsList(sessions);
      
      let matched = null;
      if (selectedDomain) {
        // Find matching sessions for current domain
        const domainMatches = sessions.filter(s => s.target_url.toLowerCase().includes(selectedDomain.toLowerCase()));
        if (domainMatches.length > 0) {
          // Sort by creation time descending
          domainMatches.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          // Prioritize COMPLETED or RUNNING over CANCELLED/FAILED/PENDING
          matched = domainMatches.find(s => s.status === 'COMPLETED' || s.status === 'RUNNING') || domainMatches[0];
        }
      }
      if (!matched && sessions.length > 0) {
        matched = sessions[0];
      }

      if (matched) {
        setActiveSession(matched);
        fetchFindings(matched.id);
      } else {
        setActiveSession(null);
        setFindings([]);
        if (targetUrl && autoStartIfEmpty) {
          autoStartScan(targetUrl);
        }
      }
    } catch (e) {
      console.error('Failed to fetch OWASP sessions', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFindings = async (sessionId) => {
    try {
      const res = await api.get(`/api/owasp-scanner/sessions/${sessionId}/findings/`);
      const list = Array.isArray(res) ? res : (res.results || []);
      setFindings(list);
    } catch (e) {
      console.error('Failed to fetch OWASP findings', e);
    }
  };

  const autoStartScan = async (urlToScan) => {
    if (!urlToScan || startingScan) return;
    try {
      setStartingScan(true);
      const payload = {
        target_url: urlToScan,
        categories: OWASP_CATEGORIES.map(c => c.id), // All 10 categories automatically
      };
      const res = await api.post('/api/owasp-scanner/start/', payload);
      if (res.session_id) {
        showNotice(`OWASP Scan automatically started for ${urlToScan}`, 'success');
        const newSession = {
          id: res.session_id,
          status: 'RUNNING',
          target_url: urlToScan,
          progress_percent: 5,
          current_phase: 'Asset Discovery',
        };
        setActiveSession(newSession);
        setFindings([]);
      }
    } catch (e) {
      console.error('Auto start OWASP scan failed', e);
    } finally {
      setStartingScan(false);
    }
  };

  useEffect(() => {
    fetchOwaspSessions(true);
  }, [selectedDomain]);

  // Poll running scan status automatically
  useEffect(() => {
    let interval = null;
    if (activeSession && (activeSession.status === 'RUNNING' || activeSession.status === 'PENDING')) {
      interval = setInterval(async () => {
        try {
          const statusRes = await api.get(`/api/owasp-scanner/sessions/${activeSession.id}/status/`);
          setActiveSession(prev => ({ ...prev, ...statusRes }));
          fetchFindings(activeSession.id);
          
          if (statusRes.status === 'COMPLETED' || statusRes.status === 'FAILED') {
            fetchOwaspSessions(false);
            showNotice(
              statusRes.status === 'COMPLETED' 
                ? 'OWASP Top 10 Scan Completed Successfully!' 
                : 'Scan failed: ' + (statusRes.error_message || 'Unknown error'),
              statusRes.status === 'COMPLETED' ? 'success' : 'error'
            );
          }
        } catch (e) {
          console.error('Error polling OWASP scan status', e);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession?.id, activeSession?.status]);

  const handleManualStart = () => {
    if (targetUrl) {
      autoStartScan(targetUrl);
    } else {
      showNotice('Please select a target domain first', 'error');
    }
  };

  const handleCancelScan = async () => {
    if (!activeSession) return;
    try {
      setCancellingScan(true);
      await api.post(`/api/owasp-scanner/sessions/${activeSession.id}/cancel/`, {});
      setActiveSession(prev => ({ ...prev, status: 'CANCELLED', current_phase: 'Cancelled' }));
      showNotice('Scan cancelled', 'info');
    } catch (e) {
      showNotice('Failed to cancel scan: ' + e.message, 'error');
    } finally {
      setCancellingScan(false);
    }
  };

  const handleMarkFalsePositive = async (findingId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/api/owasp-scanner/findings/${findingId}/false-positive/`, { reason: 'Marked by user' });
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, is_false_positive: true } : f));
      showNotice('Finding marked as false positive', 'success');
    } catch (err) {
      showNotice('Failed to mark false positive: ' + err.message, 'error');
    }
  };

  const handleVerifyFinding = async (findingId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/api/owasp-scanner/findings/${findingId}/verify/`, {});
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, is_verified: true } : f));
      showNotice('Finding verified successfully', 'success');
    } catch (err) {
      showNotice('Failed to verify finding: ' + err.message, 'error');
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (selectedCategory !== 'ALL' && f.owasp_category !== selectedCategory) return false;
    if (selectedSeverity !== 'ALL' && f.severity !== selectedSeverity) return false;
    if (onlyExploitable && !f.exploit_available) return false;
    if (onlyKev && !f.in_cisa_kev) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.owasp_category.toLowerCase().includes(q) ||
        (f.cwe_id && f.cwe_id.toLowerCase().includes(q)) ||
        (f.affected_url && f.affected_url.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Severity breakdown
  const sevCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  findings.forEach(f => {
    if (sevCounts[f.severity] !== undefined) sevCounts[f.severity]++;
  });

  // OWASP category counts
  const catCounts = {};
  OWASP_CATEGORIES.forEach(c => { catCounts[c.id] = 0; });
  findings.forEach(f => {
    if (catCounts[f.owasp_category] !== undefined) catCounts[f.owasp_category]++;
  });

  const getProgressPhaseStep = (phaseName) => {
    if (!phaseName) return 1;
    if (phaseName.includes('Discovery')) return 2;
    if (phaseName.includes('Tool') || phaseName.includes('External')) return 3;
    if (phaseName.includes('Detection') || phaseName.includes('Vulnerability') || phaseName.includes('Auditing')) return 4;
    if (phaseName.includes('CVE') || phaseName.includes('Enrichment')) return 5;
    if (phaseName.includes('Complete') || phaseName.includes('Finished')) return 6;
    return 1;
  };

  const currentStep = getProgressPhaseStep(activeSession?.current_phase);

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        <PageHeaderCard 
          badgeText="OWASP TOP 10 (2021) SCANNER"
          title="OWASP Vulnerability Security Suite"
          subtitle="Automated vulnerability discovery across all 10 OWASP categories, live phase progression, and CISA KEV exploit mapping."
        />

        {notification && (
          <div style={{
            margin: '1rem 0', padding: '0.85rem 1.25rem', borderRadius: '8px',
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : notification.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 165, 233, 0.2)',
            border: `1px solid ${notification.type === 'error' ? '#EF4444' : notification.type === 'success' ? '#10B981' : '#0EA5E9'}`,
            color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem'
          }}>
            {notification.type === 'error' ? <AlertCircle size={20} color="#EF4444" /> : <Sparkles size={20} color="#10B981" />}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Top Control Bar with Target Session Selector and Start/Cancel Actions */}
        <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#1E293B', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
            <ScanSelector 
              assignedDomains={assignedDomains}
              selectedDomain={selectedDomain}
              setSelectedDomain={setSelectedDomain}
              scansList={scansList}
              handleSelectScan={handleSelectScan}
            />

            {(sessionsList || []).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Select Scan Result:</span>
                <select
                  value={activeSession?.id || ''}
                  onChange={(e) => {
                    const selected = sessionsList.find(s => s.id === e.target.value);
                    if (selected) {
                      setActiveSession(selected);
                      fetchFindings(selected.id);
                      if (selected.target_url) {
                        const domain = selected.target_url.replace(/^https?:\/\//, '').split('/')[0];
                        if (typeof setSelectedDomain === 'function') {
                          setSelectedDomain(domain);
                        }
                      }
                    }
                  }}
                  style={{
                    background: '#0F172A', border: '1px solid #334155', borderRadius: '8px',
                    padding: '0.45rem 0.85rem', color: '#F8FAFC', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  {sessionsList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.target_url} — {s.status} ({Math.round(s.progress_percent || 0)}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {activeSession && (activeSession.status === 'RUNNING' || activeSession.status === 'PENDING') ? (
              <button
                onClick={handleCancelScan}
                disabled={cancellingScan}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', color: '#EF4444',
                  padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
                }}
              >
                <XCircle size={16} />
                {cancellingScan ? 'Cancelling...' : 'Cancel Active Scan'}
              </button>
            ) : (
              <button
                onClick={handleManualStart}
                disabled={startingScan || !selectedDomain}
                style={{
                  background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)', border: 'none', color: '#FFF',
                  padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: selectedDomain ? 'pointer' : 'not-allowed',
                  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                }}
              >
                {startingScan ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
                {startingScan ? 'Starting Scan...' : 'Start OWASP Top 10 Audit'}
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Scan Progress & OWASP Execution Monitor (Replaces Terminal) */}
        {activeSession && (
          <div style={{ 
            background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)', 
            borderRadius: '14px', 
            border: activeSession.status === 'RUNNING' ? '1px solid #0EA5E9' : '1px solid #334155',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: activeSession.status === 'RUNNING' ? '0 0 20px rgba(14, 165, 233, 0.2)' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#F8FAFC' }}>
                    OWASP Top 10 Scan Progress
                  </h3>
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800',
                    background: activeSession.status === 'RUNNING' ? 'rgba(14, 165, 233, 0.2)' : activeSession.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    border: `1px solid ${activeSession.status === 'RUNNING' ? '#0EA5E9' : activeSession.status === 'COMPLETED' ? '#10B981' : '#64748B'}`,
                    color: activeSession.status === 'RUNNING' ? '#38BDF8' : activeSession.status === 'COMPLETED' ? '#34D399' : '#94A3B8',
                    display: 'flex', alignItems: 'center', gap: '0.35rem'
                  }}>
                    {activeSession.status === 'RUNNING' && <RefreshCw size={12} className="spin" />}
                    {activeSession.status}
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                  Target Scope: <strong style={{ color: '#F8FAFC' }}>{activeSession.target_url}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '700' }}>PROGRESS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38BDF8' }}>
                    {Math.round(activeSession.progress_percent || 0)}%
                  </div>
                </div>
                {activeSession.status === 'RUNNING' && (
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.5rem 0.85rem', borderRadius: '8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: '700' }}>JUST-IN-TIME FINDINGS</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                      <Sparkles size={16} color="#38BDF8" className="spin" />
                      {findings.length} Discovered
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '10px', background: '#0F172A', borderRadius: '5px', overflow: 'hidden', border: '1px solid #334155', marginBottom: '1rem' }}>
              <div style={{ 
                width: `${Math.min(100, Math.max(0, activeSession.progress_percent || 0))}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #38BDF8 0%, #2563EB 50%, #10B981 100%)',
                borderRadius: '5px',
                transition: 'width 0.4s ease'
              }} />
            </div>

            {/* Active Phase & Current Activity Ticker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#0F172A', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#F8FAFC' }}>
                <Activity size={16} color="#38BDF8" className={activeSession.status === 'RUNNING' ? 'spin' : ''} />
                <span>Current Activity:</span>
                <span style={{ color: '#38BDF8', fontWeight: '700' }}>
                  {activeSession.current_phase || 'Initializing scan suite...'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {activeSession.status === 'RUNNING' ? 'Auto-refreshing every 2s • Findings update in real-time' : 'Scan execution finished'}
              </span>
            </div>

            {/* OWASP Top 10 Category Execution Grid */}
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
              {OWASP_CATEGORIES.map((cat) => {
                const isCurrentCategory = activeSession.current_phase?.includes(cat.id) || activeSession.current_phase?.includes(cat.name.split(':')[1]?.trim());
                const isCompleted = activeSession.status === 'COMPLETED' || (activeSession.progress_percent > 80);
                return (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.45rem 0.75rem', borderRadius: '6px',
                    background: isCurrentCategory ? 'rgba(56, 189, 248, 0.15)' : '#0F172A',
                    border: `1px solid ${isCurrentCategory ? '#38BDF8' : '#334155'}`,
                    fontSize: '0.75rem', fontWeight: '600', color: '#F8FAFC'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', truncate: 'true' }}>
                      <span style={{ color: cat.color, fontWeight: '800' }}>{cat.id}</span>
                      <span style={{ opacity: 0.9 }}>{cat.name.split(':')[1]}</span>
                    </span>
                    {isCurrentCategory ? (
                      <span style={{ color: '#38BDF8', fontSize: '0.65rem', fontWeight: '800', background: 'rgba(56, 189, 248, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        AUDITING
                      </span>
                    ) : isCompleted ? (
                      <CheckCircle2 size={14} color="#10B981" />
                    ) : (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }}></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Severity Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.1rem', background: '#1E293B', borderRadius: '10px', borderLeft: '4px solid #EF4444', borderTop: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>CRITICAL</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#EF4444', marginTop: '0.2rem' }}>{sevCounts.CRITICAL}</div>
          </div>
          <div className="card" style={{ padding: '1.1rem', background: '#1E293B', borderRadius: '10px', borderLeft: '4px solid #F97316', borderTop: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>HIGH</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#F97316', marginTop: '0.2rem' }}>{sevCounts.HIGH}</div>
          </div>
          <div className="card" style={{ padding: '1.1rem', background: '#1E293B', borderRadius: '10px', borderLeft: '4px solid #EAB308', borderTop: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>MEDIUM</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#EAB308', marginTop: '0.2rem' }}>{sevCounts.MEDIUM}</div>
          </div>
          <div className="card" style={{ padding: '1.1rem', background: '#1E293B', borderRadius: '10px', borderLeft: '4px solid #3B82F6', borderTop: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>LOW</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#3B82F6', marginTop: '0.2rem' }}>{sevCounts.LOW}</div>
          </div>
        </div>

        {/* Findings Table */}
        <div className="card" style={{ padding: '1.5rem', background: '#1E293B', borderRadius: '14px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#F8FAFC', margin: 0 }}>
                Discovered Vulnerabilities ({filteredFindings.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '0.2rem 0 0 0' }}>Detailed vulnerability findings with CWE, CVSS score, evidence, and remediation.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search findings..."
                style={{
                  background: '#0F172A', border: '1px solid #334155', borderRadius: '6px',
                  padding: '0.45rem 0.85rem', color: '#F8FAFC', fontSize: '0.85rem', minWidth: '180px'
                }}
              />
              <select
                value={selectedSeverity}
                onChange={e => setSelectedSeverity(e.target.value)}
                style={{
                  background: '#0F172A', border: '1px solid #334155', borderRadius: '6px',
                  padding: '0.45rem 0.85rem', color: '#F8FAFC', fontSize: '0.85rem'
                }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <button
                onClick={() => setOnlyExploitable(!onlyExploitable)}
                style={{
                  background: onlyExploitable ? 'rgba(239, 68, 68, 0.25)' : '#0F172A',
                  border: `1px solid ${onlyExploitable ? '#EF4444' : '#334155'}`,
                  color: onlyExploitable ? '#FCA5A5' : '#94A3B8',
                  padding: '0.45rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                }}
              >
                Exploit Available
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="vuln-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left' }}>
                  <th style={{ width: '36px' }}></th>
                  <th style={{ padding: '0.75rem', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '700' }}>VULNERABILITY NAME</th>
                  <th style={{ padding: '0.75rem', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '700' }}>AFFECTED SUB-DOMAIN / URL</th>
                  <th style={{ padding: '0.75rem', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '700' }}>OWASP CATEGORY</th>
                  <th style={{ padding: '0.75rem', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '700' }}>SEVERITY</th>
                  <th style={{ padding: '0.75rem', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '700' }}>CWE</th>
                  <th style={{ padding: '0.75rem', color: '#94A3B8', fontSize: '0.75rem', fontWeight: '700' }}>CVSS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                      {loading ? 'Loading findings...' : 'No vulnerabilities detected matching the filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredFindings.map(f => {
                    const isExpanded = expandedRows[f.id];
                    return (
                      <React.Fragment key={f.id}>
                        <tr 
                          onClick={() => toggleRow(f.id)}
                          style={{
                            cursor: 'pointer', borderBottom: '1px solid #334155',
                            background: isExpanded ? 'rgba(14, 165, 233, 0.05)' : 'transparent'
                          }}
                        >
                          <td style={{ textAlign: 'center', color: '#94A3B8' }}>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '600', color: '#F8FAFC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span>{f.name}</span>
                              {activeSession?.status === 'RUNNING' && (
                                <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8', border: '1px solid #38BDF8', padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Sparkles size={11} className="spin" /> JUST DISCOVERED
                                </span>
                              )}
                              {f.exploit_available && (
                                <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                                  Exploit Available
                                </span>
                              )}
                              {f.in_cisa_kev && (
                                <span style={{ background: 'rgba(220, 38, 38, 0.25)', color: '#FCA5A5', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                                  CISA KEV
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#38BDF8', fontFamily: 'monospace' }}>
                            {f.affected_url || activeSession?.target_url || '—'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ background: '#0F172A', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #334155', color: '#38BDF8', fontSize: '0.75rem', fontWeight: '700' }}>
                              {f.owasp_category}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700',
                              background: f.severity === 'CRITICAL' ? '#7F1D1D' : f.severity === 'HIGH' ? '#7C2D12' : f.severity === 'MEDIUM' ? '#713F12' : '#1E3A8A',
                              color: f.severity === 'CRITICAL' ? '#FCA5A5' : f.severity === 'HIGH' ? '#FDBA74' : f.severity === 'MEDIUM' ? '#FDE047' : '#93C5FD'
                            }}>
                              {f.severity}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#94A3B8', fontSize: '0.8rem' }}>{f.cwe_id || '—'}</td>
                          <td style={{ padding: '0.75rem', fontWeight: '700', color: '#F8FAFC' }}>{f.cvss_score || 'N/A'}</td>
                        </tr>

                        {/* Detailed Finding View */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="7" style={{ padding: '1.25rem', background: '#0F172A', borderBottom: '1px solid #334155' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#38BDF8', marginBottom: '0.5rem' }}>Description & Risk</h4>
                                  <p style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: '1.5', margin: 0 }}>{f.description || 'No description available.'}</p>
                                  
                                  {f.risk_description && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                      <h5 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#F97316', margin: '0 0 0.25rem 0' }}>Risk Analysis</h5>
                                      <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>{f.risk_description}</p>
                                    </div>
                                  )}

                                  {f.evidence && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                      <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#38BDF8', marginBottom: '0.25rem' }}>Technical Evidence</h4>
                                      <div style={{ background: '#1E293B', padding: '0.6rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#A7F3D0', whiteSpace: 'pre-wrap' }}>
                                        {f.evidence}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#34D399', marginBottom: '0.5rem' }}>Remediation Steps</h4>
                                  <p style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-line' }}>{f.remediation || 'No remediation guidelines provided.'}</p>

                                  {f.proof && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                      <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#F472B6', marginBottom: '0.25rem' }}>Proof of Concept</h4>
                                      <pre style={{ background: '#1E293B', padding: '0.6rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#F8FAFC', overflowX: 'auto' }}>
                                        {f.proof}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OWASPScanUI;
