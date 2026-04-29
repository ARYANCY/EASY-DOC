import asyncio
from app.features.search.search_service import search_documents
from app.core.llm.provider import get_llm_response
from app.core.llm.prompt_builder import PromptBuilder
from app.db.connection import get_db


async def chat_with_document(query: str, document_id: str | None = None) -> dict:
    """Chat with document using RAG with parallel processing."""
    
    # Retrieve relevant context
    results = await search_documents(query, document_id, top_k=5)
    
    # Build context from search results
    context = "\n\n".join([r["text"] for r in results])
    
    # Get document info if available
    doc_info = None
    if document_id:
        db = get_db()
        doc_info = await db.documents.find_one({"documentId": document_id})
    
    # Add document metadata context if available
    if doc_info:
        context = f"Document: {doc_info.get('filename', 'Unknown')}\n\n{context}"
    
    # Generate response with structured prompt
    prompt = PromptBuilder.chat(context, query)
    answer = await get_llm_response(prompt, temperature=0.5)
    
    return {
        "answer": answer,
        "sources": results,
        "query": query,
        "document_id": document_id
    }


async def batch_chat(queries: list, document_id: str | None = None) -> list:
    """Process multiple chat queries in parallel."""
    tasks = [chat_with_document(q, document_id) for q in queries]
    return await asyncio.gather(*tasks, return_exceptions=True)
