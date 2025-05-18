import React, { useState, useEffect } from 'react';
import { SidebarRootProps } from './types';
import { SidebarProvider } from './SidebarContext';
import SidebarHeader from './SidebarHeader';
import QuickActionPanel from './QuickActionPanel';
import ChatContainer from './ChatContainer';
import InputArea from './InputArea';
import FooterArea from './FooterArea';
import { checkCssLoaded } from "~utils/debug";

// 添加样式检测辅助函数
const detectStyles = () => {
  // 检查是否有基本的Tailwind类可用
  const isTailwindLoaded = typeof document !== 'undefined' && 
    window.getComputedStyle(document.documentElement)
      .getPropertyValue('--tw-ring-offset-width') !== '';

  if (!isTailwindLoaded && typeof document !== 'undefined') {
    console.warn('Tailwind 样式未正确加载，尝试应用基础样式');
    
    // 添加内联应急样式
    const emergencyStyle = document.createElement('style');
    emergencyStyle.textContent = `
      .bg-background { background-color: white; }
      .bg-primary\/5 { background-color: rgba(79, 70, 229, 0.05); }
      .bg-muted { background-color: #f3f4f6; }
      .text-foreground { color: #1f2937; }
      .text-muted-foreground { color: #6b7280; }
      .border-border { border-color: #e5e7eb; }
      
      @media (prefers-color-scheme: dark) {
        .bg-background { background-color: #1f2937; }
        .bg-primary\/5 { background-color: rgba(99, 102, 241, 0.05); }
        .bg-muted { background-color: #374151; }
        .text-foreground { color: #f3f4f6; }
        .text-muted-foreground { color: #9ca3af; }
        .border-border { border-color: #4b5563; }
      }
    `;
    document.head.appendChild(emergencyStyle);
  }

  return isTailwindLoaded;
};

const SidebarRoot: React.FC<SidebarRootProps> = ({ initialOpen = true, isNativeSidePanel = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  // 检测样式是否加载
  useEffect(() => {
    const tailwindLoaded = detectStyles();
    setStylesLoaded(tailwindLoaded);
    
    // 日志记录，帮助调试
    console.log('SidebarRoot 已挂载，样式状态:', tailwindLoaded ? '已加载' : '未加载');
  }, []);

  useEffect(() => {
    // 在组件挂载后检查CSS是否正确加载
    checkCssLoaded();
  }, []);

  // 侧边栏最小化/最大化处理
  const handleMinimize = () => {
    setIsOpen(false);
  };

  // 侧边栏最大化处理
  const handleMaximize = () => {
    setIsOpen(true);
  };

  // 处理设置按钮点击
  const openSettings = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      console.warn('无法打开设置页面：chrome API 不可用');
    }
  };

  // 原生侧边栏模式下始终以全尺寸渲染
  if (isNativeSidePanel) {
    return (
      <SidebarProvider>
        <div className="h-screen w-full bg-background flex flex-col" data-testid="native-sidebar-root">
          <SidebarHeader isNativeSidePanel={true} data-testid="sidebar-header" />
          <QuickActionPanel data-testid="quick-action-panel" />
          <ChatContainer data-testid="chat-container" />
          <InputArea data-testid="input-area" />
          <FooterArea onSettings={openSettings} data-testid="footer-area" />
        </div>
      </SidebarProvider>
    );
  }

  // 传统DOM注入模式
  if (!isOpen) {
    return (
      <div 
        className="fixed right-0 top-0 h-screen w-12 bg-primary/10 hover:bg-primary/20 transition-all duration-300 cursor-pointer flex items-center justify-center"
        onClick={handleMaximize}
        data-testid="sidebar-minimized"
      >
        <div className="rotate-90 text-primary font-semibold whitespace-nowrap">
          Nexus AI 助手
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div
        className="fixed right-0 top-0 h-screen w-80 bg-background border-l border-border shadow-lg flex flex-col"
        data-testid="sidebar-root"
      >
        <SidebarHeader onMinimize={handleMinimize} data-testid="sidebar-header" />
        <QuickActionPanel data-testid="quick-action-panel" />
        <ChatContainer data-testid="chat-container" />
        <InputArea data-testid="input-area" />
        <FooterArea onSettings={openSettings} data-testid="footer-area" />
      </div>
    </SidebarProvider>
  );
};

export default SidebarRoot; 