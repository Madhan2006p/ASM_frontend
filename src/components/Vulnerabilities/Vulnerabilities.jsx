import React, { useState } from 'react';
import VulnerabilityDashboard from '../VulnerabilityManagement/VulnerabilityDashboard';
import MyVulnerabilities from '../VulnerabilityManagement/MyVulnerabilities';
import MyFindings from '../VulnerabilityManagement/MyFindings';
import CVEView from '../VulnerabilityManagement/CVEView';
import RemediationTracker from '../VulnerabilityManagement/RemediationTracker';
import { Activity, ShieldAlert, FileText, ShieldCheck, Layers } from 'lucide-react';
import './Vulnerabilities.css';

const Vulnerabilities = ({ activeScanId, assignedDomains, selectedDomain }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={16} /> },
    { id: 'vulnerabilities', label: 'My Vulnerabilities', icon: <ShieldAlert size={16} /> },
    { id: 'findings', label: 'My Findings', icon: <FileText size={16} /> },
    { id: 'cve', label: 'CVE View', icon: <ShieldCheck size={16} /> },
    { id: 'tracker', label: 'Task / Remediation Tracker', icon: <Layers size={16} /> },
  ];

  return (
    <div className="vulnerabilities-module-wrapper">
      {/* Top Module Sub-Navigation Bar */}
      <div className="vm-top-tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`vm-top-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Render */}
      <div className="vm-tab-content">
        {activeTab === 'dashboard' && <VulnerabilityDashboard />}
        {activeTab === 'vulnerabilities' && (
          <MyVulnerabilities
            activeScanId={activeScanId}
            assignedDomains={assignedDomains}
            selectedDomain={selectedDomain}
          />
        )}
        {activeTab === 'findings' && <MyFindings />}
        {activeTab === 'cve' && <CVEView />}
        {activeTab === 'tracker' && <RemediationTracker />}
      </div>
    </div>
  );
};

export default Vulnerabilities;
