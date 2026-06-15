from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import close_pool, init_pool, initialize_schema
from .faraday_client import FaradayClient, FaradayReportUploadUnsupported
from .repository import FindingsRepository
from .risk import calculate_risk_score, risk_level
from .schemas import ASMImportOut, ASMVulnerabilityImportIn, FaradayFileImportIn, FindingsOut, SummaryOut

settings = get_settings()
app = FastAPI(title="ASM Faraday Nuclei Pipeline", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_pool()
    initialize_schema()


@app.on_event("shutdown")
def shutdown() -> None:
    close_pool()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/faraday/import-nuclei-file")
def import_nuclei_file_to_faraday(payload: FaradayFileImportIn) -> dict:
    file_path = Path(payload.file_path).expanduser().resolve()
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=400, detail="Nuclei result file does not exist")
    if file_path.suffix.lower() != ".json":
        raise HTTPException(status_code=400, detail="Nuclei result file must be a JSON file")

    file_bytes = file_path.read_bytes()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Nuclei result file is empty")

    try:
        client = FaradayClient(settings)
        try:
            import_response = client.upload_nuclei_report(file_path.name, file_bytes)
            import_method = "faraday_report_upload_api"
        except FaradayReportUploadUnsupported:
            import_response = client.create_vulnerabilities_from_nuclei(file_bytes)
            import_method = "faraday_vulnerabilities_api_fallback"
        findings = client.fetch_findings()
        stored = FindingsRepository().replace_faraday_findings(findings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Faraday import failed: {exc}") from exc

    return {
        "workspace": settings.faraday_workspace,
        "file_path": str(file_path),
        "import_method": import_method,
        "imported_findings": len(findings),
        "stored_findings": stored,
        "import_response": import_response,
    }


@app.post("/faraday/import-vulnerabilities", response_model=ASMImportOut)
def import_asm_vulnerabilities(payload: ASMVulnerabilityImportIn) -> dict:
    """
    Import vulnerabilities from the ASM frontend directly into Faraday.
    Accepts a list of vulnerability objects in the ASM vulnerability format.
    """
    asm_vulns = [v.model_dump() for v in payload.vulnerabilities]
    if not asm_vulns:
        raise HTTPException(status_code=400, detail="No vulnerabilities provided")

    try:
        client = FaradayClient(settings)
        import_response = client.create_vulnerabilities_from_asm_vulns(asm_vulns)
        findings = client.fetch_findings()
        stored = FindingsRepository().replace_faraday_findings(findings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Faraday import failed: {exc}") from exc

    return {
        "status": import_response.get("status", "completed"),
        "created": import_response.get("created", 0),
        "errors": import_response.get("errors", []),
        "stored_findings": stored,
        "workspace": settings.faraday_workspace,
    }


@app.get("/faraday/findings", response_model=FindingsOut)
def get_faraday_findings() -> dict:
    findings = [
        finding for finding in FindingsRepository().list_findings() if finding.get("finding_id", 0) >= 1_000_000_000
    ]
    return {"findings": findings}


@app.get("/faraday/findings/critical", response_model=FindingsOut)
def get_faraday_critical_findings() -> dict:
    findings = [
        finding
        for finding in FindingsRepository().list_findings("Critical")
        if finding.get("finding_id", 0) >= 1_000_000_000
    ]
    return {"findings": findings}


@app.get("/faraday/summary", response_model=SummaryOut)
def get_faraday_summary() -> dict:
    findings = [
        finding for finding in FindingsRepository().list_findings() if finding.get("finding_id", 0) >= 1_000_000_000
    ]
    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for finding in findings:
        severity = str(finding.get("severity") or "").capitalize()
        if severity in counts:
            counts[severity] += 1
    counts["Total"] = sum(counts.values())
    score = calculate_risk_score(counts)
    return {
        "total_findings": counts["Total"],
        "critical_count": counts["Critical"],
        "high_count": counts["High"],
        "medium_count": counts["Medium"],
        "low_count": counts["Low"],
        "risk_score": score,
        "risk_level": risk_level(score),
    }
