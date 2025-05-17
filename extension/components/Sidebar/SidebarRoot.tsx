import React, { useState } from 'react';
import { SidebarRootProps } from './types';
import { SidebarProvider } from './SidebarContext';
import SidebarHeader from './SidebarHeader';
import QuickActionPanel from './QuickActionPanel';
import ChatContainer from './ChatContainer';
import InputArea from './InputArea';
import FooterArea from './FooterArea';

const SidebarRoot: React.FC<SidebarRootProps> = ({ initialOpen = true, isNativeSidePanel = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  // 侧边栏最小化/最大化处理
  const handleMinimize = () => {
    setIsOpen(false);
  };

  // 侧边栏最大化处理
  const handleMaximize = () => {
    setIsOpen(true);
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
          <FooterArea data-testid="footer-area" />
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
        <FooterArea data-testid="footer-area" />
      </div>
    </SidebarProvider>
  );
};

export default SidebarRoot; 