import asyncio
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy initialization flags
_gemini_configured = False
_gemini_available = False
_openai_available = False
_groq_available = False


def _has_real_key(value: str | None) -> bool:
    if not value:
        return False
    lowered = value.strip().lower()
    return not (
        lowered.startswith("your_")
        or lowered.endswith("_optional")
        or lowered in {"optional", "none", "null", "changeme"}
    )

# Try to configure Gemini
def _configure_gemini():
    global _gemini_configured, _gemini_available
    if _gemini_configured:
        return _gemini_available
    
    _gemini_configured = True
    if not _has_real_key(settings.gemini_api_key):
        logger.warning("Gemini API key not configured")
        return False
    
    try:
        from google import genai  # noqa: F401
        logger.info("Gemini configured successfully with google-genai")
        _gemini_available = True
        return True
    except Exception as e:
        logger.warning(f"Gemini unavailable. Install google-genai or rely on fallback providers: {e}")
        return False

# Try to configure OpenAI
def _configure_openai():
    global _openai_available
    if _openai_available:
        return True
    
    if not _has_real_key(settings.openai_api_key):
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


def _configure_groq():
    global _groq_available
    if _groq_available:
        return True

    if not _has_real_key(settings.groq_api_key):
        logger.warning("Groq API key not configured")
        return False

    try:
        import groq  # noqa: F401
        _groq_available = True
        logger.info("Groq configured successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to configure Groq: {e}")
        return False


async def _call_gemini(prompt: str, temperature: float):
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    return await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=4096,
            ),
        ),
    )


async def get_llm_response(prompt: str, temperature: float = 0.7, max_retries: int = 2) -> str:
    """Get response from LLM with automatic fallback."""
    
    # Try Gemini first
    if _configure_gemini():
        for attempt in range(max_retries):
            try:
                response = await _call_gemini(prompt, temperature)
                text = getattr(response, "text", None)
                if text:
                    return text
                candidates = getattr(response, "candidates", None) or []
                if candidates:
                    parts = getattr(candidates[0].content, "parts", []) or []
                    joined = "".join(getattr(part, "text", "") for part in parts).strip()
                    if joined:
                        return joined
                raise ValueError("Gemini returned an empty response")
            except Exception as e:
                logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)

    # Try Groq fallback
    if _configure_groq():
        try:
            from groq import Groq
            client = Groq(api_key=settings.groq_api_key)
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.chat.completions.create(
                    model=settings.groq_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=2048,
                )
            )
            content = response.choices[0].message.content
            if content:
                return content
            raise ValueError("Groq returned an empty response")
        except Exception as e:
            logger.error(f"Groq fallback failed: {e}")
    
    # Try OpenAI fallback
    if _configure_openai():
        try:
            import openai
            # Use new SDK API
            client = openai.OpenAI(api_key=settings.openai_api_key)
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.chat.completions.create(
                    model=settings.openai_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=2048
                )
            )
            content = response.choices[0].message.content
            if content:
                return content
            raise ValueError("OpenAI returned an empty response")
        except Exception as e:
            logger.error(f"OpenAI fallback failed: {e}")
    
    return "Unable to generate response. Please configure GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in your .env file."


async def simplify_text(text: str) -> str:
    """Simplify legal text to plain English."""
    from app.core.llm.prompt_builder import PromptBuilder
    prompt = PromptBuilder.simplify(text[:8000])
    return await get_llm_response(prompt, temperature=0.3)


async def batch_process(prompts: list, temperature: float = 0.7) -> list:
    """Process multiple prompts in parallel."""
    tasks = [get_llm_response(p, temperature) for p in prompts]
    return await asyncio.gather(*tasks, return_exceptions=True)
