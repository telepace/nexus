"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation"; // 🎯 添加路由检测
import {
  Brain,
  MessageSquare,
  Send,
  Share,
  Sparkles,
  RefreshCw,
  Loader2,
  Bot,
  User,
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
  ConversationPublic, // 🎯 恢复使用content.ts中的类型，因为它包含messages属性
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
import { useConversationHistory } from "@/hooks/use-conversation-history";

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
    type: "summary" | "keyPoints" | "custom";  // 🎯 移除 "conversations" | "historyConversation" 类型
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
  const pathname = usePathname(); // 🎯 获取当前路由

  // 状态管理
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const showHistory = showHistoryProp;
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  
  // 使用统一的历史记录管理hook
  const {
    historyRecords,
    isLoadingHistory: loadingHistory,
    refreshHistory,
    addHistoryRecord
  } = useConversationHistory({
    contentId: content.id,
    onError: (error) => {
      console.error('历史记录加载失败:', error);
      toast({
        title: "加载失败",
        description: error,
        variant: "destructive",
      });
    }
  });
  
  // 🎯 在/reader/页面为非核心卡片设置默认折叠状态
  const getInitialCollapsedCards = useCallback(() => {
    const initialCollapsed = new Set<string>();
    
    // 如果是在/reader/页面，除了"内容摘要"和"提问清单"外，其他卡片默认折叠
    if (pathname.includes("/reader/")) {
      // 这里暂时为空，因为我们主要控制的是StreamingConversationCard
      // 静态分析卡片（summary, keyPoints）应该保持展开
    }
    
    return initialCollapsed;
  }, [pathname]);
  
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(getInitialCollapsedCards);

  // 🎯 添加滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 动态高度管理
  const { registerElement, getCardHeight } = useCardHeight();

  // 🎯 优化滚动处理，添加节流
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
  }, []);

  // 新的对话管理
  const {
    conversations: streamingConversations,
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

  // 🎯 监听路由变化，重置折叠状态
  useEffect(() => {
    setCollapsedCards(getInitialCollapsedCards());
  }, [pathname, getInitialCollapsedCards]);

  // 🎯 监听新对话出现，优化自动滚动
  useEffect(() => {
    if (streamingConversations.length > 0) {
      // 使用防抖，避免频繁滚动
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [streamingConversations.length, scrollToBottom]);

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

  // 监听历史记录数量变化
  useEffect(() => {
    onHistoryCountChange?.(historyRecords.length);
  }, [historyRecords.length, onHistoryCountChange]);

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
      try {
        console.log("🔘 Prompt 点击事件:", prompt.name);

        // 替换prompt模板中的变量
        let promptContent = prompt.content;
        if (promptContent.includes("{content}")) {
          promptContent = promptContent.replace(
            "{content}",
            content.content_text || content.title || "内容"
          );
        }

        console.log("📝 处理后的 prompt 内容:", {
          originalContent: prompt.content,
          processedContent: promptContent,
          promptName: prompt.name
        });

        // 🎯 修复：用户消息显示prompt名称，但实际发送的是完整内容
        await sendMessage(prompt.name, "simple_chat.j2", {
          promptName: prompt.name,
          promptId: prompt.id,
          originalUserInput: prompt.name, // 用户界面显示的简洁内容
          actualPromptContent: promptContent, // 实际发送给AI的完整prompt内容
        });

        // 清空输入框
        setInputValue("");

        toast({
          title: "开始分析",
          description: `正在使用 "${prompt.name}" 模板进行分析`,
        });
      } catch (error) {
        console.error("❌ handlePromptClick 错误:", error);
        toast({
          title: "处理失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      }
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
    try {
      console.log("🔘 手动输入分析事件");
      if (!inputValue.trim()) {
        console.warn("⚠️ 输入值为空，跳过分析");
        return;
      }

      console.log("📝 手动输入内容:", inputValue);

      await sendMessage(inputValue, "simple_chat.j2", {
        type: "manual_input",
        originalUserInput: inputValue, // 手动输入直接显示用户输入的内容
      });

      setInputValue("");

      toast({
        title: "开始分析",
        description: "正在处理您的问题",
      });
    } catch (error) {
      console.error("❌ handleAnalysis 错误:", error);
      toast({
        title: "处理失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  }, [inputValue, sendMessage, toast]);

  // 处理JSON行展开请求
  const handleJsonLineExpand = useCallback(
    async (jsonContent: Record<string, unknown>) => {
      console.log("[EnhancedModernAnalysisInterface] JSON line expand requested:", jsonContent);

      const selectedPoint =
        jsonContent.c || jsonContent.content || JSON.stringify(jsonContent);
      const instruction = `请对以下要点进行深度展开讨论：${selectedPoint}`;

      const displayText = `展开讨论: ${selectedPoint}`;
      
      await sendMessage(instruction, "expand_discussion.j2", {
        type: "expand_discussion",
        selectedPoint,
        originalUserInput: displayText, // 显示简洁的用户意图
        actualPromptContent: instruction, // 完整的指令内容
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
    if (!analysisResult) return [];

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

    // 🎯 移除历史对话卡片显示 - 过时的呈现方式，与下方模块化展示产生冗余
    // 历史对话现在通过底部的历史记录面板和新的实时对话卡片来处理

    return cards;
  }, [
    analysisResult,
    content.meta_info,
    showPreprocessedContent,
    // 移除 conversations 依赖，因为不再显示历史对话卡片
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

  // 主卡片组件 - 性能优化版本
  const CardComponent = ({ card }: { card: AnalysisCard }) => {
    const isSelected = selectedCard === card.id;
    const isHovered = hoveredCard === card.id;
    const isCollapsed = collapsedCards.has(card.id);

    // 🎯 优化悬浮状态处理，减少重复渲染
    const handleMouseEnter = useCallback(() => {
      setHoveredCard(card.id);
    }, [card.id]);

    const handleMouseLeave = useCallback(() => {
      setHoveredCard(null);
    }, []);

    const handleClick = useCallback(() => {
      setSelectedCard(isSelected ? null : card.id);
    }, [isSelected, card.id]);

    return (
      <div
        className="group relative cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-exclude-selection
      >
        <Card
          className={`
          transition-all duration-200 ease-out 
          relative border-0 analysis-card
          ${isSelected ? "shadow-lg linear-bg-1" : "shadow-sm linear-bg-1"}
          group-hover:shadow-lg
          transform-gpu will-change-transform
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

                {/* 🎯 优化悬浮操作按钮显示 */}
                <div className={`
                  flex items-center gap-1 mr-1 transition-opacity duration-200 relative z-10
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}>
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
              </div>
            </div>

            {/* 卡片内容 - 优化动画性能 */}
            <div
              className={`
              transition-all duration-200 ease-out overflow-hidden transform-gpu
              ${isCollapsed ? "opacity-0" : "opacity-100"}
            `}
              style={{
                maxHeight: isCollapsed ? 0 : `${getCardHeight(card.id, isCollapsed)}px`,
              }}
            >
              <div
                ref={(el) => {
                  // 延迟注册，避免在渲染过程中引起问题
                  if (el) {
                    requestAnimationFrame(() => registerElement(card.id, el));
                  } else {
                    registerElement(card.id, null);
                  }
                }}
                className="card-content-inner"
              >
                {card.content.type === "summary" || card.content.type === "keyPoints" ? (
                  renderCardContent(card)
                ) : null}

                {/* 🎯 移除所有历史对话卡片的渲染逻辑 - 过时的呈现方式 */}
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
        
        /* 🎯 性能优化样式 */
        .analysis-card {
          contain: layout style paint;
        }
        
        .analysis-card:hover {
          will-change: box-shadow;
        }
        
        .analysis-card:not(:hover) {
          will-change: auto;
        }
      `}</style>

      {/* 可滚动的主内容区域 - 优化滚动性能 */}
      <div
        className={`
          flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent 
          scrollbar-thumb-neutral-300 hover:scrollbar-thumb-neutral-400
          dark:scrollbar-thumb-neutral-600 dark:hover:scrollbar-thumb-neutral-500
          ${variant === "preview" ? "!bg-[var(--color-linear-bg-1)]" : ""}
        `}
        data-exclude-selection
        ref={scrollContainerRef}
        style={{
          contain: "layout style paint",
          willChange: "scroll-position",
          overscrollBehavior: "contain",
        }}
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
              cards.map((card) => (
                <CardComponent key={card.id} card={card} />
              ))
            ) : streamingConversations.length === 0 ? (
              <div className="flex items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    暂无分析结果，正在处理 ...
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
                    historyRecords.map((record, index) => {
                      // 🎯 类型断言：历史记录实际上包含messages属性
                      const fullRecord = record as ConversationPublic;
                      
                      // 提取用户意图
                      const getUserIntentSummary = () => {
                        if (!fullRecord.messages || fullRecord.messages.length === 0) return "无用户输入";
                        
                        const userMessages = fullRecord.messages.filter((msg: any) => msg.role === "user");
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

                      return (
                        <div
                          key={record.id}
                          className="bg-white/60 dark:bg-neutral-800/60 rounded-lg p-3 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-all duration-200 cursor-pointer group border border-neutral-200/50 dark:border-neutral-700/50"
                          onClick={() => handleHistoryClick(fullRecord)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 flex items-center justify-center border border-blue-200/30 dark:border-blue-700/30">
                                <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                {record.title || "未命名对话"}
                              </div>
                              
                              <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                {getUserIntentSummary()}
                              </div>
                              
                              <div className="flex items-center justify-between">
                                {record.summary && (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1 mr-2">
                                    {record.summary}
                                  </p>
                                )}
                                <span className="text-xs text-neutral-400 flex-shrink-0">
                                  {formatDistanceToNow(new Date(record.created_at), {
                                    addSuffix: true,
                                    locale: zhCN,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                  onClick={() => handlePromptClick(prompt)}
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalysis();
                }
              }}
              placeholder="询问关于内容的任何问题..."
              className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
            />

            {/* 发送按钮 */}
            {inputValue.trim() && (
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 text-white ml-3"
                onClick={handleAnalysis}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 当前处理状态提示 */}
          {/* isProcessing is no longer needed here as each conversation is independent */}
        </div>
      </div>
    </div>
  );
};

export { EnhancedModernAnalysisInterface };