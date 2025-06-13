"""
时区工具类测试
"""

from datetime import datetime, timezone

import pytest

from app.utils.timezone import (
    TimezoneMiddleware,
    TimezoneUtil,
    format_datetime_for_api,
    now_utc,
    parse_datetime_from_api,
)


class TestTimezoneUtil:
    """时区工具类测试"""

    def test_get_utc_now(self):
        """测试获取UTC时间"""
        utc_time = TimezoneUtil.get_utc_now()
        assert utc_time.tzinfo == timezone.utc
        assert isinstance(utc_time, datetime)

    def test_to_utc(self):
        """测试转换为UTC时间"""
        # 测试无时区信息的时间
        naive_dt = datetime(2024, 1, 1, 12, 0, 0)
        utc_dt = TimezoneUtil.to_utc(naive_dt)
        assert utc_dt.tzinfo == timezone.utc

        # 测试已有时区信息的时间
        tz_dt = datetime(2024, 1, 1, 20, 0, 0, tzinfo=timezone.utc)
        utc_dt = TimezoneUtil.to_utc(tz_dt)
        assert utc_dt.tzinfo == timezone.utc

    def test_from_utc(self):
        """测试从UTC转换到指定时区"""
        utc_dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        # 转换到上海时区
        shanghai_dt = TimezoneUtil.from_utc(utc_dt, "Asia/Shanghai")
        assert shanghai_dt.tzinfo is not None

        # 转换到纽约时区
        ny_dt = TimezoneUtil.from_utc(utc_dt, "America/New_York")
        assert ny_dt.tzinfo is not None

        # 测试无效时区
        with pytest.raises(ValueError):
            TimezoneUtil.from_utc(utc_dt, "Invalid/Timezone")

    def test_format_for_api(self):
        """测试API格式化"""
        utc_dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        # 不指定用户时区
        result = TimezoneUtil.format_for_api(utc_dt)
        assert "utc" in result
        assert "timestamp" in result
        assert isinstance(result["timestamp"], int)

        # 指定用户时区
        result = TimezoneUtil.format_for_api(utc_dt, "Asia/Shanghai")
        assert "utc" in result
        assert "timestamp" in result
        assert "local" in result
        assert "timezone" in result
        assert result["timezone"] == "Asia/Shanghai"

        # 测试None值
        result = TimezoneUtil.format_for_api(None)
        assert result == {}

    def test_parse_api_datetime(self):
        """测试解析API时间"""
        # 测试ISO格式字符串
        iso_str = "2024-01-01T12:00:00Z"
        parsed = TimezoneUtil.parse_api_datetime(iso_str)
        assert isinstance(parsed, datetime)
        assert parsed.tzinfo == timezone.utc

        # 测试datetime对象
        dt = datetime(2024, 1, 1, 12, 0, 0)
        parsed = TimezoneUtil.parse_api_datetime(dt)
        assert isinstance(parsed, datetime)
        assert parsed.tzinfo == timezone.utc

        # 测试无效格式
        with pytest.raises(ValueError):
            TimezoneUtil.parse_api_datetime("invalid-format")

        # 测试无效类型
        with pytest.raises(ValueError):
            TimezoneUtil.parse_api_datetime(123)

    def test_is_valid_timezone(self):
        """测试时区验证"""
        # 有效时区
        assert TimezoneUtil.is_valid_timezone("Asia/Shanghai")
        assert TimezoneUtil.is_valid_timezone("UTC")
        assert TimezoneUtil.is_valid_timezone("America/New_York")

        # 无效时区
        assert not TimezoneUtil.is_valid_timezone("Invalid/Timezone")
        assert not TimezoneUtil.is_valid_timezone("")

    def test_get_timezone_offset(self):
        """测试获取时区偏移量"""
        # UTC偏移量应该为0
        offset = TimezoneUtil.get_timezone_offset("UTC")
        assert offset == 0

        # 上海时区偏移量应该为8小时 (28800秒)
        offset = TimezoneUtil.get_timezone_offset("Asia/Shanghai")
        assert offset == 28800  # 8 * 60 * 60

        # 无效时区应该返回0
        offset = TimezoneUtil.get_timezone_offset("Invalid/Timezone")
        assert offset == 0


class TestTimezoneMiddleware:
    """时区中间件测试"""

    def test_extract_user_timezone(self):
        """测试提取用户时区"""
        # 有效时区头
        headers = {"x-user-timezone": "Asia/Shanghai"}
        timezone = TimezoneMiddleware.extract_user_timezone(headers)
        assert timezone == "Asia/Shanghai"

        # 无效时区头
        headers = {"x-user-timezone": "Invalid/Timezone"}
        timezone = TimezoneMiddleware.extract_user_timezone(headers)
        assert timezone is None

        # 没有时区头
        headers = {}
        timezone = TimezoneMiddleware.extract_user_timezone(headers)
        assert timezone is None

    def test_add_timezone_to_response(self):
        """测试为响应添加时区信息"""
        utc_dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        # 测试简单数据
        data = {"created_at": utc_dt}
        result = TimezoneMiddleware.add_timezone_to_response(data, "Asia/Shanghai")
        assert isinstance(result["created_at"], dict)
        assert "utc" in result["created_at"]
        assert "local" in result["created_at"]

        # 测试嵌套数据
        nested_data = {
            "user": {"created_at": utc_dt, "name": "Test"},
            "items": [
                {"created_at": utc_dt, "title": "Item 1"},
                {"created_at": utc_dt, "title": "Item 2"},
            ],
        }
        result = TimezoneMiddleware.add_timezone_to_response(
            nested_data, "Asia/Shanghai"
        )
        assert isinstance(result["user"]["created_at"], dict)
        assert isinstance(result["items"][0]["created_at"], dict)

        # 测试空数据
        result = TimezoneMiddleware.add_timezone_to_response({}, "Asia/Shanghai")
        assert result == {}

        result = TimezoneMiddleware.add_timezone_to_response(None, "Asia/Shanghai")
        assert result is None


class TestConvenienceFunctions:
    """便捷函数测试"""

    def test_now_utc(self):
        """测试now_utc便捷函数"""
        utc_time = now_utc()
        assert utc_time.tzinfo == timezone.utc
        assert isinstance(utc_time, datetime)

    def test_format_datetime_for_api(self):
        """测试format_datetime_for_api便捷函数"""
        utc_dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        result = format_datetime_for_api(utc_dt, "Asia/Shanghai")
        assert isinstance(result, dict)
        assert "utc" in result
        assert "local" in result

    def test_parse_datetime_from_api(self):
        """测试parse_datetime_from_api便捷函数"""
        iso_str = "2024-01-01T12:00:00Z"
        parsed = parse_datetime_from_api(iso_str)
        assert isinstance(parsed, datetime)
        assert parsed.tzinfo == timezone.utc


if __name__ == "__main__":
    pytest.main([__file__])
