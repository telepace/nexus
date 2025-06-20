from typing import cast

from sqlmodel import Session

from app import crud
from app.models.project import Project, ProjectCreate
from app.tests.utils.user import create_random_user
from app.tests.utils.utils import random_lower_string


def create_random_item(db: Session) -> Project:
    """Create a random project (formerly item) for testing"""
    user = create_random_user(db)
    owner_id = user.id
    assert owner_id is not None
    title = random_lower_string()
    description = random_lower_string()
    project_in = ProjectCreate(title=title, description=description)
    return cast(
        Project,
        crud.create_project(session=db, item_in=project_in, owner_id=owner_id),
    )


# Alias for backward compatibility
create_random_project = create_random_item
