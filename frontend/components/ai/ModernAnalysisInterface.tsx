"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Brain,
  MessageSquare,
  Send,
  Share,
  MoreHorizontal,
  Sparkles,
  Star,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ContentItemPublic,
  AIResult,
  ConversationListResponse,
  ConversationPublic,
} from "@/lib/api/content";
import { adaptAnalysisData } from "./AnalysisCards";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { client } from "@/lib/api/client";
import { getCookie } from "cookies-next";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { contentApi } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { FavoriteButton } from "@/components/actions/FavoriteButton";

interface ModernAnalysisInterfaceProps {
  content: ContentItemPublic;
  conversations?: ConversationListResponse["conversations"];
  analysisResult?: AIResult | null;
  isLoading?: boolean;
  className?: string;
  // 新增变体配置支持
  variant?: "preview" | "sidebar" | "fullscreen";
  showPreprocessedContent?: boolean;
  height?: "fixed" | "full";
  hideHeader?: boolean;
  onHistoryCountChange?: (count: number) => void;
  showHistory?: boolean;
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

const ModernAnalysisInterface: React.FC<ModernAnalysisInterfaceProps> = ({
  content,
  conversations = [],
  analysisResult = null,
  isLoading = false,
  className = "",
  // 新增变体配置，默认为fullscreen（保持现有行为）
  variant = "fullscreen",
  showPreprocessedContent = true,
  height = "full",
  hideHeader = false,
  onHistoryCountChange,
  showHistory: showHistoryProp,
}) => {
  const { toast } = useToast();

  // 状态管理
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const showHistory = showHistoryProp;
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [floatingMenu, setFloatingMenu] = useState({ show: false, x: 0, y: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>(
    [],
  );
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 移除原有的文本操作按钮 - 现在由独立组件处理
  // const textActions = [...]

  // 获取真实的prompts作为AI指令标签
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoadingPrompts(true);
        const promptsResponse = await fetchPrompts({
          sort: "updated_at",
          order: "desc",
        });

        if (Array.isArray(promptsResponse)) {
          // 优化的过滤逻辑：
          // 1. 显示用户明确启用的 prompts (user_enabled: true)
          // 2. 显示系统启用且用户未设置的 prompts (enabled: true && user_enabled: undefined/null)
          // 3. 排除用户明确禁用的 prompts (user_enabled: false)
          const availablePrompts = promptsResponse
            .filter((p) => {
              // 系统级别必须启用
              if (!p.enabled) return false;

              // 如果用户明确禁用，则不显示
              if (p.user_enabled === false) return false;

              // 用户明确启用或者用户未设置（默认采用系统设置）
              return (
                p.user_enabled === true ||
                p.user_enabled === undefined ||
                p.user_enabled === null
              );
            })
            .slice(0, 7);

          setPrompts(availablePrompts);

          // 调试信息
          console.log("[ModernAnalysisInterface] Prompts 加载情况:", {
            总数: promptsResponse.length,
            系统启用: promptsResponse.filter((p) => p.enabled).length,
            用户启用: promptsResponse.filter((p) => p.user_enabled === true)
              .length,
            用户禁用: promptsResponse.filter((p) => p.user_enabled === false)
              .length,
            用户未设置: promptsResponse.filter(
              (p) => p.user_enabled === undefined || p.user_enabled === null,
            ).length,
            最终显示: availablePrompts.length,
            显示的prompts: availablePrompts.map((p) => ({
              name: p.name,
              enabled: p.enabled,
              user_enabled: p.user_enabled,
            })),
          });
        }
      } catch (error) {
        console.error("获取prompts失败:", error);
      } finally {
        setLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, []);

  // 获取真实的历史对话记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const historyResponse = await contentApi.getContentConversations(
          content.id,
        );
        const records = historyResponse.conversations.slice(0, 10);
        setHistoryRecords(records);
        onHistoryCountChange?.(records.length);
      } catch (error) {
        console.error("获取历史记录失败:", error);
        onHistoryCountChange?.(0);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (content.id) {
      loadHistory();
    }
  }, [content.id, onHistoryCountChange]);

  // 监听来自正文区域的文本选择事件
  useEffect(() => {
    const handleTextSelectionAction = (event: CustomEvent) => {
      const { action, selectedText } = event.detail;
      
      // 自动填充输入框并执行分析
      const prompt = `${action.prompt}\n\n${selectedText}`;
      setInputValue(prompt);
      
      // 可选：自动开始分析
      // setTimeout(() => {
      //   if (prompt.trim()) {
      //     handleAnalysis();
      //   }
      // }, 500);
    };

    window.addEventListener('textSelectionAction' as any, handleTextSelectionAction);
    
    return () => {
      window.removeEventListener('textSelectionAction' as any, handleTextSelectionAction);
    };
  }, []);

  // 处理块选择 - 保留用于卡片交互
  const handleBlockClick = useCallback(
    (blockId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setSelectedBlock(selectedBlock === blockId ? null : blockId);
    },
    [selectedBlock],
  );

  // 监听点击外部 - 简化逻辑
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedBlock(null);
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // 处理prompt标签点击
  const handlePromptClick = useCallback(
    (prompt: PromptData) => {
      // 替换prompt模板中的变量
      let promptContent = prompt.content;
      if (promptContent.includes("{content}")) {
        promptContent = promptContent.replace(
          "{content}",
          content.content_text || content.title || "内容",
        );
      }

      setInputValue(promptContent);
    },
    [content],
  );

  // 处理历史记录点击
  const handleHistoryClick = useCallback((conversation: ConversationPublic) => {
    if (conversation.summary) {
      setInputValue(
        `继续关于"${conversation.title}"的对话：${conversation.summary}`,
      );
    } else {
      setInputValue(`继续关于"${conversation.title}"的对话`);
    }
  }, []);

  // 处理AI分析
  const handleAnalysis = useCallback(async () => {
    if (!inputValue.trim() || isAnalyzing) return;

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
            // 移除model参数，由后端自动选择最适合的模型
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
            }
          } else if (line.startsWith("8:")) {
            // 完成信号 - 最终更新
            setStreamingResponse(accumulatedContent);
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

  // 处理JSON行展开请求
  const handleJsonLineExpand = useCallback(async (jsonContent: Record<string, unknown>) => {
    console.log('[ModernAnalysisInterface] JSON line expand requested:', jsonContent);
    
    // 构造展开讨论的prompt
    const selectedPoint = jsonContent.c || jsonContent.content || JSON.stringify(jsonContent);
    const instruction = `请对以下要点进行深度展开讨论：${selectedPoint}`;
    
    // 设置输入值并触发分析
    setInputValue(instruction);
    
    // 延迟触发分析，让用户看到输入框的变化
    setTimeout(async () => {
      if (instruction.trim()) {
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
                analysis_instruction: instruction,
                template_name: "expand_discussion.j2",
                selected_point: jsonContent.c || jsonContent.content || JSON.stringify(jsonContent),
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
              if (line.startsWith("0:")) {
                const jsonlLine = line.slice(2);
                if (jsonlLine.trim()) {
                  accumulatedContent += jsonlLine + "\n";
                  setStreamingResponse(accumulatedContent);
                }
              } else if (line.startsWith("8:")) {
                setStreamingResponse(accumulatedContent);
                break;
              } else if (line.startsWith("9:")) {
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
          toast({
            title: "展开分析完成",
            description: "AI 已完成深度展开讨论",
          });
        } catch (error) {
          console.error("Expand analysis failed:", error);
          toast({
            title: "展开分析失败",
            description: "请稍后重试",
            variant: "destructive",
          });
        } finally {
          setIsAnalyzing(false);
        }
      }
    }, 100);
  }, [content.id, toast]);

  // 构建分析卡片数据
  const buildAnalysisCards = useCallback((): AnalysisCard[] => {
    if (!analysisResult && !streamingResponse) return [];

    const cards: AnalysisCard[] = [];
    // 使用meta_info代替ai_analysis
    const metaInfo = content.meta_info ? JSON.parse(content.meta_info) : null;
    const adaptedData = adaptAnalysisData(analysisResult, metaInfo);

    // 只有在显示预处理内容时才添加这些卡片
    if (showPreprocessedContent) {
      // 内容摘要卡片
      if (adaptedData.summary) {
        cards.push({
          id: "summary",
          title: "内容摘要",
          subtitle: "核心内容提炼",
          emoji: "📝",
          content: {
            type: "summary",
            data: adaptedData.summary,
          },
        });
      }

      // 关键要点卡片
      if (adaptedData.keyPoints) {
        cards.push({
          id: "keyPoints",
          title: "提问灵感",
          subtitle: "好奇心的清单",
          emoji: "🎯",
          content: {
            type: "keyPoints",
            data: adaptedData.keyPoints,
          },
        });
      }
    }

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

    return cards;
  }, [analysisResult, content.meta_info, streamingResponse, isAnalyzing, showPreprocessedContent]);

  const cards = buildAnalysisCards();

  // 渲染卡片内容
  const renderCardContent = (card: AnalysisCard) => {
    const { content: cardContent } = card;

    if (cardContent.type === "summary" || cardContent.type === "keyPoints") {
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
            <UniversalContentRenderer 
              content={textContent} 
              onExpandLine={handleJsonLineExpand}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  // 主卡片组件 - 极简化设计
  const CardComponent = ({
    card,
    index,
  }: { card: AnalysisCard; index: number }) => {
    const isSelected = selectedCard === card.id;
    const isHovered = hoveredCard === card.id;

    return (
      <div
        className="group relative cursor-pointer"
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => setSelectedCard(isSelected ? null : card.id)}
        data-exclude-selection
      >
        {/* 极简卡片主体 */}
        <Card
          className={`
          transition-shadow duration-300 ease-in-out 
          overflow-hidden relative border-0 analysis-card
          ${
            isSelected
              ? "shadow-lg bg-white dark:bg-gray-950"
              : "shadow-sm bg-gray-50/50 dark:bg-gray-900/50"
          }
          group-hover:shadow-lg
        `}
        data-exclude-selection
        >
          <CardContent className="p-4" data-exclude-selection>
            {/* 极简卡片头部 */}
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

              {/* 简化的操作按钮 */}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">正在加载分析结果...</p>
        </div>
      </div>
    );
  }

  // 根据变体计算样式
  const containerHeight = height === "fixed" ? "h-80" : "h-full";
  const containerClasses = variant === "preview" 
    ? `flex flex-col ${containerHeight} ${className}` 
    : `flex flex-col h-full ${className}`;

  return (
    <div className={containerClasses} data-exclude-selection>
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* 可滚动的主内容区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" data-exclude-selection>
        {/* 页面标题 - 根据配置条件渲染 */}
        {!hideHeader && (
          <div className="px-6 py-4" data-exclude-selection>
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
              {content.title || "内容分析"}
            </h1>
          </div>
        )}

        {/* 卡片列表 */}
        <div className="px-6 pt-4 pb-6" data-exclude-selection>
          <div className={`space-y-4 ${
            variant === "preview" 
              ? "max-w-[var(--size-body)] 2xl:max-w-[var(--size-body-lg)] mx-auto" 
              : ""
          }`}>
            {cards.length > 0 ? (
              cards.map((card, index) => (
                <CardComponent key={card.id} card={card} index={index} />
              ))
            ) : (
              <div className="flex items-center justify-center p-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/30 dark:bg-gray-900/30">
                <div className="text-center space-y-2">
                  <Brain className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    暂无分析结果，使用下方AI助手开始分析
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 固定底部AI助手 */}
      <div className={`flex-shrink-0 backdrop-blur-md border-t ${
        variant === "preview" 
          ? "bg-background/95 border-border" 
          : "bg-white/95 dark:bg-gray-950/95 border-gray-200 dark:border-gray-800"
      }`} data-exclude-selection>
        <div className="px-6 py-4">
          {/* 历史记录展开面板 */}
          {showHistory && (
            <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    历史对话
                  </h4>
                  {/* This button is now controlled by the parent */}
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                  {loadingHistory ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : historyRecords.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                      暂无历史对话
                    </div>
                  ) : (
                    historyRecords.map((record, index) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors duration-200 cursor-pointer group"
                        onClick={() => handleHistoryClick(record)}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {record.title || "未命名对话"}
                            </div>
                            {record.summary && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {record.summary}
                              </p>
                            )}
                          </div>

                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDistanceToNow(new Date(record.created_at), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI指令标签行 - 从真实API获取 */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
            {loadingPrompts ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">加载中...</span>
              </div>
            ) : (
              prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => handlePromptClick(prompt)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap flex-shrink-0"
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
            flex items-center px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 transition-all duration-200
            ${inputFocused ? "border-gray-900 dark:border-gray-100" : "border-transparent"}
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
              className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              disabled={isAnalyzing}
            />

            {/* 发送按钮 */}
            {inputValue.trim() && (
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white ml-3"
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

export { ModernAnalysisInterface };
