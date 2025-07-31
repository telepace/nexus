
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=list[schemas.UserFavoritePrompt])
def read_user_favorite_prompts(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve user favorite prompts.
    """
    user_favorite_prompts = crud.user_favorite_prompt.get_multi_by_owner(
        db=db, owner_id=current_user.id
    )
    return user_favorite_prompts


@router.post("/", response_model=schemas.UserFavoritePrompt)
def create_user_favorite_prompt(
    *,
    db: Session = Depends(deps.get_db),
    user_favorite_prompt_in: schemas.UserFavoritePromptCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new user favorite prompt.
    """
    user_favorite_prompt = crud.user_favorite_prompt.create_with_owner(
        db=db, obj_in=user_favorite_prompt_in, owner_id=current_user.id
    )
    return user_favorite_prompt


@router.delete("/{id}", response_model=schemas.UserFavoritePrompt)
def delete_user_favorite_prompt(
    *,
    db: Session = Depends(deps.get_db),
    id: uuid.UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a user favorite prompt.
    """
    user_favorite_prompt = crud.user_favorite_prompt.get(
        db=db, id=id
    )
    if not user_favorite_prompt:
        raise HTTPException(status_code=404, detail="User favorite prompt not found")
    if user_favorite_prompt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    user_favorite_prompt = crud.user_favorite_prompt.remove(db=db, id=id)
    return user_favorite_prompt

