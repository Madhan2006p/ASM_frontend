from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class FindingOut(BaseModel):
    finding_id: int
    title: str
    severity: str
    cve: Optional[str] = None
    cwe: Optional[str] = None
    description: Optional[str] = None
    mitigation: Optional[str] = None
    endpoint: Optional[str] = None
    active: bool
    date_found: Optional[datetime] = None


class SummaryOut(BaseModel):
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    risk_score: int
    risk_level: str


class FaradayFileImportIn(BaseModel):
    file_path: str


class ASMVulnerabilityItem(BaseModel):
    """A single vulnerability from the ASM system."""
    vulnerability_id: Optional[str] = None
    domain: Optional[str] = None
    subdomain: Optional[str] = None
    severity: Optional[str] = None
    cve: Optional[str] = None
    cwe: Optional[str] = None
    finding: Optional[str] = None
    description: Optional[str] = None
    template_id: Optional[str] = None
    source_tool: Optional[str] = None
    discovered_at: Optional[str] = None


class ASMVulnerabilityImportIn(BaseModel):
    """Payload for importing ASM vulnerabilities into Faraday."""
    vulnerabilities: List[ASMVulnerabilityItem]
    scan_target: Optional[str] = None


class ASMImportOut(BaseModel):
    status: str
    created: int
    errors: Optional[List[dict]] = None


class FindingsOut(BaseModel):
    findings: List[FindingOut]
