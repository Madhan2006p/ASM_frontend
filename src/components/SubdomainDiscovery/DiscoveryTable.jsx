import React from 'react';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  Lock, 
  Unlock, 
  ChevronLeft, 
  ChevronRight,
  Cloud,
  Server,
  Box,
  Layout,
  Database
} from 'lucide-react';
import './DiscoveryTable.css';

const tableData = [
  {
    id: 1,
    hostname: 'api.acme.com',
    ip: '104.18.12.45',
    technologies: [
      { name: 'AWS', icon: <Cloud size={14} />, color: '#FF9900', bg: '#FFF5E5' },
      { name: 'Nginx', icon: <Server size={14} />, color: '#009639', bg: '#E5F4EB' }
    ],
    techMore: 2,
    ssl: { status: 'Valid', detail: "Let's Encrypt", valid: true },
    status: 'Alive'
  },
  {
    id: 2,
    hostname: 'auth.acme.com',
    ip: '104.18.13.17',
    technologies: [
      { name: 'Auth0', icon: <Lock size={14} />, color: '#EB5424', bg: '#FDEEEA' }
    ],
    techMore: 1,
    ssl: { status: 'Valid', detail: "Let's Encrypt", valid: true },
    status: 'Alive'
  },
  {
    id: 3,
    hostname: 'www.acme.com',
    ip: '104.18.12.45',
    technologies: [
      { name: 'Vercel', icon: <Box size={14} />, color: '#000000', bg: '#E5E5E5' },
      { name: 'Next.js', icon: <Layout size={14} />, color: '#000000', bg: '#E5E5E5' }
    ],
    techMore: 1,
    ssl: { status: 'Valid', detail: "Let's Encrypt", valid: true },
    status: 'Alive'
  },
  {
    id: 4,
    hostname: 'static.acme.com',
    ip: '104.18.14.23',
    technologies: [
      { name: 'Cloudflare', icon: <Cloud size={14} />, color: '#F38020', bg: '#FEF2E8' }
    ],
    techMore: 1,
    ssl: { status: 'Valid', detail: "Let's Encrypt", valid: true },
    status: 'Alive'
  },
  {
    id: 5,
    hostname: 'dev.acme.internal',
    ip: '10.0.2.15',
    technologies: [
      { name: 'Docker', icon: <Box size={14} />, color: '#2496ED', bg: '#E9F4FD' }
    ],
    techMore: 2,
    ssl: { status: 'Self-signed', detail: "Expires in 12 days", warning: true },
    status: 'Alive'
  },
  {
    id: 6,
    hostname: 'mail.acme.com',
    ip: '104.18.15.89',
    technologies: [
      { name: 'Google Workspace', icon: <Layout size={14} />, color: '#4285F4', bg: '#ECF3FE' }
    ],
    ssl: { status: 'Valid', detail: "Google Trust Services", valid: true },
    status: 'Alive'
  },
  {
    id: 7,
    hostname: 'blog.acme.com',
    ip: '104.18.16.78',
    technologies: [
      { name: 'WordPress', icon: <Layout size={14} />, color: '#21759B', bg: '#E8F1F5' },
      { name: 'PHP', icon: <Database size={14} />, color: '#777BB4', bg: '#F1F1F7' }
    ],
    techMore: 1,
    ssl: { status: 'Valid', detail: "Let's Encrypt", valid: true },
    status: 'Alive'
  },
  {
    id: 8,
    hostname: 'payments.acme.com',
    ip: '104.18.17.34',
    technologies: [
      { name: 'Stripe', icon: <Layout size={14} />, color: '#635BFF', bg: '#EFF0FF' }
    ],
    techMore: 1,
    ssl: { status: 'Valid', detail: "Let's Encrypt", valid: true },
    status: 'Alive'
  },
  {
    id: 9,
    hostname: 'old.acme.com',
    ip: '104.18.18.90',
    technologies: [
      { name: 'Apache', icon: <Server size={14} />, color: '#D22128', bg: '#FAEBEC' }
    ],
    ssl: { status: 'Expired', detail: "Expired 5 days ago", error: true },
    status: 'Alive'
  },
  {
    id: 10,
    hostname: 'test.acme.com',
    ip: '104.18.19.21',
    technologies: [
      { name: 'Node.js', icon: <Box size={14} />, color: '#339933', bg: '#EAF5EA' }
    ],
    techMore: 1,
    ssl: { status: 'Valid', detail: "Let's Encrypt", valid: true },
    status: 'Alive'
  }
];

const DiscoveryTable = () => {
  return (
    <div className="discovery-table-wrapper card">
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={16} className="filter-search-icon" />
          <input type="text" placeholder="Search by hostname or IP..." />
        </div>
        <div className="filter-dropdowns">
          <button className="dropdown-btn">
            All Domains <ChevronDown size={14} />
          </button>
          <button className="dropdown-btn">
            All Status <ChevronDown size={14} />
          </button>
          <button className="dropdown-btn">
            All Technologies <ChevronDown size={14} />
          </button>
          <button className="dropdown-btn">
            All SSL Status <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="assets-table discovery-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input type="checkbox" className="custom-checkbox" />
              </th>
              <th>Hostname</th>
              <th>IP Address</th>
              <th>Technology</th>
              <th>SSL Status</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="checkbox-col">
                  <input type="checkbox" className="custom-checkbox" />
                </td>
                <td>
                  <a href="#" className="hostname-link">
                    {row.hostname} <ExternalLink size={14} />
                  </a>
                </td>
                <td className="text-secondary">{row.ip}</td>
                <td>
                  <div className="tech-badges">
                    {row.technologies.map((tech, idx) => (
                      <span 
                        key={idx} 
                        className="tech-badge"
                        style={{ color: tech.color, backgroundColor: tech.bg }}
                      >
                        {tech.icon} {tech.name}
                      </span>
                    ))}
                    {row.techMore && (
                      <span className="tech-more">+{row.techMore}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="ssl-status">
                    <div className={`ssl-main ${row.ssl.error ? 'text-red' : row.ssl.warning ? 'text-gray' : 'text-green'}`}>
                      {row.ssl.error ? <Unlock size={14} /> : row.ssl.warning ? <Unlock size={14} /> : <Lock size={14} />}
                      {row.ssl.status}
                    </div>
                    <div className={`ssl-detail ${row.ssl.error ? 'text-red' : ''}`}>
                      {row.ssl.detail}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="alive-status">
                    <span className="status-dot green-dot-small"></span> {row.status}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-footer">
        <span className="pagination-info">Showing 1 to 10 of 1,248 assets</span>
        <div className="pagination-controls">
          <button className="page-btn"><ChevronLeft size={16} /></button>
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryTable;
