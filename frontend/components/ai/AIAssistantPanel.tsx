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
  Share,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ContentItemPublic,
  ConversationPublic,
} from "@/lib/api/content";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { contentApi } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getCookie } from "cookies-next";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { FavoriteButton } from "@/components/actions/FavoriteButton";

interface AIAssistantPanelProps {
  content: ContentItemPublic;
  className?: string;
}

interface AnalysisCard {
  id: string;
  title: string;
  subtitle: string;
  emoji?: string;
  content: {
    type: "summary" | "insights" | "keyPoints" | "metadata";
    data: any;
  };
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
  const [streamingResponse, setStreamingResponse] = useState("");
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  // 加载prompts
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoadingPrompts(true);
        const promptsData = await fetchPrompts();
        if (Array.isArray(promptsData) && promptsData.length > 0) {
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
        const response = await contentApi.getContentConversations(content.id);
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

  // 处理AI分析 - 使用流式API
  const handleAnalysis = useCallback(async () => {
    if (!inputValue.trim() || isAnalyzing) return;

    console.log('[AIAssistantPanel] Starting analysis:', inputValue);
    setIsAnalyzing(true);
    setStreamingResponse("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(
        `${apiUrl}/api/v1/content/${content.id}/completion-updated`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("accessToken")}`,
          },
          body: JSON.stringify({
            analysis_instruction: inputValue,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          // 处理Vercel AI SDK数据流协议
          if (line.startsWith("0:")) {
            // 文本内容 - 提取JSONL行
            const jsonlLine = line.slice(2); // 移除 "0:" 前缀
            if (jsonlLine.trim()) {
              accumulatedContent += jsonlLine + "\n";
              setStreamingResponse(accumulatedContent);
              console.log('[AIAssistantPanel] Streaming update:', accumulatedContent.length, 'chars');
            }
          } else if (line.startsWith("8:")) {
            // 完成信号 - 最终更新
            setStreamingResponse(accumulatedContent);
            console.log('[AIAssistantPanel] Stream completed:', accumulatedContent.length, 'chars');
            break;
          } else if (line.startsWith("9:")) {
            // 错误信号
            try {
              const errorData = JSON.parse(line.slice(2));
              throw new Error(errorData.error || "Stream error");
            } catch {
              throw new Error("Stream error");
            }
          }
        }
      }

      setInputValue("");
      
      // 重新加载历史记录
      const updatedHistory = await contentApi.getContentConversations(content.id);
      if (updatedHistory.conversations) {
        setHistoryRecords(updatedHistory.conversations);
      }

      toast({
        title: "分析完成",
        description: "AI 分析已成功完成",
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "分析失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputValue, content.id, isAnalyzing, toast]);

  // 构建分析卡片数据
  const buildAnalysisCards = useCallback((): AnalysisCard[] => {
    const cards: AnalysisCard[] = [];

    // 实时分析结果卡片
    if (streamingResponse) {
      cards.push({
        id: "streaming",
        title: "AI分析",
        subtitle: isAnalyzing ? "正在分析..." : "分析完成",
        emoji: "🤖",
        content: {
          type: "summary",
          data: streamingResponse,
        },
      });
    }

    // 调试信息
    console.log('[AIAssistantPanel] buildAnalysisCards:', {
      streamingResponse: streamingResponse ? streamingResponse.substring(0, 100) + '...' : null,
      isAnalyzing,
      cardsCount: cards.length
    });

    return cards;
  }, [streamingResponse, isAnalyzing]);

  const cards = buildAnalysisCards();

  // 处理块选择
  const handleBlockClick = useCallback(
    (blockId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setSelectedBlock(selectedBlock === blockId ? null : blockId);
    },
    [selectedBlock],
  );

  // 渲染卡片内容
  const renderCardContent = (card: AnalysisCard) => {
    const { content: cardContent } = card;

    // 支持所有卡片类型，包括普通文本
    let textContent = "";

    if (typeof cardContent.data === "string") {
      textContent = cardContent.data;
    } else if (cardContent.data && typeof cardContent.data === "object") {
      textContent =
        cardContent.data.text ||
        cardContent.data.content ||
        cardContent.data.summary ||
        JSON.stringify(cardContent.data);
    }

    if (!textContent) return null;

    return (
      <div
        className={`
          p-4 rounded-lg cursor-pointer transition-all duration-200
          ${
            selectedBlock === `${card.id}-main`
              ? "bg-gray-50 dark:bg-gray-900"
              : "hover:bg-gray-25 dark:hover:bg-gray-950"
          }
        `}
        onClick={(e) => handleBlockClick(`${card.id}-main`, e)}
      >
        <div className="select-text prose prose-sm max-w-none dark:prose-invert">
          <UniversalContentRenderer content={textContent} />
        </div>
      </div>
    );
  };

  // 主卡片组件
  const CardComponent = ({
    card,
    index,
  }: { card: AnalysisCard; index: number }) => {
    const isSelected = selectedCard === card.id;
    const isHovered = hoveredCard === card.id;

    return (
      <div
        className={`
          group relative cursor-pointer transition-all duration-200
        `}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => setSelectedCard(isSelected ? null : card.id)}
        data-exclude-selection
      >
        <Card
          className={`
          transition-all duration-200 overflow-hidden relative border-0 analysis-card
          ${
            isSelected
              ? "shadow-lg bg-white dark:bg-gray-950"
              : isHovered
                ? "shadow-md bg-white dark:bg-gray-950"
                : "shadow-sm bg-gray-50/50 dark:bg-gray-900/50"
          }
        `}
        data-exclude-selection
        >
          <CardContent className="p-4" data-exclude-selection>
            {/* 卡片头部 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{card.emoji}</span>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              {isHovered && (
                <div className="flex items-center gap-1 animate-in fade-in-50 slide-in-from-right-2 duration-200">
                  <FavoriteButton
                    itemId={content.id}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 text-gray-400 hover:text-gray-600"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("分享");
                    }}
                  >
                    <Share className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* 卡片内容 */}
            {renderCardContent(card)}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-80 ${className}`}>
      {/* 卡片显示区域 - 限制高度并可滚动 */}
      {cards.length > 0 && (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          {cards.map((card, index) => (
            <CardComponent key={card.id} card={card} index={index} />
          ))}
        </div>
      )}

      {/* 底部输入区域 - 固定高度，不会缩小 */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-md border-t border-border">
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
                    historyRecords.map((record, index) => {
                      // 获取用户消息（第一个用户角色的消息）
                      const userMessage = record.messages?.find(msg => msg.role === 'user')?.content || "";
                      return (
                        <div
                          key={index}
                          className="p-2 rounded-lg bg-background/60 hover:bg-background/80 transition-colors duration-200 cursor-pointer"
                          onClick={() => setInputValue(userMessage)}
                        >
                          <p className="text-xs text-foreground line-clamp-2">
                            {userMessage}
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
                      );
                    })
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

          {/* AI指令标签行 */}
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
    </div>
  );
};