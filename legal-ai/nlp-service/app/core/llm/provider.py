import asyncio
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy initialization flags
_gemini_configured = False
_gemini_available = False
_openai_available = False

# Try to configure Gemini
def _configure_gemini():
    global _gemini_configured, _gemini_available
    if _gemini_configured:
        return _gemini_available
    
    _gemini_configured = True
    if not settings.gemini_api_key:
        logger.warning("Gemini API key not configured")
        return False
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        _gemini_available = True
        logger.info("Gemini configured successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
        return False

# Try to configure OpenAI
def _configure_openai():
    global _openai_available
    if _openai_available:
        return True
    
    if not settings.openai_api_key:
        logger.warning("OpenAI API key not configured")
        return False
    
    try:
        import openai
        # New SDK style
        openai.api_key = settings.openai_api_key
        _openai_available = True
        logger.info("OpenAI configured successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to configure OpenAI: {e}")
        return False


async def get_llm_response(prompt: str, temperature: float = 0.7, max_retries: int = 2) -> str:
    """Get response from LLM with automatic fallback."""
    
    # Try Gemini first
    if _configure_gemini():
        import google.generativeai as genai
        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
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
                logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
    
    # Try OpenAI fallback
    if _configure_openai():
        try:
            import openai
            # Use new SDK API
            client = openai.OpenAI(api_key=settings.openai_api_key)
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=2048
                )
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI fallback failed: {e}")
    
    return "Unable to generate response. Please configure GEMINI_API_KEY or OPENAI_API_KEY in your .env file."


async def simplify_text(text: str) -> str:
    """Simplify legal text to plain English."""
    from app.core.llm.prompt_builder import PromptBuilder
    prompt = PromptBuilder.simplify(text[:8000])
    return await get_llm_response(prompt, temperature=0.3)


async def batch_process(prompts: list, temperature: float = 0.7) -> list:
    """Process multiple prompts in parallel."""
    tasks = [get_llm_response(p, temperature) for p in prompts]
    return await asyncio.gather(*tasks, return_exceptions=True)
