import React from 'react';
import './PageHeaderCard.css';

/**
 * PageHeaderCard — compact header banner used at the top of every page.
 * Theme (dark / light) is handled purely via CSS using the `.light-mode`
 * class on the nearest ancestor `.app-container` (see index.css + PageHeaderCard.css).
 * No JS-side theme detection needed here.
 */
const getStatColor = (label = '', subtext = '', index = 0) => {
  const text = (label + ' ' + subtext).toLowerCase();
  if (text.includes('critical') || text.includes('failed') || text.includes('high risk') || text.includes('malicious') || text.includes('threat') || text.includes('expired') || text.includes('exposure') || text.includes('exposed')) {
    return {
      border: 'rgba(239, 68, 68, 0.45)',
      glow: 'rgba(239, 68, 68, 0.08)',
      bg: 'rgba(239, 68, 68, 0.03)'
    };
  }
  if (text.includes('warning') || text.includes('suspicious') || text.includes('needs review') || text.includes('expiring') || text.includes('weak') || text.includes('risk') || text.includes('typosquat') || text.includes('unauthenticated')) {
    return {
      border: 'rgba(245, 158, 11, 0.45)',
      glow: 'rgba(245, 158, 11, 0.08)',
      bg: 'rgba(245, 158, 11, 0.03)'
    };
  }
  if (text.includes('clean') || text.includes('safe') || text.includes('active') || text.includes('verified') || text.includes('installed')) {
    return {
      border: 'rgba(16, 185, 129, 0.45)',
      glow: 'rgba(16, 185, 129, 0.08)',
      bg: 'rgba(16, 185, 129, 0.03)'
    };
  }
  const borderColors = [
    { border: 'rgba(59, 130, 246, 0.45)', glow: 'rgba(59, 130, 246, 0.08)', bg: 'rgba(59, 130, 246, 0.03)' },
    { border: 'rgba(168, 85, 247, 0.45)', glow: 'rgba(168, 85, 247, 0.08)', bg: 'rgba(168, 85, 247, 0.03)' },
    { border: 'rgba(6, 182, 212, 0.45)', glow: 'rgba(6, 182, 212, 0.08)', bg: 'rgba(6, 182, 212, 0.03)' },
  ];
  return borderColors[index % borderColors.length];
};

const PageHeaderCard = ({ badgeText, title, subtitle, actions, stats }) => {
  return (
    <div className="phc-container">
      <div className="phc-badge">
        <div className="dot"></div>
        {badgeText}
      </div>

      <div className="phc-header-row">
        <div>
          <h1 className="phc-title">{title}</h1>
          <p className="phc-subtitle">{subtitle}</p>
        </div>
        {actions && (
          <div className="phc-actions">
            {actions}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="phc-stats-grid">
          {stats.map((stat, index) => {
            const colorInfo = getStatColor(stat.label, stat.subtext, index);
            return (
              <div 
                key={index} 
                className="phc-stat-card"
                style={{
                  '--card-border': colorInfo.border,
                  '--card-glow': colorInfo.glow,
                  '--card-bg': colorInfo.bg
                }}
              >
                <div className="phc-stat-label">{stat.label}</div>
                <div className="phc-stat-val">{stat.value}</div>
                {stat.subtext && <div className="phc-stat-sub">{stat.subtext}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PageHeaderCard;
