/* ═════════════════════════════════════════════════════════
   Tech string parsing — shared by all Technologies components
   Format examples produced by the engines:
     "Nginx/1.18.0 [Web servers]"
     "Swagger UI/3.14.2 [Documentation]"
     "WordPress [CMS]"
     "Bootstrap/4.5.2 [UI frameworks] (wappalyzer-js, wappalyzergo)"
   Legacy formats still supported:
     "jQuery (v3.6.0)"
     "Apache HTTP Server 2.4.10 [WhatCMS]"
═════════════════════════════════════════════════════════ */

export const parseTechEntry = (raw = '') => {
  let name = raw || '';
  let version = '';
  let category = 'Miscellaneous';
  let engines = [];
  let source = '';

  // Extract source tags like [FingerprintHub], [Webanalyze], [WhatCMS], [Header Analysis], [Wappalyzer]
  const sourceMatch = name.match(/\s*\[(FingerprintHub|Webanalyze|WhatCMS|Header Analysis|Wappalyzer|HTTPX)\]\s*$/i);
  if (sourceMatch) {
    source = sourceMatch[1];
    engines.push(source);
    name = name.slice(0, sourceMatch.index).trim();
  }

  // Extract trailing (engine1, engine2) tag
  const engineMatch = name.match(/\s*\(([a-z0-9-]+(?:,\s*[a-z0-9-]+)*)\)\s*$/);
  if (engineMatch) {
    const matchedEngines = engineMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    engines.push(...matchedEngines);
    name = name.slice(0, engineMatch.index).trim();
  }

  // Extract trailing [Category] tag
  const catMatch = name.match(/\s*\[(.*?)\]$/);
  if (catMatch) {
    category = catMatch[1].trim();
    name = name.replace(catMatch[0], '').trim();
  }

  // Split name / version
  if (name.includes('/')) {
    const parts = name.split('/');
    name = parts[0].trim();
    version = (parts[1] || '').trim();
  } else if (name.includes(' (v')) {
    const parts = name.split(' (v');
    name = parts[0].trim();
    version = (parts[1] || '').replace(')', '').trim();
  } else {
    // Trailing-version form: "Apache HTTP Server 2.4.10"
    const m = name.match(/(\d+\.\d+(?:\.\d+)?(?:[-_.][0-9A-Za-z]+)*)\s*$/);
    if (m) {
      version = m[1];
      name = name.slice(0, m.index).trim();
    }
  }

  // Normalise version: strip leading "v" and any parenthetical/label suffix
  version = String(version || '').trim().replace(/^v/i, '');
  version = version.split(' (')[0].split(' ')[0].trim();

  return { name: name || raw, version, category, engines: Array.from(new Set(engines)), source };
};

/* ── EOL / outdated knowledge base ───────────────────────
   A lightweight built-in reference of common platforms and
   the minimum version that is still vendor-supported. If a
   detected version is below the threshold (or a whole
   platform is EOL), the version badge is flagged. */

const EOL_RULES = [
  { test: /^php$/i,                 min: [8, 0], note: 'PHP < 8.0 is end-of-life' },
  { test: /^python$/i,              min: [3, 9], note: 'Python < 3.9 is end-of-life' },
  { test: /^node\.js$/i,            min: [18],   note: 'Node.js < 18 is end-of-life' },
  { test: /^jquery$/i,              min: [3, 0], note: 'jQuery < 3.x is unsupported' },
  { test: /^apache$/i,              min: [2, 4], note: 'Apache HTTP < 2.4 is end-of-life' },
  { test: /^nginx$/i,               min: [1, 18],note: 'Nginx < 1.18 is no longer supported' },
  { test: /^mysql$/i,               min: [5, 7], note: 'MySQL < 5.7 is end-of-life' },
  { test: /^mariadb$/i,             min: [10, 3],note: 'MariaDB < 10.3 is end-of-life' },
  { test: /^postgresql$/i,          min: [12],   note: 'PostgreSQL < 12 is end-of-life' },
  { test: /^ruby$/i,                min: [3, 0], note: 'Ruby < 3.0 is end-of-life' },
  { test: /^tomcat$/i,              min: [9],    note: 'Tomcat < 9 is end-of-life' },
  { test: /^java$/i,                min: [17],   note: 'Java < 17 is outdated' },
  { test: /^angularjs$/i,           eol: true,   note: 'AngularJS 1.x is end-of-life' },
  { test: /^flash$/i,               eol: true,   note: 'Adobe Flash is end-of-life' },
  { test: /^silverlight$/i,         eol: true,   note: 'Silverlight is end-of-life' },
  { test: /^internet explorer$/i,   eol: true,   note: 'Internet Explorer is end-of-life' },
];

const toVersionArr = (v) => String(v || '')
  .replace(/[^0-9.]/g, '')
  .split('.')
  .filter(Boolean)
  .map(n => parseInt(n, 10) || 0);

const isBelow = (a, b) => {
  const arrA = toVersionArr(a);
  const arrB = b;
  const len = Math.max(arrA.length, arrB.length);
  for (let i = 0; i < len; i++) {
    const x = arrA[i] || 0;
    const y = arrB[i] || 0;
    if (x !== y) return x < y;
  }
  return false;
};

export const getEolInfo = (name, version) => {
  for (const rule of EOL_RULES) {
    if (rule.test.test(name)) {
      // Only surface the rule note when the version is actually outdated
      if (rule.eol) return { outdated: true, note: rule.note };
      if (version && isBelow(version, rule.min)) return { outdated: true, note: rule.note };
      return { outdated: false, note: '' };
    }
  }
  return { outdated: false, note: '' };
};

/* ── Category color (shared look across dashboards) ────── */
export const TECH_CATEGORY_ICONS = {
  'Web servers': '#3B82F6',
  'JavaScript libraries': '#F59E0B',
  'JavaScript frameworks': '#8B5CF6',
  'Programming languages': '#10B981',
  CDN: '#06B6D4',
  Analytics: '#EC4899',
  Security: '#EF4444',
  CMS: '#84CC16',
  Databases: '#F97316',
  Database: '#F97316',
  'Web frameworks': '#6366F1',
  Miscellaneous: '#64748B',
};

export const techCategoryIcon = (category) =>
  TECH_CATEGORY_ICONS[category] || '#64748B';
