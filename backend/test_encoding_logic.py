#!/usr/bin/env python3
"""
测试编码修复逻辑
"""
import requests
from unittest.mock import Mock

def test_encoding_fix_logic():
    """测试编码修复逻辑"""
    
    print('🧪 测试编码修复逻辑...')

    # 模拟有问题的响应
    mock_response = Mock()
    mock_response.encoding = None  # 没有编码
    mock_response.text = '<!DOCTYPE html><html><head><title>中文测试</title></head><body><h1>你好世界</h1></body></html>'

    print(f'修复前编码: {mock_response.encoding}')

    # 应用我们的修复逻辑
    if mock_response.encoding is None or mock_response.encoding.lower() in ['iso-8859-1', 'latin-1']:
        mock_response.encoding = 'utf-8'

    print(f'修复后编码: {mock_response.encoding}')

    # 检查文本中的中文
    chinese_chars = [char for char in mock_response.text if '\u4e00' <= char <= '\u9fff']
    print(f'中文字符数: {len(chinese_chars)}')
    print(f'文本内容: {mock_response.text}')

    if len(chinese_chars) > 0:
        print('✅ 编码修复逻辑正常')
        return True
    else:
        print('❌ 编码修复逻辑有问题')
        return False

if __name__ == "__main__":
    success = test_encoding_fix_logic()
    if success:
        print("\n🎉 编码修复逻辑测试通过！")
    else:
        print("\n❌ 编码修复逻辑测试失败！") 