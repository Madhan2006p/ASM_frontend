import json
from typing import Dict, List

from psycopg2.extras import Json

from .database import get_cursor
from .models import Finding


class FindingsRepository:
    def upsert_findings(self, findings: List[Finding]) -> int:
        if not findings:
            return 0
        with get_cursor() as cursor:
            for finding in findings:
                cursor.execute(
                    """
                    INSERT INTO findings (
                        defectdojo_finding_id, title, severity, cve, cwe, description, mitigation,
                        endpoint, active, date_found, product_id, engagement_id, test_id, raw, updated_at
                    ) VALUES (
                        %(finding_id)s, %(title)s, %(severity)s, %(cve)s, %(cwe)s, %(description)s,
                        %(mitigation)s, %(endpoint)s, %(active)s, %(date_found)s, %(product_id)s,
                        %(engagement_id)s, %(test_id)s, %(raw)s, NOW()
                    )
                    ON CONFLICT (defectdojo_finding_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        severity = EXCLUDED.severity,
                        cve = EXCLUDED.cve,
                        cwe = EXCLUDED.cwe,
                        description = EXCLUDED.description,
                        mitigation = EXCLUDED.mitigation,
                        endpoint = EXCLUDED.endpoint,
                        active = EXCLUDED.active,
                        date_found = EXCLUDED.date_found,
                        product_id = EXCLUDED.product_id,
                        engagement_id = EXCLUDED.engagement_id,
                        test_id = EXCLUDED.test_id,
                        raw = EXCLUDED.raw,
                        updated_at = NOW()
                    """,
                    {
                        "finding_id": finding.finding_id,
                        "title": finding.title,
                        "severity": finding.severity,
                        "cve": finding.cve,
                        "cwe": finding.cwe,
                        "description": finding.description,
                        "mitigation": finding.mitigation,
                        "endpoint": finding.endpoint,
                        "active": finding.active,
                        "date_found": finding.date_found,
                        "product_id": finding.product_id,
                        "engagement_id": finding.engagement_id,
                        "test_id": finding.test_id,
                        "raw": Json(finding.raw),
                    },
                )
        return len(findings)

    def replace_faraday_findings(self, findings: List[Finding]) -> int:
        with get_cursor() as cursor:
            cursor.execute("DELETE FROM findings WHERE defectdojo_finding_id >= 1000000000")
        return self.upsert_findings(findings)

    def list_findings(self, severity: str | None = None) -> List[dict]:
        query = """
            SELECT defectdojo_finding_id AS finding_id, title, severity, cve, cwe, description,
                   mitigation, endpoint, active, date_found
            FROM findings
        """
        params = {}
        if severity:
            query += " WHERE LOWER(severity) = LOWER(%(severity)s)"
            params["severity"] = severity
        query += " ORDER BY date_found DESC NULLS LAST, defectdojo_finding_id DESC"
        with get_cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        return [self._serialize(row) for row in rows]

    def severity_counts(self) -> Dict[str, int]:
        with get_cursor() as cursor:
            cursor.execute(
                """
                SELECT severity, COUNT(*) AS count
                FROM findings
                WHERE active = TRUE
                GROUP BY severity
                """
            )
            rows = cursor.fetchall()
        counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for row in rows:
            severity = str(row["severity"]).capitalize()
            if severity in counts:
                counts[severity] = int(row["count"])
        counts["Total"] = sum(counts.values())
        return counts

    @staticmethod
    def _serialize(row: dict) -> dict:
        raw = dict(row)
        if raw.get("date_found"):
            raw["date_found"] = raw["date_found"].isoformat()
        return json.loads(json.dumps(raw, default=str))
