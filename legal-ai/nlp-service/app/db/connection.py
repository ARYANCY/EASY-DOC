import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

# Connection with proper pooling
client: AsyncIOMotorClient = None


async def connect_db():
    """Connect to MongoDB with connection pooling."""
    global client
    try:
        client = AsyncIOMotorClient(
            settings.mongodb_uri,
            maxPoolSize=50,
            minPoolSize=10,
            maxIdleTimeMS=45000,
            serverSelectionTimeoutMS=5000,
            retryWrites=True
        )
        # Verify connection
        await client.admin.command('ping')
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")


def get_db():
    """Get database instance."""
    if client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return client.legal_ai


async def health_check() -> bool:
    """Check database health."""
    try:
        if client:
            await client.admin.command('ping')
            return True
    except Exception:
        pass
    return False
