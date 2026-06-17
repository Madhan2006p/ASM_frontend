import React from 'react';
import { ShieldCheck, AlertCircle, ShieldAlert } from 'lucide-react';

const CertificateCards = () => {
  return (
    <div className="certificate-cards">
      {/* Purple Card - Total Certificates */}
      <div className="cert-card purple-card">
        <div className="cert-card-header">
          <div className="icon-wrapper">
            <ShieldCheck size={20} />
          </div>
          <span className="cert-card-title">TOTAL CERTIFICATES</span>
        </div>
        <div className="cert-card-value">1,014</div>
        <div className="cert-card-subtitle">Active across infrastructure</div>
      </div>

      {/* Green Card - Valid Certificates */}
      <div className="cert-card green-card">
        <div className="cert-card-header">
          <div className="icon-wrapper">
            <ShieldCheck size={20} />
          </div>
          <span className="cert-card-title">VALID CERTIFICATES</span>
        </div>
        <div className="cert-card-value">982</div>
        <div className="cert-card-subtitle">Fully secured</div>
      </div>

      {/* Orange Card - Expiring Soon */}
      <div className="cert-card orange-card">
        <div className="cert-card-header">
          <div className="icon-wrapper">
            <AlertCircle size={20} />
          </div>
          <span className="cert-card-title">EXPIRING SOON</span>
        </div>
        <div className="cert-card-value">32</div>
        <div className="cert-card-subtitle">Needs attention within 30 days</div>
      </div>
    </div>
  );
};

export default CertificateCards;
