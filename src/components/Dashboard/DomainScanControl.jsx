import React from 'react';
import { Monitor } from 'lucide-react';
import './DomainScanControl.css';

const DomainScanControl = () => {
  return (
    <div className="domain-scan-section card">
      <div className="scan-header">
        <h3 className="section-title">Domain Scan Control</h3>
        <span className="scan-subtitle">Manage scan schedules and run quick scans on your admin-assigned domains.</span>
      </div>

      <div className="scan-empty-state">
        <Monitor size={24} className="empty-icon" />
        <p className="empty-text">No domains assigned yet. Contact your admin to get domains assigned to your account.</p>
      </div>

      <div className="monitored-domains-wrapper">
        <h4 className="sub-section-title">Monitored Domains</h4>
        
        <div className="scan-table-container">
          <table className="scan-table">
            <thead>
              <tr>
                <th>DOMAIN</th>
                <th>MORNING SCAN</th>
                <th>NIGHT SCAN</th>
                <th>LAST MORNING</th>
                <th>LAST NIGHT</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="6" className="table-empty-state">
                  No domains added yet. Add a domain above to schedule and scan it.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DomainScanControl;
