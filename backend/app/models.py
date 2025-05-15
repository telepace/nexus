import uuid
from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import EmailStr
from sqlalchemy import String
from sqlmodel import Column, Field, Relationship, SQLModel

T = TypeVar("T")


# API Response model
class ApiResponse(SQLModel, Generic[T]):
    data: T | None = None
    meta: dict[str, Any] | None = None
    error: str | None = None


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(
        default=None,
        sa_column=Column(String(255), unique=True, index=True),
        max_length=255,
    )
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: str | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str | None = Field(default=None)  # Make nullable for OAuth users
    google_id: str | None = Field(
        default=None, sa_column=Column(String(255), unique=True, index=True)
    )
    items: list["Item"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "primaryjoin": "User.id == Item.owner_id",
            "foreign_keys": "[Item.owner_id]",
        },
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Token Blacklist model for storing invalidated tokens
class TokenBlacklist(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    token: str = Field(index=True)
    user_id: uuid.UUID = Field(index=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Remove foreign_key constraint, but keep it indexed for performance
    owner_id: uuid.UUID = Field(index=True, nullable=False)
    owner: User | None = Relationship(
        back_populates="items",
        sa_relationship_kwargs={
            "primaryjoin": "User.id == Item.owner_id",
            "foreign_keys": "[Item.owner_id]",
        },
    )


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None
    exp: float | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)
