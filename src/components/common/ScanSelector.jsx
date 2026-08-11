import React from 'react';
import TargetDomainTabs from './TargetDomainTabs';

const ScanSelector = ({
  assignedDomains = [],
  selectedDomain,
  setSelectedDomain,
  scansList = [],
  activeScanId,
  handleSelectScan
}) => {
  return (
    <TargetDomainTabs
      assignedDomains={assignedDomains}
      selectedDomain={selectedDomain}
      setSelectedDomain={setSelectedDomain}
    />
  );
};

export default ScanSelector;
