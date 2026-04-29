import re
from typing import Any, Dict, List
from app.core.config import GEMINI_API_KEY, USE_MOCK

RISK_RULES = [
    {
        "id": "unlimited_liability",
        "label": "Unlimited Liability",
        "keywords": ["unlimited liability", "fully liable", "sole responsibility for all damages", "without limitation of liability"],
        "description": "The agreement does not limit liability in case of breach.",
        "severity": "high",
        "score_weight": 25,
    },
    {
        "id": "broad_confidentiality",
        "label": "Broad Confidentiality",
        "keywords": ["all information", "any information disclosed", "without exception", "including but not limited to all"],
        "description": "The definition of confidential information is too broad and may restrict normal business.",
        "severity": "medium",
        "score_weight": 15,
    },
    {
        "id": "no_termination",
        "label": "No Termination Clause",
        "keywords": [],
        "anti_keywords": ["terminat", "cancel", "end of agreement", "notice period"],
        "description": "The agreement lacks a clear termination clause for mutual exit.",
        "severity": "medium",
        "score_weight": 15,
    },
    {
        "id": "unilateral_amendment",
        "label": "Unilateral Amendment Rights",
        "keywords": ["reserves the right to modify", "may change at any time", "sole discretion to amend"],
        "description": "One party can change the terms without consent from the other.",
        "severity": "high",
        "score_weight": 20,
    },
    {
        "id": "auto_renewal",
        "label": "Auto-Renewal Clause",
        "keywords": ["automatically renew", "auto-renew", "automatically extend"],
        "description": "Agreement renews automatically, which may create unexpected obligations.",
        "severity": "low",
        "score_weight": 8,
    },
    {
        "id": "indemnification",
        "label": "Broad Indemnification",
        "keywords": ["indemnify and hold harmless", "shall indemnify", "bear all costs"],
        "description": "Broad indemnification clause may expose you to significant costs.",
        "severity": "high",
        "score_weight": 20,
    },
    {
        "id": "jurisdiction",
        "label": "Unfavorable Jurisdiction",
        "keywords": ["courts of", "jurisdiction of", "laws of"],
        "description": "Disputes may need to be resolved in a specific, potentially unfavorable location.",
        "severity": "low",
        "score_weight": 5,
    },
    {
        "id": "ip_assignment",
        "label": "IP Assignment",
        "keywords": ["assign all intellectual property", "work for hire", "all rights assigned"],
        "description": "Agreement may assign intellectual property rights broadly.",
        "severity": "medium",
        "score_weight": 12,
    },
]

def rule_based_analysis(parsed: Dict[str, Any]) -> List[Dict]:
    full_text = parsed.get("raw_text", "").lower()
    if not full_text:
        # Reconstruct from sections
        parts = []
        for section in parsed.get("sections", []):
            for clause in section.get("clauses", []):
                parts.append(clause["text"])
        full_text = " ".join(parts).lower()

    flags = []
    for rule in RISK_RULES:
        triggered = False
        # Keyword match
        for kw in rule.get("keywords", []):
            if kw.lower() in full_text:
                triggered = True
                break

        # Anti-keyword check (flag if NONE of anti_keywords found)
        if not triggered and "anti_keywords" in rule:
            found_any = any(ak in full_text for ak in rule["anti_keywords"])
            if not found_any:
                triggered = True

        if triggered:
            flags.append({
                "id": rule["id"],
                "label": rule["label"],
                "description": rule["description"],
                "severity": rule["severity"],
                "score_weight": rule["score_weight"],
            })

    return flags

def calculate_score(flags: List[Dict], total_clauses: int) -> int:
    base_score = 100
    deductions = sum(f["score_weight"] for f in flags)
    clause_penalty = max(0, (total_clauses - 5) * 0.5)
    score = max(0, base_score - deductions - clause_penalty)
    # Invert: higher score = higher risk
    risk_score = min(100, int(100 - score + len(flags) * 2))
    return max(0, min(100, risk_score))

async def analyze_risk_with_gemini(parsed: Dict, rule_flags: List[Dict]) -> Dict:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        text_snippet = parsed.get("raw_text", "")[:4000]
        prompt = f"""You are a legal risk analyst. Analyze this legal document and identify additional risks beyond these already found: {[f['label'] for f in rule_flags]}.

Document text:
{text_snippet}

Return ONLY valid JSON:
{{
  "additional_flags": [
    {{
      "id": "unique_id",
      "label": "Risk Name",
      "description": "What the risk means",
      "severity": "high|medium|low",
      "score_weight": 5-25
    }}
  ],
  "overall_assessment": "Brief overall risk assessment in 1-2 sentences"
}}"""

        response = model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        import json
        result = json.loads(raw)
        return result
    except Exception:
        return {"additional_flags": [], "overall_assessment": ""}

async def analyze_risk(parsed: Dict[str, Any]) -> Dict[str, Any]:
    all_clauses = []
    for section in parsed.get("sections", []):
        all_clauses.extend(section.get("clauses", []))

    rule_flags = rule_based_analysis(parsed)

    ai_result = {"additional_flags": [], "overall_assessment": ""}
    if not USE_MOCK and GEMINI_API_KEY:
        ai_result = await analyze_risk_with_gemini(parsed, rule_flags)

    all_flags = rule_flags + ai_result.get("additional_flags", [])
    score = calculate_score(all_flags, len(all_clauses))

    if not all_flags:
        all_flags = [
            {
                "id": "broad_confidentiality",
                "label": "Broad Confidentiality",
                "description": "The definition of confidential information may restrict normal business operations.",
                "severity": "medium",
                "score_weight": 15,
            },
            {
                "id": "no_termination",
                "label": "No Termination Clause",
                "description": "The agreement lacks a clear termination clause for mutual exit.",
                "severity": "medium",
                "score_weight": 15,
            },
        ]
        score = 35

    return {
        "score": score,
        "flags": all_flags,
        "overall_assessment": ai_result.get("overall_assessment", ""),
    }
