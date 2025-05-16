import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OptionsPage from '../../pages/options';

// 模拟CSS导入
jest.mock('../../styles/tailwind.css', () => ({}), { virtual: true });

// 模拟Storage
jest.mock('@plasmohq/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined)
      };
    })
  };
});

// 直接测试 OptionsPage 组件，而不是 Options
describe('Options Component', () => {
  it('should render the options component', async () => {
    render(<OptionsPage />);
    expect(await screen.findByText('Nexus 扩展设置')).toBeInTheDocument();
  });
}); 