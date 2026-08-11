import React from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onNavigate }) => {
  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="landing-logo">
          <Shield className="landing-logo-icon" size={28} />
          <span className="landing-logo-text">Infotech Sentinel</span>
        </div>
      </nav>

      <main className="landing-main">
        <div className="landing-hero">
          <div className="landing-badge">Advanced Security Posture Management</div>
          <h1 className="landing-title">
            Discover, Monitor, and Protect Your Digital Attack Surface
          </h1>
          <p className="landing-subtitle">
            Continuous asset discovery and vulnerability management.
            Take control of your external attack surface with automated scanning and real-time alerts.
          </p>
          <div className="landing-cta-group">
            <button className="landing-btn-primary" onClick={() => onNavigate('login')}>
              Access Platform <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
