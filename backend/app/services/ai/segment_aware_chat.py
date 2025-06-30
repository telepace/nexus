"""
Segment-aware chat service that provides AI responses with segment references.
"""

import json
import logging
import uuid
from pathlib import Path
from typing import Any

import jinja2
from sqlalchemy.orm import Session

from app.models.content import AIConversation, MessageSegmentReference, Segment
from app.services.ai.chat_service import ChatService
from app.services.ai.segment_retrieval import SegmentRetrievalService
from app.utils.timezone import now_utc

logger = logging.getLogger(__name__)


class SegmentAwareChatService:
    """AI chat service that tracks segment references in responses."""

    def __init__(self, db: Session):
        self.db = db
        self.retrieval_service = SegmentRetrievalService(db)
        self.chat_service = ChatService()

        # Setup Jinja2 template environment
        template_dir = Path(__file__).parent.parent.parent / "prompt_templates"
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(template_dir),
            autoescape=jinja2.select_autoescape(["html", "xml"]),
        )

    async def chat_with_segments(
        self,
        user_message: str,
        conversation_id: uuid.UUID,
        content_item_id: uuid.UUID | None = None,
        max_segments: int = 8,
        model: str = "gpt-4o-mini",
    ) -> dict[str, Any]:
        """
        Generate AI response with segment references.

        Args:
            user_message: User's question/message
            conversation_id: ID of the conversation
            content_item_id: Optional content item to limit search to
            max_segments: Maximum segments to include in context
            model: AI model to use

        Returns:
            Dict containing response and segment references
        """
        try:
            # 1. Retrieve relevant segments
            segments_with_scores = await self.retrieval_service.retrieve_segments(
                query=user_message,
                content_item_id=content_item_id,
                max_segments=max_segments,
                similarity_threshold=0.3,  # Lower threshold for more coverage
            )

            if not segments_with_scores:
                # Fallback to regular chat if no segments found
                response = await self.chat_service.generate_with_template(
                    "simple_chat.j2", {"user_message": user_message}, model
                )
                return {
                    "response": response,
                    "segment_references": [],
                    "segments_used": [],
                }

            # 2. Prepare segments for prompt
            segments = [segment for segment, score in segments_with_scores]

            # 3. Get AI response using template directly
            ai_response = await self.chat_service.generate_with_template(
                "segment_aware_chat.j2",
                {"user_question": user_message, "segments": segments},
                model
            )

            # 4. Parse response to extract segment references
            parsed_response = await self._parse_ai_response(ai_response)

            # 5. Validate and clean segment references
            validated_references = await self._validate_segment_references(
                parsed_response.get("segment_references", []), segments
            )

            # 6. Store segment references in database
            conversation = self.db.get(AIConversation, conversation_id)
            if conversation:
                message_index = len(json.loads(conversation.messages))
                await self._store_segment_references(
                    conversation_id, message_index, validated_references
                )

            return {
                "response": parsed_response.get("answer", ai_response),
                "segment_references": validated_references,
                "segments_used": [
                    {
                        "id": str(segment.id),
                        "content": segment.content[:200] + "..."
                        if len(segment.content) > 200
                        else segment.content,
                        "segment_index": segment.segment_index,
                    }
                    for segment in segments
                ],
            }

        except Exception as e:
            logger.error(f"Error in segment-aware chat: {e}")
            # Fallback to regular chat
            response = await self.chat_service.generate_with_template(
                "simple_chat.j2", {"user_message": user_message}, model
            )
            return {
                "response": response,
                "segment_references": [],
                "segments_used": [],
                "error": str(e),
            }

    async def _generate_prompt(self, user_message: str, segments: list[Segment]) -> str:
        """Generate prompt using Jinja2 template."""
        template = self.jinja_env.get_template("segment_aware_chat.j2")

        return template.render(user_question=user_message, segments=segments)

    async def _parse_ai_response(self, response: str) -> dict[str, Any]:
        """Parse AI response to extract structured data."""
        try:
            # Try to find JSON in the response
            start_idx = response.find("{")
            end_idx = response.rfind("}") + 1

            if start_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # If no JSON found, return the response as-is
                return {"answer": response, "segment_references": []}

        except json.JSONDecodeError:
            logger.warning(f"Failed to parse AI response as JSON: {response[:100]}...")
            return {"answer": response, "segment_references": []}

    async def _validate_segment_references(
        self, references: list[dict[str, Any]], available_segments: list[Segment]
    ) -> list[dict[str, Any]]:
        """Validate and clean segment references."""
        available_segment_ids = {str(segment.id) for segment in available_segments}
        validated_references = []

        for ref in references:
            if not isinstance(ref, dict):
                continue

            # Clean segment IDs
            segment_ids = ref.get("segment_ids", [])
            if isinstance(segment_ids, list):
                valid_segment_ids = [
                    seg_id
                    for seg_id in segment_ids
                    if str(seg_id) in available_segment_ids
                ]

                if valid_segment_ids:  # Only include if has valid segments
                    validated_references.append(
                        {
                            "sentence_index": ref.get("sentence_index", 0),
                            "segment_ids": valid_segment_ids,
                            "relevance_score": ref.get("relevance_score", 0.5),
                        }
                    )

        return validated_references

    async def _store_segment_references(
        self,
        conversation_id: uuid.UUID,
        message_index: int,
        references: list[dict[str, Any]],
    ) -> None:
        """Store segment references in the database."""
        try:
            for ref in references:
                for segment_id in ref.get("segment_ids", []):
                    segment_ref = MessageSegmentReference(
                        conversation_id=conversation_id,
                        message_index=message_index,
                        segment_id=uuid.UUID(str(segment_id)),
                        sentence_index=ref.get("sentence_index"),
                        relevance_score=ref.get("relevance_score"),
                        created_at=now_utc(),
                    )
                    self.db.add(segment_ref)

            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to store segment references: {e}")
            self.db.rollback()

    async def get_conversation_segment_references(
        self, conversation_id: uuid.UUID
    ) -> dict[int, list[dict[str, Any]]]:
        """Get all segment references for a conversation, grouped by message index."""
        from sqlalchemy import select

        query = (
            select(MessageSegmentReference)
            .where(MessageSegmentReference.conversation_id == conversation_id)
            .order_by(
                MessageSegmentReference.message_index,
                MessageSegmentReference.sentence_index,
            )
        )

        references = list(self.db.exec(query))

        # Group by message index
        grouped_refs: dict[int, list[dict[str, Any]]] = {}
        for ref in references:
            msg_idx = ref.message_index
            if msg_idx not in grouped_refs:
                grouped_refs[msg_idx] = []

            grouped_refs[msg_idx].append(
                {
                    "sentence_index": ref.sentence_index,
                    "segment_id": str(ref.segment_id),
                    "relevance_score": ref.relevance_score,
                }
            )

        return grouped_refs
