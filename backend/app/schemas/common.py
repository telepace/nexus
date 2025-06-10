"""Common schemas for API responses."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response format."""

    data: T
    message: str = "Success"
    meta: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    """Error response format."""

    error: str
    message: str
    details: dict[str, Any] | None = None


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int
    per_page: int
    total: int
    pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response format."""

    data: list[T]
    meta: PaginationMeta
    message: str = "Success"
