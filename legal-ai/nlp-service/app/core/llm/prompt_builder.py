class PromptBuilder:
    """Build prompts for different legal AI tasks."""
    
    @staticmethod
    def chat(context: str, query: str) -> str:
        return f"""You are a legal document analysis assistant. Your task is to answer questions based on the provided legal document context.

Instructions:
1. Answer ONLY using the provided context below
2. If the answer is not in the context, say "I cannot find this information in the provided documents"
3. Cite the source document when providing information (use [Source: filename])
4. Be concise but complete
5. Use legal terminology appropriately

Context:
{context}

Question: {query}

Answer:"""
    
    @staticmethod
    def simplify(text: str) -> str:
        return f"""Convert this legal text into simple, plain English that anyone can understand:

Legal text:
{text}

Plain English explanation:"""
    
    @staticmethod
    def risk_analysis(text: str) -> str:
        return f"""Analyze this legal document for risks and summarize key concerns:

{text}

Provide a brief risk summary:"""
