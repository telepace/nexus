import React from 'react';
import { SidebarHeaderProps } from './types';
import { useSidebar } from './SidebarContext';

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ onMinimize, isNativeSidePanel = false }) => {
  const { connectionStatus } = useSidebar();
  
  return (
    <div className="flex items-center justify-between p-3 border-b border-border bg-background" data-testid="sidebar-header">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center" data-testid="logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <div>
          <h1 className="font-semibold text-lg">Nexus AI 助手</h1>
          <div 
            className="flex items-center gap-1 text-xs"
            data-testid="connection-status"
          >
            <div className={`h-2 w-2 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-muted-foreground">
              {connectionStatus.isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>
      </div>
      
      {!isNativeSidePanel && (
        <button
          className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
          onClick={onMinimize}
          title="最小化"
          data-testid="minimize-button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SidebarHeader; 