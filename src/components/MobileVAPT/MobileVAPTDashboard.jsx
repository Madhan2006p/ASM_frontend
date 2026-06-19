import React, { useState, useEffect } from 'react';
import { Smartphone, ShieldCheck, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import '../InternalDiscovery/InternalDashboard.css';

const MobileVAPTDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.get('/api/mobile-vapt/dashboard/');
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch mobile vapt stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="internal-dashboard-container">
      <PageHeaderCard
        badgeText="MOBILE SECURITY"
        title="Mobile Security Dashboard"
        subtitle="Vulnerability Assessment and Penetration Testing statistics for uploaded Android and iOS applications."
      />

      {loading ? (
        <div className="card" style={{ marginTop: '1.5rem', padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Loading dashboard...
        </div>
      ) : (
        <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
          <div className="metric-card-premium">
            <div className="card-icon blue"><Smartphone size={24} /></div>
            <div className="card-info">
              <h4>Total Scans</h4>
              <div className="card-value">{stats?.total_scans || 0}</div>
            </div>
          </div>
          <div className="metric-card-premium">
            <div className="card-icon purple"><ShieldCheck size={24} /></div>
            <div className="card-info">
              <h4>Average Security Score</h4>
              <div className="card-value">{stats?.avg_score ? `${stats.avg_score}/100` : 'N/A'}</div>
            </div>
          </div>
          <div className="metric-card-premium">
            <div className="card-icon red"><ShieldAlert size={24} /></div>
            <div className="card-info">
              <h4>Critical Vulnerabilities</h4>
              <div className="card-value">{stats?.critical_vulns || 0}</div>
            </div>
          </div>
          <div className="metric-card-premium">
            <div className="card-icon orange"><Activity size={24} /></div>
            <div className="card-info">
              <h4>Active Scans</h4>
              <div className="card-value">{stats?.active_scans || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileVAPTDashboard;
