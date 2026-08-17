import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { parseTechEntry, getEolInfo } from '../../utils/techUtils';
import './Technologies.css';

/**
 * TechBadge — renders a single detected technology as a clean pill with a
 * highlighted version chip and optional multi-engine indicator.
 */
const TechBadge = ({ raw, showCategory = false, showEngine = false }) => {
  if (!raw || !String(raw).trim()) return null;
  const { name, version, category, engines, source } = parseTechEntry(raw);
  const eol = getEolInfo(name, version);
  const primaryEngine = source || (engines && engines.length > 0 ? engines[0] : null);

  const title = `${name}${version ? ` ${version}` : ''}${category ? ` [${category}]` : ''}${engines && engines.length > 0 ? ` · Detected by: ${engines.join(', ')}` : ''}${eol.outdated ? ` — ${eol.note}` : ''}`;

  return (
    <span
      className={`tech-tag-badge ${eol.outdated ? 'outdated' : ''}`}
      title={title}
    >
      {name}
      {version && <em className="tech-version-pill">{version}</em>}
      {showEngine && primaryEngine && (
        <span className={`tech-source-chip tech-source-${primaryEngine.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
          {primaryEngine}
        </span>
      )}
      {eol.outdated && <AlertTriangle size={11} className="tech-eol-icon" />}
    </span>
  );
};

export default TechBadge;
