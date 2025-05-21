from typing import Any, Generic, TypeVar

from sqlmodel import SQLModel

T = TypeVar("T")


# API Response model
class ApiResponse(SQLModel, Generic[T]):
    data: T | None = None
    meta: dict[str, Any] | None = None
    error: str | None = None
