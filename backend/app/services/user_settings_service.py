import uuid
from typing import Optional

from sqlmodel import Session, select

from app.models.user_settings import UserSettings, UserSettingsCreate, UserSettingsUpdate
from app.utils.timezone import now_utc


class UserSettingsService:
    """用户设置服务"""
    
    @staticmethod
    def get_user_settings(session: Session, user_id: uuid.UUID) -> Optional[UserSettings]:
        """获取用户设置"""
        statement = select(UserSettings).where(UserSettings.user_id == user_id)
        return session.exec(statement).first()
    
    @staticmethod
    def get_or_create_user_settings(session: Session, user_id: uuid.UUID) -> UserSettings:
        """获取或创建用户设置"""
        user_settings = UserSettingsService.get_user_settings(session, user_id)
        
        if not user_settings:
            # 创建默认设置
            user_settings = UserSettings(
                user_id=user_id,
                ai_output_language="English",  # 默认英文
                auto_generate_summary=True,
                auto_generate_key_points=True,
                auto_generate_labels=True,
                max_summary_length=500
            )
            session.add(user_settings)
            session.commit()
            session.refresh(user_settings)
        
        return user_settings
    
    @staticmethod
    def create_user_settings(
        session: Session, 
        user_id: uuid.UUID, 
        settings_data: UserSettingsCreate
    ) -> UserSettings:
        """创建用户设置"""
        user_settings = UserSettings(
            user_id=user_id,
            **settings_data.dict()
        )
        session.add(user_settings)
        session.commit()
        session.refresh(user_settings)
        return user_settings
    
    @staticmethod
    def update_user_settings(
        session: Session,
        user_id: uuid.UUID,
        settings_update: UserSettingsUpdate
    ) -> Optional[UserSettings]:
        """更新用户设置"""
        user_settings = UserSettingsService.get_user_settings(session, user_id)
        
        if not user_settings:
            return None
        
        # 更新字段
        update_data = settings_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user_settings, field, value)
        
        user_settings.updated_at = now_utc()
        session.add(user_settings)
        session.commit()
        session.refresh(user_settings)
        
        return user_settings
    
    @staticmethod
    def get_user_ai_language(session: Session, user_id: uuid.UUID) -> str:
        """获取用户的 AI 输出语言偏好"""
        user_settings = UserSettingsService.get_user_settings(session, user_id)
        
        if user_settings:
            return user_settings.ai_output_language
        
        # 默认返回英文
        return "English"
    
    @staticmethod
    def set_user_ai_language(session: Session, user_id: uuid.UUID, language: str) -> UserSettings:
        """设置用户的 AI 输出语言偏好"""
        user_settings = UserSettingsService.get_or_create_user_settings(session, user_id)
        user_settings.ai_output_language = language
        user_settings.updated_at = now_utc()
        
        session.add(user_settings)
        session.commit()
        session.refresh(user_settings)
        
        return user_settings 