import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  SidebarContext as SidebarContextType,
  Message, 
  QuickAction,
  CustomPrompt,
  SuggestionChip,
  ConnectionStatus
} from './types';

// 默认快捷操作
const defaultQuickActions: QuickAction[] = [
  {
    id: 'summarize',
    label: '页面摘要',
    icon: 'file-text',
    action: 'summarize',
    description: '总结当前页面的主要内容'
  },
  {
    id: 'keypoints',
    label: '要点提取',
    icon: 'list-checks',
    action: 'extract-key-points',
    description: '提取页面中的关键要点'
  },
  {
    id: 'explain',
    label: '解释选中',
    icon: 'help-circle',
    action: 'explain-selection',
    description: '解释当前选中的文本'
  },
  {
    id: 'translate',
    label: '翻译',
    icon: 'languages',
    action: 'translate',
    description: '翻译选中的内容或整个页面'
  }
];

// 创建上下文
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// 上下文提供者组件
export const SidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: true
  });
  const [quickActions] = useState<QuickAction[]>(defaultQuickActions);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionChip[]>([]);

  // 加载历史记录和设置
  useEffect(() => {
    // 从存储中加载消息历史
    const loadHistory = async () => {
      try {
        // 这里将来可以从 chrome.storage.local 加载历史记录
      } catch (error) {
        console.error('Failed to load message history:', error);
      }
    };

    // 从存储中加载自定义提示
    const loadCustomPrompts = async () => {
      try {
        // 这里将来可以从 chrome.storage.local 加载自定义提示
      } catch (error) {
        console.error('Failed to load custom prompts:', error);
      }
    };

    loadHistory();
    loadCustomPrompts();
  }, []);

  // 监听来自background script的消息
  useEffect(() => {
    const handleMessage = (message, sender, sendResponse) => {
      console.log("[Nexus SidePanel] Received message:", message);
      
      if (message.action) {
        switch (message.action) {
          case "nexus-explain-selection":
          case "nexus-summarize-selection":
            // 处理选中文本
            if (message.data) {
              sendMessage(`请${message.action === "nexus-explain-selection" ? "解释" : "总结"}以下内容：${message.data}`);
            }
            break;
          case "nexus-translate-selection":
            // 处理翻译请求
            if (message.data) {
              sendMessage(`请将以下内容翻译成中文：${message.data}`);
            }
            break;
          case "nexus-save-selection":
            // 保存选中内容
            if (message.data) {
              const systemMessage: Message = {
                id: uuidv4(),
                type: 'system',
                content: '已保存选中内容。',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, systemMessage]);
            }
            break;
          case "nexus-clip-page":
          case "clipPage":
            // 剪藏页面
            const clipMessage: Message = {
              id: uuidv4(),
              type: 'system',
              content: '已将当前页面添加到剪藏列表。',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, clipMessage]);
            break;
          case "nexus-summarize-page":
          case "summarizePage":
            // 总结页面
            sendMessage('请总结当前页面的内容');
            break;
          default:
            console.log("[Nexus SidePanel] 未处理的消息类型:", message.action);
        }
        
        // 回复消息发送成功
        if (sendResponse) {
          sendResponse({ success: true });
        }
      }
      
      return true; // 保持消息通道开放
    };

    // 添加消息监听
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }
    
    // 清理函数
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, []);

  // 发送消息
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // 创建用户消息
    const userMessage: Message = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    
    // 创建AI响应消息占位符
    const aiMessage: Message = {
      id: uuidv4(),
      type: 'ai',
      content: '',
      isLoading: true,
      timestamp: new Date()
    };
    
    // 添加消息到状态
    setMessages(prev => [...prev, userMessage, aiMessage]);
    setIsTyping(true);
    
    try {
      // 模拟API调用
      setTimeout(() => {
        // 更新AI消息内容
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: '这是AI的回复示例，实际实现中将调用后端API获取响应。', isLoading: false }
              : msg
          )
        );
        setIsTyping(false);
        
        // 添加建议
        setSuggestions([
          {
            id: uuidv4(),
            text: '继续解释这个主题',
            action: () => sendMessage('继续解释这个主题')
          },
          {
            id: uuidv4(),
            text: '提供一个例子',
            action: () => sendMessage('提供一个例子')
          }
        ]);
      }, 1500);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: '抱歉，获取响应时出现了错误。请稍后再试。', isLoading: false }
            : msg
        )
      );
      setIsTyping(false);
      setConnectionStatus({
        isConnected: false,
        errorMessage: '连接服务器失败'
      });
    }
  };

  // 清除消息
  const clearMessages = () => {
    setMessages([]);
    setSuggestions([]);
  };

  // 执行快捷操作
  const executeQuickAction = (actionId: string) => {
    const action = quickActions.find(a => a.id === actionId);
    if (!action) return;
    
    // 基于操作ID执行不同的功能
    switch(actionId) {
      case 'summarize':
        sendMessage('请总结当前页面的内容');
        break;
      case 'keypoints':
        sendMessage('请提取当前页面的关键要点');
        break;
      case 'explain':
        // 获取选中的文本
        const selectedText = window.getSelection()?.toString();
        if (selectedText) {
          sendMessage(`请解释以下内容：${selectedText}`);
        } else {
          // 显示系统消息
          const systemMessage: Message = {
            id: uuidv4(),
            type: 'system',
            content: '请先选择要解释的文本。',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, systemMessage]);
        }
        break;
      case 'translate':
        // 获取选中的文本
        const textToTranslate = window.getSelection()?.toString();
        if (textToTranslate) {
          sendMessage(`请将以下内容翻译成中文：${textToTranslate}`);
        } else {
          // 显示系统消息
          const systemMessage: Message = {
            id: uuidv4(),
            type: 'system',
            content: '请先选择要翻译的文本。',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, systemMessage]);
        }
        break;
      default:
        break;
    }
  };

  // 上下文值
  const contextValue: SidebarContextType = {
    messages,
    sendMessage,
    clearMessages,
    isTyping,
    connectionStatus,
    quickActions,
    executeQuickAction,
    customPrompts,
    suggestions
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

// 自定义钩子，用于使用上下文
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext; 