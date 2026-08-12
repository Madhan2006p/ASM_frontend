import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { parseTechEntry, getEolInfo } from '../../utils/techUtils';
import './Technologies.css';

/**
 * TechBadge — renders a single detected technology as a clean pill with a
 * highlighted version chip. Outdated / end-of-life versions are flagged red.
 */
const TechBadge = ({ raw, showCategory = false }) => {
  if (!raw || !String(raw).trim()) return null;
  const { name, version, category } = parseTechEntry(raw);
  const eol = getEolInfo(name, version);

  const title = eol.outdated
    ? `${name}${version ? ` ${version}` : ''} — ${eol.note}`
    : showCategory
      ? `${name}${version ? ` ${version}` : ''} · ${category}`
      : name;

  return (
    <span
      className={`tech-tag-badge ${eol.outdated ? 'outdated' : ''}`}
      title={title}
    >
      {name}
      {version && <em className="tech-version-pill">{version}</em>}
      {eol.outdated && <AlertTriangle size={11} className="tech-eol-icon" />}
    </span>
  );
};

export default TechBadge;
