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

        const formatDate = (dateStr) => {
          if (!dateStr) return '—';
          try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr).split('T')[0] || '—';
            return d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);
          } catch {
            return '—';
          }
        };

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
            const createdStr = formatDate(c.created_date || c.created_at);
            const updatedStr = formatDate(c.updated_date || c.updated_at);

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
              created: createdStr,
              updated: updatedStr,
              created_date: c.created_date || c.created_at,
              updated_date: c.updated_date || c.updated_at,
              created_at: c.created_at,
              updated_at: c.updated_at,
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
        
        const sslKeywords = ['ssl', 'tls', 'cipher', 'certificate', 'hsts', 'poodle', 'beast', 'heartbleed', 'robot', 'sweet32', 'drown', 'logjam', 'freak', 'crime', 'breach', 'renegotiation', 'sni', 'ocsp'];
        const isSslRelated = (v) => {
          const text = `${v.finding || ''} ${v.template_id || ''} ${v.vulnerability_id || ''} ${v.description || ''}`.toLowerCase();
          return sslKeywords.some(kw => text.includes(kw));
        };

        const sslVulnsFromDb = vulnResults.filter(isSslRelated);
        const mappedVulnsList = [];
        const seenVulnKeys = new Set();

        // 1. Add DB Vulnerabilities
        sslVulnsFromDb.forEach((v, idx) => {
          const dom = v.subdomain || v.domain || 'target.com';
          const title = v.finding || v.vulnerability_id || 'SSL Configuration Risk';
          const key = `${dom}::${title}`.toLowerCase();
          if (!seenVulnKeys.has(key)) {
            seenVulnKeys.add(key);
            mappedVulnsList.push({
              id: v.id || `api-vuln-${idx}`,
              sNo: mappedVulnsList.length + 1,
              vulnerability: title,
              domain: dom,
              ip: '—',
              sslGrade: 'C',
              cveId: v.cve || 'N/A',
              severity: (v.severity || 'MEDIUM').toUpperCase(),
              status: v.finding_status || 'Open',
              description: v.description || 'SSL/TLS security misconfiguration detected.',
              created: formatDate(v.discovered_at || v.created_at),
              updated: formatDate(v.discovered_at || v.created_at),
              created_date: v.discovered_at || v.created_at,
              updated_date: v.discovered_at || v.created_at,
            });
          }
        });

        // 2. Derive SSL/TLS Misconfigurations from Certificate scan results
        certResults.forEach((c) => {
          const dom = c.subdomain || c.domain || '';
          if (!dom) return;
          const ip = c.ip || '—';
          const grade = c.ssl_grade || 'B';
          const createdDate = c.created_date || c.created_at;
          const updatedDate = c.updated_date || c.updated_at;

          const addMisconfig = (title, severity, desc) => {
            const key = `${dom}::${title}`.toLowerCase();
            if (!seenVulnKeys.has(key)) {
              seenVulnKeys.add(key);
              mappedVulnsList.push({
                id: `misconfig-${dom}-${title}`.replace(/[^a-zA-Z0-9-]/g, '_'),
                sNo: mappedVulnsList.length + 1,
                vulnerability: title,
                domain: dom,
                ip: ip,
                sslGrade: grade,
                cveId: 'N/A',
                severity: severity.toUpperCase(),
                status: 'Open',
                description: desc,
                created: formatDate(createdDate),
                updated: formatDate(updatedDate),
                created_date: createdDate,
                updated_date: updatedDate,
              });
            }
          };

          // Check if expired
          if (c.expiry_date) {
            const parts = c.expiry_date.split('-');
            if (parts.length === 3) {
              const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              if (!isNaN(expiry.getTime()) && expiry < new Date()) {
                addMisconfig('Expired SSL/TLS Certificate', 'HIGH', `Certificate expired on ${c.expiry_date}. Clients will encounter security warnings.`);
              }
            }
          }
          if (c.days_left !== undefined && c.days_left <= 0) {
            addMisconfig('Expired SSL/TLS Certificate', 'HIGH', 'Certificate has passed its validity period.');
          }

          // Check if untrusted
          if (c.is_trusted === false) {
            addMisconfig('Untrusted / Self-Signed SSL Certificate', 'HIGH', 'Certificate is self-signed or not signed by a recognized Certificate Authority.');
          }

          // Check domain alignment
          if (c.domain_aligned === false) {
            addMisconfig('Certificate Hostname Mismatch (SAN Mismatch)', 'MEDIUM', `Certificate Common Name / SAN does not match host "${dom}".`);
          }

          // Check weak ciphers
          if (c.weak_ciphers && Array.isArray(c.weak_ciphers) && c.weak_ciphers.length > 0) {
            c.weak_ciphers.forEach(wc => {
              addMisconfig(`Weak Cipher Suite: ${wc}`, 'HIGH', `Server supports insecure/deprecated cipher suite (${wc}).`);
            });
          }

          // Check certificate vulnerabilities array
          if (c.vulnerabilities && Array.isArray(c.vulnerabilities) && c.vulnerabilities.length > 0) {
            c.vulnerabilities.forEach(cv => {
              addMisconfig(String(cv), 'MEDIUM', `SSL/TLS audit finding: ${cv}`);
            });
          }

          // Check poor SSL grade
          if (['C', 'D', 'E', 'F'].includes((c.ssl_grade || '').toUpperCase())) {
            addMisconfig(`Suboptimal SSL Grade (${c.ssl_grade})`, 'MEDIUM', `Server received a low SSL/TLS grade (${c.ssl_grade}) due to security parameter weakness.`);
          }
        });

        // Re-number sNo
        mappedVulnsList.forEach((item, i) => { item.sNo = i + 1; });
        setVulnerabilities(mappedVulnsList);

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
          created: formatDate(s.created_date || s.created_at),
          updated: formatDate(s.updated_date || s.updated_at),
          created_date: s.created_date || s.created_at,
          updated_date: s.updated_date || s.updated_at,
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
