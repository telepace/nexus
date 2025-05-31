import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.crud import crud_content
from app.models.content import ContentItem, ContentShare
from app.schemas.content import ContentShareCreate, ContentSharePublic
from app.tests.utils.user import create_random_user, authentication_token_from_email
from app.tests.utils.content import create_random_content_item

# Fixtures from conftest.py (db, client, normal_user_token_headers) will be auto-injected.


def test_create_content_share_api(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    """
    Test POST /api/v1/content/{id}/share
    """
    # normal_user_token_headers fixture creates a user, we need their ID
    # A bit indirect: get user from DB based on settings.EMAIL_TEST_USER which is used by the fixture.
    user = crud_content.get_user_by_email(db, email=settings.EMAIL_TEST_USER)
    assert user is not None

    content_item = create_random_content_item(db, user_id=user.id)

    share_data = {
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "max_access_count": 5,
        "password": "testpassword"
    }
    response = client.post(
        f"{settings.API_V1_STR}/content/{content_item.id}/share",
        headers=normal_user_token_headers,
        json=share_data,
    )
    assert response.status_code == 201, response.text
    created_share = response.json()

    assert created_share["id"]
    assert created_share["share_token"]
    assert created_share["is_active"] is True
    assert created_share["expires_at"] == share_data["expires_at"]
    # Password is not in public response

    # Verify in DB
    db_share = db.get(ContentShare, uuid.UUID(created_share["id"]))
    assert db_share is not None
    assert db_share.content_item_id == content_item.id
    assert db_share.max_access_count == 5
    assert db_share.password_hash is not None # Password was set

    # Test creating share for content not owned by user
    other_user = create_random_user(db)
    other_content_item = create_random_content_item(db, user_id=other_user.id)
    response_forbidden = client.post(
        f"{settings.API_V1_STR}/content/{other_content_item.id}/share",
        headers=normal_user_token_headers, # User trying to share other_user's content
        json={"max_access_count": 1},
    )
    assert response_forbidden.status_code == 403, response_forbidden.text # Or 404 if item not found for user

    # Test with minimal data (no expiry, no max access, no password)
    share_data_minimal = {}
    response_minimal = client.post(
        f"{settings.API_V1_STR}/content/{content_item.id}/share",
        headers=normal_user_token_headers,
        json=share_data_minimal,
    )
    assert response_minimal.status_code == 201, response_minimal.text
    created_minimal_share = response_minimal.json()
    assert created_minimal_share["expires_at"] is None

    db_minimal_share = db.get(ContentShare, uuid.UUID(created_minimal_share["id"]))
    assert db_minimal_share is not None
    assert db_minimal_share.max_access_count is None
    assert db_minimal_share.password_hash is None


def test_get_shared_content_public_no_password(client: TestClient, db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id, content_text="Public Shared Content")
    share = crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item.id),
        content_item_id=content_item.id,
        user_id=user.id
    )

    response = client.get(f"{settings.API_V1_STR}/share/{share.share_token}")
    assert response.status_code == 200, response.text
    shared_item_data = response.json()
    assert shared_item_data["id"] == str(content_item.id)
    assert shared_item_data["content_text"] == "Public Shared Content"

    db.refresh(share) # Refresh to get updated access_count
    assert share.access_count == 1


def test_get_shared_content_with_password(client: TestClient, db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id, content_text="Password Protected Content")
    share = crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item.id, password="secure"),
        content_item_id=content_item.id,
        user_id=user.id
    )

    # Attempt without password
    response_no_pw = client.get(f"{settings.API_V1_STR}/share/{share.share_token}")
    assert response_no_pw.status_code == 401, response_no_pw.text # Assuming 401 if password required but not provided
    assert response_no_pw.json()["detail"] == "Password required"


    # Attempt with incorrect password
    response_wrong_pw = client.get(f"{settings.API_V1_STR}/share/{share.share_token}?password=wrong")
    assert response_wrong_pw.status_code == 403, response_wrong_pw.text
    assert response_wrong_pw.json()["detail"] == "Incorrect password"

    # Attempt with correct password
    response_correct_pw = client.get(f"{settings.API_V1_STR}/share/{share.share_token}?password=secure")
    assert response_correct_pw.status_code == 200, response_correct_pw.text
    shared_item_data = response_correct_pw.json()
    assert shared_item_data["id"] == str(content_item.id)
    assert shared_item_data["content_text"] == "Password Protected Content"

    db.refresh(share)
    assert share.access_count == 1 # Only successful access should increment


def test_get_shared_content_expired(client: TestClient, db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    expired_dt = datetime.now(timezone.utc) - timedelta(days=1)
    share = crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item.id, expires_at=expired_dt),
        content_item_id=content_item.id,
        user_id=user.id
    )

    response = client.get(f"{settings.API_V1_STR}/share/{share.share_token}")
    assert response.status_code == 404, response.text # Or 410 Gone, depends on API implementation
    assert "expired" in response.json()["detail"].lower()

    db.refresh(share)
    assert share.is_active is False # Should be deactivated by the API endpoint


def test_get_shared_content_max_access_reached(client: TestClient, db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    share = crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item.id, max_access_count=1),
        content_item_id=content_item.id,
        user_id=user.id
    )

    # First access - should succeed
    response1 = client.get(f"{settings.API_V1_STR}/share/{share.share_token}")
    assert response1.status_code == 200, response1.text
    db.refresh(share)
    assert share.access_count == 1
    assert share.is_active is False # Max access count of 1 reached, should deactivate

    # Second access - should fail
    response2 = client.get(f"{settings.API_V1_STR}/share/{share.share_token}")
    assert response2.status_code == 404, response2.text # No longer active or limit reached
    assert "limit reached" in response2.json()["detail"].lower() or "not found or inactive" in response2.json()["detail"].lower()


def test_get_shared_content_invalid_token(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/share/this_is_an_invalid_token")
    assert response.status_code == 404, response.text
    assert "not found" in response.json()["detail"].lower()


def test_deactivate_share_link_api_owner(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    user = crud_content.get_user_by_email(db, email=settings.EMAIL_TEST_USER)
    assert user is not None
    content_item = create_random_content_item(db, user_id=user.id)

    # Create a couple of shares for this item
    share1 = crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item.id),
        content_item_id=content_item.id,
        user_id=user.id
    )
    share2 = crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item.id),
        content_item_id=content_item.id,
        user_id=user.id
    )
    assert share1.is_active is True
    assert share2.is_active is True

    response = client.delete(
        f"{settings.API_V1_STR}/content/{content_item.id}/share",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 204, response.text

    db.refresh(share1)
    db.refresh(share2)
    assert share1.is_active is False
    assert share2.is_active is False

    # Test deactivating when no active shares exist (should still be 204)
    response_no_active = client.delete(
        f"{settings.API_V1_STR}/content/{content_item.id}/share",
        headers=normal_user_token_headers,
    )
    assert response_no_active.status_code == 204, response_no_active.text


def test_deactivate_share_link_api_not_owner(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
) -> None:
    owner_user = create_random_user(db) # Different user
    content_item_other_owner = create_random_content_item(db, user_id=owner_user.id)
    crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item_other_owner.id),
        content_item_id=content_item_other_owner.id,
        user_id=owner_user.id
    )

    response = client.delete(
        f"{settings.API_V1_STR}/content/{content_item_other_owner.id}/share",
        headers=normal_user_token_headers, # `normal_user` does not own this item
    )
    assert response.status_code == 403, response.text # Or 404 if hidden


def test_deactivate_share_link_api_content_not_found(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    non_existent_uuid = uuid.uuid4()
    response = client.delete(
        f"{settings.API_V1_STR}/content/{non_existent_uuid}/share",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 404, response.text


print("API tests for ContentShare created in backend/app/tests/api/routes/test_share_api.py")
