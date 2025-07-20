"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  MessageSquare,
  Send,
  Share,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useCardHeight } from "@/hooks/use-card-height";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CollapsibleButton } from "@/components/ui/CollapsibleButton";
import { useToast } from "@/hooks/use-toast";
import {
  ContentItemPublic,
  AIResult,
  ConversationListResponse,
  ConversationPublic,
} from "@/lib/api/content";
import { adaptAnalysisData } from "./AnalysisCards";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { contentApi } from "@/lib/api/content";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { FavoriteButton } from "@/components/actions/FavoriteButton";
import { StreamingConversationCard } from "./StreamingConversationCard";
import { useStreamingConversation } from "@/hooks/use-streaming-conversation";

interface EnhancedModernAnalysisInterfaceProps {
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
  subtitle?: string;
  emoji: string;
  content: {
    type: "summary" | "keyPoints" | "conversations" | "custom";
    data: any;
  };
}

const EnhancedModernAnalysisInterface: React.FC<EnhancedModernAnalysisInterfaceProps> = ({
  content,
  conversations,
  analysisResult = null,
  isLoading = false,
  className = "",
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
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

  // 动态高度管理
  const { registerElement, getCardHeight } = useCardHeight();

  // 新的对话管理
  const {
    conversations: streamingConversations,
    isProcessing,
    sendMessage,
    retryMessage,
    deleteConversation,
    cancelCurrentProcessing,
  } = useStreamingConversation({
    contentId: content.id,
    onConversationUpdate: (conversation) => {
      // 可以在这里添加额外的处理逻辑
    },
    onError: (error) => {
      toast({
        title: "处理失败",
        description: error,
        variant: "destructive",
      });
    },
  });

  // 获取prompts
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoadingPrompts(true);
        const promptsResponse = await fetchPrompts({
          sort: "updated_at",
          order: "desc",
        });

        if (Array.isArray(promptsResponse)) {
          const availablePrompts = promptsResponse
            .filter((p) => {
              if (!p.enabled) return false;
              if (p.user_enabled === false) return false;
              return (
                p.user_enabled === true ||
                p.user_enabled === undefined ||
                p.user_enabled === null
              );
            })
            .slice(0, 7);

          setPrompts(availablePrompts);
        }
      } catch (error) {
        console.error("获取prompts失败:", error);
      } finally {
        setLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, []);

  // 获取历史对话记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const historyResponse = await contentApi.getContentConversations(content.id);
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
      const prompt = `${action.prompt}\n\n${selectedText}`;
      setInputValue(prompt);
    };

    window.addEventListener(
      "textSelectionAction" as keyof WindowEventMap,
      handleTextSelectionAction
    );

    return () => {
      window.removeEventListener(
        "textSelectionAction" as keyof WindowEventMap,
        handleTextSelectionAction
      );
    };
  }, []);

  // 监听点击外部
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedBlock(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // 处理prompt标签点击 - 优化版本
  const handlePromptClick = useCallback(
    async (prompt: PromptData) => {
      // 替换prompt模板中的变量
      let promptContent = prompt.content;
      if (promptContent.includes("{content}")) {
        promptContent = promptContent.replace(
          "{content}",
          content.content_text || content.title || "内容"
        );
      }

      // 立即发送消息，而不是填充输入框
      await sendMessage(promptContent, prompt.name, {
        promptName: prompt.name,
        promptId: prompt.id,
      });

      // 清空输入框
      setInputValue("");

      toast({
        title: "开始分析",
        description: `正在使用 "${prompt.name}" 模板进行分析`,
      });
    },
    [content, sendMessage, toast]
  );

  // 处理历史记录点击
  const handleHistoryClick = useCallback((conversation: ConversationPublic) => {
    if (conversation.summary) {
      setInputValue(
        `继续关于"${conversation.title}"的对话：${conversation.summary}`
      );
    } else {
      setInputValue(`继续关于"${conversation.title}"的对话`);
    }
  }, []);

  // 处理手动输入的分析
  const handleAnalysis = useCallback(async () => {
    if (!inputValue.trim()) return;

    await sendMessage(inputValue, undefined, {
      type: "manual_input",
    });

    setInputValue("");

    toast({
      title: "开始分析",
      description: "正在处理您的问题",
    });
  }, [inputValue, sendMessage, toast]);

  // 处理JSON行展开请求
  const handleJsonLineExpand = useCallback(
    async (jsonContent: Record<string, unknown>) => {
      console.log("[EnhancedModernAnalysisInterface] JSON line expand requested:", jsonContent);

      const selectedPoint =
        jsonContent.c || jsonContent.content || JSON.stringify(jsonContent);
      const instruction = `请对以下要点进行深度展开讨论：${selectedPoint}`;

      await sendMessage(instruction, "expand_discussion.j2", {
        type: "expand_discussion",
        selectedPoint,
      });

      toast({
        title: "展开讨论",
        description: "正在深度分析选中的要点",
      });
    },
    [sendMessage, toast]
  );

  // 构建分析卡片数据
  const buildAnalysisCards = useCallback((): AnalysisCard[] => {
    if (!analysisResult && (!conversations || conversations.length === 0)) return [];

    const cards: AnalysisCard[] = [];
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
          subtitle: "",
          emoji: "🤔",
          content: {
            type: "keyPoints",
            data: adaptedData.keyPoints,
          },
        });
      }
    }

    // 对话历史卡片
    if (conversations && conversations.length > 0) {
      const conversationsWithMessages = conversations.filter(conv => 
        conv.messages && conv.messages.length > 0
      );
      
      if (conversationsWithMessages.length > 0) {
        cards.push({
          id: "conversations",
          title: "对话记录",
          subtitle: `${conversationsWithMessages.length} 个对话，${conversationsWithMessages.reduce((total, conv) => total + (conv.messages?.length || 0), 0)} 条消息`,
          emoji: "💬",
          content: {
            type: "conversations",
            data: conversationsWithMessages,
          },
        });
      }
    }

    return cards;
  }, [
    analysisResult,
    content.meta_info,
    showPreprocessedContent,
    conversations,
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
          cardContent.data.text ||
          cardContent.data.content ||
          cardContent.data.summary ||
          JSON.stringify(cardContent.data);
      }

      if (!textContent) return null;

      return (
        <div
          className={`
            px-6 py-4 rounded-lg transition-all duration-200
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

  // 主卡片组件
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
        <Card
          className={`
          transition-all duration-300 ease-in-out 
          relative border-0 analysis-card
          ${isSelected ? "shadow-lg linear-bg-1" : "shadow-sm linear-bg-1"}
          group-hover:shadow-lg
        `}
        >
          <CardContent className="px-12 py-4">
            {/* 卡片头部 */}
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

              <div className="flex items-center gap-1 flex-row-reverse relative z-10">
                <CollapsibleButton
                  isCollapsed={isCollapsed}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleCardCollapse(card.id);
                  }}
                  size="md"
                  className="text-neutral-400 hover:text-neutral-600 relative z-10"
                />

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

            {/* 卡片内容 */}
            <div
              className={`
              transition-all duration-300 ease-in-out overflow-hidden
              ${isCollapsed ? "opacity-0" : "opacity-100"}
            `}
              style={{
                maxHeight: isCollapsed ? 0 : `${getCardHeight(card.id, isCollapsed)}px`,
              }}
            >
              <div
                ref={(el) => registerElement(card.id, el)}
                className="card-content-inner"
              >
                {card.content.type === "summary" || card.content.type === "keyPoints" ? (
                  renderCardContent(card)
                ) : card.content.type === "conversations" && (
                  <div className="space-y-3">
                    {card.content.data.map((conversation: any, index: number) => (
                      <div key={conversation.id || index} className="border rounded-lg p-3 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {conversation.title || "未命名对话"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {conversation.conversation_type === "auto_analysis" && "自动分析"}
                              {conversation.conversation_type === "user_chat" && "用户对话"}
                              {conversation.conversation_type === "prompt_analysis" && "模板分析"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.created_at), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                        {conversation.messages && conversation.messages.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {conversation.messages
                              .filter((msg: any) => msg.role !== "system")
                              .slice(0, 3)
                              .map((message: any, msgIndex: number) => (
                                <div
                                  key={msgIndex}
                                  className={`flex gap-2 ${
                                    message.role === "user" ? "justify-end" : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`max-w-[80%] p-2 rounded text-xs ${
                                      message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {message.content.length > 100
                                      ? `${message.content.substring(0, 100)}...`
                                      : message.content}
                                  </div>
                                </div>
                              ))}
                            {conversation.messages.filter((msg: any) => msg.role !== "system").length > 3 && (
                              <div className="text-center text-xs text-muted-foreground">
                                还有 {conversation.messages.filter((msg: any) => msg.role !== "system").length - 3} 条消息...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          variant === "preview" ? "!bg-[var(--color-linear-bg-1)]" : ""
        }`}
        data-exclude-selection
      >
        {/* 页面标题 */}
        {!hideHeader && (
          <div
            className={`px-6 py-4 ${
              variant === "preview" ? "!bg-[var(--color-linear-bg-1)]" : ""
            }`}
            data-exclude-selection
          >
            <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
              {content.title || "内容分析"}
            </h1>
          </div>
        )}

        {/* 原有的分析卡片 - 放在最前面 */}
        <div className="px-8 pt-4 pb-2" data-exclude-selection>
          <div
            className={`space-y-6 ${
              variant === "preview" ? "max-w-2xl mx-auto" : ""
            }`}
          >
            {cards.length > 0 ? (
              cards.map((card) => <CardComponent key={card.id} card={card} />)
            ) : streamingConversations.length === 0 ? (
              <div className="flex items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    暂无分析结果，使用下方AI助手开始分析
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 新的实时对话卡片 - 放在最后面，确保新卡片出现在最下方 */}
        <div className="px-8 pt-2 pb-6" data-exclude-selection>
          <div
            className={`space-y-6 ${
              variant === "preview" ? "max-w-2xl mx-auto" : ""
            }`}
          >
            {streamingConversations.map((conversation) => (
              <StreamingConversationCard
                key={conversation.id}
                conversation={conversation.messages}
                onExpandLine={handleJsonLineExpand}
                onRetry={retryMessage}
                onDelete={deleteConversation}
              />
            ))}
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

          {/* AI指令标签行 */}
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
                  onClick={() => handlePromptClick(prompt)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalysis();
                }
              }}
              placeholder="询问关于内容的任何问题..."
              className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
              disabled={isProcessing}
            />

            {/* 发送按钮 */}
            {inputValue.trim() && (
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 text-white ml-3"
                onClick={handleAnalysis}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* 当前处理状态提示 */}
          {isProcessing && (
            <div className="mt-2 text-center">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>正在处理您的问题...</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-neutral-400 hover:text-neutral-600"
                  onClick={cancelCurrentProcessing}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { EnhancedModernAnalysisInterface };