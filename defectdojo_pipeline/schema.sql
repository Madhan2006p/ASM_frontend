CREATE TABLE IF NOT EXISTS findings (
    id SERIAL PRIMARY KEY,
    defectdojo_finding_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    cve TEXT,
    cwe TEXT,
    description TEXT,
    mitigation TEXT,
    endpoint TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    date_found TIMESTAMPTZ,
    product_id INTEGER,
    engagement_id INTEGER,
    test_id INTEGER,
    raw JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings (severity);
CREATE INDEX IF NOT EXISTS idx_findings_active ON findings (active);
CREATE INDEX IF NOT EXISTS idx_findings_date_found ON findings (date_found DESC);
