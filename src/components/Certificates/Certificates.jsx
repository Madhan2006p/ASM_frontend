import React, { useState, useEffect } from 'react';
import CertDashboard from './CertDashboard';
import CertFindings from './CertFindings';
import CertificatesTable from './CertificatesTable';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const Certificates = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCerts = async () => {
      if (!activeScanId) {
        setCerts([]);
        return;
      }
      setLoading(true);
      try {
        const data = await api.get(`/api/attacksurface/ssl-certificates/?scan=${activeScanId}`);
        const results = Array.isArray(data) ? data : (data.results || []);
        
        // Map backend model to frontend structure
        const mapped = results.map(c => {
          let days = 90; // Default fallback
          if (c.expiry_date) {
            let dateStr = c.expiry_date;
            // Fix DD-MM-YYYY parsing bug (JS natively parses 01-08-2026 as Jan 8th instead of Aug 1st)
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
              const [dd, mm, yyyy] = dateStr.split('-');
              dateStr = `${yyyy}-${mm}-${dd}`;
            }
            const expiry = new Date(dateStr);
            if (!isNaN(expiry.getTime())) {
              const diffTime = expiry - new Date();
              days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            }
          }

          const type = !c.is_trusted 
            ? 'Self Signed' 
            : (c.issuer_name?.toLowerCase().includes('digicert') 
              ? 'OV' 
              : (c.issuer_name?.toLowerCase().includes('globalsign') 
                ? 'EV' 
                : 'DV'));

          const tls = c.cipher_suite?.includes('1.3') || c.cipher_suite?.includes('AES_256_GCM') 
            ? 'TLS 1.3' 
            : (c.cipher_suite?.includes('1.2') 
              ? 'TLS 1.2' 
              : (c.cipher_suite?.includes('1.0') || c.cipher_suite?.includes('1.1') 
                ? 'TLS 1.0' 
                : 'TLS 1.3'));

          const health = days === 0 
            ? 'Expired' 
            : (days < 30 ? 'Expiring Soon' : 'Healthy');

          const risk = (days === 0 || !c.is_trusted || c.ssl_grade === 'F') 
            ? 'CRITICAL' 
            : ((days < 30 || c.ssl_grade === 'C' || c.ssl_grade === 'D') ? 'MEDIUM' : 'LOW');

          return {
            id: c.id,
            domain: c.subdomain || c.domain,
            issuer: c.issuer_name || 'Unknown',
            type,
            tls,
            expires: c.expiry_date || '—',
            days,
            health,
            risk,
            sslGrade: c.ssl_grade || 'A',
            isTrusted: c.is_trusted
          };
        });

        setCerts(mapped);
      } catch (err) {
        console.error("Failed to fetch SSL certificates", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCerts();
  }, [activeScanId]);

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        <CertDashboard certs={certs} loading={loading} />
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
        <CertFindings certs={certs} loading={loading} />
        <CertificatesTable certs={certs} loading={loading} />
      </div>
    </div>
  );
};

export default Certificates;
