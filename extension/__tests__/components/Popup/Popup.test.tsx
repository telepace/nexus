import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../../tests/test-utils';
import userEvent from '@testing-library/user-event';
import Popup from '../../../components/Popup/Popup';
import { getRecentClippings, login } from '../../../utils/api';
import { generateMockClipping, generateMockUserProfile } from '../../../tests/test-utils';

// 模拟依赖
jest.mock('../../../utils/api');
jest.mock('@plasmohq/storage');

describe('Popup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render popup with loading state initially', () => {
    render(<Popup />);
    
    // 验证加载状态元素存在
    expect(screen.getByText(/加载中/i) || screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should display recent clippings when loaded', async () => {
    // 模拟API返回的clippings数据
    const mockClippings = [
      generateMockClipping({ title: '测试文章1' }),
      generateMockClipping({ title: '测试文章2' })
    ];
    
    // 设置模拟函数返回值
    (getRecentClippings as jest.Mock).mockResolvedValueOnce(mockClippings);
    
    render(<Popup />);
    
    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试文章1')).toBeInTheDocument();
      expect(screen.getByText('测试文章2')).toBeInTheDocument();
    });
    
    // 验证API调用
    expect(getRecentClippings).toHaveBeenCalledWith(expect.any(Number));
  });

  it('should handle empty clippings state', async () => {
    // 模拟API返回空数组
    (getRecentClippings as jest.Mock).mockResolvedValueOnce([]);
    
    render(<Popup />);
    
    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText(/没有保存的内容/i) || screen.getByText(/No saved items/i)).toBeInTheDocument();
    });
  });

  it('should display login form when user is not authenticated', async () => {
    // 模拟未授权错误
    (getRecentClippings as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
    
    render(<Popup />);
    
    // 等待登录表单显示
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /登录/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/邮箱/i) || screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/密码/i) || screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
  });

  it('should handle login process correctly', async () => {
    // 模拟未登录状态
    (getRecentClippings as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
    
    // 模拟成功登录
    const mockUserProfile = generateMockUserProfile();
    (login as jest.Mock).mockResolvedValueOnce(mockUserProfile);
    
    // 登录后获取数据
    const mockClippings = [generateMockClipping()];
    (getRecentClippings as jest.Mock).mockResolvedValueOnce(mockClippings);
    
    render(<Popup />);
    
    // 等待登录表单显示
    await waitFor(() => {
      expect(screen.getByLabelText(/邮箱/i) || screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });
    
    // 填写登录表单
    const emailInput = screen.getByLabelText(/邮箱/i) || screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/密码/i) || screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /登录/i }) || screen.getByRole('button', { name: /Login/i });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    
    // 提交表单
    fireEvent.click(loginButton);
    
    // 验证登录API调用
    expect(login).toHaveBeenCalledWith('test@example.com', 'password123');
    
    // 验证登录后加载了数据
    await waitFor(() => {
      expect(getRecentClippings).toHaveBeenCalledTimes(2);
    });
  });

  it('should show error message when login fails', async () => {
    // 模拟登录失败
    (getRecentClippings as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
    (login as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));
    
    render(<Popup />);
    
    // 填写登录表单
    await waitFor(() => {
      expect(screen.getByLabelText(/邮箱/i) || screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });
    
    const emailInput = screen.getByLabelText(/邮箱/i) || screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/密码/i) || screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);
    
    // 验证显示错误消息
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  // 可以继续添加更多测试场景，例如：
  // - 显示离线状态消息
  // - 点击操作按钮
  // - 显示错误状态
  // - 导航到其他页面
}); 