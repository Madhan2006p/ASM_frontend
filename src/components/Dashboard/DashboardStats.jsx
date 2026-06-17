import React from 'react';
import { TrendingUp } from 'lucide-react';
import { AlertCircle, AlertTriangle, Info, Shield, Globe, Server, Lock, Activity, Eye, Zap } from 'lucide-react';
import './DashboardStats.css';

const topStats = [
  { label: 'Subdomains',      value: '0', colorClass: 'text-blue-500',   icon: <Globe size={18} />,         gradient: 'stat-grad-blue' },
  { label: 'Domains',         value: '0', colorClass: 'text-cyan-400',   icon: <Activity size={18} />,      gradient: 'stat-grad-cyan' },
  { label: 'Web Entities',    value: '0', colorClass: 'text-green-500',  icon: <Eye size={18} />,           gradient: 'stat-grad-green' },
  { label: 'Certificates',    value: '0', colorClass: 'text-red-500',    icon: <Lock size={18} />,          gradient: 'stat-grad-red' },
  { label: 'Vulnerabilities', value: '0', colorClass: 'text-yellow-500', icon: <AlertTriangle size={18} />, gradient: 'stat-grad-yellow' },
  { label: 'Open Ports',      value: '0', colorClass: 'text-gray-500',   icon: <Server size={18} />,        gradient: 'stat-grad-gray' },
];

// Exported so Vulnerabilities page can use it
export const vulnStats = [
  { label: 'Critical', value: '0', colorClass: 'text-red-500',    bgClass: 'bg-red-50',    icon: <AlertCircle size={22} />,   bar: 'bar-critical' },
  { label: 'High',     value: '0', colorClass: 'text-yellow-500', bgClass: 'bg-yellow-50', icon: <AlertTriangle size={22} />, bar: 'bar-high' },
  { label: 'Medium',   value: '0', colorClass: 'text-blue-500',   bgClass: 'bg-blue-50',   icon: <Info size={22} />,          bar: 'bar-medium' },
  { label: 'Low',      value: '0', colorClass: 'text-gray-500',   bgClass: 'bg-gray-100',  icon: <Shield size={22} />,        bar: 'bar-low' },
];

const DashboardStats = () => {
  return (
    <div className="dashboard-stats-section">
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <div className="dash-badge"><Zap size={12} /> Live Dashboard</div>
          <h1 className="dash-title">Security Overview</h1>
          <p className="dash-subtitle">Real-time visibility into your external attack surface</p>
        </div>
        <div className="dash-header-meta">
          <span className="last-sync"><Activity size={13} /> Last synced: Just now</span>
        </div>
      </div>

      {/* Asset Stats Row */}
      <div className="top-stats-grid">
        {topStats.map((stat, idx) => (
          <div key={idx} className={`stat-card-centered ${stat.gradient}`}>
            <div className="stat-icon-wrap">{stat.icon}</div>
            <span className={`stat-value-large ${stat.colorClass}`}>{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardStats;
