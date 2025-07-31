import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel, UniqueConstraint

from app.utils.timezone import now_utc


class UserSettingsBase(SQLModel):
    """用户设置基础模型"""

    # AI 输出语言偏好
    ai_output_language: str = Field(default="English", description="AI 输出语言偏好")

    # 其他设置可以在这里扩展
    auto_generate_summary: bool = Field(default=True, description="是否自动生成摘要")
    auto_generate_key_points: bool = Field(default=True, description="是否自动生成要点")
    auto_generate_labels: bool = Field(default=True, description="是否自动生成标签")

    # 偏好设置
    preferred_analysis_model: str | None = Field(default=None, description="偏好的分析模型")
    max_summary_length: int = Field(default=500, description="摘要最大长度")


class UserSettingsCreate(UserSettingsBase):
    """创建用户设置请求模型"""
    pass


class UserSettingsUpdate(SQLModel):
    """更新用户设置请求模型"""
    ai_output_language: str | None = Field(default=None, description="AI 输出语言偏好")
    auto_generate_summary: bool | None = Field(default=None, description="是否自动生成摘要")
    auto_generate_key_points: bool | None = Field(default=None, description="是否自动生成要点")
    auto_generate_labels: bool | None = Field(default=None, description="是否自动生成标签")
    preferred_analysis_model: str | None = Field(default=None, description="偏好的分析模型")
    max_summary_length: int | None = Field(default=None, description="摘要最大长度")


class UserSettings(UserSettingsBase, table=True):
    """用户设置数据库模型"""

    __tablename__ = "user_settings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, description="用户ID")

    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)

    # 确保每个用户只有一个设置记录
    __table_args__ = (UniqueConstraint("user_id"),)


class UserSettingsPublic(UserSettingsBase):
    """用户设置公开模型"""

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
