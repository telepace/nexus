from unittest.mock import MagicMock

from app.core.db import init_db as init


def test_init_successful_connection():
    """测试数据库初始化连接成功"""
    # 创建一个mock的session对象
    session_mock = MagicMock()

    # 模拟session.exec的返回值
    exec_mock = MagicMock()
    session_mock.exec.return_value = exec_mock
    exec_mock.first.return_value = None  # 模拟没有找到用户

    # 调用要测试的函数
    init(session_mock)

    # 验证session.exec被调用（现在会调用多次，因为要创建用户、标签、提示词等）
    assert session_mock.exec.called
    # 验证first()被调用
    assert exec_mock.first.called
    # 验证add被调用（创建用户时）
    assert session_mock.add.called
    # 验证commit被调用
    assert session_mock.commit.called
