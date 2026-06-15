SEVERITY_WEIGHTS = {
    "Critical": 100,
    "High": 50,
    "Medium": 20,
    "Low": 5,
}


def calculate_risk_score(counts: dict) -> int:
    return sum(int(counts.get(severity, 0)) * weight for severity, weight in SEVERITY_WEIGHTS.items())


def risk_level(score: int) -> str:
    if score <= 50:
        return "Low"
    if score <= 150:
        return "Medium"
    if score <= 300:
        return "High"
    return "Critical"
