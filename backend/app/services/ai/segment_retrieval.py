"""
Segment retrieval service for finding relevant content segments based on user queries.
"""

import uuid

from fastapi import Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.sql import select, text

from app.api.deps import get_db
from app.models.content import Segment
from app.services.ai.embedding import get_embedding


class SegmentRetrievalService:
    """Service for retrieving relevant content segments."""

    def __init__(self, db: Session):
        self.db = db

    async def retrieve_segments(
        self,
        query: str,
        content_item_id: uuid.UUID | None = None,
        max_segments: int = 10,
        similarity_threshold: float = 0.7,
    ) -> list[tuple[Segment, float]]:
        """
        Retrieve relevant segments based on query.

        Args:
            query: User query
            content_item_id: Optional content item ID to limit search
            max_segments: Maximum number of segments to return
            similarity_threshold: Minimum similarity score

        Returns:
            List of (segment, similarity_score) tuples
        """
        # Get query embedding
        query_embedding = await get_embedding(query)

        # Build base query
        base_query = select(Segment)

        if content_item_id:
            base_query = base_query.where(Segment.content_item_id == content_item_id)

        # If we have embeddings, use vector similarity
        if query_embedding:
            # Only get segments that have embeddings - use text-based filtering for JSONB
            query_with_vectors = base_query.filter(
                text("content_vector IS NOT NULL")
            ).limit(max_segments * 2)

            segments_with_vectors = self.db.exec(query_with_vectors)

            results = []
            for segment in segments_with_vectors:
                if segment.content_vector:
                    similarity = self._calculate_cosine_similarity(
                        query_embedding, segment.content_vector
                    )
                    if similarity >= similarity_threshold:
                        results.append((segment, similarity))

            # Sort by similarity and take top results
            results.sort(key=lambda x: x[1], reverse=True)
            return results[:max_segments]

        # Fallback to text search if no embeddings
        return await self._text_based_retrieval(query, base_query, max_segments)

    async def _text_based_retrieval(
        self, query: str, base_query, max_segments: int
    ) -> list[tuple[Segment, float]]:
        """Fallback text-based retrieval using keyword matching."""
        # Simple keyword-based search
        keywords = query.lower().split()

        # Use PostgreSQL full-text search if available
        search_query = base_query.where(
            func.lower(Segment.content).contains(query.lower())
        ).limit(max_segments)

        results = []
        for segment in self.db.exec(search_query):
            # Calculate simple keyword match score
            content_lower = segment.content.lower()
            matches = sum(1 for keyword in keywords if keyword in content_lower)
            score = matches / len(keywords) if keywords else 0

            if score > 0:
                results.append((segment, score))

        # Sort by score
        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def _calculate_cosine_similarity(
        self, vec1: list[float], vec2: list[float]
    ) -> float:
        """Calculate cosine similarity between two vectors."""
        if len(vec1) != len(vec2):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec1, vec2, strict=False))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    async def get_segments_by_content_item(
        self, content_item_id: uuid.UUID
    ) -> list[Segment]:
        """Get all segments for a specific content item."""
        query = (
            select(Segment)
            .where(Segment.content_item_id == content_item_id)
            .order_by(Segment.segment_index)
        )

        return list(self.db.exec(query))


# Dependency injection
def get_segment_retrieval_service(
    db: Session = Depends(get_db),
) -> SegmentRetrievalService:
    """Get segment retrieval service instance."""
    return SegmentRetrievalService(db)
