"use client";

import React, { useState, useCallback, useMemo } from "react";
import { 
  MessageSquare, 
  Sparkles, 
  Send, 
  RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ConversationPublic } from "@/lib/api/content";
import type { PromptData } from "@/components/actions/prompts-action";

interface AIAssistantPanelProps {
  // 输入相关
  inputValue: string;
  setInputValue: (value: string) => void;
  inputFocused: boolean;
  setInputFocused: (focused: boolean) => void;
  onAnalysis: () => void;
  
  // 历史记录相关
  showHistory?: boolean;
  historyRecords: ConversationPublic[];
  loadingHistory: boolean;
  onHistoryClick: (conversation: ConversationPublic) => void;
  
  // Prompts 相关
  prompts: PromptData[];
  loadingPrompts: boolean;
  onPromptClick: (prompt: PromptData) => void;
  
  // 样式变体
  variant?: "preview" | "sidebar" | "fullscreen";
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  inputValue,
  setInputValue,
  inputFocused,
  setInputFocused,
  onAnalysis,
  showHistory = false,
  historyRecords,
  loadingHistory,
  onHistoryClick,
  prompts,
  loadingPrompts,
  onPromptClick,
  variant = "fullscreen",
}) => {
  // 优化的历史记录渲染
  const historyItems = useMemo(() => {
    return historyRecords.map((record, index) => {
      // 提取用户意图
      const getUserIntentSummary = () => {
        if (!record.messages || record.messages.length === 0) return "无用户输入";
        
        const userMessages = record.messages.filter((msg: any) => msg.role === "user");
        if (userMessages.length === 0) return "无用户输入";
        
        const firstUserMessage = userMessages[0];
        const metadata = (firstUserMessage.metadata as any) || {};
        
        // 优先显示prompt名称
        if (metadata.isPromptBased && metadata.promptName) {
          return `📝 ${metadata.promptName}`;
        }
        
        // 显示原始用户输入
        if (metadata.originalUserInput) {
          const originalInput = String(metadata.originalUserInput);
          return originalInput.length > 40
            ? `${originalInput.substring(0, 40)}...`
            : originalInput;
        }
        
        // 默认显示消息内容
        const content = String(firstUserMessage.content || "");
        return content.length > 40
          ? `${content.substring(0, 40)}...`
          : content;
      };

      return {
        ...record,
        userIntentSummary: getUserIntentSummary(),
        index,
      };
    });
  }, [historyRecords]);

  // 优化的输入处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAnalysis();
    }
  }, [onAnalysis]);

  return (
    <div
      className={`flex-shrink-0 backdrop-blur-md border-t ${
        variant === "preview"
          ? "linear-bg-1 border-border"
          : "linear-bg-1 border-border dark:border-neutral-800"
      }`}
      data-exclude-selection
    >
      <div className="px-6 py-4">
        {/* 历史记录展开面板 */}
        {showHistory && (
          <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="bg-neutral-50/80 dark:bg-neutral-900/80 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  历史对话
                </h4>
              </div>

              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto text-neutral-400" />
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    暂无历史对话
                  </div>
                ) : (
                  historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/60 dark:bg-neutral-800/60 rounded-lg p-3 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-all duration-200 cursor-pointer group border border-neutral-200/50 dark:border-neutral-700/50"
                      onClick={() => onHistoryClick(item)}
                      style={{ animationDelay: `${item.index * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 flex items-center justify-center border border-blue-200/30 dark:border-blue-700/30">
                            <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {item.title || "未命名对话"}
                          </div>
                          
                          <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            {item.userIntentSummary}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {item.summary && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1 mr-2">
                                {item.summary}
                              </p>
                            )}
                            <span className="text-xs text-neutral-400 flex-shrink-0">
                              {formatDistanceToNow(new Date(item.created_at), {
                                addSuffix: true,
                                locale: zhCN,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI指令标签行 - 优化滚动性能 */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {loadingPrompts ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
              <span className="text-sm text-neutral-500">加载中...</span>
            </div>
          ) : (
            prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => onPromptClick(prompt)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu will-change-transform"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{prompt.name}</span>
              </button>
            ))
          )}
        </div>

        {/* 输入框 */}
        <div
          className={`
            flex items-center px-4 py-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border-2 transition-all duration-200
            ${inputFocused ? "border-neutral-900 dark:border-neutral-100" : "border-transparent"}
          `}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="询问关于内容的任何问题..."
            className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
          />

          {/* 发送按钮 */}
          {inputValue.trim() && (
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 text-white ml-3"
              onClick={onAnalysis}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};