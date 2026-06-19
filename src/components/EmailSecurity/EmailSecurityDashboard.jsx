import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, Server, RefreshCw } from 'lucide-react';
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
        setEmailSecurityData(list.length > 0 ? list[0] : null);
      } catch (err) {
        console.error('Failed to fetch email security stats', err);
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
        subtitle="High-level posture of your email security configurations (SPF, DMARC, MX) via checkdmarc."
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
        (() => {
          const spf_valid  = Array.isArray(emailSecurityData.spf)   && emailSecurityData.spf.length   > 0;
          const dmarc_valid = Array.isArray(emailSecurityData.dmarc) && emailSecurityData.dmarc.length > 0;
          const mx_valid   = Array.isArray(emailSecurityData.mx)    && emailSecurityData.mx.length    > 0;

          return (
            <div className="metrics-grid">
              <div className="metric-card-premium">
                <div className={`card-icon ${spf_valid ? 'green' : 'red'}`}><Mail size={24} /></div>
                <div className="card-info">
                  <h4>SPF Status</h4>
                  <div className="card-value">{spf_valid ? 'Valid' : 'Invalid'}</div>
                </div>
              </div>
              <div className="metric-card-premium">
                <div className={`card-icon ${dmarc_valid ? 'green' : 'red'}`}><ShieldCheck size={24} /></div>
                <div className="card-info">
                  <h4>DMARC Status</h4>
                  <div className="card-value">{dmarc_valid ? 'Valid' : 'Invalid'}</div>
                </div>
              </div>
              <div className="metric-card-premium">
                <div className={`card-icon ${mx_valid ? 'green' : 'red'}`}><Server size={24} /></div>
                <div className="card-info">
                  <h4>MX Records</h4>
                  <div className="card-value">{mx_valid ? 'Configured' : 'Missing'}</div>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="card" style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          No email security data available for the selected scan.
        </div>
      )}
    </div>
  );
};

export default EmailSecurityDashboard;

