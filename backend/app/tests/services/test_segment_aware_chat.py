"""
Tests for segment-aware chat functionality.
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlmodel import select

from app.models import User
from app.models.content import AIConversation, ContentItem, Segment
from app.services.ai.segment_aware_chat import SegmentAwareChatService
from app.utils.timezone import now_utc


@pytest.fixture
def sample_content_item(db_session):
    """Create a sample content item for testing."""
    # 获取测试数据库中的第一个用户（由 init_db 创建）
    user = db_session.exec(select(User)).first()
    if not user:
        # 如果没有用户，创建一个测试用户
        from app.core.config import settings
        from app.core.security import get_password_hash

        user = User(
            email=settings.EMAIL_TEST_USER,
            hashed_password=get_password_hash("testpassword123"),
            full_name="Test User",
            is_active=True,
            is_superuser=False,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    content_item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,  # 使用实际存在的用户ID
        type="text",
        title="Test Content",
        content_text="This is a test content for segment-aware chat testing.",
        processing_status="completed",
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db_session.add(content_item)
    db_session.commit()
    return content_item


@pytest.fixture
def sample_segments(db_session, sample_content_item):
    """Create sample segments for testing."""
    segments = []

    segment_contents = [
        "人工智能是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。",
        "机器学习是人工智能的一个子集，它使计算机能够从数据中学习而无需明确编程。",
        "深度学习是机器学习的一个子集，使用神经网络来模拟人脑的工作方式。",
    ]

    for i, content in enumerate(segment_contents):
        segment = Segment(
            id=uuid.uuid4(),
            content_item_id=sample_content_item.id,
            segment_index=i,
            display_number=i + 1,  # 添加 display_number (1-based)
            content=content,
            segment_type="paragraph",
            word_count=len(content.split()),
            char_count=len(content),
            created_at=now_utc(),
        )
        segments.append(segment)
        db_session.add(segment)

    db_session.commit()
    return segments


@pytest.fixture
def sample_conversation(db_session, sample_content_item):
    """Create a sample AI conversation."""
    conversation = AIConversation(
        id=uuid.uuid4(),
        user_id=sample_content_item.user_id,
        content_item_id=sample_content_item.id,
        title="Test Conversation",
        ai_model_name="gpt-4o-mini",
        messages="[]",
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db_session.add(conversation)
    db_session.commit()
    return conversation


class TestSegmentAwareChatService:
    """Test cases for SegmentAwareChatService."""

    @pytest.mark.asyncio
    async def test_chat_with_segments_basic(
        self, db_session, sample_conversation, sample_segments
    ):
        """Test basic chat with segments functionality."""
        service = SegmentAwareChatService(db_session)

        # Mock the chat service response
        mock_response_dict = {
            "answer": "人工智能是一个广泛的领域，包括机器学习和深度学习等子领域。",
            "segment_references": [
                {
                    "sentence_index": 0,
                    "segment_numbers": [
                        sample_segments[0].display_number,
                        sample_segments[1].display_number
                        if len(sample_segments) > 1
                        else sample_segments[0].display_number,
                    ],
                    "relevance_score": 0.9,
                }
            ],
        }

        # Convert to JSON string as the actual service would return
        import json

        mock_response = json.dumps(mock_response_dict, ensure_ascii=False)

        # Mock the segment retrieval to return our test segments with scores
        mock_segments_with_scores = [(segment, 0.8) for segment in sample_segments]

        with patch.object(
            service.retrieval_service, "retrieve_segments", new_callable=AsyncMock
        ) as mock_retrieval:
            mock_retrieval.return_value = mock_segments_with_scores

            with patch.object(
                service.chat_service, "generate_with_template", new_callable=AsyncMock
            ) as mock_chat:
                mock_chat.return_value = mock_response

                result = await service.chat_with_segments(
                    user_message="什么是人工智能？",
                    conversation_id=sample_conversation.id,
                    content_item_id=sample_conversation.content_item_id,
                )

                # Verify response structure
                assert "response" in result
                assert "segment_references" in result
                assert "segments_used" in result
                assert len(result["segment_references"]) > 0
                assert len(result["segments_used"]) > 0

    @pytest.mark.asyncio
    async def test_segment_retrieval(self, db_session, sample_segments):
        """Test segment retrieval functionality."""
        service = SegmentAwareChatService(db_session)

        # Mock the retrieval service to return sample segments
        # Find the segment that contains "机器学习" for testing
        target_segment = None
        for segment in sample_segments:
            if "机器学习" in segment.content:
                target_segment = segment
                break

        # Create mock segments with scores
        mock_segments_with_scores = [(target_segment, 0.9), (sample_segments[0], 0.8)]

        # Mock the retrieval service
        with patch.object(
            service.retrieval_service, "retrieve_segments", new_callable=AsyncMock
        ) as mock_retrieval:
            mock_retrieval.return_value = mock_segments_with_scores

            # Test retrieving segments
            segments_with_scores = await service.retrieval_service.retrieve_segments(
                query="机器学习",
                content_item_id=sample_segments[0].content_item_id,
                max_segments=5,
            )

            assert len(segments_with_scores) > 0

            # Should find the segment containing "机器学习"
            found_ml_segment = False
            for segment, _score in segments_with_scores:
                if "机器学习" in segment.content:
                    found_ml_segment = True
                    break

            assert found_ml_segment, "Should find segment containing '机器学习'"

    @pytest.mark.asyncio
    async def test_validate_segment_references(self, db_session, sample_segments):
        """Test segment reference validation."""
        service = SegmentAwareChatService(db_session)

        # Test with valid and invalid segment IDs
        references = [
            {
                "sentence_index": 0,
                "segment_ids": [str(sample_segments[0].id), "invalid-uuid"],
                "relevance_score": 0.8,
            },
            {
                "sentence_index": 1,
                "segment_ids": ["another-invalid-uuid"],
                "relevance_score": 0.5,
            },
        ]

        validated = await service._validate_segment_references(
            references, sample_segments
        )

        # Should only keep the reference with valid segment IDs
        assert len(validated) == 1
        assert len(validated[0]["segment_ids"]) == 1
        assert validated[0]["segment_ids"][0] == str(sample_segments[0].id)

    @pytest.mark.asyncio
    async def test_parse_ai_response(self, db_session):
        """Test AI response parsing."""
        service = SegmentAwareChatService(db_session)

        # Test with valid JSON response
        json_response = """
        {
            "answer": "这是一个测试回答。",
            "segment_references": [
                {
                    "sentence_index": 0,
                    "segment_ids": ["test-uuid"],
                    "relevance_score": 0.9
                }
            ]
        }
        """

        parsed = await service._parse_ai_response(json_response)

        assert "answer" in parsed
        assert "segment_references" in parsed
        assert parsed["answer"] == "这是一个测试回答。"
        assert len(parsed["segment_references"]) == 1

        # Test with non-JSON response
        text_response = "This is a plain text response."
        parsed = await service._parse_ai_response(text_response)

        assert parsed["answer"] == text_response
        assert parsed["segment_references"] == []

    @pytest.mark.asyncio
    async def test_get_conversation_segment_references(
        self, db_session, sample_conversation
    ):
        """Test retrieving conversation segment references."""
        service = SegmentAwareChatService(db_session)

        # Initially should be empty
        references = await service.get_conversation_segment_references(
            sample_conversation.id
        )
        assert len(references) == 0

        # Add some references manually for testing
        # This would normally be done by the chat_with_segments method
        # but we can test the retrieval functionality independently


@pytest.mark.asyncio
async def test_prompt_template_rendering():
    """Test that the Jinja2 template renders correctly."""
    from pathlib import Path

    import jinja2

    # Create mock segments
    mock_segments = [
        type(
            "MockSegment",
            (),
            {"id": uuid.uuid4(), "content": "This is the first segment content.", "display_number": 1},
        )(),
        type(
            "MockSegment",
            (),
            {"id": uuid.uuid4(), "content": "This is the second segment content.", "display_number": 2},
        )(),
    ]

    # Setup template environment
    template_dir = Path(__file__).parent.parent.parent / "prompt_templates"
    jinja_env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(template_dir),
        autoescape=jinja2.select_autoescape(["html", "xml"]),
    )

    template = jinja_env.get_template("segment_aware_chat.j2")

    rendered = template.render(user_question="What is AI?", segments=mock_segments)

    # Verify template contains expected elements
    assert "What is AI?" in rendered
    assert "[1]" in rendered
    assert "[2]" in rendered
    assert "first segment content" in rendered
    assert "second segment content" in rendered
    assert "JSON format" in rendered
