import re
from typing import Any, Dict
from app.core.config import GEMINI_API_KEY, USE_MOCK

async def simplify_text(text: str) -> str:
    if not USE_MOCK and GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""You are a legal simplification expert. Convert the following legal clause into clear, plain English that anyone can understand. Be concise (2-4 sentences max). Do NOT use legal jargon.

Legal text:
{text}

Plain English version:"""
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            pass

    # Fallback mock simplification
    simplified_map = {
        "confidential": "This means all private information shared between the parties must be kept secret.",
        "liability": "This section explains who is responsible if something goes wrong and what compensation may be owed.",
        "terminat": "This explains how and when either party can end this agreement.",
        "payment": "This covers how and when money needs to be paid.",
        "governing": "This states which country or state's laws will be used to resolve any disagreements.",
        "intellectual": "This covers who owns any creative work or inventions made during this agreement.",
        "indemnif": "This means one party agrees to cover costs if the other party faces legal trouble because of this agreement.",
        "warrant": "This contains promises about the quality and accuracy of what is being provided.",
    }

    text_lower = text.lower()
    for keyword, explanation in simplified_map.items():
        if keyword in text_lower:
            return explanation

    return f"In simple terms: {text[:200]}... This clause sets out specific rights and obligations that both parties agree to follow."
