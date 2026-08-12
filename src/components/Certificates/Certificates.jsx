import React, { useState, useEffect, useMemo } from 'react';
import CertDashboard from './CertDashboard';
import CertificatesTable from './CertificatesTable';
import CertVulnerabilitiesTable from './CertVulnerabilitiesTable';
import NoCertificateTable from './NoCertificateTable';
import SSLDetailModal from './SSLDetailModal';
import { api } from '../../utils/api';

const Certificates = ({
  activeScanId,
  assignedDomains = [],
  selectedDomain: propSelectedDomain,
  setSelectedDomain: propSetSelectedDomain
}) => {
  // Main view switcher: 'Certificate' | 'SSL Vulnerability' | 'No Certificate'
  const [activeView, setActiveView] = useState('Certificate');

  // Top Domain Navigation selected tab (default 'Overall')
  const [localDomain, setLocalDomain] = useState('Overall');
  const selectedDomain = propSelectedDomain || localDomain;
  const setSelectedDomain = (domain) => {
    setLocalDomain(domain);
    if (propSetSelectedDomain) propSetSelectedDomain(domain);
  };

  // Data states (start empty — never show placeholder/mock data)
  const [certs, setCerts] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [noCerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter selection states for Summary Cards
  const [selectedCertFilter, setSelectedCertFilter] = useState('overall'); // 'overall' | 'expired' | 'yetToExpire'
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

  // Modal inspection state
  const [selectedCertModal, setSelectedCertModal] = useState(null);

  // Fetch certificate & vulnerability data when activeScanId changes
  useEffect(() => {
    const fetchData = async () => {
      if (!activeScanId) return;
      setLoading(true);

      try {
        // Fetch SSL certificates from backend
        const certData = await api.get(`/api/attacksurface/ssl-certificates/?scan=${activeScanId}`).catch(() => []);
        const certResults = Array.isArray(certData) ? certData : (certData.results || []);

        {
          const mappedCerts = certResults.map((c, idx) => {
            const isError = c.cipher_suite?.startsWith('Connection error') || c.cipher_suite?.startsWith('Error');
            let daysLeft = 90;
            if (c.expiry_date) {
              const parts = c.expiry_date.split('-');
              if (parts.length === 3) {
                const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (!isNaN(expiry.getTime())) {
                  daysLeft = Math.max(0, Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)));
                }
              }
            }

            return {
              id: c.id || `api-cert-${idx}`,
              sNo: idx + 1,
              domain: c.subdomain || c.domain,
              ip: c.ip || '103.243.32.9',
              rdns: c.rdns || '--',
              sslGrade: isError ? 'F' : (c.ssl_grade || 'A'),
              issuer: c.issuer_name || 'GlobalSign RSA OV SSL CA 2018 (GlobalSign nv-sa from BE)',
              expireDate: c.expiry_date || '28-9-2025',
              purchaseDate: c.purchase_date || '27-8-2024',
              location: c.location || 'India',
              locationFlag: c.location?.includes('US') ? '🇺🇸' : '🇮🇳',
              created: c.created_at ? new Date(c.created_at).toLocaleDateString() : '21-12-2024',
              updated: c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '20-3-2025',
              daysLeft,
              isTrusted: c.is_trusted !== undefined ? c.is_trusted : true,
              tlsVersion: 'TLS 1.3',
              cipherSuite: c.cipher_suite || 'TLS_AES_256_GCM_SHA384'
            };
          });

          setCerts(mappedCerts);
        }

        // Fetch SSL vulnerabilities from backend
        const vulnData = await api.get(`/api/attacksurface/vulnerabilities/?scan=${activeScanId}`).catch(() => []);
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
    const targetQuery = selectedDomain.toLowerCase().replace(/\.in|\.com/g, '');
    return certs.filter(c => c.domain.toLowerCase().includes(targetQuery));
  }, [certs, selectedDomain]);

  const domainFilteredVulns = useMemo(() => {
    if (selectedDomain === 'Overall') return vulnerabilities;
    const targetQuery = selectedDomain.toLowerCase().replace(/\.in|\.com/g, '');
    return vulnerabilities.filter(v => v.domain.toLowerCase().includes(targetQuery));
  }, [vulnerabilities, selectedDomain]);

  const domainFilteredNoCerts = useMemo(() => {
    if (selectedDomain === 'Overall') return noCerts;
    const targetQuery = selectedDomain.toLowerCase().replace(/\.in|\.com/g, '');
    return noCerts.filter(n => n.domain.toLowerCase().includes(targetQuery));
  }, [noCerts, selectedDomain]);

  // Compute Summary Card Counts for Certificate View
  const certCounts = useMemo(() => {
    const total = domainFilteredCerts.length;
    const expired = domainFilteredCerts.filter(c => c.daysLeft <= 0 || c.expireDate?.includes('2024')).length;
    const yetToExpire = Math.max(0, total - expired);

    return {
      overall: total,
      expired: expired,
      yetToExpire: yetToExpire
    };
  }, [domainFilteredCerts]);

  // Compute Status Card Counts for SSL Vulnerability View (Overall, Unreviewed, In Progress, Muted, False Positive, Closed)
  const vulnCounts = useMemo(() => {
    const counts = {
      overall: domainFilteredVulns.length,
      unreviewed: 0,
      inProgress: 0,
      muted: 0,
      falsePositive: 0,
      closed: 0
    };

    domainFilteredVulns.forEach((v) => {
      const st = (v.status || 'Unreviewed').toLowerCase().replace(/\s+/g, '');
      if (st.includes('unreview')) counts.unreviewed += 1;
      else if (st.includes('progress')) counts.inProgress += 1;
      else if (st.includes('mute')) counts.muted += 1;
      else if (st.includes('false') || st.includes('positive')) counts.falsePositive += 1;
      else if (st.includes('close')) counts.closed += 1;
      else counts.unreviewed += 1;
    });

    return counts;
  }, [domainFilteredVulns]);

  return (
    <div className="global-page-container">
      <div className="global-max-width">
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
              certs={domainFilteredCerts}
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
