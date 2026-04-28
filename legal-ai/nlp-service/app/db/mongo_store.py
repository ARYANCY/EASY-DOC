from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = AsyncIOMotorClient(settings.mongodb_uri)
db = client.legal_ai


async def store_document(document_id: str, data: dict):
    """Store document in MongoDB."""
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": data},
        upsert=True
    )


async def get_document(document_id: str) -> dict | None:
    """Retrieve document from MongoDB."""
    return await db.documents.find_one({"document_id": document_id})


async def delete_document(document_id: str):
    """Delete document from MongoDB."""
    await db.documents.delete_one({"document_id": document_id})
