"""
Segment retrieval service for finding relevant content segments based on user queries.
"""

import re
import uuid

from fastapi import Depends
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

            segments_with_vectors = self.db.exec(query_with_vectors).all()

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
        # Simple keyword-based search - handle Chinese text better
        query_lower = query.lower()

        # For Chinese text, split by common punctuation and also try to extract key terms
        # Split by punctuation and filter out empty strings
        keywords = [
            k.strip()
            for k in re.split(r"[？。，、！；：\s]+", query_lower)
            if k.strip()
        ]

        # Filter out common question words for better matching
        question_words = {
            "什么",
            "什么是",
            "怎么",
            "如何",
            "为什么",
            "哪里",
            "哪个",
            "谁",
            "吗",
            "呢",
        }
        filtered_keywords = []

        for keyword in keywords:
            # Skip pure question words
            if keyword in question_words:
                continue
            # Remove question words from the beginning of keywords
            for qw in question_words:
                if keyword.startswith(qw):
                    keyword = keyword[len(qw) :].strip()
                    break
            if keyword:  # Only add non-empty keywords
                filtered_keywords.append(keyword)

        # If no keywords found after filtering, use original keywords
        if not filtered_keywords:
            filtered_keywords = keywords

        # If still no keywords, use the original query
        if not filtered_keywords:
            filtered_keywords = [query_lower]

        # Execute the base query first to get all segments, then filter in Python
        # This avoids potential issues with SQLAlchemy's query compilation
        segments = self.db.exec(
            base_query.limit(max_segments * 10)
        ).all()  # Get more to filter

        results = []
        for segment_row in segments:
            # Handle SQLAlchemy Row objects
            if hasattr(segment_row, "_data") and hasattr(segment_row, "__getitem__"):
                # This is a SQLAlchemy Row object, extract the actual Segment
                segment = segment_row[
                    0
                ]  # The first (and only) column is the Segment object
            else:
                segment = segment_row

            # Now segment should be a proper Segment object
            if not hasattr(segment, "content"):
                continue

            # Calculate keyword match score - use substring matching for Chinese
            content_lower = segment.content.lower()
            matches = 0
            for keyword in filtered_keywords:
                if keyword in content_lower:
                    matches += 1

            score = matches / len(filtered_keywords) if filtered_keywords else 0

            if score > 0:
                results.append((segment, score))

        # Sort by score and take top results
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:max_segments]

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

        return list(self.db.exec(query).all())


# Dependency injection
def get_segment_retrieval_service(
    db: Session = Depends(get_db),
) -> SegmentRetrievalService:
    """Get segment retrieval service instance."""
    return SegmentRetrievalService(db)
