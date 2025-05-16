import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// 添加自定义渲染器（如果项目有Providers，可以添加在这里）
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { ...options });

// 测试数据生成器
export const generateMockClipping = (override = {}) => ({
  id: 'test-id-' + Math.random().toString(36).substr(2, 9),
  title: 'Test Title',
  content: 'Test content for clipping',
  url: 'https://example.com/test-page',
  timestamp: Date.now(),
  status: 'unread' as const,
  ...override
});

export const generateMockUserProfile = (override = {}) => ({
  id: 'user-id-' + Math.random().toString(36).substr(2, 9),
  name: 'Test User',
  email: 'test@example.com',
  isAuthenticated: true,
  token: 'mock-jwt-token',
  tokenExpiry: Date.now() + 3600000, // 1 hour from now
  ...override
});

// 导出所有测试工具
export * from '@testing-library/react';
export { customRender as render }; 