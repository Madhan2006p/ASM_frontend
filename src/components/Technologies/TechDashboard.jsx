import React from 'react';
import './Technologies.css';
import PageHeaderCard from '../common/PageHeaderCard';

const TechDashboard = () => {
  return (
    <div>
      <PageHeaderCard 
        badgeText="INVENTORY"
        title="Technologies"
        subtitle="Track software versions, stack distribution, and End-of-Life projections."
      />
    </div>
  );
};

export default TechDashboard;
