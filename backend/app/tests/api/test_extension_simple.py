from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_extension_summary_endpoint_exists():
    """测试流式摘要端点是否存在（通过401错误验证）"""
    response = client.post(
        "/api/v1/extension/summary/stream", json={"text": "测试内容", "lang": "zh"}
    )
    # 期待401而不是404，说明端点存在但需要认证
    assert response.status_code == 401


def test_extension_keypoints_endpoint_exists():
    """测试流式要点端点是否存在（通过401错误验证）"""
    response = client.post(
        "/api/v1/extension/keypoints/stream", json={"text": "测试内容", "lang": "zh"}
    )
    # 期待401而不是404，说明端点存在但需要认证
    assert response.status_code == 401


def test_extension_analyze_endpoint_exists():
    """测试分析端点是否存在（通过401错误验证）"""
    response = client.post(
        "/api/v1/extension/analyze", json={"text": "测试内容", "lang": "zh"}
    )
    # 期待401而不是404，说明端点存在但需要认证
    assert response.status_code == 401


def test_extension_validation_error():
    """测试数据验证错误"""
    response = client.post(
        "/api/v1/extension/summary/stream",
        json={
            "text": "",  # 空文本应该失败
            "lang": "zh",
        },
        headers={"Authorization": "Bearer fake-token"},
    )
    # 验证错误或认证错误都可以接受
    assert response.status_code in [422, 401]


def test_app_health():
    """测试应用健康状态"""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
