import React from 'react';
import OWASPScanUI from './OWASPScannerUI';
import './Vulnerabilities.css';
import './OWASPScannerUI.css';

const Vulnerabilities = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  return (
    <OWASPScanUI
      assignedDomains={assignedDomains}
      selectedDomain={selectedDomain}
      setSelectedDomain={setSelectedDomain}
      scansList={scansList}
      handleSelectScan={handleSelectScan}
      activeScanId={activeScanId}
    />
  );
};

export default Vulnerabilities;
