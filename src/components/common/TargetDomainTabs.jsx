import React from 'react';
import { Lock } from 'lucide-react';
import './TargetDomainTabs.css';

const TargetDomainTabs = ({
  assignedDomains = [],
  scansList = [],
  selectedDomain = '',
  setSelectedDomain
}) => {
  // Combine assigned domains and scanned targets so all valid target domains are selectable
  const assignedList = Array.isArray(assignedDomains) ? assignedDomains : [];
  const scanTargets = Array.isArray(scansList) ? scansList.map(s => s.target) : [];
  const domainList = Array.from(new Set([...assignedList, ...scanTargets].filter(Boolean)));

  const tabs = [
    { label: 'All Domains', value: '' },
    ...domainList.map(d => ({ label: d, value: d }))
  ];

  return (
    <div className="target-domain-tabs-container">
      <div className="target-domain-label-badge">
        <Lock size={13} className="target-domain-lock-icon" />
        <span>TARGET DOMAIN</span>
      </div>

      <div className="target-domain-divider"></div>

      <div className="target-domain-tabs-wrapper">
        {tabs.map((tab) => {
          const isActive = (selectedDomain || '') === tab.value;
          return (
            <button
              key={tab.value || 'all'}
              onClick={() => setSelectedDomain && setSelectedDomain(tab.value)}
              className={`target-domain-tab-btn ${isActive ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TargetDomainTabs;
