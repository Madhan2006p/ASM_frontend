import React from 'react';
import { Lock } from 'lucide-react';
import './TargetDomainTabs.css';

const DEFAULT_DOMAINS = ['kct.ac.in', 'hackersinfotech.com'];

const TargetDomainTabs = ({
  assignedDomains = [],
  selectedDomain = '',
  setSelectedDomain
}) => {
  // Combine assigned domains with default required domains ensuring kct.ac.in & hackersinfotech.com are present
  const baseList = (Array.isArray(assignedDomains) && assignedDomains.length > 0)
    ? assignedDomains
    : DEFAULT_DOMAINS;

  const domainList = Array.from(new Set([...baseList, 'kct.ac.in', 'hackersinfotech.com']));

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
