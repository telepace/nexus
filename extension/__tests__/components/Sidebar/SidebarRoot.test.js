import React from 'react';
import { render, screen } from '@testing-library/react';
import SidebarRoot from '../../../components/Sidebar/SidebarRoot';

// 模拟SidebarContext
jest.mock('../../../components/Sidebar/SidebarContext', () => ({
  SidebarProvider: ({ children }) => <div>{children}</div>,
  useSidebar: () => ({
    messages: [],
    sendMessage: jest.fn(),
    isTyping: false,
    connectionStatus: { isConnected: true },
    quickActions: [],
    executeQuickAction: jest.fn(),
    suggestions: []
  })
}));

// 模拟子组件
jest.mock('../../../components/Sidebar/SidebarHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-header">Header</div>
}));

jest.mock('../../../components/Sidebar/QuickActionPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-quick-action">QuickActions</div>
}));

jest.mock('../../../components/Sidebar/ChatContainer', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chat">Chat</div>
}));

jest.mock('../../../components/Sidebar/InputArea', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-input">Input</div>
}));

jest.mock('../../../components/Sidebar/FooterArea', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-footer">Footer</div>
}));

describe('SidebarRoot Component', () => {
  test('renders native sidebar correctly', () => {
    render(<SidebarRoot isNativeSidePanel={true} />);
    
    expect(screen.getByTestId('native-sidebar-root')).toBeInTheDocument();
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-quick-action')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chat')).toBeInTheDocument();
    expect(screen.getByTestId('mock-input')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });

  test('renders minimized sidebar when isOpen is false', () => {
    render(<SidebarRoot initialOpen={false} />);
    expect(screen.getByTestId('sidebar-minimized')).toBeInTheDocument();
  });

  test('renders full sidebar when isOpen is true', () => {
    render(<SidebarRoot initialOpen={true} />);
    expect(screen.getByTestId('sidebar-root')).toBeInTheDocument();
  });
});
