import React from 'react';
import { Globe } from 'lucide-react';
import './DiscoveryCards.css';

const DiscoveryCards = () => {
  return (
    <div className="discovery-cards">
      <div className="discovery-card card">
        <div className="discovery-card-content">
          <div>
            <div className="card-title-muted">Total Assets</div>
            <div className="card-value-large">1,248</div>
          </div>
          <div className="icon-wrapper-blue">
            <Globe size={24} />
          </div>
        </div>
      </div>

      <div className="discovery-card card">
        <div className="discovery-card-content justify-start">
          <div className="status-dot green-dot"></div>
          <div>
            <div className="card-title-muted">Live Assets</div>
            <div className="card-value-large">842</div>
          </div>
        </div>
      </div>

      <div className="discovery-card card">
        <div className="discovery-card-content justify-start">
          <div className="status-dot blue-dot"></div>
          <div>
            <div className="card-title-muted">New Assets</div>
            <div className="card-value-large">37</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryCards;
