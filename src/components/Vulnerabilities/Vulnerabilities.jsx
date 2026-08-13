import React from 'react';
import OWASPScanUI from './OWASPScannerUI';
import './Vulnerabilities.css';

const Vulnerabilities = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  return (
    <OWASPScanUI
      activeScanId={activeScanId}
      assignedDomains={assignedDomains}
      selectedDomain={selectedDomain}
      setSelectedDomain={setSelectedDomain}
      scansList={scansList}
      handleSelectScan={handleSelectScan}
    />
  );
};

export default Vulnerabilities;
