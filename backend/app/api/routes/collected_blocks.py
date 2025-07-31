from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import CollectedBlock
from app.schemas.collected_block import (
    CollectedBlockCreate,
    CollectedBlockPublic,
    CollectedBlocksPublic,
)

router = APIRouter()


@router.post("/", response_model=CollectedBlockPublic)
def create_collected_block(
    collected_block_in: CollectedBlockCreate,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Create new collected block."""
    collected_block = CollectedBlock(**collected_block_in.model_dump(), user_id=current_user.id)
    session.add(collected_block)
    session.commit()
    session.refresh(collected_block)
    return collected_block


@router.get("/", response_model=CollectedBlocksPublic)
def read_collected_blocks(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve collected blocks."""
    count_statement = select(CollectedBlock).where(CollectedBlock.user_id == current_user.id)
    count = session.exec(count_statement).count()

    statement = (
        select(CollectedBlock)
        .where(CollectedBlock.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    collected_blocks = session.exec(statement).all()

    return CollectedBlocksPublic(data=collected_blocks, count=count)


@router.delete("/{lock_id}", response_model=CollectedBlockPublic)
def delete_collected_block(
    block_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Delete collected block."""
    collected_block = session.get(CollectedBlock, block_id)
    if not collected_block:
        raise HTTPException(status_code=404, detail="CollectedBlock not found")
    if collected_block.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(collected_block)
    session.commit()
    return collected_block

