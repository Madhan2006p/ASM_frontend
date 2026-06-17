import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  GitBranch, 
  Users, 
  AlertTriangle, 
  Activity, 
  Clock, 
  GitCommit, 
  GitPullRequest, 
  RefreshCw, 
  PlayCircle, 
  Eye, 
  Shield, 
  Plus, 
  Loader, 
  CheckCircle,
  Database
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './SurfaceWeb.css';
import { api } from '../../utils/api';

const SurfaceWeb = ({ activeTarget }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Tab data states
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [scans, setScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);

  // Actions states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionStatus, setActionStatus] = useState(null); // 'success', 'error'

  // Add Repo Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');

  // Load Dashboard Stats
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.get('/api/surface-monitoring/repos/stats/');
      setStats(data);
    } catch (err) {
      console.error("Failed to load Surface Monitoring stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load Repositories
  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const data = await api.get('/api/surface-monitoring/repos/');
      setRepos(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load repos", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Load Events
  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const data = await api.get('/api/surface-monitoring/events/');
      setEvents(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load Scans
  const loadScans = async () => {
    setLoadingScans(true);
    try {
      const data = await api.get('/api/surface-monitoring/scans/');
      setScans(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load scans", err);
    } finally {
      setLoadingScans(false);
    }
  };

  useEffect(() => {
    loadStats();
    if (activeTab === 'Repositories') loadRepos();
    if (activeTab === 'Activity') loadEvents();
    if (activeTab === 'Scan History') loadScans();
  }, [activeTab]);

  // Discover repositories matching organization name
  const handleDiscoverOrg = async () => {
    setActionLoading(true);
    setActionMsg('');
    setActionStatus(null);
    try {
      const res = await api.post('/api/surface-monitoring/repos/discover_by_org/');
      setActionStatus('success');
      setActionMsg(`Discovery run completed. Found/updated repos.`);
      loadStats();
      if (activeTab === 'Repositories') loadRepos();
    } catch (err) {
      console.error("Failed to run org discovery", err);
      setActionStatus('error');
      setActionMsg(err.message || 'Failed to discover organization repositories.');
    } finally {
      setActionLoading(false);
    }
  };

  // Scan all repositories for secrets
  const handleScanAll = async () => {
    setActionLoading(true);
    setActionMsg('');
    setActionStatus(null);
    try {
      const res = await api.post('/api/surface-monitoring/repos/scan_all/');
      setActionStatus('success');
      setActionMsg(`Successfully queued Gitleaks scan on ${res.count || 0} repositories!`);
      loadStats();
      if (activeTab === 'Scan History') loadScans();
    } catch (err) {
      console.error("Failed to queue batch scan", err);
      setActionStatus('error');
      setActionMsg(err.message || 'Failed to trigger batch repositories scan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Scan a single repo
  const handleScanRepo = async (repoId) => {
    try {
      const res = await api.post(`/api/surface-monitoring/repos/${repoId}/scan/`);
      alert(`Gitleaks scan queued for repository.`);
      loadStats();
    } catch (err) {
      console.error("Failed to scan repo", err);
      alert(err.message || "Failed to queue scan.");
    }
  };

  // Poll single repo events
  const handlePollEvents = async (repoId) => {
    try {
      const res = await api.post(`/api/surface-monitoring/repos/${repoId}/poll_events/`);
      alert(`Polled events from GitHub.`);
      loadStats();
      if (activeTab === 'Activity') loadEvents();
    } catch (err) {
      console.error("Failed to poll events", err);
      alert(err.message || "Failed to poll events.");
    }
  };

  // Add Repository
  const handleAddRepoSubmit = async (e) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    try {
      const res = await api.post('/api/surface-monitoring/repos/add_repo/', {
        full_name: newRepoName.trim()
      });
      alert(res.message || "Repository added.");
      setNewRepoName('');
      setShowAddModal(false);
      loadStats();
      if (activeTab === 'Repositories') loadRepos();
    } catch (err) {
      console.error("Failed to add repo", err);
      alert(err.message || "Failed to add repository.");
    }
  };

  const orgName = stats?.org_name || 'kec';

  return (
    <div className="surface-web-container">
      
      <PageHeaderCard
        badgeText="BRAND MONITORING"
        title="Surface Web Monitoring"
        subtitle="Discover and monitor GitHub repositories matching your organization name. Track secret leaks, pushes, creates, and workflow executions."
        stats={[
          { label: 'Repositories',  value: (stats?.total_repos ?? 0).toString(), subtext: 'Discovered' },
          { label: 'Secrets Found', value: (stats?.total_secrets_found ?? 0).toString(), subtext: 'Exposed credentials' },
          { label: 'Scans Run',     value: (stats?.total_scans ?? 0).toString(), subtext: 'Gitleaks analysis' },
          { label: 'Activity (7d)', value: (stats?.recent_events ?? 0).toString(), subtext: 'Recent events' },
        ]}
        actions={
          <>
          </>
        }
      />

      {/* Monitoring Organization Banner */}
      <div className="sw-org-banner">
        <div className="sw-org-avatar">
          <Users size={20} color="#6B21A8" />
        </div>
        <div className="sw-org-info">
          <span className="sw-org-label">MONITORING ORGANIZATION</span>
          <span className="sw-org-name" style={{ textTransform: 'uppercase' }}>{orgName}</span>
        </div>
      </div>

      {/* Alert Msg Banner */}
      {actionMsg && (
        <div 
          style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: actionStatus === 'success' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            borderColor: actionStatus === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            color: actionStatus === 'success' ? '#22C55E' : '#EF4444'
          }}
        >
          {actionStatus === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Primary Stats Grid */}
      <div className="sw-primary-stats">
        
        <div className="sw-stat-card">
          <div className="sw-stat-content">
            <span className="sw-stat-label">REPOSITORIES</span>
            <span className="sw-stat-value text-purple">{stats?.total_repos ?? 0}</span>
          </div>
          <Globe size={24} className="sw-stat-icon text-purple-light" />
        </div>

        <div className="sw-stat-card">
          <div className="sw-stat-content">
            <span className="sw-stat-label">SECRETS FOUND</span>
            <span className="sw-stat-value text-red">{stats?.total_secrets_found ?? 0}</span>
          </div>
          <AlertTriangle size={24} className="sw-stat-icon text-red-light" />
        </div>

        <div className="sw-stat-card">
          <div className="sw-stat-content">
            <span className="sw-stat-label">SCANS</span>
            <span className="sw-stat-value text-blue">{stats?.total_scans ?? 0}</span>
          </div>
          <Activity size={24} className="sw-stat-icon text-blue-light" />
        </div>

        <div className="sw-stat-card">
          <div className="sw-stat-content">
            <span className="sw-stat-label">ACTIVITY (7D)</span>
            <span className="sw-stat-value text-green">{stats?.recent_events ?? 0}</span>
          </div>
          <Clock size={24} className="sw-stat-icon text-green-light" />
        </div>

      </div>

      {/* Secondary Stats Grid */}
      <div className="sw-secondary-stats">
        
        <div className="sw-small-stat">
          <div className="sw-small-icon-bg bg-blue-light">
            <GitCommit size={14} className="text-blue" />
          </div>
          <div className="sw-small-content">
            <span className="sw-small-label">PUSHED</span>
            <span className="sw-small-value text-blue">{stats?.recent_pushes ?? 0}</span>
          </div>
        </div>

        <div className="sw-small-stat">
          <div className="sw-small-icon-bg bg-green-light">
            <GitPullRequest size={14} className="text-green" />
          </div>
          <div className="sw-small-content">
            <span className="sw-small-label">CREATED</span>
            <span className="sw-small-value text-green">{stats?.recent_creates ?? 0}</span>
          </div>
        </div>

        <div className="sw-small-stat">
          <div className="sw-small-icon-bg bg-purple-light">
            <RefreshCw size={14} className="text-purple" />
          </div>
          <div className="sw-small-content">
            <span className="sw-small-label">UPDATED</span>
            <span className="sw-small-value text-purple">{stats?.recent_updates ?? 0}</span>
          </div>
        </div>

        <div className="sw-small-stat sw-small-stat-actions">
          <div className="sw-small-icon-bg bg-orange-light">
            <PlayCircle size={14} className="text-orange" />
          </div>
          <div className="sw-small-content">
            <span className="sw-small-label">ACTIONS</span>
            <div className="sw-small-value-group">
              <span className="text-green">{stats?.recent_action_success ?? 0} OK</span> / <span className="text-red">{stats?.recent_action_failed ?? 0} Fail</span>
            </div>
          </div>
        </div>

        <div className="sw-small-stat">
          <div className="sw-small-icon-bg bg-cyan-light">
            <Eye size={14} className="text-cyan" />
          </div>
          <div className="sw-small-content">
            <span className="sw-small-label">WATCHING</span>
            <span className="sw-small-value text-cyan">{stats?.total_watching ?? 0}</span>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="sw-tabs">
        {['Dashboard', 'Activity', 'Repositories', 'Scan History'].map(tab => (
          <button 
            key={tab}
            className={`sw-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Dashboard' && <Activity size={14} />}
            {tab === 'Activity' && <Clock size={14} />}
            {tab === 'Repositories' && <Globe size={14} />}
            {tab === 'Scan History' && <Shield size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Dashboard' && (
        <div className="sw-dashboard-content">
          
          {/* Recent Activity */}
          <div className="sw-panel">
            <div className="sw-panel-header sw-flex-between" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
              <div className="sw-panel-title-group">
                <Clock size={18} className="text-orange" />
                <h2 className="sw-panel-title">Recent Activity</h2>
              </div>
              <button className="sw-btn-view-all" onClick={() => setActiveTab('Activity')}>View All &rarr;</button>
            </div>
            
            {stats?.latest_events && stats.latest_events.length > 0 ? (
              <div style={{ padding: '0.75rem 1.5rem' }}>
                {stats.latest_events.map((ev, i) => (
                  <div 
                    key={i} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 0',
                      borderBottom: i < stats.latest_events.length - 1 ? '1px solid var(--border-color)' : 'none'
                    }}
                  >
                    <span 
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: ev.event_type === 'push' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
                        color: ev.event_type === 'push' ? '#3B82F6' : '#22C55E'
                      }}
                    >
                      {ev.event_type}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{ev.repository_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ev.details}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(ev.event_occurred_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sw-empty-state sw-py-large">
                <Clock size={24} className="text-gray-light mb-2" />
                <p className="text-gray" style={{ color: 'var(--text-secondary)' }}>
                  No recent activity. Click <strong>"Discover Repos"</strong> to find matching resources.
                </p>
              </div>
            )}
          </div>

          {/* Repository Charts */}
          <div className="sw-charts-grid">
            <div className="sw-panel">
              <div className="sw-panel-header" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
                <h2 className="sw-panel-title">Repositories by Visibility</h2>
              </div>
              <div className="sw-empty-state sw-py-medium" style={{ padding: '1.5rem' }}>
                {stats?.repos_by_visibility && Object.keys(stats.repos_by_visibility).length > 0 ? (
                  Object.entries(stats.repos_by_visibility).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.85rem' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{key}</span>
                      <span className="font-mono">{val}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray text-left w-full" style={{ color: 'var(--text-secondary)' }}>No data yet. Discover repositories to see stats.</p>
                )}
              </div>
            </div>

            <div className="sw-panel">
              <div className="sw-panel-header" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
                <h2 className="sw-panel-title">Repositories by Language</h2>
              </div>
              <div className="sw-empty-state sw-py-medium" style={{ padding: '1.5rem' }}>
                {stats?.repos_by_language && Object.keys(stats.repos_by_language).length > 0 ? (
                  Object.entries(stats.repos_by_language).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '600' }}>{key}</span>
                      <span className="font-mono">{val}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray text-left w-full" style={{ color: 'var(--text-secondary)' }}>No data yet. Discover repositories to see stats.</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sw-panel">
            <div className="sw-panel-header" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
              <div className="sw-panel-title-group">
                <Activity size={18} className="text-blue" />
                <h2 className="sw-panel-title">Quick Actions</h2>
              </div>
            </div>
            <div className="sw-quick-actions-grid" style={{ padding: '1.5rem' }}>
              
              <button className="sw-qa-btn blue" onClick={handleDiscoverOrg}>
                <Search size={20} />
                <span>Discover by "{orgName}"</span>
              </button>

              <button className="sw-qa-btn green" onClick={() => setActiveTab('Repositories')}>
                <GitBranch size={20} />
                <span>View Repositories</span>
              </button>

              <button className="sw-qa-btn yellow" onClick={() => setActiveTab('Activity')}>
                <Clock size={20} />
                <span>View Activity</span>
              </button>

              <button className="sw-qa-btn red" onClick={handleScanAll}>
                <Shield size={20} />
                <span>Scan All for Secrets</span>
              </button>

            </div>
          </div>

        </div>
      )}

      {activeTab === 'Repositories' && (
        <div className="sw-panel">
          <div className="sw-panel-header sw-flex-between" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            <div className="sw-panel-title-group">
              <Globe size={18} className="text-purple" />
              <h2 className="sw-panel-title">Discovered Repositories</h2>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{repos.length} repositories total</span>
          </div>

          <div className="mv-table-container">
            {repos.length > 0 ? (
              <table className="mv-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>VISIBILITY</th>
                    <th>LANGUAGE</th>
                    <th>STARS</th>
                    <th>SECRETS EXPOSED</th>
                    <th>BRANCH</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right', paddingRight: '2rem' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold' }}>
                        <a href={r.repo_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                          {r.full_name}
                        </a>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '600' }}>
                        {r.visibility}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>{r.language || '—'}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>⭐ {r.stars || 0}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span 
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: '700',
                            background: r.hardcoded_credentials_count > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                            color: r.hardcoded_credentials_count > 0 ? '#EF4444' : '#22C55E'
                          }}
                        >
                          {r.hardcoded_credentials_count} secrets
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>{r.default_branch || 'main'}</td>
                      <td style={{ padding: '1rem 1.5rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700' }}>
                        {r.status}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right', paddingRight: '2rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="sw-btn-outline-blue" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => handleScanRepo(r.id)}
                          >
                            Scan secrets
                          </button>
                          <button 
                            className="sw-btn-outline-green" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => handlePollEvents(r.id)}
                          >
                            Poll Github
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="sw-empty-state sw-py-large">
                <Globe size={24} className="text-gray-light mb-2" />
                <p className="text-gray" style={{ color: 'var(--text-secondary)' }}>
                  {loadingRepos ? 'Loading repositories...' : 'No repositories discovered. Trigger discovery to populate.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Activity' && (
        <div className="sw-panel">
          <div className="sw-panel-header sw-flex-between" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            <div className="sw-panel-title-group">
              <Clock size={18} className="text-green" />
              <h2 className="sw-panel-title">Commit & Web Activity Feed</h2>
            </div>
          </div>
          <div className="mv-table-container">
            {events.length > 0 ? (
              <table className="mv-table">
                <thead>
                  <tr>
                    <th>TYPE</th>
                    <th>REPOSITORY</th>
                    <th>DETAILS</th>
                    <th>DATE OCCURRED</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span 
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background: e.event_type === 'push' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
                            color: e.event_type === 'push' ? '#3B82F6' : '#22C55E'
                          }}
                        >
                          {e.event_type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '700' }}>{e.repository_name}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>{e.details}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(e.event_occurred_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="sw-empty-state sw-py-large">
                <Clock size={24} className="text-gray-light mb-2" />
                <p className="text-gray" style={{ color: 'var(--text-secondary)' }}>
                  {loadingEvents ? 'Loading events feed...' : 'No activity recorded yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Scan History' && (
        <div className="sw-panel">
          <div className="sw-panel-header sw-flex-between" style={{ borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            <div className="sw-panel-title-group">
              <Shield size={18} className="text-red" />
              <h2 className="sw-panel-title">Repository Scan History</h2>
            </div>
          </div>
          <div className="mv-table-container">
            {scans.length > 0 ? (
              <table className="mv-table">
                <thead>
                  <tr>
                    <th>SCAN ID</th>
                    <th>REPOSITORY</th>
                    <th>STATUS</th>
                    <th>SECRETS EXPOSED</th>
                    <th>DATE RUN</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id}>
                      <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace' }}>#{s.id}</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '700' }}>{s.repository_name}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span 
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background: s.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)',
                            color: s.status === 'completed' ? '#22C55E' : '#F97316'
                          }}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '700', color: s.findings_count > 0 ? '#EF4444' : '#22C55E' }}>
                        {s.findings_count} secrets
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(s.scanned_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="sw-empty-state sw-py-large">
                <Shield size={24} className="text-gray-light mb-2" />
                <p className="text-gray" style={{ color: 'var(--text-secondary)' }}>
                  {loadingScans ? 'Loading scans...' : 'No repository secret scans recorded.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Repository Modal */}
      {showAddModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div 
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '2rem',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Add GitHub Repository
            </h3>
            <form onSubmit={handleAddRepoSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  Repository Name or URL
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. owner/repository or full GitHub URL"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}
                >
                  Add Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SurfaceWeb;
