import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests

from .config import Settings
from .models import Finding


class FaradayClient:
    FINDING_ID_OFFSET = 1_000_000_000

    def __init__(self, settings: Settings):
        self.settings = settings
        self.base_url = settings.faraday_url.rstrip("/")
        self.workspace = settings.faraday_workspace
        self.session = requests.Session()
        self.verify_ssl = settings.faraday_verify_ssl
        self._authenticate()

    def _api(self, path: str) -> str:
        return f"{self.base_url}/_api/v3/{path.lstrip('/')}"

    def _authenticate(self) -> None:
        response = self.session.post(
            f"{self.base_url}/_api/login",
            json={"email": self.settings.faraday_username, "password": self.settings.faraday_password},
            verify=self.verify_ssl,
            timeout=30,
        )
        if response.status_code in (400, 401):
            response = self.session.post(
                f"{self.base_url}/_api/login",
                json={"username": self.settings.faraday_username, "password": self.settings.faraday_password},
                verify=self.verify_ssl,
                timeout=30,
            )
        if response.status_code in (404, 405):
            self.session.auth = (self.settings.faraday_username, self.settings.faraday_password)
            return
        response.raise_for_status()
        payload = response.json()
        token = payload.get("token") or payload.get("access_token") or payload.get("jwt")
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})

    def _request(self, method: str, path: str, **kwargs) -> Any:
        response = self.session.request(method, self._api(path), verify=self.verify_ssl, timeout=60, **kwargs)
        response.raise_for_status()
        if not response.content:
            return {}
        return response.json()

    def ensure_workspace(self) -> None:
        response = self.session.get(self._api(f"ws/{self.workspace}"), verify=self.verify_ssl, timeout=30)
        if response.status_code == 200:
            return
        if response.status_code not in (400, 404):
            response.raise_for_status()
        self._request(
            "POST",
            "ws/",
            json={"name": self.workspace, "description": "ASM Nuclei imports", "active": True},
        )

    def upload_nuclei_report(self, file_name: str, file_bytes: bytes) -> Dict[str, Any]:
        self.ensure_workspace()
        files = {"file": (file_name, file_bytes, "application/json")}
        data = {"plugin_id": "Nuclei", "workspace": self.workspace}
        candidates = [
            f"ws/{self.workspace}/upload_report",
            f"ws/{self.workspace}/upload_reports",
            f"ws/{self.workspace}/import_report",
        ]
        last_error = None
        for path in candidates:
            response = self.session.post(self._api(path), data=data, files=files, verify=self.verify_ssl, timeout=120)
            if response.status_code in (200, 201, 202):
                return response.json() if response.content else {"status": "accepted", "endpoint": path}
            if response.status_code not in (404, 405):
                response.raise_for_status()
            last_error = {"status_code": response.status_code, "endpoint": path, "body": response.text}
        raise FaradayReportUploadUnsupported(last_error)

    def create_vulnerabilities_from_nuclei(self, file_bytes: bytes) -> Dict[str, Any]:
        self.ensure_workspace()
        nuclei_items = self._load_nuclei_items(file_bytes)
        created = 0
        for index, item in enumerate(nuclei_items, start=1):
            payload = self._nuclei_to_faraday_vuln(item, index)
            response = self.session.post(
                self._api(f"ws/{self.workspace}/vulns/"),
                json=payload,
                verify=self.verify_ssl,
                timeout=60,
            )
            if response.status_code in (200, 201):
                created += 1
            else:
                response.raise_for_status()
        return {"status": "created_via_vulns_api", "created": created}

    def fetch_findings(self) -> List[Finding]:
        self.ensure_workspace()
        payload = self._list(f"ws/{self.workspace}/vulns/")
        return [self._normalize_finding(item) for item in payload]

    def _list(self, path: str) -> List[Dict[str, Any]]:
        results = []
        url = self._api(path)
        while url:
            response = self.session.get(url, verify=self.verify_ssl, timeout=60)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                return payload
            results.extend(payload.get("results", []))
            url = payload.get("next")
        return results

    def create_vulnerabilities_from_asm_vulns(self, asm_vulns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Import vulnerabilities from the ASM system's vulnerability format
        directly into Faraday without requiring a nuclei file.
        """
        self.ensure_workspace()
        created = 0
        errors = []
        for index, vuln in enumerate(asm_vulns, start=1):
            try:
                payload = self._asm_vuln_to_faraday(vuln, index)
                response = self.session.post(
                    self._api(f"ws/{self.workspace}/vulns/"),
                    json=payload,
                    verify=self.verify_ssl,
                    timeout=60,
                )
                if response.status_code in (200, 201):
                    created += 1
                else:
                    errors.append({"index": index, "status": response.status_code, "detail": response.text[:200]})
            except Exception as exc:
                errors.append({"index": index, "error": str(exc)})
        result = {"status": "created_via_asm_api", "created": created}
        if errors:
            result["errors"] = errors
        return result

    @staticmethod
    def _asm_vuln_to_faraday(vuln: Dict[str, Any], index: int) -> Dict[str, Any]:
        """
        Convert an ASM vulnerability format to Faraday's vulnerability format.

        ASM format fields:
          - vulnerability_id, domain, subdomain, severity, cve, cwe, finding,
            template_id, source_tool, discovered_at
        """
        severity = str(vuln.get("severity") or "info").lower()
        title = vuln.get("vulnerability_id") or vuln.get("template_id") or f"ASM Vulnerability {index}"
        description = vuln.get("finding") or vuln.get("description") or ""
        cve = vuln.get("cve") or ""
        cwe = vuln.get("cwe") or ""
        target = vuln.get("subdomain") or vuln.get("domain") or ""
        template_id = vuln.get("template_id") or vuln.get("vulnerability_id") or f"asm-{index}"
        source_tool = vuln.get("source_tool") or "ASM"
        references = []
        if cve:
            references.append(f"https://nvd.nist.gov/vuln/detail/{cve}")

        return {
            "name": f"[{source_tool}] {title}",
            "desc": description or f"Vulnerability found on {target}",
            "severity": severity,
            "resolution": "Review the affected endpoint and apply vendor guidance.",
            "refs": references,
            "status": "opened",
            "external_id": template_id,
            "target": target,
            "data": json.dumps({
                "cve": cve or None,
                "cwe": cwe or None,
                "source_tool": source_tool,
                "domain": vuln.get("domain", ""),
                "raw": vuln,
            }, default=str),
        }

    @staticmethod
    def _load_nuclei_items(file_bytes: bytes) -> List[Dict[str, Any]]:
        text = file_bytes.decode("utf-8")
        try:
            parsed = json.loads(text)
            return parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            return [json.loads(line) for line in text.splitlines() if line.strip()]

    @staticmethod
    def _nuclei_to_faraday_vuln(item: Dict[str, Any], index: int) -> Dict[str, Any]:
        info = item.get("info") or {}
        classification = info.get("classification") or {}
        severity = str(info.get("severity") or "info").lower()
        title = info.get("name") or item.get("template-id") or f"Nuclei finding {index}"
        cve = classification.get("cve-id") or classification.get("cve")
        cwe = classification.get("cwe-id") or classification.get("cwe")
        references = info.get("reference") or []
        if isinstance(references, str):
            references = [references]
        return {
            "name": title,
            "desc": info.get("description") or item.get("matched-at") or title,
            "severity": severity,
            "resolution": info.get("remediation") or info.get("mitigation") or "Review the affected endpoint and apply vendor guidance.",
            "refs": references,
            "status": "opened",
            "external_id": item.get("template-id") or f"nuclei-{index}",
            "target": item.get("matched-at") or item.get("host") or item.get("url"),
            "data": json.dumps({"cve": cve, "cwe": cwe, "raw": item}, default=str),
        }

    @staticmethod
    def _normalize_finding(item: Dict[str, Any]) -> Finding:
        data = item.get("data")
        parsed_data = {}
        if isinstance(data, str):
            try:
                parsed_data = json.loads(data)
            except json.JSONDecodeError:
                parsed_data = {}
        severity = str(item.get("severity") or "Info").capitalize()
        return Finding(
            finding_id=FaradayClient.FINDING_ID_OFFSET + int(item.get("id") or item.get("_id") or 0),
            title=item.get("name") or "Untitled finding",
            severity=severity,
            cve=FaradayClient._join(parsed_data.get("cve") or item.get("cve")),
            cwe=FaradayClient._join(parsed_data.get("cwe") or item.get("cwe")),
            description=item.get("desc") or item.get("description"),
            mitigation=item.get("resolution") or item.get("mitigation"),
            endpoint=item.get("target") or item.get("hostnames") or item.get("service"),
            active=str(item.get("status") or "opened").lower() not in {"closed", "confirmed closed", "false positive"},
            date_found=FaradayClient._parse_datetime(item.get("create_date") or item.get("created_at")),
            product_id=None,
            engagement_id=None,
            test_id=None,
            raw=item,
        )

    @staticmethod
    def _join(value: Any) -> Optional[str]:
        if value in (None, "", []):
            return None
        if isinstance(value, list):
            return ", ".join(str(item) for item in value if item) or None
        return str(value)

    @staticmethod
    def _parse_datetime(value: Any) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None


class FaradayReportUploadUnsupported(Exception):
    pass
