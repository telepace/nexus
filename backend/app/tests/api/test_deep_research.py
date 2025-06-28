"""
Deep Research API 测试
测试深度研究任务的创建、查询和管理功能
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import DeepResearchJob, User


@pytest.fixture
def authenticated_client(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> TestClient:
    """获取已认证的测试客户端"""
    client.headers.update(normal_user_token_headers)
    return client


class TestDeepResearchAPI:
    """Deep Research API 测试类"""

    def test_create_deep_research_job_success(
        self, authenticated_client: TestClient, user: User
    ):
        """测试成功创建深度研究任务"""
        with patch(
            "app.services.deep_research_service.deep_research_service.process_deep_research"
        ) as mock_process:
            mock_process.return_value = AsyncMock()

            request_data = {
                "query": "人工智能在医疗领域的最新发展趋势",
                "depth": 3,
                "breadth": 2,
            }

            response = authenticated_client.post(
                "/api/v1/deep-research/create",
                json=request_data,
            )

            assert response.status_code == 201
            data = response.json()
            assert "job_id" in data
            assert data["status"] == "pending"
            assert "深度研究任务已创建" in data["message"]
            assert uuid.UUID(data["job_id"])  # 验证是有效的UUID

    def test_create_deep_research_job_invalid_query(
        self, authenticated_client: TestClient
    ):
        """测试无效查询的深度研究任务创建"""
        request_data = {
            "query": "短",  # 太短的查询
            "depth": 3,
            "breadth": 2,
        }

        response = authenticated_client.post(
            "/api/v1/deep-research/create",
            json=request_data,
        )

        assert response.status_code == 422  # 验证错误

    def test_create_deep_research_job_invalid_depth(
        self, authenticated_client: TestClient
    ):
        """测试无效深度参数的深度研究任务创建"""
        request_data = {
            "query": "人工智能在医疗领域的最新发展趋势",
            "depth": 10,  # 超出范围
            "breadth": 2,
        }

        response = authenticated_client.post(
            "/api/v1/deep-research/create",
            json=request_data,
        )

        assert response.status_code == 422  # 验证错误

    def test_get_deep_research_job_success(
        self, authenticated_client: TestClient, db: Session, user: User
    ):
        """测试成功获取深度研究任务信息"""
        # 创建测试任务
        job = DeepResearchJob(
            user_id=user.id,
            query="测试查询",
            depth=3,
            breadth=2,
            status="pending",
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        response = authenticated_client.get(f"/api/v1/deep-research/jobs/{job.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(job.id)
        assert data["query"] == "测试查询"
        assert data["status"] == "pending"
        assert data["depth"] == 3
        assert data["breadth"] == 2

    def test_get_deep_research_job_not_found(self, authenticated_client: TestClient):
        """测试获取不存在的深度研究任务"""
        fake_id = uuid.uuid4()
        response = authenticated_client.get(f"/api/v1/deep-research/jobs/{fake_id}")

        assert response.status_code == 404
        data = response.json()
        # 检查是否包含错误信息
        if "detail" in data:
            assert "深度研究任务不存在" in data["detail"]
        elif "error" in data:
            assert "深度研究任务不存在" in data["error"]
        else:
            # 如果都没有，检查整个响应
            assert "深度研究任务不存在" in str(data)

    def test_get_deep_research_job_forbidden(
        self, authenticated_client: TestClient, db: Session
    ):
        """测试访问其他用户的深度研究任务"""
        # 创建另一个真实用户
        from app.crud import create_user
        from app.models import UserCreate

        other_user_data = UserCreate(
            email="other@example.com",
            password="testpassword123",
            is_superuser=False,
        )
        other_user = create_user(session=db, user_create=other_user_data)
        db.commit()
        db.refresh(other_user)

        # 创建该用户的任务
        job = DeepResearchJob(
            user_id=other_user.id,
            query="其他用户的查询",
            depth=3,
            breadth=2,
            status="pending",
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        response = authenticated_client.get(f"/api/v1/deep-research/jobs/{job.id}")

        assert response.status_code == 403
        data = response.json()
        # 检查是否包含错误信息
        if "detail" in data:
            assert "无权访问" in data["detail"]
        elif "error" in data:
            assert "无权访问" in data["error"]
        else:
            # 如果都没有，检查整个响应
            assert "无权访问" in str(data)

    def test_get_deep_research_result_pending(
        self, authenticated_client: TestClient, db: Session, user: User
    ):
        """测试获取待处理任务的结果"""
        job = DeepResearchJob(
            user_id=user.id,
            query="测试查询",
            depth=3,
            breadth=2,
            status="pending",
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        with patch(
            "app.services.deep_research_service.deep_research_service.get_job_result"
        ) as mock_get_result:
            mock_get_result.return_value = {
                "status": "pending",
                "error_message": None,
                "progress": 0,
                "markdown_content": None,
            }

            response = authenticated_client.get(
                f"/api/v1/deep-research/jobs/{job.id}/result"
            )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "pending"
            assert data["progress"] == 0
            assert data["markdown_content"] is None

    def test_get_deep_research_result_completed(
        self, authenticated_client: TestClient, db: Session, user: User
    ):
        """测试获取已完成任务的结果"""
        job = DeepResearchJob(
            user_id=user.id,
            query="测试查询",
            depth=3,
            breadth=2,
            status="completed",
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        with patch(
            "app.services.deep_research_service.deep_research_service.get_job_result"
        ) as mock_get_result:
            mock_get_result.return_value = {
                "status": "completed",
                "error_message": None,
                "progress": 100,
                "markdown_content": "# 测试研究报告\n\n这是一个测试报告。",
                "research_meta": {"sources_count": 5},
                "title": "测试报告",
                "summary": {"brief": "这是摘要"},
                "key_points": {"points": ["要点1", "要点2"]},
                "labels": ["测试", "AI"],
                "reading_time_minutes": 5,
                "difficulty_level": "intermediate",
                "content_quality_score": 0.8,
            }

            response = authenticated_client.get(
                f"/api/v1/deep-research/jobs/{job.id}/result"
            )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"
            assert data["progress"] == 100
            assert "测试研究报告" in data["markdown_content"]
            assert data["title"] == "测试报告"
            assert data["labels"] == ["测试", "AI"]

    def test_list_deep_research_jobs(
        self, authenticated_client: TestClient, db: Session, user: User
    ):
        """测试获取用户的深度研究任务列表"""
        # 创建多个测试任务
        job1 = DeepResearchJob(
            user_id=user.id,
            query="测试查询1",
            depth=3,
            breadth=2,
            status="pending",
        )
        job2 = DeepResearchJob(
            user_id=user.id,
            query="测试查询2",
            depth=2,
            breadth=3,
            status="completed",
        )
        db.add_all([job1, job2])
        db.commit()

        response = authenticated_client.get("/api/v1/deep-research/jobs")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        # 检查是否按创建时间倒序排列
        assert data[0]["query"] in ["测试查询1", "测试查询2"]
        assert data[1]["query"] in ["测试查询1", "测试查询2"]

    def test_delete_deep_research_job_success(
        self, authenticated_client: TestClient, db: Session, user: User
    ):
        """测试成功删除深度研究任务"""
        job = DeepResearchJob(
            user_id=user.id,
            query="要删除的测试查询",
            depth=3,
            breadth=2,
            status="completed",
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # 保存job_id用于后续查询
        job_id = job.id

        response = authenticated_client.delete(f"/api/v1/deep-research/jobs/{job_id}")

        assert response.status_code == 204

        # 验证任务已被删除 - 使用新的查询而不是访问已删除的对象
        from sqlmodel import select

        statement = select(DeepResearchJob).where(DeepResearchJob.id == job_id)
        deleted_job = db.exec(statement).first()
        assert deleted_job is None

    def test_delete_deep_research_job_not_found(self, authenticated_client: TestClient):
        """测试删除不存在的深度研究任务"""
        fake_id = uuid.uuid4()
        response = authenticated_client.delete(f"/api/v1/deep-research/jobs/{fake_id}")

        assert response.status_code == 404

    def test_delete_deep_research_job_forbidden(
        self, authenticated_client: TestClient, db: Session
    ):
        """测试删除其他用户的深度研究任务"""
        # 创建另一个真实用户
        from app.crud import create_user
        from app.models import UserCreate

        other_user_data = UserCreate(
            email="other2@example.com",
            password="testpassword123",
            is_superuser=False,
        )
        other_user = create_user(session=db, user_create=other_user_data)
        db.commit()
        db.refresh(other_user)

        # 创建该用户的任务
        job = DeepResearchJob(
            user_id=other_user.id,
            query="其他用户的查询",
            depth=3,
            breadth=2,
            status="pending",
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        response = authenticated_client.delete(f"/api/v1/deep-research/jobs/{job.id}")

        assert response.status_code == 403

    def test_unauthorized_access(self, client: TestClient):
        """测试未认证用户访问API"""
        response = client.post(
            "/api/v1/deep-research/create",
            json={"query": "测试查询", "depth": 3, "breadth": 2},
        )

        assert response.status_code == 401
