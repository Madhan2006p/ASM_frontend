import React from 'react';
import OWASPScannerUI from './OWASPScannerUI';

const Vulnerabilities = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  return (
    <OWASPScannerUI 
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
