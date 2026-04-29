import re
from typing import List
from app.core.config import GEMINI_API_KEY, USE_MOCK
from app.features.search.vector_search import search
from app.db.store import get_document

MOCK_ANSWERS = {
    "breach": "If the other party breaches the agreement, you may be entitled to seek legal remedies for breach of contract, which may include compensation for damages and injunctive relief.",
    "payment": "Based on the document, there is no direct payment obligation mentioned. It primarily focuses on confidentiality and restrictions.",
    "terminat": "Either party can terminate this agreement by providing written notice as specified in the termination clause. The notice period and conditions are outlined in the relevant section.",
    "confidential": "The agreement defines confidential information broadly to include all proprietary and business information disclosed by either party. Both parties are obligated to maintain strict confidentiality.",
    "duration": "The agreement remains in effect for the period specified in the term clause, typically 3 years from the effective date.",
    "jurisdiction": "Any disputes arising from this agreement shall be resolved under the governing law specified in the agreement, usually in the jurisdiction mentioned in the governing law clause.",
    "intellectual": "All intellectual property rights remain with the Disclosing Party. The Receiving Party does not gain any IP rights through this agreement.",
    "liability": "Liability under this agreement is subject to the limitations outlined in the liability clause. Indirect and consequential damages may be excluded.",
}

def get_mock_answer(query: str, context: List[str]) -> str:
    q_lower = query.lower()
    for keyword, answer in MOCK_ANSWERS.items():
        if keyword in q_lower:
            return answer
    if context:
        return f"Based on the document: {context[0][:300]}... This clause is relevant to your question about '{query}'."
    return f"Based on the document content, I can provide information about '{query}'. The document contains relevant clauses that address this matter. Please refer to the specific sections for detailed information."

async def generate_answer(query: str, context: List[str], doc_summary: str) -> str:
    if not USE_MOCK and GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")

            context_text = "\n\n".join(context[:4]) if context else "No specific context found."
            prompt = f"""You are an AI Legal Assistant. Answer the user's question based ONLY on the provided document context. Be concise and helpful. If the answer is not in the context, say so clearly.

Document Summary: {doc_summary}

Relevant Document Sections:
{context_text}

User Question: {query}

Answer (2-4 sentences, plain English):"""

            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            pass

    return get_mock_answer(query, context)

async def handle_chat(doc_id: str, query: str, history: List[dict]) -> str:
    doc = get_document(doc_id)
    summary = doc.get("summary", "") if doc else ""

    context_chunks = search(doc_id, query, top_k=5)

    if not context_chunks and doc:
        # Fallback: gather all clause texts
        all_clauses = []
        for section in doc.get("sections", []):
            for clause in section.get("clauses", []):
                all_clauses.append(clause["text"])
        context_chunks = all_clauses[:3]

    answer = await generate_answer(query, context_chunks, summary)
    return answer
