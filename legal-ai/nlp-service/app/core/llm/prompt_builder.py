class PromptBuilder:
    """Build prompts for different legal AI tasks."""
    
    @staticmethod
    def chat(context: str, query: str) -> str:
        return f"""Based on the following legal document context, answer the user's question.
If the answer cannot be found in the context, say so clearly.

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
