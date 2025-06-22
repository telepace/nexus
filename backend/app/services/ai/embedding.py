"""
Embedding service for generating vector representations of text.
"""

import logging

import openai

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self):
        self.client = None
        if hasattr(settings, "OPENAI_API_KEY") and settings.OPENAI_API_KEY:
            self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def get_embedding(
        self, text: str, model: str = "text-embedding-3-small"
    ) -> list[float] | None:
        """
        Get embedding for a single text.

        Args:
            text: Text to embed
            model: Embedding model to use

        Returns:
            List of floats representing the embedding, or None if failed
        """
        if not self.client:
            logger.warning(
                "OpenAI client not configured, skipping embedding generation"
            )
            return None

        try:
            # Clean and truncate text if too long
            cleaned_text = text.strip()[:8000]  # Limit to 8000 chars for safety

            response = await self.client.embeddings.create(
                input=cleaned_text, model=model
            )

            return response.data[0].embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    async def get_embeddings_batch(
        self, texts: list[str], model: str = "text-embedding-3-small"
    ) -> list[list[float] | None]:
        """
        Get embeddings for multiple texts in batch.

        Args:
            texts: List of texts to embed
            model: Embedding model to use

        Returns:
            List of embeddings (or None for failed ones)
        """
        if not self.client:
            logger.warning(
                "OpenAI client not configured, skipping embedding generation"
            )
            return [None] * len(texts)

        try:
            # Clean and truncate texts
            cleaned_texts = [text.strip()[:8000] for text in texts]

            response = await self.client.embeddings.create(
                input=cleaned_texts, model=model
            )

            return [data.embedding for data in response.data]

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return [None] * len(texts)


# Global service instance
_embedding_service = None


def get_embedding_service() -> EmbeddingService:
    """Get the global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


async def get_embedding(
    text: str, model: str = "text-embedding-3-small"
) -> list[float] | None:
    """Convenience function to get embedding for a single text."""
    service = get_embedding_service()
    return await service.get_embedding(text, model)


async def get_embeddings_batch(
    texts: list[str], model: str = "text-embedding-3-small"
) -> list[list[float] | None]:
    """Convenience function to get embeddings for multiple texts."""
    service = get_embedding_service()
    return await service.get_embeddings_batch(texts, model)
