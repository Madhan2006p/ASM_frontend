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
    const parseIssuer = (raw) => {
      if (!raw) return 'Unknown';
      const match = raw.match(/(?:organizationName|O)[=+]([^;]+)/i) || raw.match(/(?:commonName|CN)[=+]([^;]+)/i);
      return match ? match[1].trim() : raw.split(';')[0].split('+').pop().trim() || raw;
    };

    const mapCert = (c) => {
      const isError = c.cipher_suite?.startsWith('Connection error') || 
                      c.cipher_suite?.startsWith('SSL error') || 
                      c.cipher_suite?.startsWith('Error');

      let days = null;
      let expires = '—';
      
      let dateStr = c.expiry_date;
      if (!dateStr) {
        const defaultExp = new Date();
        defaultExp.setDate(defaultExp.getDate() + 90);
        const dd = String(defaultExp.getDate()).padStart(2, '0');
        const mm = String(defaultExp.getMonth() + 1).padStart(2, '0');
        const yyyy = defaultExp.getFullYear();
        dateStr = `${dd}-${mm}-${yyyy}`;
      }

      if (dateStr) {
        let parseableStr = dateStr;
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [dd, mm, yyyy] = dateStr.split('-');
          parseableStr = `${yyyy}-${mm}-${dd}`;
        }
        const expiry = new Date(parseableStr);
        if (!isNaN(expiry.getTime())) {
          const diffTime = expiry - new Date();
          days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          expires = dateStr;
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
        ? 'Healthy' 
        : (days === 0 ? 'Expired' : (days < 30 ? 'Expiring Soon' : 'Healthy'));

      const risk = isError 
        ? 'LOW' 
        : ((days === 0 || !c.is_trusted || c.ssl_grade === 'F') 
          ? 'CRITICAL' 
          : ((days !== null && days < 30 || c.ssl_grade === 'C' || c.ssl_grade === 'D') ? 'MEDIUM' : 'LOW'));

      return {
        id: c.id,
        domain: c.subdomain || c.domain || '—',
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
    };

    const fetchCerts = async () => {
      try {
        setLoading(true);
        let allMapped = [];
        const seenIds = new Set();

        if (selectedDomain && activeScanId) {
          // Specific domain: fetch from that scan only
          const data = await api.get(`/api/attacksurface/ssl-certificates/?scan=${activeScanId}`);
          const results = Array.isArray(data) ? data : (data.results || []);
          results.forEach(c => { if (!seenIds.has(c.id)) { seenIds.add(c.id); allMapped.push(mapCert(c)); } });
        } else if (!selectedDomain && scansList && scansList.length > 0) {
          // All Domains: fetch from ALL scans and combine
          for (const scan of scansList) {
            try {
              const data = await api.get(`/api/attacksurface/ssl-certificates/?scan=${scan.id}`);
              const results = Array.isArray(data) ? data : (data.results || []);
              results.forEach(c => { if (!seenIds.has(c.id)) { seenIds.add(c.id); allMapped.push(mapCert(c)); } });
            } catch (e) { /* skip failed */ }
          }
        }

        setCerts(allMapped);
      } catch (err) {
        console.error("Failed to fetch SSL certificates", err);
      } finally {
        setLoading(false);
      }
    };

    if (!selectedDomain && (!scansList || scansList.length === 0)) {
      setCerts([]);
      setLoading(false);
      return;
    }
    if (selectedDomain && !activeScanId) {
      setCerts([]);
      setLoading(false);
      return;
    }

    fetchCerts();
  }, [activeScanId, selectedDomain, scansList]);

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />
        <CertDashboard certs={certs} loading={loading} />
        <CertFindings certs={certs} loading={loading} />
        <CertificatesTable certs={certs} loading={loading} />
      </div>
    </div>
  );
};

export default Certificates;
