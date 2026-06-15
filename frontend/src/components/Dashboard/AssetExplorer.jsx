import React, { useState } from 'react';
import './AssetExplorer.css';

const AssetExplorer = () => {
  const [activeTab, setActiveTab] = useState('Web Entities');
  
  const tabs = ['Web Entities', 'Storage Buckets', 'Certificates', 'Software'];

  return (
    <div className="asset-explorer-section card">
      <div className="explorer-header">
        <h3 className="section-title">Asset & Environment Explorer</h3>
        <p className="explorer-subtitle">Explore your discovered cloud assets, software inventories, SSL profiles, and risk trends.</p>
      </div>

      <div className="explorer-tabs">
        {tabs.map(tab => (
          <button 
            key={tab} 
            className={`explorer-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <hr className="explorer-divider" />

      <div className="explorer-table-container">
        <table className="explorer-table">
          <thead>
            <tr>
              <th>HTTP URL</th>
              <th>SUBDOMAIN</th>
              <th>HTTP STATUS</th>
              <th>CONTENT TYPE</th>
              <th>TITLE</th>
              <th>TECHNOLOGIES</th>
              <th>LAST SCAN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="7" className="table-empty-state">
                No web entities found. Start a scan to add.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetExplorer;
