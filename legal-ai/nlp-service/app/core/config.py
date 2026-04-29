import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
MONGODB_URI    = os.getenv("MONGODB_URI", "")

USE_MOCK = not bool(GEMINI_API_KEY)
