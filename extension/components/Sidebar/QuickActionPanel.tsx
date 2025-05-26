import React from 'react';
import { QuickActionPanelProps } from './types';
import { useSidebar } from './SidebarContext';

const QuickActionPanel: React.FC<QuickActionPanelProps> = () => {
  const { quickActions, executeQuickAction } = useSidebar();

  // 根据图标名获取相应的SVG图标
  const getIconByName = (iconName: string) => {
    switch (iconName) {
      case 'file-text':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        );
      case 'list-checks':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <polyline points="3 6 4 7 6 5" />
            <polyline points="3 12 4 13 6 11" />
            <polyline points="3 18 4 19 6 17" />
          </svg>
        );
      case 'help-circle':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'languages':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 8 6 6" />
            <path d="m4 14 6-6 2-3" />
            <path d="M2 5h12" />
            <path d="M7 2h1" />
            <path d="m22 22-5-10-5 10" />
            <path d="M14 18h6" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        );
    }
  };

  return (
    <div 
      className="p-3 border-b border-border flex items-center gap-2 overflow-x-auto"
      data-testid="quick-action-panel"
    >
      {quickActions.map(action => (
        <button
          key={action.id}
          className="h-9 px-3 rounded-md border border-border bg-background hover:bg-muted flex items-center gap-2 min-w-max"
          onClick={() => executeQuickAction(action.id)}
          title={action.description}
          data-testid={`${action.id}-button`}
        >
          <span className="text-primary">{getIconByName(action.icon)}</span>
          <span className="text-sm">{action.label}</span>
        </button>
      ))}
      
      <button
        className="h-9 px-3 rounded-md border border-border bg-background hover:bg-muted flex items-center gap-2 min-w-max"
        title="自定义提示词"
        data-testid="custom-prompt-selector"
      >
        <span className="text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </span>
        <span className="text-sm">自定义</span>
      </button>
    </div>
  );
};

export default QuickActionPanel; 