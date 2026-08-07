import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Search,
  Download, Filter, ShieldAlert, GitMerge, X, ArrowRight, Eye, CheckCircle2
} from 'lucide-react';

/* Node Type styling and icons map */
const NODE_TYPES = {
  Internet:            { icon: '🌐', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: '#3b82f6' },
  Domain:              { icon: '🎯', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   border: '#06b6d4' },
  Subdomain:           { icon: '💻', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  border: '#8b5cf6' },
  IP:                  { icon: '🖥️', color: '#a855f7', bg: 'rgba(168,85,247,0.15)',  border: '#a855f7' },
  'Open Port':         { icon: '🔌', color: '#f97316', bg: 'rgba(249,115,22,0.15)',  border: '#f97316' },
  'Running Service':   { icon: '⚙️', color: '#eab308', bg: 'rgba(234,179,8,0.15)',   border: '#eab308' },
  Technology:          { icon: '🛠', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   border: '#06b6d4' },
  Endpoint:            { icon: '🔗', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: '#3b82f6' },
  Vulnerability:       { icon: '🚨', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: '#ef4444' },
  Misconfiguration:    { icon: '⚠️', color: '#f97316', bg: 'rgba(249,115,22,0.15)',  border: '#f97316' },
  'Credential Exposure':{ icon: '🔑', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: '#ef4444' },
  'Admin Panel':       { icon: '🔐', color: '#eab308', bg: 'rgba(234,179,8,0.15)',   border: '#eab308' },
  Database:            { icon: '🗄️', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: '#ef4444' },
  'Critical Asset':    { icon: '💎', color: '#ef4444', bg: 'rgba(239,68,68,0.2)',    border: '#ef4444' },
  'Business Asset':    { icon: '🏢', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  border: '#8b5cf6' },
};

const getNodeStyle = (type) => NODE_TYPES[type] || NODE_TYPES.Subdomain;

const AttackGraph = ({ analysisData, selectedPath, onClearSelectedPath }) => {
  const { graphNodes, graphEdges, attackPaths } = analysisData;

  const [zoom, setZoom]               = useState(1);
  const [pan, setPan]                 = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning]     = useState(false);
  const [startPan, setStartPan]       = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightPathId, setHighlightPathId] = useState(selectedPath?.id || null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend]   = useState(true);

  const containerRef = useRef(null);
  const svgRef       = useRef(null);

  useEffect(() => {
    if (selectedPath) {
      setHighlightPathId(selectedPath.id);
    }
  }, [selectedPath]);

  /* Calculate auto-layout node coordinates in layered columns */
  const layoutData = useMemo(() => {
    if (!graphNodes || graphNodes.length === 0) return { nodes: [], edges: [] };

    // Group nodes into layers
    const layerMap = {
      Internet: 0,
      Domain: 1,
      Subdomain: 2,
      IP: 2,
      'Open Port': 3,
      'Running Service': 3,
      Technology: 4,
      Endpoint: 5,
      Vulnerability: 5,
      Misconfiguration: 5,
      'Credential Exposure': 5,
      'Admin Panel': 6,
      Database: 6,
      'Critical Asset': 6,
      'Business Asset': 6,
    };

    const layers = {};
    graphNodes.forEach((node) => {
      const l = layerMap[node.type] !== undefined ? layerMap[node.type] : 3;
      if (!layers[l]) layers[l] = [];
      layers[l].push(node);
    });

    const colWidth = 220;
    const rowHeight = 90;
    const nodeCoords = {};

    Object.keys(layers).sort().forEach((lKey) => {
      const lIndex = Number(lKey);
      const list = layers[lKey];
      const startY = 60 + (Math.max(0, 5 - list.length) * rowHeight) / 2;

      list.forEach((node, idx) => {
        const x = 80 + lIndex * colWidth;
        const y = startY + idx * rowHeight;
        nodeCoords[node.id] = { ...node, x, y };
      });
    });

    // Build edges with calculated coordinates
    const edgesWithCoords = [];
    graphEdges.forEach((e) => {
      if (nodeCoords[e.source] && nodeCoords[e.target]) {
        edgesWithCoords.push({
          ...e,
          x1: nodeCoords[e.source].x + 80,
          y1: nodeCoords[e.source].y + 24,
          x2: nodeCoords[e.target].x,
          y2: nodeCoords[e.target].y + 24,
        });
      }
    });

    return {
      nodes: Object.values(nodeCoords),
      edges: edgesWithCoords,
    };
  }, [graphNodes, graphEdges]);

  /* Mouse Panning & Zoom */
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.tagName === 'g') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleZoomIn  = () => setZoom((z) => Math.min(z + 0.15, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.4));
  const handleReset   = () => { setZoom(1); setPan({ x: 40, y: 40 }); setSearchQuery(''); setSelectedNode(null); setHighlightPathId(null); if (onClearSelectedPath) onClearSelectedPath(); };

  /* Export SVG / PNG */
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attack-graph-${Date.now()}.svg`;
    link.click();
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.fillStyle = '#0b132b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `attack-graph-${Date.now()}.png`;
      link.click();
    };
    img.src = url;
  };

  /* Highlight active path filter */
  const highlightedNodes = useMemo(() => {
    if (!highlightPathId) return null;
    const foundPath = attackPaths.find((p) => p.id === highlightPathId);
    if (!foundPath) return null;
    const set = new Set();
    foundPath.stages.forEach((st) => set.add(st.name));
    return set;
  }, [highlightPathId, attackPaths]);

  return (
    <div className={`apa-graph-wrapper ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      {/* ── Top Control Bar ───────────────────────────────── */}
      <div className="apa-graph-controls">
        <div className="apa-graph-controls-left">
          <div className="apa-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search node or asset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X size={12} /></button>}
          </div>

          {attackPaths.length > 0 && (
            <select
              className="vapt-scan-select"
              value={highlightPathId || ''}
              onChange={(e) => setHighlightPathId(e.target.value || null)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
            >
              <option value="">— Highlight Attack Path —</option>
              {attackPaths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} ({p.riskScore}/100) - {p.targetAsset}
                </option>
              ))}
            </select>
          )}

          {highlightPathId && (
            <button className="vapt-btn vapt-btn-ghost" onClick={() => { setHighlightPathId(null); if (onClearSelectedPath) onClearSelectedPath(); }} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
              Clear Highlight
            </button>
          )}
        </div>

        <div className="apa-graph-controls-right">
          <button className="vapt-btn vapt-btn-ghost icon-only" onClick={handleZoomIn} title="Zoom In"><ZoomIn size={15} /></button>
          <button className="vapt-btn vapt-btn-ghost icon-only" onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={15} /></button>
          <button className="vapt-btn vapt-btn-ghost icon-only" onClick={handleReset} title="Reset Layout"><RotateCcw size={15} /></button>
          <button className="vapt-btn vapt-btn-ghost icon-only" onClick={() => setIsFullscreen(!isFullscreen)} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <div className="apa-dropdown">
            <button className="vapt-btn vapt-btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
              <Download size={14} /> Export Graph
            </button>
            <div className="apa-dropdown-menu">
              <button onClick={handleExportPNG}>Export PNG Image</button>
              <button onClick={handleExportSVG}>Export Vector SVG</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Graph Canvas (SVG) ───────────────────────────── */}
      <div
        className="apa-graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" opacity="0.75" />
            </marker>
            <marker
              id="arrowhead-highlight"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Render Edges */}
            {layoutData.edges.map((edge, idx) => {
              const sourceNode = layoutData.nodes.find((n) => n.id === edge.source);
              const targetNode = layoutData.nodes.find((n) => n.id === edge.target);

              const isHighlighted =
                highlightedNodes &&
                sourceNode &&
                targetNode &&
                (highlightedNodes.has(sourceNode.label) || highlightedNodes.has(sourceNode.type)) &&
                (highlightedNodes.has(targetNode.label) || highlightedNodes.has(targetNode.type));

              return (
                <g key={`edge-${idx}`}>
                  <path
                    d={`M ${edge.x1} ${edge.y1} C ${(edge.x1 + edge.x2) / 2} ${edge.y1}, ${(edge.x1 + edge.x2) / 2} ${edge.y2}, ${edge.x2} ${edge.y2}`}
                    fill="none"
                    stroke={isHighlighted ? '#ef4444' : 'rgba(59, 130, 246, 0.35)'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={isHighlighted ? 'none' : '4, 4'}
                    markerEnd={isHighlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
                  />
                </g>
              );
            })}

            {/* Render Nodes */}
            {layoutData.nodes.map((node) => {
              const style = getNodeStyle(node.type);
              const isMatch = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());
              const isHighlighted = highlightedNodes && (highlightedNodes.has(node.label) || highlightedNodes.has(node.type));
              const isSelected = selectedNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(node)}
                  className={`apa-graph-node ${isSelected ? 'selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    width="160"
                    height="48"
                    rx="8"
                    fill={style.bg}
                    stroke={isSelected ? '#3b82f6' : isHighlighted ? '#ef4444' : isMatch ? '#eab308' : style.border}
                    strokeWidth={isSelected || isHighlighted || isMatch ? 2.5 : 1}
                  />
                  <text x="12" y="28" fontSize="16">{style.icon}</text>
                  <text
                    x="38"
                    y="22"
                    fontSize="11"
                    fontWeight="700"
                    fill="#f1f5f9"
                    clipPath="inset(0 0 0 0)"
                  >
                    {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
                  </text>
                  <text x="38" y="36" fontSize="9" fontWeight="600" fill={style.color}>
                    {node.type}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ── Graph Legend ──────────────────────────────────── */}
      {showLegend && (
        <div className="apa-graph-legend">
          <div className="apa-legend-header">
            <span>Graph Legend</span>
            <button onClick={() => setShowLegend(false)}><X size={12} /></button>
          </div>
          <div className="apa-legend-grid">
            {Object.entries(NODE_TYPES).slice(0, 8).map(([type, cfg]) => (
              <div key={type} className="apa-legend-item">
                <span className="apa-legend-icon">{cfg.icon}</span>
                <span className="apa-legend-label" style={{ color: cfg.color }}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!showLegend && (
        <button className="apa-legend-toggle" onClick={() => setShowLegend(true)}>
          <Filter size={13} /> Legend
        </button>
      )}

      {/* ── Right-Side Node Information Panel ────────────── */}
      {selectedNode && (
        <div className="apa-node-drawer page-animate">
          <div className="apa-drawer-header">
            <div className="apa-drawer-title">
              <span>{getNodeStyle(selectedNode.type).icon}</span>
              <div>
                <h3>{selectedNode.label}</h3>
                <span className="apa-node-badge" style={{ color: getNodeStyle(selectedNode.type).color }}>
                  {selectedNode.type}
                </span>
              </div>
            </div>
            <button className="vapt-close-btn" onClick={() => setSelectedNode(null)}><X size={16} /></button>
          </div>

          <div className="apa-drawer-body">
            <div className="vapt-detail-block">
              <h5>Asset Details</h5>
              <table className="vapt-meta-table">
                <tbody>
                  <tr><td>Asset Name</td><td>{selectedNode.label}</td></tr>
                  <tr><td>Asset Type</td><td>{selectedNode.type}</td></tr>
                  <tr><td>Hostname / Domain</td><td>{selectedNode.host || selectedNode.label}</td></tr>
                  <tr><td>Risk Score</td><td><strong style={{ color: selectedNode.risk === 'CRITICAL' ? '#ef4444' : '#f97316' }}>{selectedNode.risk || 'HIGH'}</strong></td></tr>
                  <tr><td>Exposure Level</td><td>Public Internet Exposed</td></tr>
                  <tr><td>Status</td><td><span className="adr-status-badge">Active</span></td></tr>
                </tbody>
              </table>
            </div>

            {selectedNode.description && (
              <div className="vapt-detail-block">
                <h5>Node Description</h5>
                <p className="vapt-finding-text">{selectedNode.description}</p>
              </div>
            )}

            <div className="vapt-detail-block">
              <h5>Remediation Guidance</h5>
              <p className="vapt-finding-text">
                Enforce network segmentation, patch associated CVEs, and restrict exposed ports to internal VPN access.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttackGraph;
