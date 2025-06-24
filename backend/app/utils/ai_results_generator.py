"""
⚠️  DEPRECATED: This module is deprecated and will be removed in future versions.

Use PreprocessingPipeline instead for unified AI processing with better quality content.

This utility generates basic AI analysis results for a content item.
It was used as a lightweight fallback when the full PreprocessingPipeline was not available.
Now that PreprocessingPipeline is mature and handles markdown content properly,
this fallback is no longer needed.

Migration path: Replace calls to generate_and_store_basic_ai_results() with
PreprocessingPipeline._ai_initialization_layer() which provides:
- Better content quality (markdown processed)
- Complete document_metadata context
- Unified template processing
- Better error handling
"""

from __future__ import annotations

import collections
import logging
import re
import uuid
import warnings
from typing import Any

from sqlmodel import Session, select

from app.models.content import AIResult, ContentItem
from app.services.ai.chat_service import ChatService

logger = logging.getLogger(__name__)


async def generate_and_store_basic_ai_results(
    session: Session, content_item: ContentItem, markdown_content: str
) -> None:
    """
    ⚠️  DEPRECATED: Use PreprocessingPipeline._ai_initialization_layer() instead.

    Generate a very basic AIResult entry and upsert into the database.

    This function is *idempotent*: running it multiple times for the same
    ``content_item`` will simply update the existing ``ai_results`` row without
    creating duplicates because the ``content_item_id`` column on ``AIResult`` is
    unique.
    """

    warnings.warn(
        "generate_and_store_basic_ai_results is deprecated. "
        "Use PreprocessingPipeline._ai_initialization_layer() for better AI processing.",
        DeprecationWarning,
        stacklevel=2,
    )

    # Skip if empty
    if not markdown_content.strip():
        logger.warning(
            "AI result generation skipped because content is empty for %s",
            content_item.id,
        )
        return

    chat_service = ChatService()

    # Very small context for the mock templates
    context: dict[str, Any] = {
        "content": markdown_content[:8000]  # Limit size to keep it light
    }

    # Generate each piece. ChatService methods are async.
    summary_resp = await chat_service.generate_with_template("summary.j2", context)
    key_points_resp = await chat_service.generate_with_template(
        "key_points.j2", context
    )
    labels_resp = await chat_service.generate_with_template("labels.j2", context)

    # Normalize outputs (could be dict with json, dict with text, or plain str)
    def _normalize(resp, main_key):
        if isinstance(resp, dict):
            if main_key in resp:
                return resp[main_key]
            if "text" in resp:
                return {"text": resp["text"]}
        elif isinstance(resp, str):
            return {"text": resp}
        return {}

    summary = _normalize(summary_resp, "summary")
    key_points = _normalize(key_points_resp, "key_points")

    if isinstance(labels_resp, dict) and "tags" in labels_resp:
        labels = labels_resp["tags"]
    elif isinstance(labels_resp, list):
        labels = labels_resp
    else:
        labels = []

    # 优先使用 LLM 生成的阅读时间，否则回退到算法估算
    ai_reading_time = (
        labels_resp.get("reading_time_minutes")
        if isinstance(labels_resp, dict)
        else None
    )
    if (
        ai_reading_time is not None
        and isinstance(ai_reading_time, int)
        and ai_reading_time > 0
    ):
        reading_time_minutes = ai_reading_time
    else:
        # 回退到算法估算（每分钟200词）
        reading_time_minutes = max(1, len(markdown_content.split()) // 200)

    # Basic content analysis fallback
    analysis: dict[str, Any] = {
        "word_count": len(markdown_content.split()),
        "char_count": len(markdown_content),
        "unique_words": len(set(markdown_content.split())),
        "contains_code": "```" in markdown_content,
    }

    # Very naive quality score: ratio of unique words to total words (0-1), scaled
    quality_score = round(
        min(1.0, analysis["unique_words"] / max(1, analysis["word_count"])) * 5, 2
    )

    # ---------------- Heuristic fallback if AI failed ----------------
    if not summary:
        # Take first 120 characters as summary text
        summary_text = markdown_content.strip().replace("\n", " ")[:120]
        summary = {"text": summary_text}

    if not key_points:
        # Very naive key point extraction: top 3 frequent words >4 chars
        tokens = re.findall(r"[A-Za-z\u4e00-\u9fa5]{4,}", markdown_content.lower())
        common = [word for word, _ in collections.Counter(tokens).most_common(5)]
        key_points = {"points": common}

    # Upsert logic
    existing: AIResult | None = session.exec(
        select(AIResult).where(AIResult.content_item_id == content_item.id)
    ).first()

    if existing:
        existing.summary = summary
        existing.key_points = key_points
        existing.labels = labels
        existing.reading_time_minutes = reading_time_minutes
        existing.difficulty_level = "intermediate"
        existing.content_quality_score = quality_score
        existing.content_analysis = analysis
        session.add(existing)
        logger.info("Updated existing AIResult for %s", content_item.id)
    else:
        ai_result = AIResult(
            id=uuid.uuid4(),
            content_item_id=content_item.id,
            summary=summary,
            key_points=key_points,
            labels=labels,
            reading_time_minutes=reading_time_minutes,
            difficulty_level="intermediate",
            content_quality_score=quality_score,
            content_analysis=analysis,
        )
        session.add(ai_result)
        logger.info("Created new AIResult for %s", content_item.id)

    # The caller is responsible for committing the session.
