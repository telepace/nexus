"""
测试时区中间件
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import Request, Response
from starlette.responses import JSONResponse

from app.api.middlewares.timezone_middleware import (
    TimezoneHTTPMiddleware,
    get_user_timezone,
    TimezoneResponseHelper
)


class TestTimezoneHTTPMiddleware:
    """测试时区HTTP中间件"""

    @pytest.fixture
    def middleware(self):
        """创建中间件实例"""
        return TimezoneHTTPMiddleware(app=None)

    @pytest.fixture
    def mock_request(self):
        """创建模拟请求"""
        request = MagicMock(spec=Request)
        request.headers = {}
        request.query_params = {}
        request.state = MagicMock()
        return request

    @pytest.mark.asyncio
    async def test_dispatch_with_timezone_header(self, middleware, mock_request):
        """测试带时区头的请求处理"""
        # 设置时区头
        mock_request.headers = {"x-user-timezone": "Asia/Shanghai"}
        
        # 模拟call_next
        mock_response = JSONResponse(content={"message": "test"})
        call_next = AsyncMock(return_value=mock_response)
        
        with patch.object(middleware, '_process_response_timezone', 
                         return_value=mock_response) as mock_process:
            response = await middleware.dispatch(mock_request, call_next)
            
            # 验证时区被设置到请求状态
            assert mock_request.state.user_timezone == "Asia/Shanghai"
            
            # 验证响应处理被调用
            mock_process.assert_called_once_with(mock_response, "Asia/Shanghai")

    @pytest.mark.asyncio
    async def test_dispatch_with_timezone_query_param(self, middleware, mock_request):
        """测试带时区查询参数的请求处理"""
        # 设置时区查询参数
        mock_request.query_params = {"timezone": "America/New_York"}
        
        mock_response = JSONResponse(content={"message": "test"})
        call_next = AsyncMock(return_value=mock_response)
        
        with patch.object(middleware, '_process_response_timezone', 
                         return_value=mock_response):
            await middleware.dispatch(mock_request, call_next)
            
            # 验证时区被设置
            assert mock_request.state.user_timezone == "America/New_York"

    @pytest.mark.asyncio
    async def test_dispatch_without_timezone(self, middleware, mock_request):
        """测试没有时区信息的请求处理"""
        mock_response = Response(content="test")
        call_next = AsyncMock(return_value=mock_response)
        
        response = await middleware.dispatch(mock_request, call_next)
        
        # 验证时区为None
        assert mock_request.state.user_timezone is None
        
        # 验证返回原响应
        assert response == mock_response

    @pytest.mark.asyncio
    async def test_dispatch_non_json_response(self, middleware, mock_request):
        """测试非JSON响应的处理"""
        mock_request.headers = {"x-user-timezone": "Asia/Shanghai"}
        
        # 非JSON响应
        mock_response = Response(content="plain text")
        call_next = AsyncMock(return_value=mock_response)
        
        response = await middleware.dispatch(mock_request, call_next)
        
        # 验证直接返回原响应
        assert response == mock_response

    def test_extract_timezone_from_request_header_priority(self, middleware, mock_request):
        """测试时区提取的优先级 - 头部优先"""
        mock_request.headers = {"x-user-timezone": "Asia/Shanghai"}
        mock_request.query_params = {"timezone": "America/New_York"}
        
        with patch('app.api.middlewares.timezone_middleware.TimezoneUtil.is_valid_timezone', 
                  return_value=True):
            timezone = middleware._extract_timezone_from_request(mock_request)
            
            # 头部时区应该优先
            assert timezone == "Asia/Shanghai"

    def test_extract_timezone_from_request_invalid_timezone(self, middleware, mock_request):
        """测试无效时区的处理"""
        mock_request.headers = {"x-user-timezone": "Invalid/Timezone"}
        
        with patch('app.api.middlewares.timezone_middleware.TimezoneUtil.is_valid_timezone', 
                  return_value=False):
            timezone = middleware._extract_timezone_from_request(mock_request)
            
            assert timezone is None

    def test_extract_timezone_from_request_query_fallback(self, middleware, mock_request):
        """测试查询参数回退"""
        mock_request.query_params = {"timezone": "Europe/London"}
        
        with patch('app.api.middlewares.timezone_middleware.TimezoneUtil.is_valid_timezone', 
                  return_value=True):
            timezone = middleware._extract_timezone_from_request(mock_request)
            
            assert timezone == "Europe/London"

    @pytest.mark.asyncio
    async def test_process_response_timezone_success(self, middleware):
        """测试成功的响应时区处理"""
        test_data = {"created_at": "2023-01-01T00:00:00Z"}
        response = JSONResponse(content=test_data)
        
        with patch('app.api.middlewares.timezone_middleware.TimezoneMiddleware.add_timezone_to_response',
                  return_value={"created_at": "2023-01-01T08:00:00+08:00"}) as mock_add_tz:
            
            processed_response = await middleware._process_response_timezone(
                response, "Asia/Shanghai"
            )
            
            # 验证时区处理被调用
            mock_add_tz.assert_called_once_with(test_data, "Asia/Shanghai")
            
            # 验证返回新的JSONResponse
            assert isinstance(processed_response, JSONResponse)

    @pytest.mark.asyncio
    async def test_process_response_timezone_error_handling(self, middleware):
        """测试响应时区处理的错误处理"""
        response = JSONResponse(content={"test": "data"})
        
        # 模拟JSON解析错误
        with patch('json.loads', side_effect=json.JSONDecodeError("test", "test", 0)):
            processed_response = await middleware._process_response_timezone(
                response, "Asia/Shanghai"
            )
            
            # 错误时应该返回原响应
            assert processed_response == response

    @pytest.mark.asyncio
    async def test_process_response_timezone_memoryview_body(self, middleware):
        """测试memoryview类型的响应体处理"""
        test_data = {"message": "test"}
        json_bytes = json.dumps(test_data).encode('utf-8')
        
        # 创建带memoryview body的响应
        response = JSONResponse(content=test_data)
        response.body = memoryview(json_bytes)
        
        with patch('app.api.middlewares.timezone_middleware.TimezoneMiddleware.add_timezone_to_response',
                  return_value=test_data):
            processed_response = await middleware._process_response_timezone(
                response, "Asia/Shanghai"
            )
            
            assert isinstance(processed_response, JSONResponse)


class TestGetUserTimezone:
    """测试获取用户时区函数"""

    def test_get_user_timezone_exists(self):
        """测试时区存在的情况"""
        mock_request = MagicMock(spec=Request)
        mock_request.state.user_timezone = "Asia/Shanghai"
        
        timezone = get_user_timezone(mock_request)
        assert timezone == "Asia/Shanghai"

    def test_get_user_timezone_not_exists(self):
        """测试时区不存在的情况"""
        mock_request = MagicMock(spec=Request)
        # 删除user_timezone属性
        del mock_request.state.user_timezone
        
        timezone = get_user_timezone(mock_request)
        assert timezone is None

    def test_get_user_timezone_no_state(self):
        """测试没有state的情况"""
        mock_request = MagicMock(spec=Request)
        mock_request.state = None
        
        timezone = get_user_timezone(mock_request)
        assert timezone is None


class TestTimezoneResponseHelper:
    """测试时区响应帮助类"""

    def test_format_datetime_fields_with_timezone(self):
        """测试带时区的日期时间字段格式化"""
        test_data = {"created_at": "2023-01-01T00:00:00Z"}
        
        with patch('app.api.middlewares.timezone_middleware.TimezoneMiddleware.add_timezone_to_response',
                  return_value={"created_at": "2023-01-01T08:00:00+08:00"}) as mock_add_tz:
            
            result = TimezoneResponseHelper.format_datetime_fields(
                test_data, "Asia/Shanghai"
            )
            
            mock_add_tz.assert_called_once_with(test_data, "Asia/Shanghai")
            assert result == {"created_at": "2023-01-01T08:00:00+08:00"}

    def test_format_datetime_fields_without_timezone(self):
        """测试不带时区的日期时间字段格式化"""
        test_data = {"created_at": "2023-01-01T00:00:00Z"}
        
        with patch('app.api.middlewares.timezone_middleware.TimezoneMiddleware.add_timezone_to_response',
                  return_value=test_data) as mock_add_tz:
            
            result = TimezoneResponseHelper.format_datetime_fields(test_data, None)
            
            mock_add_tz.assert_called_once_with(test_data, None)

    def test_create_timezone_aware_response_dict(self):
        """测试创建时区感知的字典响应"""
        test_data = {"message": "test", "created_at": "2023-01-01T00:00:00Z"}
        
        with patch.object(TimezoneResponseHelper, 'format_datetime_fields',
                         return_value=test_data) as mock_format:
            
            response = TimezoneResponseHelper.create_timezone_aware_response(
                test_data, "Asia/Shanghai", 200
            )
            
            mock_format.assert_called_once_with(test_data, "Asia/Shanghai")
            assert isinstance(response, JSONResponse)
            assert response.status_code == 200

    def test_create_timezone_aware_response_list(self):
        """测试创建时区感知的列表响应"""
        test_data = [
            {"id": 1, "created_at": "2023-01-01T00:00:00Z"},
            {"id": 2, "created_at": "2023-01-02T00:00:00Z"}
        ]
        
        with patch.object(TimezoneResponseHelper, 'format_datetime_fields',
                         side_effect=lambda x, tz: x) as mock_format:
            
            response = TimezoneResponseHelper.create_timezone_aware_response(
                test_data, "Asia/Shanghai"
            )
            
            # 每个字典项都应该被格式化
            assert mock_format.call_count == 2
            assert isinstance(response, JSONResponse)

    def test_create_timezone_aware_response_non_dict_list_item(self):
        """测试包含非字典项的列表响应"""
        test_data = [
            {"id": 1, "created_at": "2023-01-01T00:00:00Z"},
            "string_item",
            123
        ]
        
        with patch.object(TimezoneResponseHelper, 'format_datetime_fields',
                         side_effect=lambda x, tz: x) as mock_format:
            
            response = TimezoneResponseHelper.create_timezone_aware_response(test_data)
            
            # 只有字典项被格式化
            assert mock_format.call_count == 1
            assert isinstance(response, JSONResponse)

    def test_create_timezone_aware_response_primitive_data(self):
        """测试原始数据类型的响应"""
        test_data = "simple string"
        
        response = TimezoneResponseHelper.create_timezone_aware_response(test_data)
        
        assert isinstance(response, JSONResponse)
        assert response.status_code == 200

    def test_create_timezone_aware_response_custom_status_code(self):
        """测试自定义状态码的响应"""
        test_data = {"error": "not found"}
        
        response = TimezoneResponseHelper.create_timezone_aware_response(
            test_data, status_code=404
        )
        
        assert response.status_code == 404
        assert isinstance(response, JSONResponse) 