import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarRoot from '../components/Sidebar/SidebarRoot';

// 模拟依赖
jest.mock('react-dom', () => ({
  render: jest.fn()
}));

describe('Native Side Panel', () => {
  beforeEach(() => {
    // 模拟chrome API
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        },
        sendMessage: jest.fn()
      }
    };
  });

  test('renders correctly in native side panel mode', () => {
    // 创建一个容器来模拟render的目标
    document.body.innerHTML = '<div id="root"></div>';
    
    render(<SidebarRoot isNativeSidePanel={true} />);
    
    // 验证主要组件存在
    expect(screen.getByTestId('native-sidebar-root')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-header')).toBeInTheDocument();
    expect(screen.getByTestId('quick-action-panel')).toBeInTheDocument();
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
    
    // 验证最小化按钮在原生模式下不存在
    expect(screen.queryByTestId('minimize-button')).not.toBeInTheDocument();
  });
});

// 测试功能检测工具
describe('Feature Detection Utilities', () => {
  beforeEach(() => {
    // 重置chrome对象
    delete global.chrome;
  });
  
  test('isSidePanelSupported returns false when chrome.sidePanel is undefined', () => {
    // 仅模拟chrome对象，但没有sidePanel
    global.chrome = {
      runtime: {}
    };
    
    const { isSidePanelSupported } = require('../utils/feature-detection');
    expect(isSidePanelSupported()).toBe(false);
  });
  
  test('isSidePanelSupported returns true when chrome.sidePanel is defined', () => {
    // 模拟完整的sidePanel API
    global.chrome = {
      runtime: {},
      sidePanel: {
        open: jest.fn(),
        setPanelBehavior: jest.fn()
      }
    };
    
    const { isSidePanelSupported } = require('../utils/feature-detection');
    expect(isSidePanelSupported()).toBe(true);
  });
  
  test('openSidebar calls chrome.sidePanel.open with correct parameters', async () => {
    // 模拟sidePanel API
    const openMock = jest.fn().mockResolvedValue(undefined);
    global.chrome = {
      runtime: {},
      sidePanel: {
        open: openMock,
        setPanelBehavior: jest.fn()
      }
    };
    
    const { openSidebar } = require('../utils/feature-detection');
    const result = await openSidebar(123);
    
    expect(result).toBe(true);
    expect(openMock).toHaveBeenCalledWith({ tabId: 123 });
  });
}); 