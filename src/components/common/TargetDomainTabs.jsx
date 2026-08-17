import React, { useEffect, useMemo } from 'react';
import { Lock } from 'lucide-react';
import './TargetDomainTabs.css';

const TargetDomainTabs = ({
  assignedDomains = [],
  scansList = [],
  selectedDomain = '',
  setSelectedDomain
}) => {
  const assignedList = Array.isArray(assignedDomains) ? assignedDomains : [];
  const scanTargets = useMemo(
    () => (Array.isArray(scansList) ? scansList.map(s => s.target).filter(Boolean) : []),
    [scansList]
  );
  const domainList = useMemo(
    () => Array.from(new Set([...scanTargets, ...assignedList].filter(Boolean))),
    [scanTargets, assignedList]
  );

  // When a module opens with no domain selected yet, default to the latest scanned domain
  useEffect(() => {
    if (!selectedDomain && domainList.length > 0 && setSelectedDomain) {
      const defaultDomain = scanTargets[0] || domainList[0];
      setSelectedDomain(defaultDomain);
    }
  }, [selectedDomain, domainList, scanTargets, setSelectedDomain]);

  const tabs = domainList.map(d => ({ label: d, value: d }));

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
