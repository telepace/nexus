import uuid
from typing import Any

from fastapi.testclient import TestClient


def test_create_prompt(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    # 设置测试数据
    data = {
        "name": "测试提示词",
        "description": "这是一个测试提示词",
        "content": "这是提示词的内容",
        "type": "simple",
        "visibility": "public",
    }

    # 发送请求
    response = client.post(
        "/api/v1/prompts/", headers=normal_user_token_headers, json=data
    )

    # 验证响应
    assert response.status_code == 201
    content = response.json()
    assert content["name"] == data["name"]
    assert content["description"] == data["description"]
    assert content["content"] == data["content"]
    assert content["type"] == data["type"]
    assert content["visibility"] == data["visibility"]
    assert "id" in content
    assert "created_at" in content
    assert "updated_at" in content
    assert "created_by" in content
    assert "tags" in content


def test_read_prompt(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    # 先创建一个提示词
    data = {
        "name": "测试提示词",
        "description": "这是一个测试提示词",
        "content": "这是提示词的内容",
        "type": "simple",
        "visibility": "public",
    }
    response = client.post(
        "/api/v1/prompts/", headers=normal_user_token_headers, json=data
    )
    prompt_id = response.json()["id"]

    # 读取提示词
    response = client.get(
        f"/api/v1/prompts/{prompt_id}", headers=normal_user_token_headers
    )

    # 验证响应
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["description"] == data["description"]
    assert content["content"] == data["content"]
    assert content["type"] == data["type"]
    assert content["visibility"] == data["visibility"]
    assert "id" in content
    assert "created_at" in content
    assert "updated_at" in content
    assert "created_by" in content
    assert "tags" in content


def test_update_prompt(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    # 先创建一个提示词
    data = {
        "name": "测试提示词",
        "description": "这是一个测试提示词",
        "content": "这是提示词的内容",
        "type": "simple",
        "visibility": "public",
    }
    response = client.post(
        "/api/v1/prompts/", headers=normal_user_token_headers, json=data
    )
    prompt_id = response.json()["id"]

    # 更新提示词
    update_data = {
        "name": "更新后的提示词",
        "description": "这是更新后的提示词",
        "content": "这是更新后的内容",
    }
    response = client.put(
        f"/api/v1/prompts/{prompt_id}",
        headers=normal_user_token_headers,
        json=update_data,
    )

    # 验证响应
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == update_data["name"]
    assert content["description"] == update_data["description"]
    assert content["content"] == update_data["content"]


def test_delete_prompt(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    # 先创建一个提示词
    data = {
        "name": "测试提示词",
        "description": "这是一个测试提示词",
        "content": "这是提示词的内容",
        "type": "simple",
        "visibility": "public",
    }
    response = client.post(
        "/api/v1/prompts/", headers=normal_user_token_headers, json=data
    )
    prompt_id = response.json()["id"]

    # 删除提示词
    response = client.delete(
        f"/api/v1/prompts/{prompt_id}", headers=normal_user_token_headers
    )

    # 验证响应
    assert response.status_code == 204

    # 确认提示词已被删除
    response = client.get(
        f"/api/v1/prompts/{prompt_id}", headers=normal_user_token_headers
    )
    assert response.status_code == 404


def test_tags(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    superuser_token_headers: dict[str, str],
) -> None:
    # 创建标签
    tag_name = f"测试标签{uuid.uuid4().hex[:8]}"  # 使用 UUID 替代 pytest.get_unique_id
    tag_data = {
        "name": tag_name,
        "description": "这是一个测试标签",
        "color": "#FF0000",
    }

    # 创建标签
    response = client.post(
        "/api/v1/prompts/tags", headers=normal_user_token_headers, json=tag_data
    )
    assert response.status_code == 201
    tag_id = response.json()["id"]

    # 获取标签列表
    response = client.get("/api/v1/prompts/tags", headers=normal_user_token_headers)
    assert response.status_code == 200
    tags = response.json()
    assert len(tags) > 0
    assert any(tag["name"] == tag_name for tag in tags)

    # 更新标签
    update_data: dict[str, str] = {
        "description": "这是更新后的标签描述",
        "color": "#00FF00",
    }
    response = client.put(
        f"/api/v1/prompts/tags/{tag_id}",
        headers=normal_user_token_headers,
        json=update_data,
    )
    assert response.status_code == 200
    updated_tag = response.json()
    assert updated_tag["description"] == update_data["description"]
    assert updated_tag["color"] == update_data["color"]

    # 删除标签 (需要超级用户权限)
    response = client.delete(
        f"/api/v1/prompts/tags/{tag_id}", headers=superuser_token_headers
    )
    assert response.status_code == 204

    # 确认标签已被删除
    response = client.get("/api/v1/prompts/tags", headers=normal_user_token_headers)
    assert response.status_code == 200
    tags = response.json()
    assert not any(tag["id"] == tag_id for tag in tags)


def test_prompt_with_tags(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    # 创建标签
    tag_name = (
        f"测试提示词标签{uuid.uuid4().hex[:8]}"  # 使用 UUID 替代 pytest.get_unique_id
    )
    tag_data: dict[str, str] = {
        "name": tag_name,
        "description": "这是一个测试标签",
        "color": "#FF0000",
    }
    response = client.post(
        "/api/v1/prompts/tags", headers=normal_user_token_headers, json=tag_data
    )
    assert response.status_code == 201
    tag_id = response.json()["id"]

    # 创建带标签的提示词
    data: dict[str, Any] = {
        "name": "带标签的测试提示词",
        "description": "这是一个带标签的测试提示词",
        "content": "这是提示词的内容",
        "type": "simple",
        "visibility": "public",
        "tag_ids": [tag_id],
    }
    response = client.post(
        "/api/v1/prompts/", headers=normal_user_token_headers, json=data
    )
    assert response.status_code == 201
    prompt = response.json()
    assert len(prompt["tags"]) == 1
    assert prompt["tags"][0]["id"] == tag_id

    # 更新提示词的标签
    update_data: dict[str, list[Any]] = {
        "tag_ids": [],  # 移除所有标签
    }
    response = client.put(
        f"/api/v1/prompts/{prompt['id']}",
        headers=normal_user_token_headers,
        json=update_data,
    )
    assert response.status_code == 200
    updated_prompt = response.json()
    assert len(updated_prompt["tags"]) == 0
