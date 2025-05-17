import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OptionsPage from '../../pages/options';

// 模拟CSS导入
jest.mock('../../styles/tailwind.css', () => ({}), { virtual: true });

// 创建一个模拟的用户设置
const mockUserSettings = {
  theme: 'system',
  defaultClipAction: 'save',
  openSidebarOnClip: false,
  autoSummarize: false,
  defaultLanguage: 'en',
  showBadgeCounter: true,
  useBrowserLanguage: false,
  keepSidePanelOpen: false,
  promptShortcuts: [
    { shortcut: '/insight', prompt: 'Get insight from internet' },
    { shortcut: '/summarize', prompt: 'Summarize the context' },
    { shortcut: '/rephrase', prompt: 'Rephrase the sentence' },
    { shortcut: '/translate', prompt: 'Translate to local language' }
  ],
  keyboardShortcut: '⇧⌘E'
};

// 模拟Storage
jest.mock('@plasmohq/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'userSettings') {
            return Promise.resolve(mockUserSettings);
          }
          return Promise.resolve(null);
        }),
        set: jest.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe('Options New Features', () => {
  beforeEach(() => {
    render(<OptionsPage />);
  });

  // 语言设置测试
  it('should display language settings with browser language option', async () => {
    expect(await screen.findByText('默认语言')).toBeInTheDocument();
    expect(await screen.findByText('Will answer in this language when possible')).toBeInTheDocument();
    
    // 测试"使用浏览器语言"选项
    const useBrowserLanguageCheckbox = screen.getByLabelText('Use browser language');
    expect(useBrowserLanguageCheckbox).toBeInTheDocument();
    expect(useBrowserLanguageCheckbox).not.toBeChecked();
  });

  // 主题设置测试
  it('should display theme settings with elmo option', async () => {
    expect(await screen.findByText('主题')).toBeInTheDocument();
    expect(await screen.findByText('Change the elmo theme')).toBeInTheDocument();
    
    // 检查下拉菜单中是否有elmo选项
    const themeSelect = screen.getByLabelText('主题');
    expect(themeSelect).toBeInTheDocument();
    expect(screen.getByText('Elmo 主题')).toBeInTheDocument();
  });

  // 快捷提示测试
  it('should display prompt shortcuts settings', async () => {
    expect(await screen.findByText('Prompt shortcuts')).toBeInTheDocument();
    
    // 检查是否显示了预设的快捷提示
    expect(screen.getByText('/insight')).toBeInTheDocument();
    expect(screen.getByText('Get insight from internet')).toBeInTheDocument();
  });

  // 键盘快捷键测试
  it('should display keyboard shortcut settings', async () => {
    expect(await screen.findByText('Keyboard shortcut')).toBeInTheDocument();
    expect(await screen.findByText('Press')).toBeInTheDocument();
    expect(await screen.findByText('to activate the extension')).toBeInTheDocument();
  });

  // 侧边栏设置测试
  it('should display side panel settings', async () => {
    expect(await screen.findByText('Keep side panel open')).toBeInTheDocument();
    expect(await screen.findByText('The side panel remains open when navigating between tabs')).toBeInTheDocument();
    
    const keepSidePanelOpenCheckbox = screen.getByLabelText('Keep side panel open');
    expect(keepSidePanelOpenCheckbox).toBeInTheDocument();
    expect(keepSidePanelOpenCheckbox).not.toBeChecked();
  });
}); 