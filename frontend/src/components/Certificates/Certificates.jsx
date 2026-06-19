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
        
        // Helper to clean up issuer names (e.g. "countryName+US; organizationName+Let's Encrypt; commonName+YE1" -> "Let's Encrypt")
        const parseIssuer = (raw) => {
          if (!raw) return 'Unknown';
          const match = raw.match(/(?:organizationName|O)[=+]([^;]+)/i) || raw.match(/(?:commonName|CN)[=+]([^;]+)/i);
          return match ? match[1].trim() : raw.split(';')[0].split('+').pop().trim() || raw;
        };

        // Map backend model to frontend structure
        const mapped = results.map(c => {
          const isError = c.cipher_suite?.startsWith('Connection error') || 
                          c.cipher_suite?.startsWith('SSL error') || 
                          c.cipher_suite?.startsWith('Error');

          let days = null; // Use null for unknown days
          let expires = '—';
          if (!isError && c.expiry_date) {
            let dateStr = c.expiry_date;
            // Fix DD-MM-YYYY parsing bug
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
              const [dd, mm, yyyy] = dateStr.split('-');
              dateStr = `${yyyy}-${mm}-${dd}`;
            }
            const expiry = new Date(dateStr);
            if (!isNaN(expiry.getTime())) {
              const diffTime = expiry - new Date();
              days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
              expires = c.expiry_date;
            }
          }

          const type = isError 
            ? '—'
            : (!c.is_trusted 
              ? 'Self Signed' 
              : (c.issuer_name?.toLowerCase().includes('digicert') 
                ? 'OV' 
                : (c.issuer_name?.toLowerCase().includes('globalsign') 
                  ? 'EV' 
                  : 'DV')));

          const tls = isError
            ? '—'
            : (c.cipher_suite?.includes('1.3') || c.cipher_suite?.includes('AES_256_GCM') 
              ? 'TLS 1.3' 
              : (c.cipher_suite?.includes('1.2') 
                ? 'TLS 1.2' 
                : (c.cipher_suite?.includes('1.0') || c.cipher_suite?.includes('1.1') 
                  ? 'TLS 1.0' 
                  : 'TLS 1.3')));

          const health = days === null 
            ? 'Unknown' 
            : (days === 0 ? 'Expired' : (days < 30 ? 'Expiring Soon' : 'Healthy'));

          const risk = isError 
            ? 'LOW' 
            : ((days === 0 || !c.is_trusted || c.ssl_grade === 'F') 
              ? 'CRITICAL' 
              : ((days !== null && days < 30 || c.ssl_grade === 'C' || c.ssl_grade === 'D') ? 'MEDIUM' : 'LOW'));

          return {
            id: c.id,
            domain: c.subdomain || c.domain,
            issuer: isError ? '—' : parseIssuer(c.issuer_name),
            type,
            tls,
            cipher: c.cipher_suite || 'Unknown',
            expires,
            days,
            health,
            risk,
            sslGrade: isError ? '—' : (c.ssl_grade || 'A'),
            isTrusted: isError ? true : c.is_trusted
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
