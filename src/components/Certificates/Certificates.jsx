import React, { useState, useEffect, useMemo } from 'react';
import CertDashboard from './CertDashboard';
import CertificatesTable from './CertificatesTable';
import CertVulnerabilitiesTable from './CertVulnerabilitiesTable';
import NoCertificateTable from './NoCertificateTable';
import SSLDetailModal from './SSLDetailModal';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const Certificates = ({
  activeScanId,
  assignedDomains = [],
  selectedDomain: propSelectedDomain,
  setSelectedDomain: propSetSelectedDomain
}) => {
  // Main view switcher: 'Certificate' | 'SSL Vulnerability' | 'No Certificate'
  const [activeView, setActiveView] = useState('Certificate');

  // Top Domain Navigation selected tab
  const [localDomain, setLocalDomain] = useState('');
  const selectedDomain = propSelectedDomain !== undefined ? propSelectedDomain : localDomain;
  const setSelectedDomain = (domain) => {
    setLocalDomain(domain);
    if (propSetSelectedDomain) propSetSelectedDomain(domain);
  };

  // Data states (start empty — never show placeholder/mock data)
  const [certs, setCerts] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [noCerts, setNoCerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter selection states for Summary Cards
  const [selectedCertFilter, setSelectedCertFilter] = useState('overall'); // 'overall' | 'expired' | 'yetToExpire'
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

  // Modal inspection state
  const [selectedCertModal, setSelectedCertModal] = useState(null);

  // Fetch certificate & vulnerability data when activeScanId changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Fetch SSL certificates from backend
        const certEndpoint = activeScanId
          ? `/api/attacksurface/ssl-certificates/?scan=${activeScanId}`
          : `/api/attacksurface/ssl-certificates/`;
        const certData = await api.get(certEndpoint).catch(() => []);
        const certResults = Array.isArray(certData) ? certData : (certData.results || []);

        {
          const mappedCerts = certResults.map((c, idx) => {
            const isError = c.cipher_suite?.startsWith('Connection error') || c.cipher_suite?.startsWith('Error');
            let daysLeft = 0;
            let isExpired = false;
            if (c.expiry_date) {
              const parts = c.expiry_date.split('-');
              if (parts.length === 3) {
                const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (!isNaN(expiry.getTime())) {
                  const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
                  daysLeft = Math.max(0, diff);
                  if (expiry < new Date()) {
                    isExpired = true;
                  }
                }
              }
            } else if (c.days_left !== undefined) {
              daysLeft = c.days_left;
              if (daysLeft <= 0) isExpired = true;
            }

            const certStatus = isExpired ? 'Expired' : (isError ? 'Invalid' : (c.status || 'Valid'));

            return {
              id: c.id || `api-cert-${idx}`,
              sNo: idx + 1,
              domain: c.subdomain || c.domain,
              ip: c.ip || '—',
              rdns: c.rdns || '--',
              sslGrade: isError ? 'F' : (c.ssl_grade || 'A'),
              issuer: c.issuer_name || '—',
              expireDate: c.expiry_date || '—',
              purchaseDate: c.purchase_date || '—',
              expiry_date: c.expiry_date || '—',
              purchase_date: c.purchase_date || '—',
              validFrom: c.purchase_date || '—',
              validUntil: c.expiry_date || '—',
              status: certStatus,
              location: c.location || 'India',
              locationFlag: c.location?.includes('US') ? '🇺🇸' : '🇮🇳',
              created: c.created_at ? new Date(c.created_at).toLocaleDateString() : '—',
              updated: c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—',
              daysLeft,
              isTrusted: c.is_trusted !== undefined ? c.is_trusted : !isExpired,
              tlsVersion: isError ? 'None' : 'TLS 1.3',
              cipherSuite: c.cipher_suite || '—'
            };
          });

          setCerts(mappedCerts);
        }

        // Fetch SSL vulnerabilities from backend
        const vulnEndpoint = activeScanId
          ? `/api/attacksurface/vulnerabilities/?scan=${activeScanId}`
          : `/api/attacksurface/vulnerabilities/`;
        const vulnData = await api.get(vulnEndpoint).catch(() => []);
        const vulnResults = Array.isArray(vulnData) ? vulnData : (vulnData.results || []);
        
        const sslVulnsOnly = vulnResults.filter(v => 
          (v.finding && v.finding.toLowerCase().includes('ssl')) ||
          (v.template_id && v.template_id.toLowerCase().includes('ssl')) ||
          (v.vulnerability_id && v.vulnerability_id.toLowerCase().includes('ssl'))
        );

        {
          const mappedVulns = sslVulnsOnly.map((v, idx) => ({
            id: v.id || `api-vuln-${idx}`,
            sNo: idx + 1,
            vulnerability: v.finding || v.vulnerability_id || 'SSL Configuration Risk',
            domain: v.subdomain || v.domain || 'target.com',
            cveId: v.cve || 'N/A',
            severity: (v.severity || 'MEDIUM').toUpperCase(),
            description: v.description || 'SSL security vulnerability detected.',
            created: v.discovered_at ? new Date(v.discovered_at).toLocaleDateString() : '21-12-2024',
            updated: '20-03-2025'
          }));

          setVulnerabilities(mappedVulns);
        }

        // Fetch subdomains to derive targets without SSL certificates
        const subEndpoint = activeScanId
          ? `/api/attacksurface/subdomains/?scan=${activeScanId}`
          : `/api/attacksurface/subdomains/`;
        const subData = await api.get(subEndpoint).catch(() => []);
        const subResults = Array.isArray(subData) ? subData : (subData.results || []);

        const certDomains = new Set(certResults.map(c => (c.subdomain || c.domain || '').toLowerCase().trim()));
        const missingCerts = subResults.filter(s => {
          const d = (s.domain || s.subdomain || '').toLowerCase().trim();
          return d && !certDomains.has(d);
        });

        const mappedNoCerts = missingCerts.map((s, idx) => ({
          id: s.id || `no-cert-${idx}`,
          sNo: idx + 1,
          domain: s.domain || s.subdomain,
          ip: Array.isArray(s.ip) && s.ip.length > 0 ? s.ip.join(', ') : (s.ip || 'DNS Not Found'),
          status: 'Unencrypted (HTTP)',
          action: 'Issue Cert',
          teamAction: 'Unassigned',
          location: s.location || 'India',
          locationFlag: s.location?.includes('US') ? '🇺🇸' : '🇮🇳',
          created: s.created_at ? new Date(s.created_at).toLocaleDateString() : '—',
          updated: s.updated_at ? new Date(s.updated_at).toLocaleDateString() : '—'
        }));

        setNoCerts(mappedNoCerts);

      } catch (err) {
        console.error("Failed to load SSL certificates data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeScanId]);

  // Compute domain options for Top Domain Navigation bar (user-assigned domains only)
  const domainsList = useMemo(() => {
    const customDomains = (assignedDomains || []).map(d => typeof d === 'string' ? d : d.domain).filter(Boolean);
    return ['Overall', ...Array.from(new Set(customDomains))];
  }, [assignedDomains]);

  // Domain Filtered Datasets
  const domainFilteredCerts = useMemo(() => {
    if (selectedDomain === 'Overall') return certs;
    const cleanDomain = selectedDomain.toLowerCase().trim();
    return certs.filter(c => {
      const cDom = (c.domain || '').toLowerCase();
      return cDom === cleanDomain || cDom.endsWith('.' + cleanDomain) || cDom.includes(cleanDomain);
    });
  }, [certs, selectedDomain]);

  const domainFilteredVulns = useMemo(() => {
    if (selectedDomain === 'Overall') return vulnerabilities;
    const cleanDomain = selectedDomain.toLowerCase().trim();
    return vulnerabilities.filter(v => {
      const vDom = (v.domain || '').toLowerCase();
      return vDom === cleanDomain || vDom.endsWith('.' + cleanDomain) || vDom.includes(cleanDomain);
    });
  }, [vulnerabilities, selectedDomain]);

  const domainFilteredNoCerts = useMemo(() => {
    if (selectedDomain === 'Overall') return noCerts;
    const cleanDomain = selectedDomain.toLowerCase().trim();
    return noCerts.filter(n => {
      const nDom = (n.domain || '').toLowerCase();
      return nDom === cleanDomain || nDom.endsWith('.' + cleanDomain) || nDom.includes(cleanDomain);
    });
  }, [noCerts, selectedDomain]);

  // Helper to determine if a certificate is expired
  const isCertExpired = (c) => {
    if (c.daysLeft !== undefined && c.daysLeft <= 0) return true;
    const dStr = c.expiry_date || c.expireDate;
    if (dStr) {
      const parts = String(dStr).split('-');
      if (parts.length === 3) {
        const expDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(expDate.getTime())) {
          return expDate < new Date();
        }
      }
    }
    return false;
  };

  // Compute Summary Card Counts for Certificate View
  const certCounts = useMemo(() => {
    const total = domainFilteredCerts.length;
    const expired = domainFilteredCerts.filter(isCertExpired).length;
    const yetToExpire = Math.max(0, total - expired);

    return {
      overall: total,
      expired: expired,
      yetToExpire: yetToExpire
    };
  }, [domainFilteredCerts]);

  // Filter certs based on selectedCertFilter ('overall' | 'expired' | 'yetToExpire')
  const displayedCerts = useMemo(() => {
    if (selectedCertFilter === 'expired') {
      return domainFilteredCerts.filter(isCertExpired);
    }
    if (selectedCertFilter === 'yetToExpire') {
      return domainFilteredCerts.filter(c => !isCertExpired(c));
    }
    return domainFilteredCerts;
  }, [domainFilteredCerts, selectedCertFilter]);

  // Compute Status Card Counts for SSL Vulnerability View (Overall, Unreviewed, In Progress, Muted)
  const vulnCounts = useMemo(() => {
    const counts = {
      overall: domainFilteredVulns.length,
      unreviewed: 0,
      inProgress: 0,
      muted: 0
    };

    domainFilteredVulns.forEach((v) => {
      const st = (v.status || 'Unreviewed').toLowerCase().replace(/\s+/g, '');
      if (st.includes('unreview')) counts.unreviewed += 1;
      else if (st.includes('progress')) counts.inProgress += 1;
      else if (st.includes('mute')) counts.muted += 1;
      else counts.unreviewed += 1;
    });

    return counts;
  }, [domainFilteredVulns]);

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        <div style={{ marginBottom: '1.25rem' }}>
          <ScanSelector 
            assignedDomains={assignedDomains}
            selectedDomain={selectedDomain}
            setSelectedDomain={setSelectedDomain}
          />
        </div>
        <div className="ssl-module-wrapper">
          
          {/* Top Dashboard Navigation & Hero Summary Cards */}
          <CertDashboard
            domainsList={domainsList}
            selectedDomain={selectedDomain}
            setSelectedDomain={setSelectedDomain}
            activeView={activeView}
            setActiveView={setActiveView}
            certCounts={certCounts}
            selectedCertFilter={selectedCertFilter}
            setSelectedCertFilter={setSelectedCertFilter}
            vulnCounts={vulnCounts}
            selectedSeverityFilter={selectedSeverityFilter}
            setSelectedSeverityFilter={setSelectedSeverityFilter}
          />

          {/* Render Active View Table */}
          {activeView === 'Certificate' && (
            <CertificatesTable
              certs={displayedCerts}
              loading={loading}
              onSelectCert={(cert) => setSelectedCertModal(cert)}
            />
          )}

          {activeView === 'SSL Vulnerability' && (
            <CertVulnerabilitiesTable
              vulnerabilities={domainFilteredVulns}
              loading={loading}
              selectedSeverityFilter={selectedSeverityFilter}
            />
          )}

          {activeView === 'No Certificate' && (
            <NoCertificateTable
              noCerts={domainFilteredNoCerts}
              loading={loading}
            />
          )}

          {/* Certificate Detail Inspector Modal */}
          {selectedCertModal && (
            <SSLDetailModal
              cert={selectedCertModal}
              onClose={() => setSelectedCertModal(null)}
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default Certificates;
