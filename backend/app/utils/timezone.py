"""
时区转换工具类

提供UTC时间转换、时区感知的时间处理、以及API响应格式化功能
"""

import zoneinfo
from datetime import datetime, timezone

from pydantic import BaseModel


class TimezoneUtil:
    """时区转换工具类"""

    # 支持的时区列表
    SUPPORTED_TIMEZONES = {
        "UTC": "UTC",
        "Asia/Shanghai": "Asia/Shanghai",
        "America/New_York": "America/New_York",
        "Europe/London": "Europe/London",
        "Australia/Sydney": "Australia/Sydney",
        "America/Los_Angeles": "America/Los_Angeles",
        "Europe/Paris": "Europe/Paris",
        "Asia/Tokyo": "Asia/Tokyo",
    }

    @classmethod
    def get_utc_now(cls) -> datetime:
        """获取当前UTC时间"""
        return datetime.now(timezone.utc)

    @classmethod
    def to_utc(cls, dt: datetime) -> datetime:
        """将datetime转换为UTC时间"""
        if dt.tzinfo is None:
            # 如果没有时区信息，假设为UTC
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @classmethod
    def from_utc(cls, utc_dt: datetime, target_timezone: str = "UTC") -> datetime:
        """将UTC时间转换为指定时区时间"""
        if target_timezone not in cls.SUPPORTED_TIMEZONES:
            raise ValueError(f"不支持的时区: {target_timezone}")

        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=timezone.utc)

        if target_timezone == "UTC":
            return utc_dt

        target_tz = zoneinfo.ZoneInfo(target_timezone)
        return utc_dt.astimezone(target_tz)

    @classmethod
    def format_for_api(cls, dt: datetime, user_timezone: str | None = None) -> dict:
        """
        格式化时间用于API响应
        返回包含UTC时间和用户时区时间的字典
        """
        if dt is None:
            return {}

        # 确保是UTC时间
        utc_dt = cls.to_utc(dt)

        result = {
            "utc": utc_dt.isoformat(),
            "timestamp": int(utc_dt.timestamp()),
        }

        # 如果提供了用户时区，添加本地时间
        if user_timezone and user_timezone in cls.SUPPORTED_TIMEZONES:
            local_dt = cls.from_utc(utc_dt, user_timezone)
            result["local"] = local_dt.isoformat()
            result["timezone"] = user_timezone

        return result

    @classmethod
    def parse_api_datetime(cls, dt_str: str | datetime) -> datetime:
        """解析API传入的时间字符串，返回UTC datetime"""
        if isinstance(dt_str, datetime):
            return cls.to_utc(dt_str)

        if isinstance(dt_str, str):
            # 尝试解析ISO格式
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                return cls.to_utc(dt)
            except ValueError:
                # 如果无法解析，抛出异常
                raise ValueError(f"无法解析时间格式: {dt_str}")

        raise ValueError(f"不支持的时间类型: {type(dt_str)}")

    @classmethod
    def is_valid_timezone(cls, timezone_str: str) -> bool:
        """检查时区字符串是否有效"""
        return timezone_str in cls.SUPPORTED_TIMEZONES

    @classmethod
    def get_timezone_offset(cls, timezone_str: str, dt: datetime | None = None) -> int:
        """获取指定时区相对于UTC的偏移量（秒）"""
        if not cls.is_valid_timezone(timezone_str):
            return 0

        if timezone_str == "UTC":
            return 0

        dt = dt or cls.get_utc_now()
        target_tz = zoneinfo.ZoneInfo(timezone_str)
        local_dt = dt.astimezone(target_tz)

        offset = local_dt.utcoffset()
        if offset is None:
            return 0

        return int(offset.total_seconds())


class DateTimeResponse(BaseModel):
    """时间API响应模型"""

    utc: str
    timestamp: int
    local: str | None = None
    timezone: str | None = None


class TimezoneMiddleware:
    """时区中间件，用于处理请求中的时区信息"""

    @staticmethod
    def extract_user_timezone(headers: dict) -> str | None:
        """从请求头中提取用户时区"""
        timezone_header = headers.get("x-user-timezone")

        if timezone_header and TimezoneUtil.is_valid_timezone(timezone_header):
            return timezone_header

        return None

    @staticmethod
    def add_timezone_to_response(data: dict, user_timezone: str | None = None) -> dict:
        """为响应数据添加时区信息"""
        if not data:
            return data

        # 递归处理嵌套数据
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = TimezoneUtil.format_for_api(value, user_timezone)
            elif isinstance(value, dict):
                data[key] = TimezoneMiddleware.add_timezone_to_response(
                    value, user_timezone
                )
            elif isinstance(value, list):
                data[key] = [
                    TimezoneMiddleware.add_timezone_to_response(item, user_timezone)
                    if isinstance(item, dict)
                    else item
                    for item in value
                ]

        return data


# 便捷函数
def now_utc() -> datetime:
    """获取当前UTC时间的便捷函数"""
    return TimezoneUtil.get_utc_now()


def format_datetime_for_api(dt: datetime, user_timezone: str | None = None) -> dict:
    """格式化时间用于API响应的便捷函数"""
    return TimezoneUtil.format_for_api(dt, user_timezone)


def parse_datetime_from_api(dt_str: str | datetime) -> datetime:
    """解析API传入时间的便捷函数"""
    return TimezoneUtil.parse_api_datetime(dt_str)
