import React from 'react';
import PortDashboard from './PortDashboard';
import PortTable from './PortTable';
import './PortScan.css';

const PortScan = () => {
  return (
    <div className="port-page-container">
      <div className="port-max-width">
        <PortDashboard />
        <PortTable />
      </div>
    </div>
  );
};

export default PortScan;
