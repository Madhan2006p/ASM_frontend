import React from 'react';
import { Activity } from 'lucide-react';
import './RecentActivity.css';

const RecentActivity = () => {
  return (
    <div className="recent-activity-section">
      <div className="table-header">
        <h3 className="section-title">Recent Activity</h3>
      </div>
      <div className="activity-container">
        <div className="activity-empty">
          <div className="activity-empty-icon">
            <Activity size={18} />
          </div>
          <p>No recent activity to display</p>
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
