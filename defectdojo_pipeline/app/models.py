from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class Finding:
    finding_id: int
    title: str
    severity: str
    cve: Optional[str]
    cwe: Optional[str]
    description: Optional[str]
    mitigation: Optional[str]
    endpoint: Optional[str]
    active: bool
    date_found: Optional[datetime]
    product_id: Optional[int]
    engagement_id: Optional[int]
    test_id: Optional[int]
    raw: Dict[str, Any]
