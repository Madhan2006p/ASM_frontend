import React, { useState, useEffect } from 'react';
import { Shield, ChevronDown, ChevronUp, Server, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../utils/api';
import './EmailSecurity.css';
import { buildRecommendations } from './EmailSecurityRecommendations';

const StarttlsBadge = ({ starttls }) => {
  if (!starttls || !starttls.checked) {
    return (
      <span className="starttls-badge failed">
        <AlertTriangle size={14} /> Verification Failed
      </span>
    );
  }
  if (starttls.supported) {
    return (
      <span className="starttls-badge supported">
        <CheckCircle2 size={14} /> Supported
      </span>
    );
  }
  return (
    <span className="starttls-badge notsupported">
      <XCircle size={14} /> Not Supported
    </span>
  );
};

const EmailSecurity = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan, setActivePage, setEmailSecRec }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const domainList = Array.from(new Set(assignedDomains || []));

  useEffect(() => {
    if (!selectedDomain && domainList.length > 0) {
      setSelectedDomain(domainList[0]);
    }
  }, [selectedDomain, domainList, setSelectedDomain]);

  useEffect(() => {
    const loadEmailSecurity = async () => {
      if (!activeScanId && !selectedDomain) {
        setResult(null);
        return;
      }
      try {
        setLoading(true);
        const queryParam = activeScanId ? `scan=${activeScanId}` : `domain=${selectedDomain}`;
        const data = await api.get(`/api/attacksurface/email-security/?${queryParam}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        if (list.length > 0) {
          setResult(list[0]);
        } else {
          setResult(null);
        }
      } catch (e) {
        console.error('Failed to load email security findings', e);
        setResult(null);
      } finally {
        setLoading(false);
      }
    };
    loadEmailSecurity();
  }, [activeScanId, selectedDomain]);

  const hasRecord = (val) => {
    if (!val) return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  };

  const getRecordText = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.length > 0 ? val.join(' ') : '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const getScore = () => {
    if (!result) return { score: 0, grade: 'F' };
    let score = 0;
    if (hasRecord(result.spf)) score += 25;
    if (hasRecord(result.dmarc)) score += 25;
    if (hasRecord(result.dkim_default) || hasRecord(result.dkim_selector1)) score += 25;
    if (hasRecord(result.bimi)) score += 15;
    if (hasRecord(result.mx)) score += 10;
    
    let grade = 'B';
    if (score >= 90) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 50) grade = 'C';
    else if (score >= 30) grade = 'D';
    else grade = 'F';

    return { score, grade };
  };

  const { score, grade } = getScore();

  // Per-protocol recommendations derived from live result — no new API calls
  const allRecs = result ? buildRecommendations(result) : [];
  const getRecFor = (prefix) => allRecs.find(r => r.id.startsWith(prefix)) || null;
  const dmarcRec    = getRecFor('dmarc');
  const spfRec      = getRecFor('spf');
  const dkimRec     = getRecFor('dkim');
  const bimiRec     = getRecFor('bimi');
  const mxRec       = getRecFor('mx');
  const starttlsRec = getRecFor('starttls');

  // Navigate to the recommendation page for the selected module
  const viewRecommendation = (rec) => {
    if (!rec || !setActivePage || !setEmailSecRec) return;
    setEmailSecRec(rec);
    setActivePage('Email Security Recommendation');
  };

  const getStatusInfo = (hasRec, type, recordText = '') => {
    if (!hasRec) return { pill: 'Not Configured', className: 'notconfigured' };
    if (type === 'DMARC' && recordText && !recordText.toLowerCase().includes('p=reject')) {
      return { pill: 'Mis Configured', className: 'misconfigured' };
    }
    return { pill: 'Configured', className: 'configured' };
  };

  const truncate = (str, n) => {
    if (!str) return '';
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  const dmarcText = getRecordText(result?.dmarc);
  const spfText = getRecordText(result?.spf);
  const dkimText = getRecordText(result?.dkim_default) || getRecordText(result?.dkim_selector1);
  const bimiText = getRecordText(result?.bimi);

  const dmarcStatus = getStatusInfo(hasRecord(result?.dmarc), 'DMARC', dmarcText);
  const spfStatus = getStatusInfo(hasRecord(result?.spf), 'SPF', spfText);
  const dkimStatus = getStatusInfo(hasRecord(result?.dkim_default) || hasRecord(result?.dkim_selector1), 'DKIM', dkimText);
  const bimiStatus = getStatusInfo(hasRecord(result?.bimi), 'BIMI', bimiText);
  const mxStatus = getStatusInfo(hasRecord(result?.mx), 'MX');

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not Available';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB').replace(/\//g, '-');
    } catch {
      return 'Not Available';
    }
  };
  
  const discoverDate = result?.created_date ? formatDate(result.created_date) : (result ? formatDate(new Date()) : 'Not Available');
  const updateDate = result?.last_update_date ? formatDate(result.last_update_date) : (result ? formatDate(new Date()) : 'Not Available');

  const activeTargetDomain = selectedDomain || (domainList.length > 0 ? domainList[0] : (result?.domain || 'Unknown Domain'));

  return (
    <div className="email-security-v2">
      {domainList.length > 0 && (
        <div className="domain-tabs-v2">
          {domainList.map((d) => (
            <div
              key={d}
              className={`domain-tab-v2 ${selectedDomain === d || (!selectedDomain && d === domainList[0]) ? 'active' : ''}`}
              onClick={() => setSelectedDomain && setSelectedDomain(d)}
            >
              {d}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Loading email security data...</div>
      ) : result ? (
        <>
          <div className="top-cards-row">
            <div className="top-card score">
              <div className="score-number">{score}</div>
              <div className="score-badge">{grade}</div>
            </div>
            
            <div className="top-card dmarc">
              <div className={`status-pill ${dmarcStatus.className}`}>{dmarcStatus.pill}</div>
              <div className="top-card-title">DMARC</div>
            </div>

            <div className="top-card spf">
              <div className={`status-pill ${spfStatus.className}`}>{spfStatus.pill}</div>
              <div className="top-card-title">SPF</div>
            </div>

            <div className="top-card dkim">
              <div className={`status-pill ${dkimStatus.className}`}>{dkimStatus.pill}</div>
              <div className="top-card-title">DKIM</div>
            </div>

            <div className="top-card bimi">
              <div className={`status-pill ${bimiStatus.className}`}>{bimiStatus.pill}</div>
              <div className="top-card-title">BIMI</div>
            </div>

            <div className="top-card mx">
              <div className={`status-pill ${mxStatus.className}`}>{mxStatus.pill}</div>
              <div className="top-card-title">MX</div>
            </div>
          </div>

          <div className="details-grid">
            {/* DMARC */}
            <div className="detail-card">
              <div className="detail-icon-col">
                <Shield size={40} />
                <div className="detail-icon-title">DMARC</div>
              </div>
              <div className="detail-content">
                {dmarcStatus.className === 'notconfigured' ? (
                  <div className="detail-desc" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    We couldn't find a DMARC record associated with your domain.
                  </div>
                ) : (
                  <>
                    <div className="detail-desc">
                      Your domain has a DMARC record {dmarcStatus.className === 'misconfigured' ? 'with a policy that could be stricter.' : 'that is properly configured.'}
                    </div>
                    <div className="record-val-label">Record value</div>
                    <div className="record-val-box" onClick={() => toggleExpand('dmarc')} style={{ cursor: 'pointer' }}>
                      <span>{expanded.dmarc ? (dmarcText || 'No record text found') : (truncate(dmarcText, 40) || 'No record text found')}</span>
                      {expanded.dmarc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <div className="dates-row">
                      <div>Discover Date : <br/> {discoverDate}</div>
                      <div>Last Update Date : <br/> {updateDate}</div>
                    </div>
                  </>
                )}
                {dmarcRec && (
                  <div className="es-rec-btn-row">
                    <button className="es-view-rec-btn" onClick={() => viewRecommendation(dmarcRec)}>
                      View Recommendation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SPF */}
            <div className="detail-card">
              <div className="detail-icon-col">
                <Shield size={40} />
                <div className="detail-icon-title">SPF</div>
              </div>
              <div className="detail-content">
                {spfStatus.className === 'notconfigured' ? (
                  <div className="detail-desc" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    We couldn't find an SPF record associated with your domain.
                  </div>
                ) : (
                  <>
                    <div className="detail-desc">
                      Your domain has a valid SPF record. You can track, manage and level up your email authentication standards.
                    </div>
                    <div className="record-val-label">Record value</div>
                    <div className="record-val-box" onClick={() => toggleExpand('spf')} style={{ cursor: 'pointer' }}>
                      <span>{expanded.spf ? (spfText || 'No record text found') : (truncate(spfText, 40) || 'No record text found')}</span>
                      {expanded.spf ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <div className="dates-row">
                      <div>Discover Date : <br/> {discoverDate}</div>
                      <div>Last Update Date : <br/> {updateDate}</div>
                    </div>
                  </>
                )}
                {spfRec && (
                  <div className="es-rec-btn-row">
                    <button className="es-view-rec-btn" onClick={() => viewRecommendation(spfRec)}>
                      View Recommendation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* DKIM */}
            <div className="detail-card">
              <div className="detail-icon-col">
                <Shield size={40} />
                <div className="detail-icon-title">DKIM</div>
              </div>
              <div className="detail-content">
                {dkimStatus.className === 'notconfigured' ? (
                  <div className="detail-desc" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    We couldn't find a DKIM record associated with your domain.
                  </div>
                ) : (
                  <>
                    <div className="detail-desc">
                      Your domain has a valid DKIM record configured.
                    </div>
                    <div className="record-val-label">Record value</div>
                    <div className="record-val-box" onClick={() => toggleExpand('dkim')} style={{ cursor: 'pointer' }}>
                      <span>{expanded.dkim ? (dkimText || 'No record text found') : (truncate(dkimText, 40) || 'No record text found')}</span>
                      {expanded.dkim ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <div className="dates-row">
                      <div>Discover Date : <br/> {discoverDate}</div>
                      <div>Last Update Date : <br/> {updateDate}</div>
                    </div>
                  </>
                )}
                {dkimRec && (
                  <div className="es-rec-btn-row">
                    <button className="es-view-rec-btn" onClick={() => viewRecommendation(dkimRec)}>
                      View Recommendation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* BIMI */}
            <div className="detail-card">
              <div className="detail-icon-col">
                <Shield size={40} />
                <div className="detail-icon-title">BIMI</div>
              </div>
              <div className="detail-content">
                {bimiStatus.className === 'notconfigured' ? (
                  <div className="detail-desc" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                    We couldn't find a BIMI record associated with your domain.
                  </div>
                ) : (
                  <>
                    <div className="detail-desc">
                      Your domain has a valid BIMI record configured.
                    </div>
                    <div className="record-val-label">Record value</div>
                    <div className="record-val-box" onClick={() => toggleExpand('bimi')} style={{ cursor: 'pointer' }}>
                      <span>{expanded.bimi ? (bimiText || 'No record text found') : (truncate(bimiText, 40) || 'No record text found')}</span>
                      {expanded.bimi ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <div className="dates-row">
                      <div>Discover Date : <br/> {discoverDate}</div>
                      <div>Last Update Date : <br/> {updateDate}</div>
                    </div>
                  </>
                )}
                {bimiRec && (
                  <div className="es-rec-btn-row">
                    <button className="es-view-rec-btn" onClick={() => viewRecommendation(bimiRec)}>
                      View Recommendation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MX Records & STARTTLS */}
            <div className="detail-card full-width">
              <div className="detail-icon-col">
                <Server size={40} />
                <div className="detail-icon-title">MX & TLS</div>
              </div>
              <div className="detail-content" style={{ flexDirection: 'row', gap: '3rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="detail-desc">
                    Mail Exchange (MX) records direct email to servers for a domain.
                  </div>
                  <div className="record-val-label">Configured Mail Servers</div>
                  {hasRecord(result?.mx) ? (
                    (Array.isArray(result.mx) ? result.mx : [result.mx]).map((rec, i) => {
                      const parts = typeof rec === 'string' ? rec.split(' ') : [];
                      const displayPriority = i + 1;
                      const host = parts.length > 1 && !isNaN(parts[0]) ? parts.slice(1).join(' ') : rec;
                      return (
                        <div key={i} className="mx-record-item">
                          <div className="mx-priority-pill">{displayPriority}</div>
                          <div className="mx-host-text">{host}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="mx-record-item">
                      <div className="mx-host-text">No MX records published.</div>
                    </div>
                  )}
                  {mxRec && (
                    <div className="es-rec-btn-row" style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                      <button className="es-view-rec-btn" onClick={() => viewRecommendation(mxRec)}>
                        View Recommendation
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="detail-desc">
                    STARTTLS guarantees that emails are encrypted during transit between mail servers.
                  </div>
                  <div className="record-val-label" style={{ marginBottom: '1rem' }}>STARTTLS Support</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <StarttlsBadge starttls={result?.smtp_starttls} />
                    {result?.smtp_starttls && !result.smtp_starttls.checked && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verification failed. Server unreachable.</span>
                    )}
                  </div>
                  {starttlsRec && (
                    <div className="es-rec-btn-row" style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                      <button className="es-view-rec-btn" onClick={() => viewRecommendation(starttlsRec)}>
                        View Recommendation
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {activeScanId ? 'No email security data found for this scan.' : 'Select a target domain or scan to view email security results.'}
        </div>
      )}
    </div>
  );
};

export default EmailSecurity;
