import React from 'react';
import { Layers, Server, Database, Globe, RefreshCw } from 'lucide-react';
import './Technologies.css';
import PageHeaderCard from '../common/PageHeaderCard';

const TechDashboard = ({ onExport, technologies = [], loading }) => {
  const getCategoryStats = (catName) => {
    const list = technologies.filter(t => t.category === catName);
    const assetCount = list.reduce((sum, item) => sum + item.assets, 0);
    const topItems = list.slice(0, 3);
    const totalTechs = list.length;
    const upToDate = totalTechs > 0 ? Math.round((list.filter(t => t.eol === 'Supported').length / totalTechs) * 100) : 0;
    
    return {
      assetCount,
      topItems,
      upToDate
    };
  };

  const frontend = getCategoryStats('Frontend');
  const backend = getCategoryStats('Backend');
  const databases = getCategoryStats('Database');
  const webservers = getCategoryStats('Web Server');

  return (
    <div>
      <PageHeaderCard 
        badgeText="INVENTORY"
        title="Technologies"
        subtitle="Track software versions, stack distribution, and End-of-Life projections."
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={20} style={{ marginRight: '0.5rem' }} /> Loading stack stats...
        </div>
      ) : (
        <div className="tech-category-grid">
          
          {/* Frontend Core */}
          <div className="category-card">
            <div className="cat-icon-title">
              <div className="cat-icon bg-purple"><Layers size={20} /></div>
              <div>
                <div className="cat-title">Frontend Core</div>
                <div className="cat-count">{frontend.assetCount} Instances detected</div>
              </div>
            </div>
            
            <div className="cat-progress-container">
              <div className="cat-progress-lbl">
                <span>Supported Stack</span>
                <span>{frontend.upToDate}%</span>
              </div>
              <div className="cat-progress-track">
                <div className="cat-progress-fill fill-purple" style={{width: `${frontend.upToDate}%`}}></div>
              </div>
            </div>

            <div className="cat-list">
              {frontend.topItems.map((item, idx) => (
                <div key={idx} className="cat-list-item">
                  <span className="sw-name">{item.name}</span>
                  <span className={`sw-ver ${item.eol !== 'Supported' ? 'outdated' : ''}`}>{item.version}</span>
                </div>
              ))}
              {frontend.topItems.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>No frontend techs detected</div>
              )}
            </div>
          </div>

          {/* Backend Services */}
          <div className="category-card">
            <div className="cat-icon-title">
              <div className="cat-icon bg-orange"><Server size={20} /></div>
              <div>
                <div className="cat-title">Backend</div>
                <div className="cat-count">{backend.assetCount} Instances detected</div>
              </div>
            </div>
            
            <div className="cat-progress-container">
              <div className="cat-progress-lbl">
                <span>Supported Stack</span>
                <span>{backend.upToDate}%</span>
              </div>
              <div className="cat-progress-track">
                <div className="cat-progress-fill fill-orange" style={{width: `${backend.upToDate}%`}}></div>
              </div>
            </div>

            <div className="cat-list">
              {backend.topItems.map((item, idx) => (
                <div key={idx} className="cat-list-item">
                  <span className="sw-name">{item.name}</span>
                  <span className={`sw-ver ${item.eol !== 'Supported' ? 'outdated' : ''}`}>{item.version}</span>
                </div>
              ))}
              {backend.topItems.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>No backend services detected</div>
              )}
            </div>
          </div>

          {/* Databases */}
          <div className="category-card">
            <div className="cat-icon-title">
              <div className="cat-icon bg-green"><Database size={20} /></div>
              <div>
                <div className="cat-title">Databases</div>
                <div className="cat-count">{databases.assetCount} Instances detected</div>
              </div>
            </div>
            
            <div className="cat-progress-container">
              <div className="cat-progress-lbl">
                <span>Supported Stack</span>
                <span>{databases.upToDate}%</span>
              </div>
              <div className="cat-progress-track">
                <div className="cat-progress-fill fill-green" style={{width: `${databases.upToDate}%`}}></div>
              </div>
            </div>

            <div className="cat-list">
              {databases.topItems.map((item, idx) => (
                <div key={idx} className="cat-list-item">
                  <span className="sw-name">{item.name}</span>
                  <span className={`sw-ver ${item.eol !== 'Supported' ? 'outdated' : ''}`}>{item.version}</span>
                </div>
              ))}
              {databases.topItems.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>No databases detected</div>
              )}
            </div>
          </div>

          {/* Web Servers */}
          <div className="category-card">
            <div className="cat-icon-title">
              <div className="cat-icon bg-blue"><Globe size={20} /></div>
              <div>
                <div className="cat-title">Web Servers</div>
                <div className="cat-count">{webservers.assetCount} Instances detected</div>
              </div>
            </div>
            
            <div className="cat-progress-container">
              <div className="cat-progress-lbl">
                <span>Supported Stack</span>
                <span>{webservers.upToDate}%</span>
              </div>
              <div className="cat-progress-track">
                <div className="cat-progress-fill fill-blue" style={{width: `${webservers.upToDate}%`}}></div>
              </div>
            </div>

            <div className="cat-list">
              {webservers.topItems.map((item, idx) => (
                <div key={idx} className="cat-list-item">
                  <span className="sw-name">{item.name}</span>
                  <span className={`sw-ver ${item.eol !== 'Supported' ? 'outdated' : ''}`}>{item.version}</span>
                </div>
              ))}
              {webservers.topItems.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>No web servers detected</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default TechDashboard;
