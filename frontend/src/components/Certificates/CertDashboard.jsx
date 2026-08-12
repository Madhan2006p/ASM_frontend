import React from 'react';
import { Layers, AlertCircle, Hourglass } from 'lucide-react';
import './CertDashboard.css';

// Speedometer / Gauge Icon matching Screenshot 0
const SpeedometerIcon = ({ color = '#3B82F6', percent = 50 }) => {
  // Angle mapped from 0% (left) to 100% (right) across top half circle
  const angle = 180 + (percent * 1.8);
  const rad = (angle * Math.PI) / 180;
  const needleX = 32 + 14 * Math.cos(rad);
  const needleY = 36 + 14 * Math.sin(rad);

  return (
    <svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" style={{ fill: 'var(--bg-card-2)', stroke: 'var(--border-color)' }} strokeWidth="2" />
      {/* Track arc */}
      <path
        d="M 14 40 A 20 20 0 1 1 50 40"
        style={{ stroke: 'var(--border-color)' }}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Color filled arc */}
      <path
        d="M 14 40 A 20 20 0 1 1 50 40"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="95"
        strokeDashoffset={Math.max(0, 95 - (95 * Math.max(percent, 10)) / 100)}
        fill="none"
      />
      {/* Pivot point */}
      <circle cx="32" cy="36" r="3.5" style={{ fill: 'var(--text-secondary)' }} />
      {/* Gauge Needle */}
      <line
        x1="32"
        y1="36"
        x2={needleX}
        y2={needleY}
        style={{ stroke: 'var(--text-primary)' }}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

const CertDashboard = ({
  domainsList = ['Overall'],
  selectedDomain = 'Overall',
  setSelectedDomain,
  activeView = 'Certificate', // 'No Certificate' | 'Certificate' | 'SSL Vulnerability'
  setActiveView,
  // Certificate Summary Counts
  certCounts = { overall: 0, expired: 0, yetToExpire: 0 },
  selectedCertFilter = 'overall',
  setSelectedCertFilter,
  // Vulnerability Severity Counts
  vulnCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  selectedSeverityFilter = 'ALL',
  setSelectedSeverityFilter
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Main Page Header */}
      <div className="ssl-page-header">
        <h1 className="ssl-page-title">SSL Certificates</h1>
      </div>

      {/* 2. Top Domain Navigation Bar */}
      <div className="ssl-domain-nav-container">
        <div className="ssl-domain-tabs">
          {domainsList.map((domain) => (
            <button
              key={domain}
              className={`ssl-domain-tab ${selectedDomain === domain ? 'active' : ''}`}
              onClick={() => setSelectedDomain(domain)}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Sub-View Switcher Navigation Tabs */}
      <div className="ssl-view-switcher-container">
        <div className="ssl-view-tabs">
          <button
            className={`ssl-view-tab ${activeView === 'No Certificate' ? 'active' : ''}`}
            onClick={() => setActiveView('No Certificate')}
          >
            No Certificate
          </button>
          <button
            className={`ssl-view-tab ${activeView === 'Certificate' ? 'active' : ''}`}
            onClick={() => setActiveView('Certificate')}
          >
            Certificate
          </button>
          <button
            className={`ssl-view-tab ${activeView === 'SSL Vulnerability' ? 'active' : ''}`}
            onClick={() => setActiveView('SSL Vulnerability')}
          >
            SSL Vulnerability
          </button>
        </div>
      </div>

      {/* 4. Dynamic Summary Cards based on Active View */}

      {/* VIEW A: Certificate View - 3 Summary Cards */}
      {activeView === 'Certificate' && (
        <div className="ssl-cert-summary-grid">
          
          {/* Card 1: Overall */}
          <div
            className={`ssl-cert-card ${selectedCertFilter === 'overall' ? 'active-filter' : ''}`}
            onClick={() => setSelectedCertFilter('overall')}
          >
            <div className="ssl-cert-card-icon cyan">
              <Layers size={24} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">Overall</span>
              <span className="ssl-cert-card-value">{certCounts.overall}</span>
            </div>
          </div>

          {/* Card 2: Expired */}
          <div
            className={`ssl-cert-card ${selectedCertFilter === 'expired' ? 'active-filter' : ''}`}
            onClick={() => setSelectedCertFilter('expired')}
          >
            <div className="ssl-cert-card-icon red">
              <AlertCircle size={24} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">Expired</span>
              <span className="ssl-cert-card-value">{certCounts.expired}</span>
            </div>
          </div>

          {/* Card 3: Yet To Expire */}
          <div
            className={`ssl-cert-card ${selectedCertFilter === 'yetToExpire' ? 'active-filter' : ''}`}
            onClick={() => setSelectedCertFilter('yetToExpire')}
          >
            <div className="ssl-cert-card-icon amber">
              <Hourglass size={24} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">Yet To Expire</span>
              <span className="ssl-cert-card-value">{certCounts.yetToExpire}</span>
            </div>
          </div>

        </div>
      )}

      {/* VIEW B: SSL Vulnerability View - 6 Status Summary Cards */}
      {activeView === 'SSL Vulnerability' && (
        <div className="ssl-vuln-status-grid">
          
          {/* Card 1: Overall */}
          <div
            className={`ssl-vuln-card ${selectedSeverityFilter === 'overall' || selectedSeverityFilter === 'ALL' ? 'active-filter' : ''}`}
            onClick={() => setSelectedSeverityFilter('ALL')}
          >
            <div className="ssl-cert-card-icon cyan">
              <Layers size={22} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">Overall</span>
              <span className="ssl-cert-card-value">{vulnCounts.overall || 0}</span>
            </div>
          </div>

          {/* Card 2: Unreviewed */}
          <div
            className={`ssl-vuln-card ${selectedSeverityFilter === 'Unreviewed' ? 'active-filter' : ''}`}
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'Unreviewed' ? 'ALL' : 'Unreviewed')}
          >
            <div className="ssl-cert-card-icon red">
              <AlertCircle size={22} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">Unreviewed</span>
              <span className="ssl-cert-card-value">{vulnCounts.unreviewed || 0}</span>
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div
            className={`ssl-vuln-card ${selectedSeverityFilter === 'In Progress' ? 'active-filter' : ''}`}
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'In Progress' ? 'ALL' : 'In Progress')}
          >
            <div className="ssl-cert-card-icon amber">
              <Hourglass size={22} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">In Progress</span>
              <span className="ssl-cert-card-value">{vulnCounts.inProgress || 0}</span>
            </div>
          </div>

          {/* Card 4: Muted */}
          <div
            className={`ssl-vuln-card ${selectedSeverityFilter === 'Muted' ? 'active-filter' : ''}`}
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'Muted' ? 'ALL' : 'Muted')}
          >
            <div className="ssl-cert-card-icon slate">
              <Hourglass size={22} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">Muted</span>
              <span className="ssl-cert-card-value">{vulnCounts.muted || 0}</span>
            </div>
          </div>

          {/* Card 5: False Positive */}
          <div
            className={`ssl-vuln-card ${selectedSeverityFilter === 'False Positive' ? 'active-filter' : ''}`}
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'False Positive' ? 'ALL' : 'False Positive')}
          >
            <div className="ssl-cert-card-icon purple">
              <AlertCircle size={22} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">False Positive</span>
              <span className="ssl-cert-card-value">{vulnCounts.falsePositive || 0}</span>
            </div>
          </div>

          {/* Card 6: Closed */}
          <div
            className={`ssl-vuln-card ${selectedSeverityFilter === 'Closed' ? 'active-filter' : ''}`}
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'Closed' ? 'ALL' : 'Closed')}
          >
            <div className="ssl-cert-card-icon green">
              <Layers size={22} />
            </div>
            <div className="ssl-cert-card-content">
              <span className="ssl-cert-card-label">Closed</span>
              <span className="ssl-cert-card-value">{vulnCounts.closed || 0}</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default CertDashboard;
