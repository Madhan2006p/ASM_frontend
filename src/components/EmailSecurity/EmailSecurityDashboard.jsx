import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, XCircle, RefreshCw, Server } from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import '../InternalDiscovery/InternalDashboard.css';

const EmailSecurityDashboard = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [loading, setLoading] = useState(false);
  const [emailSecurityData, setEmailSecurityData] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!activeScanId) {
        setEmailSecurityData(null);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/email-security/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        if (list.length > 0) {
          setEmailSecurityData(list[0]);
        } else {
          setEmailSecurityData(null);
        }
      } catch (err) {
        console.error("Failed to fetch email security stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [activeScanId]);

  return (
    <div className="internal-dashboard-container">
      <PageHeaderCard
        badgeText="EMAIL SECURITY"
        title="Email Security Dashboard"
        subtitle="High-level posture of your email security configurations (SPF, DMARC, DKIM)."
      />

      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Loading dashboard...
        </div>
      ) : emailSecurityData ? (
        <>
          <div className="metrics-grid">
            <div className="metric-card-premium">
              <div className={`card-icon ${emailSecurityData.spf_valid ? 'green' : 'red'}`}><Mail size={24} /></div>
              <div className="card-info">
                <h4>SPF Status</h4>
                <div className="card-value">{emailSecurityData.spf_valid ? 'Valid' : 'Invalid'}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className={`card-icon ${emailSecurityData.dmarc_valid ? 'green' : 'red'}`}><ShieldCheck size={24} /></div>
              <div className="card-info">
                <h4>DMARC Status</h4>
                <div className="card-value">{emailSecurityData.dmarc_valid ? 'Valid' : 'Invalid'}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className={`card-icon ${emailSecurityData.dkim_valid ? 'green' : 'red'}`}><ShieldCheck size={24} /></div>
              <div className="card-info">
                <h4>DKIM Status</h4>
                <div className="card-value">{emailSecurityData.dkim_valid ? 'Valid' : 'Invalid'}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className={`card-icon ${emailSecurityData.open_relay ? 'red' : 'green'}`}><Server size={24} /></div>
              <div className="card-info">
                <h4>Open Relay</h4>
                <div className="card-value">{emailSecurityData.open_relay ? 'Vulnerable' : 'Secure'}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          No email security data available for the selected scan.
        </div>
      )}
    </div>
  );
};

export default EmailSecurityDashboard;
