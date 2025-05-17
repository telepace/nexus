import React from 'react';
import { ChatContainerProps, MessageProps, SuggestionChipsProps } from './types';
import { useSidebar } from './SidebarContext';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkReact from 'remark-react';

// 消息组件
const Message: React.FC<MessageProps> = ({ message }) => {
  // Markdown 解析器
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkReact, {
      createElement: React.createElement,
    }) as any;

  // 根据消息类型设置不同的样式
  const getMessageStyle = () => {
    switch (message.type) {
      case 'user':
        return 'bg-muted text-foreground';
      case 'ai':
        return 'bg-primary/5 text-foreground';
      case 'system':
        return 'bg-muted/50 text-muted-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  // 渲染消息内容，支持Markdown
  const renderContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex items-center gap-2">
          <div className="animate-pulse flex space-x-1">
            <div className="h-2 w-2 bg-current rounded-full"></div>
            <div className="h-2 w-2 bg-current rounded-full"></div>
            <div className="h-2 w-2 bg-current rounded-full"></div>
          </div>
          <span className="text-sm">AI正在思考...</span>
        </div>
      );
    }

    try {
      // 解析Markdown内容
      return processor.processSync(message.content).result;
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return <p>{message.content}</p>;
    }
  };

  // 获取发送者名称
  const getSenderName = () => {
    switch (message.type) {
      case 'user':
        return '用户';
      case 'ai':
        return 'Nexus AI';
      case 'system':
        return '系统';
      default:
        return '';
    }
  };

  return (
    <div className={`px-3 py-2 rounded-lg ${getMessageStyle()} mb-3`}>
      <div className="text-xs text-muted-foreground mb-1 flex justify-between">
        <span>{getSenderName()}</span>
        {message.timestamp && (
          <span>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {renderContent()}
      </div>
      {message.contextSource && (
        <div className="text-xs text-muted-foreground mt-2">
          来源: {message.contextSource}
        </div>
      )}
    </div>
  );
};

// 建议提示组件
const SuggestionChips: React.FC<SuggestionChipsProps> = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2" data-testid="suggestion-chips">
      {suggestions.map(suggestion => (
        <button
          key={suggestion.id}
          className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full text-muted-foreground"
          onClick={() => suggestion.action()}
        >
          {suggestion.text}
        </button>
      ))}
    </div>
  );
};

// 主聊天容器组件
const ChatContainer: React.FC<ChatContainerProps> = () => {
  const { messages, suggestions } = useSidebar();

  return (
    <div className="flex-1 overflow-y-auto p-3" data-testid="chat-container">
      <div data-testid="message-list">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">开始与 Nexus AI 助手聊天</h3>
            <p className="text-muted-foreground text-sm mt-2">
              您可以询问任何问题，或者使用上方的快捷操作
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <Message key={message.id} message={message} />
            ))}
            <SuggestionChips suggestions={suggestions} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatContainer; 