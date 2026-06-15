import React from 'react';
import { Globe, Server, Lock } from 'lucide-react';
import './RecentAssetsTable.css';

const assets = [
  {
    id: 1,
    asset: 'api.acme-payments.com',
    type: 'Domain',
    value: '104.18.24.231',
    location: 'San Francisco, United States',
    flag: '🇺🇸',
    firstSeen: 'May 14, 2024',
    isNew: true,
    icon: <Globe size={16} className="asset-icon" />
  },
  {
    id: 2,
    asset: '198.51.100.23',
    type: 'IP Address',
    value: '198.51.100.23',
    location: 'Frankfurt, Germany',
    flag: '🇩🇪',
    firstSeen: 'May 14, 2024',
    isNew: true,
    icon: <Server size={16} className="asset-icon" />
  },
  {
    id: 3,
    asset: 'login.acme.com',
    type: 'Domain',
    value: '104.18.25.12',
    location: 'New York, United States',
    flag: '🇺🇸',
    firstSeen: 'May 14, 2024',
    isNew: true,
    icon: <Globe size={16} className="asset-icon" />
  },
  {
    id: 4,
    asset: '203.0.113.17',
    type: 'IP Address',
    value: '203.0.113.17',
    location: 'Singapore, Singapore',
    flag: '🇸🇬',
    firstSeen: 'May 14, 2024',
    isNew: true,
    icon: <Server size={16} className="asset-icon" />
  },
  {
    id: 5,
    asset: '*.acme-cdn.com',
    type: 'SSL Certificate',
    value: '*.acme-cdn.com',
    location: 'Dublin, Ireland',
    flag: '🇮🇪',
    firstSeen: 'May 14, 2024',
    isNew: true,
    icon: <Lock size={16} className="asset-icon" />
  }
];

const RecentAssetsTable = () => {
  return (
    <div className="recent-assets card">
      <div className="table-header">
        <h3 className="section-title">Recently Discovered Assets</h3>
        <span className="badge-new ml-2">New</span>
        <span className="count-label">1,257</span>
      </div>

      <div className="table-container">
        <table className="assets-table">
          <thead>
            <tr>
              <th>ASSET</th>
              <th>TYPE</th>
              <th>VALUE</th>
              <th>LOCATION</th>
              <th>FIRST SEEN</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((item) => (
              <tr key={item.id} className="table-row">
                <td>
                  <div className="asset-cell">
                    {item.icon}
                    <span className="asset-name">{item.asset}</span>
                    {item.isNew && <span className="badge-new">New</span>}
                  </div>
                </td>
                <td className="text-secondary">{item.type}</td>
                <td className="text-secondary">{item.value}</td>
                <td>
                  <div className="location-cell">
                    <span className="flag">{item.flag}</span>
                    <span className="text-secondary">{item.location}</span>
                  </div>
                </td>
                <td className="text-secondary">{item.firstSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-dots">
        <div className="dot active"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
};

export default RecentAssetsTable;
