"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  MessageSquare,
  ArrowUpRight,
  Share,
  Sparkles,
  RefreshCw,
  Minus,
  Plus,
  Loader2,
} from "lucide-react";
import { useCardHeight } from "@/hooks/use-card-height";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AIResult,
  ConversationListResponse,
  ConversationPublic,
} from "@/lib/api/content";
import { ContentItemPublic } from "@/app/(withSidebar)/content-library/types";
import { adaptAnalysisData } from "./AnalysisCards";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { getCookie } from "cookies-next";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { contentApi } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { useLLMAnalysisStore } from "@/lib/stores/llm-analysis-store";

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
    data: string | object;
  };
}

const ModernAnalysisInterface: React.FC<ModernAnalysisInterfaceProps> = ({
  content,
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  // Remove local state for prompts
  // const [prompts, setPrompts] = useState<PromptData[]>([]);
  // const [loadingPrompts, setLoadingPrompts] = useState(true);
  // Add store usage
  const { enabledPrompts, isLoadingPrompts, loadPrompts } = useLLMAnalysisStore();
  // Load prompts from store
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>(
    [],
  );
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

  // 动态高度管理
  const { registerElement, getCardHeight } = useCardHeight();

  // 移除原有的文本操作按钮 - 现在由独立组件处理
  // const textActions = [...]

  // 获取真实的prompts作为AI指令标签
  // useEffect(() => {
  //   const loadPrompts = async () => {
  //     try {
  //       setLoadingPrompts(true);
  //       const promptsResponse = await fetchPrompts({
  //         sort: "updated_at",
  //         order: "desc",
  //       });

  //       if (Array.isArray(promptsResponse)) {
  //         // 优化的过滤逻辑：
  //         // 1. 显示用户明确启用的 prompts (user_enabled: true)
  //         // 2. 显示系统启用且用户未设置的 prompts (enabled: true && user_enabled: undefined/null)
  //         // 3. 排除用户明确禁用的 prompts (user_enabled: false)
  //         const availablePrompts = promptsResponse
  //           .filter((p) => {
  //             // 系统级别必须启用
  //             if (!p.enabled) return false;

  //             // 如果用户明确禁用，则不显示
  //             if (p.user_enabled === false) return false;

  //             // 用户明确启用或者用户未设置（默认采用系统设置）
  //             return (
  //               p.user_enabled === true ||
  //               p.user_enabled === undefined ||
  //               p.user_enabled === null
  //             );
  //           })
  //           .slice(0, 7);

  //         setPrompts(availablePrompts);

  //         // 调试信息
  //         console.log("[ModernAnalysisInterface] Prompts 加载情况:", {
  //           总数: promptsResponse.length,
  //           系统启用: promptsResponse.filter((p) => p.enabled).length,
  //           用户启用: promptsResponse.filter((p) => p.user_enabled === true)
  //             .length,
  //           用户禁用: promptsResponse.filter((p) => p.user_enabled === false)
  //             .length,
  //           用户未设置: promptsResponse.filter(
  //           (p) => p.user_enabled === undefined || p.user_enabled === null,
  //         ).length,
  //         最终显示: availablePrompts.length,
  //         显示的prompts: availablePrompts.map((p) => ({
  //         name: p.name,
  //         enabled: p.enabled,
  //         user_enabled: p.user_enabled,
  //       })),
  //     });
  //   }
  // } catch (error) {
  //   console.error("获取prompts失败:", error);
  // } finally {
  //   setLoadingPrompts(false);
  // }
  // };

  // loadPrompts();
  // }, []);

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

    window.addEventListener(
      "textSelectionAction" as keyof WindowEventMap,
      handleTextSelectionAction,
    );

    return () => {
      window.removeEventListener(
        "textSelectionAction" as keyof WindowEventMap,
        handleTextSelectionAction,
      );
    };
  }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const performCompletion = useCallback(
    async (body: Record<string, unknown>, title: string) => {
      // isAnalyzing 是在函数外部定义的，但在函数内部使用。
      // 为了确保函数在重新渲染时能够获取到最新的 isAnalyzing 状态，
      // 我们不应该将其包含在 useCallback 的依赖数组中，
      // 否则会导致函数在 isAnalyzing 变化时重新创建，从而引发逻辑问题。
      // 正确的做法是，useCallback 依赖的应该是那些在组件生命周期内基本不变的函数或值。
      if (isAnalyzing) return;

      setIsAnalyzing(true);
      setStreamingResponse("");

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(
          `${apiUrl}/api/v1/content/${content.id}/completion-updated`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getCookie("accessToken")}`,
            },
            body: JSON.stringify(body),
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
          title: title,
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
    },
    [
      content.id,
      toast,
      setInputValue,
      setStreamingResponse,
      setIsAnalyzing,
      isAnalyzing,
    ],
  );

  const handleAnalysis = useCallback(async () => {
    if (!inputValue.trim()) return;
    await performCompletion(
      {
        analysis_instruction: inputValue,
      },
      "分析完成",
    );
  }, [inputValue, performCompletion]);

  // 处理JSON行展开请求
  const handleJsonLineExpand = useCallback(
    async (jsonContent: Record<string, unknown>) => {
      console.log(
        "[ModernAnalysisInterface] JSON line expand requested:",
        jsonContent,
      );

      // 构造展开讨论的prompt
      const selectedPoint =
        jsonContent.c || jsonContent.content || JSON.stringify(jsonContent);
      const instruction = `请对以下要点进行深度展开讨论：${selectedPoint}`;

      // 设置输入值，让用户可以看到
      setInputValue(instruction);

      // 立即触发分析，不使用setTimeout
      await performCompletion(
        {
          analysis_instruction: instruction,
          template_name: "expand_discussion.j2",
          selected_point: selectedPoint,
        },
        "展开分析完成",
      );
    },
    [performCompletion, setInputValue],
  );

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
          title: "提问清单",
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
  }, [
    analysisResult,
    content.meta_info,
    streamingResponse,
    isAnalyzing,
    showPreprocessedContent,
  ]);

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
          (cardContent.data as any).text ||
          (cardContent.data as any).content ||
          (cardContent.data as any).summary ||
          JSON.stringify(cardContent.data);
      }

      if (!textContent) return null;

      return (
        <div
          className={`
            px-6 py-3 rounded-lg transition-all duration-200
            ${
              selectedBlock === `${card.id}-main`
                ? "linear-bg-1 opacity-90"
                : "hover:linear-bg-1"
            }
          `}
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

  // 处理卡片折叠状态
  const toggleCardCollapse = useCallback((cardId: string) => {
    setCollapsedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  // 主卡片组件 - 极简化设计
  const CardComponent = ({ card }: { card: AnalysisCard }) => {
    const isSelected = selectedCard === card.id;
    const isHovered = hoveredCard === card.id;
    const isCollapsed = collapsedCards.has(card.id);

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
          transition-all duration-300 ease-in-out 
          relative border-0 analysis-card
          ${isSelected ? "shadow-lg linear-bg-1" : "shadow-sm linear-bg-1"}
          group-hover:shadow-lg
        `}
        >
          <CardContent className="px-12 py-4">
            {/* 极简卡片头部 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{card.emoji}</span>
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {card.title}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* 操作按钮：使用 flex-row-reverse 保证折叠/展开按钮始终最右 */}
              <div className="flex items-center gap-1 flex-row-reverse relative z-10">
                {/* 折叠/展开按钮 - 始终显示 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-neutral-600 relative z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleCardCollapse(card.id);
                  }}
                >
                  {isCollapsed ? (
                    <Plus className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* 其他操作按钮 - 仅在悬停时显示 */}
                {isHovered && (
                  <div className="flex items-center gap-1 mr-1 transition-all duration-200 relative z-10">
                    <FavoriteButton
                      itemId={content.id}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 text-neutral-400 hover:text-neutral-600 relative z-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-400 hover:text-neutral-600 relative z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log("分享");
                      }}
                    >
                      <Share className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 卡片内容 - 支持折叠状态 */}
            <div
              className={`
              transition-all duration-300 ease-in-out overflow-hidden
              ${isCollapsed ? "opacity-0" : "opacity-100"}
            `}
              style={{
                maxHeight: isCollapsed
                  ? 0
                  : `${getCardHeight(card.id, isCollapsed)}px`,
              }}
            >
              <div
                ref={(el) => registerElement(card.id, el)}
                className="card-content-inner"
              >
                {renderCardContent(card)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-neutral-400" />
          <p className="text-sm text-neutral-500">正在加载分析结果...</p>
        </div>
      </div>
    );
  }

  // 根据变体计算样式
  const containerHeight = height === "fixed" ? "h-80" : "h-full";
  const containerClasses =
    variant === "preview"
      ? `flex flex-col ${containerHeight} ${className} linear-bg-1`
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
      <div
        className={`flex-1 overflow-y-auto custom-scrollbar ${variant === "preview" ? "!bg-[var(--color-linear-bg-1)]" : ""}`}
        data-exclude-selection
      >
        {/* 页面标题 - 根据配置条件渲染 */}
        {!hideHeader && (
          <div
            className={`px-6 py-3 ${variant === "preview" ? "!bg-[var(--color-linear-bg-1)]" : ""}`}
            data-exclude-selection
          >
            <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
              {content.title || "内容分析"}
            </h1>
          </div>
        )}

        {/* 卡片列表 */}
        <div className="px-8 pt-4 pb-6" data-exclude-selection>
          <div
            className={`space-y-6 ${
              variant === "preview" ? "max-w-2xl mx-auto" : ""
            }`}
          >
            {cards.length > 0 ? (
              cards.map((card) => <CardComponent key={card.id} card={card} />)
            ) : (
              <div className="flex items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30">
                <div className="text-center space-y-2">
                  <Brain className="h-8 w-8 text-neutral-400 mx-auto" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    暂无分析结果，使用下方AI助手开始分析
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 固定底部AI助手 */}
      <div
        className={`flex-shrink-0 backdrop-blur-md border-t ${
          variant === "preview"
            ? "linear-bg-1 border-border"
            : "linear-bg-1 border-border dark:border-neutral-800"
        }`}
        data-exclude-selection
      >
        <div className="px-6 py-3">
          {/* 历史记录展开面板 */}
          {showHistory && (
            <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <div className="bg-neutral-50/80 dark:bg-neutral-900/80 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    历史对话
                  </h4>
                  {/* This button is now controlled by the parent */}
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                  {loadingHistory ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto text-neutral-400" />
                    </div>
                  ) : historyRecords.length === 0 ? (
                    <div className="text-center py-4 text-sm text-neutral-500 dark:text-neutral-400">
                      暂无历史对话
                    </div>
                  ) : (
                    historyRecords.map((record, index) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors duration-200 cursor-pointer group"
                        onClick={() => handleHistoryClick(record)}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {record.title || "未命名对话"}
                            </div>
                            {record.summary && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                                {record.summary}
                              </p>
                            )}
                          </div>

                          <span className="text-xs text-neutral-400 flex-shrink-0">
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
          <div className="flex items-center gap-2 mb-1 overflow-x-auto scrollbar-hide pb-1">
            {isLoadingPrompts ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
                <span className="text-sm text-neutral-500">加载中...</span>
              </div>
            ) : (
              enabledPrompts.slice(0, 7).map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => handlePromptClick(prompt)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 whitespace-nowrap flex-shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{prompt.name}</span>
                </button>
              ))
            )}
          </div>

          {/* 现代化聊天输入框 */}
          <div className="relative bg-white dark:bg-zinc-800 shadow-md rounded-3xl focus-within:ring-1 focus-within:ring-foreground transition-all duration-300">
            <div className="flex items-center gap-3 pl-6 pr-3 py-1">
              <div className="relative flex-1">
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
                  className="border-0 bg-transparent px-0 py-2 h-auto text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none w-full"
                  disabled={isAnalyzing}
                  autoComplete="off"
                />
              </div>

              {/* 现代化发送按钮 */}
              <Button
                size="icon"
                className="rounded-full h-6 w-6 shadow-md text-foreground hover:text-foreground bg-neutral-100 hover:bg-neutral-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 cursor-pointer"
                onClick={handleAnalysis}
                disabled={!inputValue.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ModernAnalysisInterface };
