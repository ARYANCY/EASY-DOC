from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # LLM Providers
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    groq_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    groq_model: str = "llama-3.1-8b-instant"
    openai_model: str = "gpt-4o-mini"
    
    # Database
    mongodb_uri: str = "mongodb://localhost:27017"
    faiss_index_path: str = "./faiss_index"
    
    # Performance
    max_workers: int = 4
    embedding_batch_size: int = 32
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
