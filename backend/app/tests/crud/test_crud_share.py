import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import Session

from app.core.security import get_password_hash, verify_password
from app.crud import crud_content
from app.models.content import ContentItem, ContentShare
from app.schemas.content import ContentShareCreate
from app.tests.utils.user import create_random_user
from app.tests.utils.content import create_random_content_item

# Fixtures from conftest.py will be automatically available (e.g., `db`)


def test_create_content_share(db: Session) -> None:
    """
    Test creating a new content share link.
    """
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)

    expires_at_dt = datetime.now(timezone.utc) + timedelta(days=7)
    share_in = ContentShareCreate(
        content_item_id=content_item.id, # Not strictly used by CRUD, but good for schema validation
        expires_at=expires_at_dt,
        max_access_count=10,
        password="testpassword",
    )

    created_share = crud_content.create_content_share(
        db=db,
        content_share_in=share_in,
        content_item_id=content_item.id,
        user_id=user.id  # user_id for audit/context, not stored on ContentShare model itself
    )

    assert created_share.id is not None
    assert created_share.content_item_id == content_item.id
    assert created_share.share_token is not None
    assert len(created_share.share_token) > 10 # Basic check for token format/length
    assert created_share.is_active is True
    assert created_share.access_count == 0
    assert created_share.expires_at == expires_at_dt
    assert created_share.max_access_count == 10
    assert created_share.password_hash is not None
    assert verify_password("testpassword", created_share.password_hash)

    # Test creating a share with minimal options
    share_in_minimal = ContentShareCreate(content_item_id=content_item.id)
    created_share_minimal = crud_content.create_content_share(
        db=db,
        content_share_in=share_in_minimal,
        content_item_id=content_item.id,
        user_id=user.id
    )
    assert created_share_minimal.expires_at is None
    assert created_share_minimal.max_access_count is None
    assert created_share_minimal.password_hash is None


def test_unique_share_token_generation(db: Session) -> None:
    """
    Test that generated share tokens are unique.
    """
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    share_in = ContentShareCreate(content_item_id=content_item.id)

    share1 = crud_content.create_content_share(db, content_share_in=share_in, content_item_id=content_item.id, user_id=user.id)
    share2 = crud_content.create_content_share(db, content_share_in=share_in, content_item_id=content_item.id, user_id=user.id)

    assert share1.share_token != share2.share_token


def test_get_content_share_by_token(db: Session) -> None:
    """
    Test retrieving a content share by its token.
    """
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    share_in = ContentShareCreate(content_item_id=content_item.id)
    created_share = crud_content.create_content_share(db, content_share_in=share_in, content_item_id=content_item.id, user_id=user.id)

    # Test successful retrieval
    retrieved_share = crud_content.get_content_share_by_token(db, token=created_share.share_token)
    assert retrieved_share is not None
    assert retrieved_share.id == created_share.id
    assert retrieved_share.share_token == created_share.share_token

    # Test with a non-existent token
    non_existent_token = "this_token_does_not_exist"
    retrieved_share_none = crud_content.get_content_share_by_token(db, token=non_existent_token)
    assert retrieved_share_none is None

    # Test with an inactive token (after deactivating)
    created_share.is_active = False
    db.add(created_share)
    db.commit()
    db.refresh(created_share)

    # get_content_share_by_token should still return it, API layer handles active check typically
    retrieved_inactive_share = crud_content.get_content_share_by_token(db, token=created_share.share_token)
    assert retrieved_inactive_share is not None
    assert retrieved_inactive_share.is_active is False


def test_get_content_shares_by_content_id(db: Session) -> None:
    user = create_random_user(db)
    content_item1 = create_random_content_item(db, user_id=user.id)
    content_item2 = create_random_content_item(db, user_id=user.id)

    share1_ci1 = crud_content.create_content_share(db, content_share_in=ContentShareCreate(content_item_id=content_item1.id), content_item_id=content_item1.id, user_id=user.id)
    share2_ci1 = crud_content.create_content_share(db, content_share_in=ContentShareCreate(content_item_id=content_item1.id), content_item_id=content_item1.id, user_id=user.id)
    share1_ci2 = crud_content.create_content_share(db, content_share_in=ContentShareCreate(content_item_id=content_item2.id), content_item_id=content_item2.id, user_id=user.id)

    # Deactivate one share to ensure only active ones are returned by default
    share2_ci1 = crud_content.deactivate_content_share(db, content_share=share2_ci1)

    shares_for_ci1 = crud_content.get_content_shares_by_content_id(db, content_item_id=content_item1.id)
    assert len(shares_for_ci1) == 1
    assert shares_for_ci1[0].id == share1_ci1.id
    assert shares_for_ci1[0].is_active is True

    shares_for_ci2 = crud_content.get_content_shares_by_content_id(db, content_item_id=content_item2.id)
    assert len(shares_for_ci2) == 1
    assert shares_for_ci2[0].id == share1_ci2.id

    non_existent_uuid = uuid.uuid4()
    shares_for_none = crud_content.get_content_shares_by_content_id(db, content_item_id=non_existent_uuid)
    assert len(shares_for_none) == 0


def test_increment_access_count(db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    share = crud_content.create_content_share(
        db,
        content_share_in=ContentShareCreate(content_item_id=content_item.id, max_access_count=3),
        content_item_id=content_item.id,
        user_id=user.id
    )

    assert share.access_count == 0
    assert share.is_active is True

    share = crud_content.increment_access_count(db, content_share=share)
    assert share.access_count == 1
    assert share.is_active is True

    share = crud_content.increment_access_count(db, content_share=share)
    assert share.access_count == 2
    assert share.is_active is True

    share = crud_content.increment_access_count(db, content_share=share) # Reaches max_access_count
    assert share.access_count == 3
    assert share.is_active is False # Should be deactivated

    # Further increments should not reactivate, count still goes up
    share = crud_content.increment_access_count(db, content_share=share)
    assert share.access_count == 4
    assert share.is_active is False


def test_deactivate_content_share(db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    share = crud_content.create_content_share(db, content_share_in=ContentShareCreate(content_item_id=content_item.id), content_item_id=content_item.id, user_id=user.id)
    assert share.is_active is True

    deactivated_share = crud_content.deactivate_content_share(db, content_share=share)
    assert deactivated_share.is_active is False

    # Ensure it's persisted
    retrieved_share = crud_content.get_content_share_by_token(db, token=share.share_token)
    assert retrieved_share is not None
    assert retrieved_share.is_active is False


def test_delete_content_share(db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    share = crud_content.create_content_share(db, content_share_in=ContentShareCreate(content_item_id=content_item.id), content_item_id=content_item.id, user_id=user.id)
    share_id = share.id
    share_token = share.share_token

    deleted_share = crud_content.delete_content_share(db, id=share_id)
    assert deleted_share is not None
    assert deleted_share.id == share_id

    # Verify it's gone from DB
    assert crud_content.get_content_share_by_token(db, token=share_token) is None
    # Or using get by id if we had one: assert db.get(ContentShare, share_id) is None

    # Test deleting a non-existent share
    non_existent_uuid = uuid.uuid4()
    deleted_none = crud_content.delete_content_share(db, id=non_existent_uuid)
    assert deleted_none is None


def test_update_content_share(db: Session) -> None:
    user = create_random_user(db)
    content_item = create_random_content_item(db, user_id=user.id)
    share = crud_content.create_content_share(db, content_share_in=ContentShareCreate(content_item_id=content_item.id), content_item_id=content_item.id, user_id=user.id)

    old_password_hash = share.password_hash
    new_expiry = datetime.now(timezone.utc) + timedelta(days=30)

    update_data = {
        "expires_at": new_expiry,
        "max_access_count": 50,
        "password": "newpassword123",
        "is_active": False # Also test deactivating via update
    }
    updated_share = crud_content.update_content_share(db, content_share=share, update_data=update_data)

    assert updated_share.expires_at == new_expiry
    assert updated_share.max_access_count == 50
    assert updated_share.is_active is False
    assert updated_share.password_hash is not None
    assert old_password_hash != updated_share.password_hash # Ensure hash changed
    assert verify_password("newpassword123", updated_share.password_hash)

    # Test updating only one field, e.g., making it active again without password change
    update_data_reactivate = {"is_active": True}
    current_password_hash = updated_share.password_hash
    reactivated_share = crud_content.update_content_share(db, content_share=updated_share, update_data=update_data_reactivate)
    assert reactivated_share.is_active is True
    assert reactivated_share.password_hash == current_password_hash # Ensure hash did not change

print("CRUD tests for ContentShare created in backend/app/tests/crud/test_crud_share.py")
