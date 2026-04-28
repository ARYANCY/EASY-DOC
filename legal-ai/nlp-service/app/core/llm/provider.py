import asyncio
import google.generativeai as genai
from app.core.config import settings

# Configure Gemini (primary)
genai.configure(api_key=settings.gemini_api_key)

# Fallback configurations
_FALLBACK_PROVIDERS = []

# Try to configure OpenAI fallback
try:
    import openai
    if settings.openai_api_key:
        openai.api_key = settings.openai_api_key
        _FALLBACK_PROVIDERS.append('openai')
except ImportError:
    pass


async def get_llm_response(prompt: str, temperature: float = 0.7, max_retries: int = 2) -> str:
    """Get response from LLM with automatic fallback."""
    
    # Try Gemini first
    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')  # Updated model
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: model.generate_content(
                    prompt,
                    generation_config={
                        'temperature': temperature,
                        'max_output_tokens': 4096,
                    }
                )
            )
            return response.text
        except Exception as e:
            print(f"Gemini attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
    
    # Try OpenAI fallback
    if 'openai' in _FALLBACK_PROVIDERS:
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=2048
                )
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI fallback failed: {e}")
    
    return "Unable to generate response. All LLM providers failed."


async def simplify_text(text: str) -> str:
    """Simplify legal text to plain English."""
    from app.core.llm.prompt_builder import PromptBuilder
    prompt = PromptBuilder.simplify(text[:8000])
    return await get_llm_response(prompt, temperature=0.3)


async def batch_process(prompts: list, temperature: float = 0.7) -> list:
    """Process multiple prompts in parallel."""
    tasks = [get_llm_response(p, temperature) for p in prompts]
    return await asyncio.gather(*tasks, return_exceptions=True)
