import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarRoot from '../../../components/Sidebar/SidebarRoot';

// 模拟chrome API
global.chrome = {
  runtime: {
    openOptionsPage: jest.fn()
  }
} as any;

describe('SidebarRoot Component', () => {
  // 在每个测试前重置模拟函数
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('设置按钮应该打开选项页面', () => {
    render(<SidebarRoot />);
    
    // 查找设置按钮并点击
    const settingsButton = screen.getByTestId('settings-button');
    fireEvent.click(settingsButton);
    
    // 验证 chrome.runtime.openOptionsPage 是否被调用
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  test('应该显示右下角图像', () => {
    render(<SidebarRoot />);
    
    // 验证右下角图像是否存在
    const cornerImage = screen.getByTestId('corner-image');
    expect(cornerImage).toBeInTheDocument();
    
    // 验证图像位置
    expect(cornerImage).toHaveClass('absolute');
    
    // 获取SVG图像
    const svgImage = cornerImage.querySelector('svg');
    expect(svgImage).toBeInTheDocument();
  });
}); 