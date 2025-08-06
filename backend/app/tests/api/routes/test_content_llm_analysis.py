from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models.content import ContentItem


class TestContentLLMAnalysisUpdated:
    """测试内容LLM分析的更新版本"""

    def test_analyze_ai_sdk_updated_prompt_structure(
        self, client: TestClient, db: Session, normal_user_token_headers: dict
    ):
        """测试更新后的analyze端点使用正确的prompt结构"""
        # 获取测试用户
        test_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)

        # 创建真实的内容项并保存到数据库
        content_text = """# 人工智能的发展趋势

        人工智能技术正在快速发展，包括：
        1. 大语言模型的突破
        2. 多模态AI的兴起
        3. AI在各行业的应用

        这些发展为未来带来了巨大机遇。"""

        real_content_item = ContentItem(
            user_id=test_user.id,
            type="article",
            title="AI发展趋势",
            content_text=content_text,
            processing_status="completed",
        )

        # 保存到数据库
        db.add(real_content_item)
        db.commit()
        db.refresh(real_content_item)

        analysis_instruction = "分析这篇文章的主要观点和结构"

        with (
            patch("aiohttp.ClientSession") as MockSession,
        ):
            # 创建异步mock会话和响应
            mock_session_instance = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 200

            # 模拟流式响应
            async def mock_iter_chunked(_size):
                yield 'data: {"choices": [{"delta": {"content": "这是分析结果"}}]}\n'.encode()
                yield b"data: [DONE]\n"

            mock_response.content.iter_chunked = mock_iter_chunked

            # 设置 session.post 返回 mock_response
            mock_session_instance.post.return_value.__aenter__.return_value = (
                mock_response
            )
            mock_session_instance.post.return_value.__aexit__.return_value = None

            # 设置 ClientSession 返回 mock_session_instance
            MockSession.return_value.__aenter__.return_value = mock_session_instance
            MockSession.return_value.__aexit__.return_value = None

            # 发送请求
            response = client.post(
                f"/api/v1/content/{real_content_item.id}/analyze-ai-sdk-updated",
                headers=normal_user_token_headers,
                json={
                    "analysis_instruction": analysis_instruction,
                    "model": "or-llama-3-1-8b-instruct",
                },
            )

            # 验证响应
            assert response.status_code == 200

            # 验证调用了LiteLLM
            mock_session_instance.post.assert_called_once()
            call_args = mock_session_instance.post.call_args

            # 验证请求payload
            payload = call_args[1]["json"]
            messages = payload["messages"]

            # 验证消息结构
            assert len(messages) == 2
            assert messages[0]["role"] == "system"
            assert messages[0]["content"] == real_content_item.content_text
            assert messages[1]["role"] == "user"
            # 验证用户消息包含了analysis_instruction（被包装在模板中）
            assert analysis_instruction in messages[1]["content"]
            assert "friendly AI chat assistant" in messages[1]["content"]

    def test_completion_updated_prompt_structure(
        self, client: TestClient, db: Session, normal_user_token_headers: dict
    ):
        """测试更新后的completion端点使用正确的prompt结构"""
        # 获取测试用户
        test_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)

        # 创建真实的内容项并保存到数据库
        content_text = """# 人工智能的发展趋势

        人工智能技术正在快速发展，包括：
        1. 大语言模型的突破
        2. 多模态AI的兴起
        3. AI在各行业的应用

        这些发展为未来带来了巨大机遇。"""

        real_content_item = ContentItem(
            user_id=test_user.id,
            type="article",
            title="AI发展趋势",
            content_text=content_text,
            processing_status="completed",
        )

        # 保存到数据库
        db.add(real_content_item)
        db.commit()
        db.refresh(real_content_item)

        analysis_instruction = "分析这篇文章的结构和逻辑"

        with (
            patch("aiohttp.ClientSession") as MockSession,
        ):
            # 创建异步mock会话和响应
            mock_session_instance = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status = 200

            # 模拟流式响应
            async def mock_iter_chunked(_size):
                yield 'data: {"choices": [{"delta": {"content": "分析完成"}}]}\n'.encode()
                yield b"data: [DONE]\n"

            mock_response.content.iter_chunked = mock_iter_chunked

            # 设置 session.post 返回 mock_response
            mock_session_instance.post.return_value.__aenter__.return_value = (
                mock_response
            )
            mock_session_instance.post.return_value.__aexit__.return_value = None

            # 设置 ClientSession 返回 mock_session_instance
            MockSession.return_value.__aenter__.return_value = mock_session_instance
            MockSession.return_value.__aexit__.return_value = None

            # 发送请求
            response = client.post(
                f"/api/v1/content/{real_content_item.id}/completion-updated",
                headers=normal_user_token_headers,
                json={
                    "analysis_instruction": analysis_instruction,
                    "model": "or-llama-3-1-8b-instruct",
                },
            )

            # 验证响应
            assert response.status_code == 200

            # 验证调用了LiteLLM
            mock_session_instance.post.assert_called_once()
            call_args = mock_session_instance.post.call_args

            # 验证请求payload
            payload = call_args[1]["json"]
            messages = payload["messages"]

            # 验证消息结构
            assert len(messages) == 2
            assert messages[0]["role"] == "system"
            assert messages[0]["content"] == real_content_item.content_text
            assert messages[1]["role"] == "user"
            # 验证用户消息包含了analysis_instruction（被包装在模板中）
            assert analysis_instruction in messages[1]["content"]
            assert "friendly AI chat assistant" in messages[1]["content"]

    def test_empty_content_handling(
        self, client: TestClient, db: Session, normal_user_token_headers: dict
    ):
        """测试空内容的处理"""
        # 获取测试用户
        test_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)

        empty_content_item = ContentItem(
            user_id=test_user.id,
            type="article",
            title="空文章",
            content_text="",
            processing_status="completed",
        )

        # 保存到数据库
        db.add(empty_content_item)
        db.commit()
        db.refresh(empty_content_item)

        response = client.post(
            f"/api/v1/content/{empty_content_item.id}/analyze-ai-sdk-updated",
            headers=normal_user_token_headers,
            json={
                "analysis_instruction": "分析这篇文章",
                "model": "or-llama-3-1-8b-instruct",
            },
        )

        # 应该返回错误，因为内容为空
        assert response.status_code == 400

    def test_missing_analysis_instruction(
        self, client: TestClient, db: Session, normal_user_token_headers: dict
    ):
        """测试缺少分析指令的情况"""
        # 获取测试用户
        test_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)

        real_content_item = ContentItem(
            user_id=test_user.id,
            type="article",
            title="测试文章",
            content_text="这是一些测试内容",
            processing_status="completed",
        )

        # 保存到数据库
        db.add(real_content_item)
        db.commit()
        db.refresh(real_content_item)

        response = client.post(
            f"/api/v1/content/{real_content_item.id}/analyze-ai-sdk-updated",
            headers=normal_user_token_headers,
            json={
                "model": "or-llama-3-1-8b-instruct"
                # 缺少 analysis_instruction
            },
        )

        # 应该返回错误，因为缺少必需的参数
        assert response.status_code == 422
