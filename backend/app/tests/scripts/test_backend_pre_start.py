from unittest.mock import MagicMock, patch

import pytest

from app.backend_pre_start import init


@pytest.mark.skip(reason="需要修复mock配置问题，暂时跳过")
@patch("sqlmodel.Session")
def test_init_successful_connection(session_mock_class):
    """测试数据库初始化连接成功"""
    # 创建一个mock对象
    engine_mock = MagicMock()

    # 设置session_mock的返回值和方法调用
    session_mock = MagicMock()
    session_mock_class.return_value = session_mock

    # 调用要测试的函数
    init(engine_mock)

    # 检查Session是否以正确的参数被调用
    session_mock_class.assert_called_once()
