import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.prompts import _check_prompt_access
from app.api.routes.prompts import router as prompts_router
from app.core.config import settings as app_settings
from app.models.prompt import (
    Prompt,
    PromptCreate,
    PromptUpdate,
    PromptVersion,
    PromptVersionCreate,
    Tag,
    TagCreate,
    TagUpdate,
)
from app.tests.utils.utils import get_error_detail


# --- Fixtures ---
@pytest.fixture
def mock_db_session_fixture():
    session = MagicMock(spec=Session)
    mock_exec_result = MagicMock()
    session.exec.return_value = mock_exec_result
    return session


@pytest.fixture
def mock_current_user_fixture():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.is_superuser = False
    user.teams = []
    return user


@pytest.fixture(scope="module")
def app_for_prompts_module():
    app = FastAPI()
    app.include_router(prompts_router, prefix=f"{app_settings.API_V1_STR}/prompts")
    return app


@pytest.fixture
def client(
    app_for_prompts_module: FastAPI,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    app_for_prompts_module.dependency_overrides[get_db] = (
        lambda: mock_db_session_fixture
    )
    app_for_prompts_module.dependency_overrides[get_current_user] = (
        lambda: mock_current_user_fixture
    )
    with TestClient(app_for_prompts_module) as c:
        yield c
    del app_for_prompts_module.dependency_overrides[get_db]
    del app_for_prompts_module.dependency_overrides[get_current_user]


# ===== Tests for Tag Management =====
def test_read_tags_success(client: TestClient, mock_db_session_fixture: MagicMock):
    mock_tag1 = Tag(id=uuid.uuid4(), name="Tag1", description="Desc1")
    mock_tag2 = Tag(id=uuid.uuid4(), name="Tag2", description="Desc2")
    mock_db_session_fixture.exec.return_value.all.return_value = [mock_tag1, mock_tag2]
    response = client.get(f"{app_settings.API_V1_STR}/prompts/tags")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Tag1"
    assert data[1]["name"] == "Tag2"
    executed_query = mock_db_session_fixture.exec.call_args[0][0]
    assert executed_query.column_descriptions[0]["entity"] == Tag


def test_read_tags_empty(client: TestClient, mock_db_session_fixture: MagicMock):
    mock_db_session_fixture.exec.return_value.all.return_value = []
    response = client.get(f"{app_settings.API_V1_STR}/prompts/tags")
    assert response.status_code == 200
    assert response.json() == []


def test_read_tags_db_error(client: TestClient, mock_db_session_fixture: MagicMock):
    mock_db_session_fixture.exec.side_effect = SQLAlchemyError("DB error")
    response = client.get(f"{app_settings.API_V1_STR}/prompts/tags")
    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "获取标签列表失败" in error_detail


def test_create_tag_success(client: TestClient, mock_db_session_fixture: MagicMock):
    tag_in = TagCreate(name="New Tag", description="New Desc")
    mock_created_tag = Tag(
        id=uuid.uuid4(), name=tag_in.name, description=tag_in.description
    )
    mock_db_session_fixture.exec.return_value.first.return_value = None

    def mock_refresh_effect(obj, *_args, **_kwargs):
        obj.id = mock_created_tag.id

    mock_db_session_fixture.refresh.side_effect = mock_refresh_effect
    response = client.post(f"{app_settings.API_V1_STR}/prompts/tags", json=tag_in.model_dump())
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == tag_in.name
    added_obj = mock_db_session_fixture.add.call_args[0][0]
    assert isinstance(added_obj, Tag)
    assert added_obj.name == tag_in.name


def test_create_tag_conflict(client: TestClient, mock_db_session_fixture: MagicMock):
    tag_in = TagCreate(name="Existing Tag")
    mock_db_session_fixture.exec.return_value.first.return_value = Tag(
        id=uuid.uuid4(), name="Existing Tag"
    )
    response = client.post(f"{app_settings.API_V1_STR}/prompts/tags", json=tag_in.model_dump())
    assert response.status_code == 409


def test_create_tag_db_error_on_commit(
    client: TestClient, mock_db_session_fixture: MagicMock
):
    tag_in = TagCreate(name="Error Tag")
    mock_db_session_fixture.exec.return_value.first.return_value = None
    mock_db_session_fixture.commit.side_effect = SQLAlchemyError("Commit error")
    response = client.post(f"{app_settings.API_V1_STR}/prompts/tags", json=tag_in.model_dump())
    assert response.status_code == 500
    mock_db_session_fixture.rollback.assert_called_once()


def test_update_tag_success(client: TestClient, mock_db_session_fixture: MagicMock):
    tag_id = uuid.uuid4()
    existing_tag = Tag(id=tag_id, name="Old")
    mock_db_session_fixture.get.return_value = existing_tag
    tag_update = TagUpdate(name="New")
    mock_db_session_fixture.exec.return_value.first.return_value = None
    response = client.put(
        f"{app_settings.API_V1_STR}/prompts/tags/{tag_id}", json=tag_update.model_dump()
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_update_tag_not_found(client: TestClient, mock_db_session_fixture: MagicMock):
    tag_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = None
    response = client.put(
        f"{app_settings.API_V1_STR}/prompts/tags/{tag_id}",
        json=TagUpdate(name="Any").model_dump(),
    )
    assert response.status_code == 404


def test_update_tag_name_conflict(
    client: TestClient, mock_db_session_fixture: MagicMock
):
    tag_id = uuid.uuid4()
    existing_tag = Tag(id=tag_id, name="Old")
    mock_db_session_fixture.get.return_value = existing_tag
    tag_update = TagUpdate(name="ConflictName")
    mock_db_session_fixture.exec.return_value.first.return_value = Tag(
        id=uuid.uuid4(), name="ConflictName"
    )
    response = client.put(
        f"{app_settings.API_V1_STR}/prompts/tags/{tag_id}", json=tag_update.model_dump()
    )
    assert response.status_code == 409


def test_delete_tag_success_superuser(
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    mock_current_user_fixture.is_superuser = True
    tag_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = Tag(id=tag_id, name="ToDelete")
    response = client.delete(f"{app_settings.API_V1_STR}/prompts/tags/{tag_id}")
    assert response.status_code == 204


def test_delete_tag_forbidden_non_superuser(
    client: TestClient, mock_current_user_fixture: MagicMock
):
    mock_current_user_fixture.is_superuser = False
    response = client.delete(f"{app_settings.API_V1_STR}/prompts/tags/{uuid.uuid4()}")
    assert response.status_code == 403


def test_delete_tag_not_found_superuser(
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    mock_current_user_fixture.is_superuser = True
    tag_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = None
    response = client.delete(f"{app_settings.API_V1_STR}/prompts/tags/{tag_id}")
    assert response.status_code == 404


# ===== Tests for Prompt CRUD =====
@patch("app.models.PromptVersion")
@patch("app.models.Prompt")
def test_create_prompt_success_no_tags(
    MPr: MagicMock,
    MPV: MagicMock,
    client: TestClient,
    mock_current_user_fixture: MagicMock,
):
    p_in = PromptCreate(
        name="Test", content="Content", type="simple", visibility="public"
    )
    p_mock = MagicMock(spec=Prompt, id=uuid.uuid4(), tags=[])
    MPr.return_value = p_mock
    for k, v in p_in.model_dump(exclude={"tag_ids"}).items():
        setattr(p_mock, k, v)
    p_mock.created_by = mock_current_user_fixture.id
    p_mock.content = p_in.content
    p_mock.input_vars = p_in.input_vars
    MPV.return_value = MagicMock(spec=PromptVersion)
    response = client.post(f"{app_settings.API_V1_STR}/prompts/", json=p_in.model_dump())
    assert response.status_code == 201
    assert response.json()["name"] == p_in.name


@patch("app.models.PromptVersion")
@patch("app.models.Prompt")
@patch("app.models.Tag")
def test_create_prompt_with_tags(
    _MT: MagicMock,
    MPr: MagicMock,
    MPV: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    t_id1, t_id2 = uuid.uuid4(), uuid.uuid4()
    p_in = PromptCreate(
        name="Tags",
        content="Content",
        type="simple",
        visibility="public",
        tag_ids=[t_id1, t_id2],
    )
    p_mock = MagicMock(spec=Prompt, id=uuid.uuid4(), tags=[])
    MPr.return_value = p_mock
    for k, v in p_in.model_dump(exclude={"tag_ids"}).items():
        setattr(p_mock, k, v)
    p_mock.created_by = mock_current_user_fixture.id
    p_mock.content = p_in.content
    p_mock.input_vars = p_in.input_vars
    MPV.return_value = MagicMock(spec=PromptVersion)
    mock_t1 = Tag(id=t_id1, name="T1")
    mock_t2 = Tag(id=t_id2, name="T2")

    def get_tag_se(_model_cls, tid):
        return mock_t1 if tid == t_id1 else (mock_t2 if tid == t_id2 else None)

    mock_db_session_fixture.get.side_effect = get_tag_se
    # Convert UUID objects to strings for JSON serialization
    payload = p_in.model_dump()
    if payload.get("tag_ids"):
        payload["tag_ids"] = [str(tag_id) for tag_id in payload["tag_ids"]]
    response = client.post(f"{app_settings.API_V1_STR}/prompts/", json=payload)
    assert response.status_code == 201
    assert len(response.json()["tags"]) == 2


@patch("app.models.Prompt")
def test_create_prompt_db_error(
    MPr: MagicMock, client: TestClient, mock_db_session_fixture: MagicMock
):
    p_in = PromptCreate(name="Error", content="Err", type="simple", visibility="public")
    MPr.return_value = MagicMock(spec=Prompt, id=uuid.uuid4(), tags=[])
    mock_db_session_fixture.add.side_effect = SQLAlchemyError("DB add error")
    response = client.post(f"{app_settings.API_V1_STR}/prompts/", json=p_in.model_dump())
    assert response.status_code == 500
    mock_db_session_fixture.rollback.assert_called_once()


# --- Tests for GET / (Read Prompts) ---
def test_read_prompts_empty(client: TestClient, mock_db_session_fixture: MagicMock):
    mock_db_session_fixture.exec.return_value.all.return_value = []
    response = client.get(f"{app_settings.API_V1_STR}/prompts/")
    assert response.status_code == 200
    assert response.json() == []


@patch("app.api.routes.prompts.select")
def test_read_prompts_with_search_and_sort(
    mock_sqlmodel_select: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    mock_p1 = Prompt(
        id=uuid.uuid4(),
        name="Alpha Search",
        content="Content A",
        created_at=datetime(2023, 1, 1),
        updated_at=datetime(2023, 1, 2),
        tags=[],
    )
    mock_p2 = Prompt(
        id=uuid.uuid4(),
        name="Beta",
        content="Search Content B",
        created_at=datetime(2023, 1, 3),
        updated_at=datetime(2023, 1, 3),
        tags=[],
    )
    mock_query = MagicMock()
    mock_sqlmodel_select.return_value = mock_query
    mock_query.where.return_value.order_by.return_value = mock_query
    mock_db_session_fixture.exec.return_value.all.return_value = [mock_p2, mock_p1]
    response = client.get(
        f"{app_settings.API_V1_STR}/prompts/?search=Search&sort=updated_at&order=asc"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Beta"


@patch("app.api.routes.prompts.select")
@patch("app.api.routes.prompts.func")
def test_read_prompts_with_tag_filter(
    mock_sql_func: MagicMock,
    mock_sqlmodel_select: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    tag_id1 = uuid.uuid4()
    mock_p1 = Prompt(id=uuid.uuid4(), name="Tagged", tags=[])

    # Mock the query chain
    mock_query = MagicMock()
    mock_sqlmodel_select.return_value = mock_query
    mock_query.where.return_value = mock_query
    mock_query.order_by.return_value = mock_query

    # Mock func.count and func.max - 修复：返回数字而不是字符串
    mock_sql_func.count.return_value = 1

    # Mock database execution
    mock_db_session_fixture.exec.return_value.all.return_value = [mock_p1]

    response = client.get(f"{app_settings.API_V1_STR}/prompts/?tag_ids={tag_id1}")
    assert response.status_code == 200
    assert len(response.json()) == 1


@patch("app.api.routes.prompts.select")
def test_read_prompts_db_error_main_query(
    mock_sqlmodel_select: MagicMock,
    client: TestClient,
):
    mock_sqlmodel_select.side_effect = Exception("Generic DB error during select")
    response = client.get(f"{app_settings.API_V1_STR}/prompts/")
    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "Generic DB error during select" in error_detail


# --- GET /{prompt_id} ---
def test_read_prompt_success(
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    p_id = uuid.uuid4()
    mock_p = Prompt(
        id=p_id,
        name="Test",
        content="Test",
        type="simple",
        created_by=mock_current_user_fixture.id,
        visibility="private",
        tags=[],
    )
    mock_db_session_fixture.get.return_value = mock_p
    response = client.get(f"{app_settings.API_V1_STR}/prompts/{p_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test"


def test_read_prompt_not_found(client: TestClient, mock_db_session_fixture: MagicMock):
    p_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = None
    response = client.get(f"{app_settings.API_V1_STR}/prompts/{p_id}")
    assert response.status_code == 404


@patch("app.api.routes.prompts._check_prompt_access", return_value=False)
def test_read_prompt_access_denied(
    _mca: MagicMock, client: TestClient, mock_db_session_fixture: MagicMock
):
    p_id = uuid.uuid4()
    mock_p = Prompt(
        id=p_id, name="Test", content="Test", type="simple", created_by=uuid.uuid4()
    )
    mock_db_session_fixture.get.return_value = mock_p
    response = client.get(f"{app_settings.API_V1_STR}/prompts/{p_id}")
    assert response.status_code == 403


def test_read_prompt_db_error_on_get(
    client: TestClient, mock_db_session_fixture: MagicMock
):
    p_id = uuid.uuid4()
    mock_db_session_fixture.get.side_effect = SQLAlchemyError("Get Error")
    response = client.get(f"{app_settings.API_V1_STR}/prompts/{p_id}")
    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "Get Error" in error_detail


# --- PUT /{prompt_id} ---
@patch("app.api.routes.prompts.datetime")
@patch("app.models.Tag")
def test_update_prompt_success_change_name_and_tags(
    _MockTagModel: MagicMock,
    mock_datetime_routes: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    existing_prompt = Prompt(
        id=prompt_id,
        name="Old Name",
        content="Old Content",
        type="simple",
        created_by=mock_current_user_fixture.id,
        visibility="private",
        tags=[Tag(id=uuid.uuid4(), name="OldTag")],
    )
    mock_new_tag = Tag(id=uuid.uuid4(), name="NewTag")

    def get_side_effect(model_cls, item_id):  # NOSONAR
        if model_cls == Prompt and item_id == prompt_id:
            return existing_prompt
        if model_cls == Tag and item_id == mock_new_tag.id:
            return mock_new_tag
        return None

    mock_db_session_fixture.get.side_effect = get_side_effect
    mock_datetime_routes.utcnow.return_value = datetime(2023, 1, 1, 12, 30, 0)

    update_payload = PromptUpdate(
        name="New Prompt Name", tag_ids=[mock_new_tag.id]
    ).model_dump(exclude_unset=True)
    # Convert UUID objects to strings for JSON serialization
    if update_payload.get("tag_ids"):
        update_payload["tag_ids"] = [
            str(tag_id) for tag_id in update_payload["tag_ids"]
        ]
    response = client.put(f"{app_settings.API_V1_STR}/prompts/{prompt_id}", json=update_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Prompt Name"
    assert len(data["tags"]) == 1
    assert data["tags"][0]["id"] == str(mock_new_tag.id)
    assert existing_prompt.name == "New Prompt Name"
    assert existing_prompt.updated_at == datetime(2023, 1, 1, 12, 30, 0)
    assert len(existing_prompt.tags) == 1
    assert existing_prompt.tags[0].id == mock_new_tag.id
    mock_db_session_fixture.commit.assert_called_once()


def test_update_prompt_not_found(
    client: TestClient, mock_db_session_fixture: MagicMock
):
    prompt_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = None
    response = client.put(
        f"{app_settings.API_V1_STR}/prompts/{prompt_id}",
        json=PromptUpdate(name="Any").model_dump(),
    )
    assert response.status_code == 404


@patch("app.api.routes.prompts._check_prompt_access", return_value=False)
def test_update_prompt_access_denied(
    _mock_check_access: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = Prompt(id=prompt_id, name="Test")
    response = client.put(
        f"{app_settings.API_V1_STR}/prompts/{prompt_id}",
        json=PromptUpdate(name="Any").model_dump(),
    )
    assert response.status_code == 403


@patch("app.api.routes.prompts.datetime")
def test_update_prompt_db_error(
    mock_datetime_routes: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    existing_prompt = Prompt(
        id=prompt_id,
        name="Old Name",
        content="Old Content",
        created_by=mock_current_user_fixture.id,
    )
    mock_db_session_fixture.get.return_value = existing_prompt
    mock_datetime_routes.utcnow.return_value = datetime.utcnow()
    mock_db_session_fixture.commit.side_effect = SQLAlchemyError("DB Update Error")
    update_payload = PromptUpdate(name="New Name").model_dump()
    response = client.put(f"{app_settings.API_V1_STR}/prompts/{prompt_id}", json=update_payload)
    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "更新提示词失败" in error_detail
    mock_db_session_fixture.rollback.assert_called_once()


# --- DELETE /{prompt_id} ---
def test_delete_prompt_success(
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    prompt_to_delete = Prompt(
        id=prompt_id, name="To Delete", created_by=mock_current_user_fixture.id
    )
    mock_db_session_fixture.get.return_value = prompt_to_delete
    response = client.delete(f"{app_settings.API_V1_STR}/prompts/{prompt_id}")
    assert response.status_code == 204
    mock_db_session_fixture.delete.assert_called_once_with(prompt_to_delete)


def test_delete_prompt_not_found(
    client: TestClient, mock_db_session_fixture: MagicMock
):
    prompt_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = None
    response = client.delete(f"{app_settings.API_V1_STR}/prompts/{prompt_id}")
    assert response.status_code == 404


@patch("app.api.routes.prompts._check_prompt_access", return_value=False)
def test_delete_prompt_access_denied(
    _mock_check_access: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    mock_db_session_fixture.get.return_value = Prompt(id=prompt_id, name="Test")
    response = client.delete(f"{app_settings.API_V1_STR}/prompts/{prompt_id}")
    assert response.status_code == 403


def test_delete_prompt_db_error(
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    p = Prompt(id=prompt_id, name="To Delete", created_by=mock_current_user_fixture.id)
    mock_db_session_fixture.get.return_value = p
    mock_db_session_fixture.commit.side_effect = SQLAlchemyError("DB Delete Error")
    response = client.delete(f"{app_settings.API_V1_STR}/prompts/{prompt_id}")
    assert response.status_code == 500
    mock_db_session_fixture.rollback.assert_called_once()


# --- PromptVersion Endpoints ---
@patch("app.api.routes.prompts.select")
def test_read_prompt_versions_success(
    mock_sqlmodel_select: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    mock_prompt = Prompt(id=prompt_id, created_by=mock_current_user_fixture.id)
    mock_db_session_fixture.get.return_value = mock_prompt
    mock_v1 = PromptVersion(prompt_id=prompt_id, version=1)
    mock_v2 = PromptVersion(prompt_id=prompt_id, version=2)
    mock_query = MagicMock()
    mock_sqlmodel_select.return_value.where.return_value.order_by.return_value = (
        mock_query
    )
    mock_db_session_fixture.exec.return_value.all.return_value = [mock_v2, mock_v1]
    response = client.get(f"{app_settings.API_V1_STR}/prompts/{prompt_id}/versions")
    assert response.status_code == 200
    assert len(response.json()) == 2


@patch("app.api.routes.prompts.func")
@patch("app.api.routes.prompts.datetime")
@patch("app.api.routes.prompts.select")
def test_create_prompt_version_success(
    mock_select: MagicMock,
    mock_dt: MagicMock,
    mock_func: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    p_id = uuid.uuid4()
    mock_p = Prompt(
        id=p_id,
        name="Test Prompt",
        content="Test Content",
        type="simple",
        visibility="private",
        created_by=mock_current_user_fixture.id,
    )
    mock_db_session_fixture.get.return_value = mock_p

    # Mock func.max to return a mock expression
    mock_max_expr = MagicMock()
    mock_func.max.return_value = mock_max_expr

    # Mock select to return a query that can be chained
    mock_query = MagicMock()
    mock_select.return_value = mock_query
    mock_query.where.return_value = mock_query

    # Mock the database execution to return the max version
    mock_db_session_fixture.exec.return_value.first.return_value = 1

    # Mock datetime.utcnow
    mock_dt.utcnow.return_value = datetime(2023, 1, 1, 14, 0, 0)

    v_in = PromptVersionCreate(content="NewV", change_notes="notes")
    response = client.post(
        f"{app_settings.API_V1_STR}/prompts/{p_id}/versions", json=v_in.model_dump()
    )

    assert response.status_code == 200
    data = response.json()
    assert data["prompt_id"] == str(p_id)
    assert data["content"] == "NewV"
    assert data["change_notes"] == "notes"
    assert data["version"] == 2
    assert data["created_by"] == str(mock_current_user_fixture.id)


@patch("app.api.routes.prompts.select")
def test_read_prompt_version_success(
    mock_sqlmodel_select: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    p_id = uuid.uuid4()
    v_num = 1
    mock_p = Prompt(id=p_id, created_by=mock_current_user_fixture.id)
    mock_db_session_fixture.get.return_value = mock_p
    mock_v = PromptVersion(prompt_id=p_id, version=v_num, content="V1")
    mock_q = MagicMock()
    mock_sqlmodel_select.return_value.where.return_value = mock_q
    mock_db_session_fixture.exec.return_value.first.return_value = mock_v
    response = client.get(f"{app_settings.API_V1_STR}/prompts/{p_id}/versions/{v_num}")
    assert response.status_code == 200
    assert response.json()["version"] == v_num


def test_read_prompt_version_not_found(
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    version_num = 1
    mock_prompt = Prompt(id=prompt_id, created_by=mock_current_user_fixture.id)
    mock_db_session_fixture.get.return_value = mock_prompt
    mock_db_session_fixture.exec.return_value.first.return_value = None
    response = client.get(
        f"{app_settings.API_V1_STR}/prompts/{prompt_id}/versions/{version_num}"
    )
    assert response.status_code == 404
    error_detail = get_error_detail(response.json())
    assert error_detail == "Version not found"


# --- Duplicate Prompt ---
@patch("app.models.Prompt")
def test_duplicate_prompt_db_error(
    _MockPromptModel: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
    mock_current_user_fixture: MagicMock,
):
    prompt_id = uuid.uuid4()
    original_prompt = Prompt(
        id=prompt_id,
        name="Original",
        content="Content",
        created_by=mock_current_user_fixture.id,
    )
    mock_db_session_fixture.get.return_value = original_prompt
    mock_db_session_fixture.commit.side_effect = SQLAlchemyError(
        "DB error during duplicate commit"
    )

    response = client.post(f"{app_settings.API_V1_STR}/prompts/{prompt_id}/duplicate")
    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "复制提示词失败" in error_detail
    mock_db_session_fixture.rollback.assert_called_once()


# --- _check_prompt_access Tests ---
def test_check_prompt_access_superuser():
    mock_user = MagicMock(is_superuser=True, id=uuid.uuid4())
    mock_prompt = MagicMock()
    assert _check_prompt_access(mock_prompt, mock_user) is True


def test_check_prompt_access_creator():
    user_id = uuid.uuid4()
    mock_user = MagicMock(id=user_id, is_superuser=False)
    mock_prompt = MagicMock(created_by=user_id, visibility="private")
    assert _check_prompt_access(mock_prompt, mock_user) is True


def test_check_prompt_access_public():
    mock_user = MagicMock(id=uuid.uuid4(), is_superuser=False)
    mock_prompt = MagicMock(created_by=uuid.uuid4(), visibility="public")
    assert _check_prompt_access(mock_prompt, mock_user) is True


def test_check_prompt_access_team_member():
    user_id, team_id = uuid.uuid4(), uuid.uuid4()
    mock_t = MagicMock()
    mock_t.id = team_id
    mock_user = MagicMock(id=user_id, is_superuser=False, teams=[mock_t])
    mock_prompt = MagicMock(created_by=uuid.uuid4(), visibility="team", team_id=team_id)
    assert _check_prompt_access(mock_prompt, mock_user) is True


def test_check_prompt_access_team_not_member():
    user_id, t1, t2 = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    mock_t = MagicMock()
    mock_t.id = t1
    mock_user = MagicMock(id=user_id, is_superuser=False, teams=[mock_t])
    mock_prompt = MagicMock(created_by=uuid.uuid4(), visibility="team", team_id=t2)
    assert _check_prompt_access(mock_prompt, mock_user) is False


def test_check_prompt_access_private_not_creator_not_superuser():
    mock_user = MagicMock(id=uuid.uuid4(), is_superuser=False)
    mock_prompt = MagicMock(created_by=uuid.uuid4(), visibility="private")
    assert _check_prompt_access(mock_prompt, mock_user) is False
