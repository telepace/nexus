"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  MessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ContentItemPublic,
  ConversationPublic,
} from "@/lib/api/content";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { contentApi } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface AIAssistantPanelProps {
  content: ContentItemPublic;
  className?: string;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  content,
  className = "",
}) => {
  const { toast } = useToast();

  // 状态管理
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 加载prompts
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoadingPrompts(true);
        const promptsData = await fetchPrompts();
        if (promptsData && promptsData.length > 0) {
          // 只显示前6个prompt，避免UI过于拥挤
          setPrompts(promptsData.slice(0, 6));
        }
      } catch (error) {
        console.error("Failed to load prompts:", error);
      } finally {
        setLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, []);

  // 加载历史对话
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await contentApi.getConversations(content.id);
        if (response.conversations) {
          setHistoryRecords(response.conversations);
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (content.id) {
      loadHistory();
    }
  }, [content.id]);

  // 处理prompt按钮点击
  const handlePromptClick = useCallback((prompt: PromptData) => {
    setInputValue(prompt.content || prompt.name);
  }, []);

  // 处理AI分析
  const handleAnalysis = useCallback(async () => {
    if (!inputValue.trim() || isAnalyzing) return;

    const userInput = inputValue.trim();
    setInputValue("");
    setIsAnalyzing(true);

    try {
      // 调用AI对话API
      const response = await contentApi.createConversation(content.id, {
        message: userInput,
      });

      if (response) {
        // 重新加载历史记录
        const updatedHistory = await contentApi.getConversations(content.id);
        if (updatedHistory.conversations) {
          setHistoryRecords(updatedHistory.conversations);
        }

        toast({
          title: "分析完成",
          description: "AI已完成对您问题的分析",
        });
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "分析失败",
        description: "AI分析过程中出现错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputValue, isAnalyzing, content.id, toast]);

  return (
    <div className={`flex-shrink-0 bg-background/95 backdrop-blur-md border-t border-border ${className}`}>
      <div className="px-6 py-4">
        {/* 历史记录微提示 */}
        {historyRecords.length > 0 && !showHistory && (
          <div
            className="flex items-center justify-center mb-3 cursor-pointer group"
            onClick={() => setShowHistory(true)}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors duration-200">
              <div className="flex -space-x-1">
                {historyRecords.slice(0, 3).map((_, index) => (
                  <div
                    key={index}
                    className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">
                {historyRecords.length} 条历史对话
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* 历史记录展开面板 */}
        {showHistory && (
          <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="bg-muted/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  历史对话
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowHistory(false)}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : historyRecords.length > 0 ? (
                  historyRecords.map((record, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg bg-background/60 hover:bg-background/80 transition-colors duration-200 cursor-pointer"
                      onClick={() => setInputValue(record.user_message || "")}
                    >
                      <p className="text-xs text-foreground line-clamp-2">
                        {record.user_message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {record.created_at
                          ? formatDistanceToNow(new Date(record.created_at), {
                              addSuffix: true,
                              locale: zhCN,
                            })
                          : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground">
                      暂无历史对话
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI指令标签行 - 从真实API获取 */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {loadingPrompts ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">加载中...</span>
            </div>
          ) : (
            prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handlePromptClick(prompt)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground whitespace-nowrap flex-shrink-0"
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
            flex items-center px-4 py-3 bg-muted rounded-2xl border-2 transition-all duration-200
            ${inputFocused ? "border-primary" : "border-transparent"}
          `}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAnalysis();
              }
            }}
            placeholder="询问关于内容的任何问题..."
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
            disabled={isAnalyzing}
          />

          {/* 发送按钮 */}
          {inputValue.trim() && (
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground ml-3"
              onClick={handleAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Brain className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};