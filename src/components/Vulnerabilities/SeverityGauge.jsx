import React from 'react';

const SeverityGauge = ({ score, label }) => {
  // Use a precise semi-circle path
  // Center is (100, 100), Radius is 60.
  // Start at (40, 100), sweep up to (160, 100).
  const arcPath = "M 30 100 A 70 70 0 0 1 170 100";
  const strokeWidth = 12;

  // We have 4 segments: Low (green), Medium (yellow), High (orange), Critical (red)
  // With pathLength="100", each segment gets 25 units. We use 23 for a 2-unit gap.
  const segments = [
    { color: '#00B894', offset: 0 },         // Green
    { color: '#FDCB6E', offset: -25 },       // Yellow
    { color: '#E17055', offset: -50 },       // Orange
    { color: '#D63031', offset: -75 },       // Red
  ];

  return (
    <div className="severity-gauge-wrapper">
      <svg width="200" height="120" viewBox="0 0 200 120" className="gauge-svg">
        {/* Background Track */}
        <path 
          d={arcPath} 
          fill="none" 
          stroke="#F1F2F6" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round"
        />
        
        {/* Colored Segments */}
        {segments.map((seg, i) => (
          <path 
            key={i}
            d={arcPath}
            fill="none" 
            stroke={seg.color} 
            strokeWidth={strokeWidth} 
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="23 100"
            strokeDashoffset={seg.offset}
          />
        ))}

        {/* Center Text */}
        <text x="100" y="85" textAnchor="middle" className="gauge-score">{score}</text>
        <text x="100" y="105" textAnchor="middle" className="gauge-label">{label}</text>
      </svg>
      <div className="gauge-footer">CVSS</div>
    </div>
  );
};

export default SeverityGauge;
