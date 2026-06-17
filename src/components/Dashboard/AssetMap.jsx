import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
} from 'react-simple-maps';
import { Plus, Minus, Maximize } from 'lucide-react';
import './AssetMap.css';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Sample coordinates for bubbles (long, lat)
const markers = [
  { coordinates: [-122.4194, 37.7749], size: 8 }, // SF
  { coordinates: [-74.006, 40.7128], size: 12 },  // NY
  { coordinates: [-0.1276, 51.5074], size: 10 },  // London
  { coordinates: [13.4050, 52.5200], size: 6 },   // Berlin
  { coordinates: [103.8198, 1.3521], size: 9 },   // Singapore
  { coordinates: [151.2093, -33.8688], size: 5 }, // Sydney
  { coordinates: [77.2090, 28.6139], size: 14 },  // New Delhi
  { coordinates: [-43.1729, -22.9068], size: 4 }, // Rio
  { coordinates: [139.6917, 35.6895], size: 11 }, // Tokyo
  { coordinates: [37.6173, 55.7558], size: 5 },   // Moscow
];

const AssetMap = () => {
  return (
    <div className="asset-map card">
      <div className="map-header">
        <h3 className="section-title">Asset Distribution</h3>
        <button className="icon-btn"><Maximize size={16}/></button>
      </div>

      <div className="map-container">
        {/* Map Controls */}
        <div className="map-controls">
          <button className="control-btn"><Plus size={16} /></button>
          <div className="divider"></div>
          <button className="control-btn"><Minus size={16} /></button>
        </div>

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-title">Asset Count</div>
          <div className="legend-item">
            <span className="dot dot-1"></span> 1 - 10
          </div>
          <div className="legend-item">
            <span className="dot dot-2"></span> 11 - 100
          </div>
          <div className="legend-item">
            <span className="dot dot-3"></span> 101 - 1,000
          </div>
          <div className="legend-item">
            <span className="dot dot-4"></span> 1,001 - 10,000
          </div>
          <div className="legend-item">
            <span className="dot dot-5"></span> 10,000+
          </div>
        </div>

        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 120 }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#E2E8F0"
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#CBD5E1", outline: "none" },
                    pressed: { fill: "#CBD5E1", outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {markers.map(({ coordinates, size }, i) => (
            <Marker key={i} coordinates={coordinates}>
              <circle 
                r={size} 
                fill="var(--brand-primary)" 
                opacity={0.6} 
                stroke="var(--brand-primary-light)"
                strokeWidth={2}
                style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                className="map-bubble"
              />
            </Marker>
          ))}
        </ComposableMap>
      </div>
    </div>
  );
};

export default AssetMap;
