import React, { useState, useRef, useEffect } from 'react';
import { InputAreaProps } from './types';
import { useSidebar } from './SidebarContext';

const InputArea: React.FC<InputAreaProps> = () => {
  const { sendMessage, isTyping } = useSidebar();
  const [inputValue, setInputValue] = useState('');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整文本区域高度
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // 检查是否输入了 / 或 @ 字符，打开命令菜单
    if (e.target.value.endsWith('/') || e.target.value.endsWith('@')) {
      setIsCommandMenuOpen(true);
    } else {
      setIsCommandMenuOpen(false);
    }
  };

  // 处理发送消息
  const handleSendMessage = () => {
    if (inputValue.trim() && !isTyping) {
      sendMessage(inputValue);
      setInputValue('');
      
      // 重置输入框高度
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-3 border-t border-border bg-background" data-testid="input-area">
      <div className="relative">
        <textarea
          ref={inputRef}
          className="w-full p-2 pr-10 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none min-h-[40px] max-h-[120px]"
          placeholder={isTyping ? "AI正在回复中..." : "输入消息或使用 / 调用命令..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          rows={1}
          data-testid="text-input"
        />
        
        <button
          className={`absolute right-2 bottom-2 h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
            inputValue.trim() && !isTyping
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isTyping}
          data-testid="send-button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
      
      {/* 命令菜单 */}
      {isCommandMenuOpen && (
        <div className="absolute bottom-16 left-3 right-3 bg-background border border-border rounded-md shadow-lg p-2 max-h-48 overflow-y-auto">
          <div className="text-xs text-muted-foreground mb-2 px-2">常用命令</div>
          <button 
            className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
            onClick={() => {
              setInputValue('/summarize');
              setIsCommandMenuOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
          >
            <span className="font-semibold">/summarize</span> - 总结当前页面
          </button>
          <button 
            className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
            onClick={() => {
              setInputValue('/translate');
              setIsCommandMenuOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
          >
            <span className="font-semibold">/translate</span> - 翻译选中内容
          </button>
          <div className="text-xs text-muted-foreground mt-2 mb-1 px-2">选择模型</div>
          <button 
            className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
            onClick={() => {
              setInputValue('@gpt-4');
              setIsCommandMenuOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
          >
            <span className="font-semibold">@gpt-4</span> - 使用 GPT-4 模型
          </button>
          <button 
            className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
            onClick={() => {
              setInputValue('@claude');
              setIsCommandMenuOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
          >
            <span className="font-semibold">@claude</span> - 使用 Claude 模型
          </button>
        </div>
      )}
      
      {/* 上下文控制（可选扩展） */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>使用上下文:</span>
          <select className="bg-background border border-border rounded-sm px-1 py-0.5 text-xs">
            <option value="page">当前页面</option>
            <option value="selection">选中内容</option>
            <option value="none">无</option>
          </select>
        </div>
        <button 
          className="text-xs text-primary hover:underline"
          onClick={() => setInputValue('')}
        >
          清除输入
        </button>
      </div>
    </div>
  );
};

export default InputArea; 