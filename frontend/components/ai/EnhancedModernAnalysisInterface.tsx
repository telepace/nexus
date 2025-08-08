"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { usePathname } from "next/navigation"; // 🎯 添加路由检测
import { Brain, Loader2, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18nSafe } from "@/lib/i18n-fallback";
import {
  ContentItemPublic,
  AIResult,
  ConversationListResponse,
  ConversationPublic, // 🎯 恢复使用content.ts中的类型，因为它包含messages属性
} from "@/lib/api/content";
import { adaptAnalysisData } from "./AnalysisCards";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { contentApi } from "@/lib/api/content";
import { StreamingConversationCard } from "./StreamingConversationCard";
import { useStreamingConversation } from "@/hooks/use-streaming-conversation";
import { useConversationHistory } from "@/hooks/use-conversation-history";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { AnalysisCardsContainer } from "./AnalysisCardsContainer";
import { useScrollManager } from "@/hooks/useScrollManager";

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
  // 新增AI状态变化回调
  onStatusChange?: (
    status: "idle" | "processing" | "completed",
    hasConversations: boolean,
  ) => void;
  // 🎯 重新设计：分离共享状态和场景状态
  sharedContentId?: string; // AI分析状态：跨场景共享
  sceneSpecificId?: string; // UI状态：场景隔离
  scene?: string; // 场景标识，用于缓存隔离
}

interface AnalysisCard {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  content: {
    type: "summary" | "keyPoints" | "custom"; // 🎯 移除 "conversations" | "historyConversation" 类型
    data: any;
  };
}

const EnhancedModernAnalysisInterface: React.FC<
  EnhancedModernAnalysisInterfaceProps
> = ({
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
  onStatusChange,
  sharedContentId,
  sceneSpecificId,
  scene = "default",
}) => {
  const { toast } = useToast();
  const { t } = useI18nSafe();
  const pathname = usePathname();

  // ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURNS
  // 🔍 渲染追踪日志 - 分析重新渲染原因
  const renderCount = React.useRef(0);
  const prevProps = React.useRef<any>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 内存优化：preview模式下优化性能，但保留核心交互功能
  const isPreviewMode = variant === "preview";

  // 模式优化配置（使用useMemo避免对象重新创建）
  const previewOptimizations = useMemo(
    () => ({
      disableStreamingConversations: false,
      disablePromptLoading: false,
      disableHistoryLoading: isPreviewMode,
      reduceEventListeners: isPreviewMode,
      disableInteraction: false,
      optimizeRendering: isPreviewMode,
      disableCardHeight: variant === "sidebar" || isPreviewMode,
    }),
    [isPreviewMode, variant],
  );

  // State declarations
  const showHistory = showHistoryProp;
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);

  // More state and memo declarations
  const originalContentId = useMemo(() => {
    return content?.id || "";
  }, [content?.id]);

  const aiAnalysisStorageId = useMemo(() => {
    return sharedContentId || content?.id || "";
  }, [sharedContentId, content?.id]);

  const uiStateStorageId = useMemo(() => {
    return sceneSpecificId || content?.id || "";
  }, [sceneSpecificId, content?.id]);

  const getInitialCollapsedCards = useCallback(() => {
    const initialCollapsed = new Set<string>();
    return initialCollapsed;
  }, []);

  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(
    getInitialCollapsedCards,
  );

  // 🎯 重新设计：使用统一滚动管理器
  const scrollManager = useScrollManager({
    enableUserIntentDetection: true,
    debug: process.env.NODE_ENV === "development",
  });

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      // 检查用户是否正在滚动，避免干扰
      if (scrollManager.isUserScrolling) {
        scrollManager.log("用户正在滚动，跳过自动滚动到底部");
        return;
      }

      // 使用统一的滚动管理器
      scrollManager.executeScroll(scrollContainerRef, "bottom", {
        force: false // 尊重用户意图，不强制滚动
      });
    }
  }, [scrollManager]);

  const stableStreamingContentId = useMemo(() => {
    return aiAnalysisStorageId;
  }, [aiAnalysisStorageId]);

  const handleConversationUpdate = useCallback((conversation: any) => {
    // Handle conversation update
  }, []);

  const handleStreamingError = useCallback(
    (error: any) => {
      toast({
        title: "处理失败",
        description: error?.message || "处理过程中发生错误，请稍后重试",
        variant: "destructive",
      });
    },
    [toast],
  );

  const {
    conversations: streamingConversations,
    isStreaming,
    sendMessage,
    cancelCurrentProcessing,
  } = useStreamingConversation({
    contentId: stableStreamingContentId,
    scene, // 🎯 传递场景参数实现缓存隔离，解决状态串扰问题
    onConversationUpdate: handleConversationUpdate,
    onError: handleStreamingError,
  });

  const { historyRecords, isLoadingHistory, refreshHistory, addHistoryRecord } = useConversationHistory({
    contentId: stableStreamingContentId, // 使用与streaming相同的contentId确保一致性
    scene, // 🎯 传递场景参数实现缓存隔离
  });

  // Performance optimization: Remove debug logging

  useEffect(() => {
    if (variant === "preview") {
      return;
    }
  }, [pathname, variant]);

  useEffect(() => {
    return () => {
      // Cleanup
    };
  }, [cancelCurrentProcessing]);

  // 🎯 智能滚动：仅在有新消息且用户未主动滚动时才滚动到底部
  useEffect(() => {
    // 🚨 Preview模式下禁用此滚动逻辑，避免冲突
    if (variant === "preview" || streamingConversations.length === 0) {
      return;
    }
    
    // 使用智能滚动策略
    const scenario = {
      variant: (variant || "preview") as "preview" | "sidebar" | "fullscreen",
      scene: "reader" as const,
      contentChanged: false,
      userHasScrolled: scrollManager.userHasScrolled,
      hasNewContent: true, // 有新的AI回复内容
    };

    scrollManager.smartScroll(scrollContainerRef, scenario);
  }, [streamingConversations, scrollManager, variant]);

  // 🎯 监听用户滚动事件 - Preview模式下禁用，避免双重监听
  useEffect(() => {
    // 🚨 Preview模式下滚动由外层 ContentAnalysisView 统一管理
    if (variant === "preview") {
      return;
    }
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = (event: Event) => {
      scrollManager.handleScroll(event);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [scrollManager, variant]);

  const aiStatusInfo = useMemo(() => {
    const hasConversations = streamingConversations.length > 0;
    return {
      status: isStreaming ? "processing" : hasConversations ? "completed" : "idle",
      hasConversations,
    };
  }, [streamingConversations.length, isStreaming]);

  useEffect(() => {
    onStatusChange?.(aiStatusInfo.status as any, aiStatusInfo.hasConversations);
  }, [aiStatusInfo.status, aiStatusInfo.hasConversations, onStatusChange]);

  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const data = await fetchPrompts({
          user_enabled: true, // 只获取用户启用的 prompts
          sort: "updated_at",
          order: "desc"
        });
        
        // 检查返回的数据是否是错误对象
        if (Array.isArray(data)) {
          setPrompts(data as PromptData[]);
        } else if (data && 'error' in data) {
          console.error("Failed to load prompts:", data.error);
          setPrompts([]);
        } else {
          console.error("Unexpected prompts data format:", data);
          setPrompts([]);
        }
      } catch (error) {
        console.error("Failed to load prompts:", error);
        setPrompts([]);
      } finally {
        setLoadingPrompts(false);
      }
    };

    if (!previewOptimizations.disablePromptLoading) {
      loadPrompts();
    } else {
      setLoadingPrompts(false);
    }
  }, [previewOptimizations.disablePromptLoading]);

  useEffect(() => {
    onHistoryCountChange?.(historyRecords.length);
  }, [historyRecords.length, onHistoryCountChange]);

  useEffect(() => {
    if (previewOptimizations.reduceEventListeners) {
      return;
    }
  }, [previewOptimizations.reduceEventListeners]);

  useEffect(() => {
    if (previewOptimizations.reduceEventListeners) {
      return;
    }
  }, [previewOptimizations.reduceEventListeners]);

  const handlePromptClick = useCallback(
    async (prompt: PromptData) => {
      try {
        // 替换prompt模板中的变量
        let promptContent = prompt.content;
        if (promptContent.includes("{content}")) {
          promptContent = promptContent.replace(
            "{content}",
            content.content_text || content.title || "内容",
          );
        }

        // 使用流式对话发送消息
        await sendMessage(
          promptContent,
          prompt.name, // 这是promptTemplate参数
          {
            promptName: prompt.name,
            promptId: prompt.id,
            isPromptBased: true,
            originalUserInput: `使用模板：${prompt.name}`,
            actualPromptContent: promptContent,
          }
        );

        console.log("Prompt clicked and message sent:", {
          promptName: prompt.name,
          content: promptContent.substring(0, 100) + "..."
        });
      } catch (error) {
        console.error("Prompt click error:", error);
      }
    },
    [content, sendMessage],
  );

  const handleHistoryClick = useCallback(
    async (conversation: ConversationPublic) => {
      try {
        const historyContent = conversation.summary
          ? `继续关于"${conversation.title}"的对话：${conversation.summary}`
          : `继续关于"${conversation.title}"的对话`;

        // 发送历史对话相关的消息
        await sendMessage(
          historyContent,
          undefined, // 没有模板
          {
            isHistoryBased: true,
            conversationId: conversation.id,
            originalUserInput: historyContent,
          }
        );

        console.log("History conversation continued:", conversation.title);
      } catch (error) {
        console.error("History click error:", error);
      }
    },
    [sendMessage],
  );

  const handleAnalysis = useCallback(
    async (inputText: string) => {
      try {
        if (!inputText.trim()) return;

        // 使用流式对话发送用户输入的消息
        await sendMessage(
          inputText.trim(),
          undefined, // 没有模板
          {
            isPromptBased: false,
            originalUserInput: inputText.trim(),
          }
        );

        console.log("User message sent:", inputText.trim());
      } catch (error) {
        console.error("Analysis error:", error);
      }
    },
    [sendMessage],
  );

  const handleJsonLineExpand = useCallback(
    async (jsonContent: Record<string, unknown>) => {
      // Handle JSON line expand
    },
    [],
  );

  const stableAnalysisResult = useMemo(() => analysisResult, [analysisResult]);
  const stableMetaInfo = useMemo(
    () => (content?.meta_info ? JSON.parse(content.meta_info) : null),
    [content?.meta_info],
  );

  const buildAnalysisCards = useCallback((): AnalysisCard[] => {
    if (
      !stableAnalysisResult &&
      !streamingConversations.length &&
      (!conversations || conversations.length === 0)
    )
      return [];

    const cards: AnalysisCard[] = [];
    const adaptedData = adaptAnalysisData(stableAnalysisResult, stableMetaInfo);

    // 只有在显示预处理内容时才添加这些卡片
    if (showPreprocessedContent) {
      // 内容摘要卡片
      if (adaptedData.summary) {
        cards.push({
          id: `summary-${content.id}`,
          title: "内容摘要",
          subtitle: "",
          emoji: "📄",
          content: {
            type: "summary",
            data: adaptedData.summary,
          },
        });
      }

      // 关键要点卡片
      if (adaptedData.keyPoints) {
        cards.push({
          id: `keyPoints-${content.id}`,
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

    // 历史对话卡片 - 每个对话作为独立卡片显示
    if (conversations && conversations.length > 0) {
      const conversationsWithMessages = conversations.filter(
        (conv) => conv.messages && conv.messages.length > 0,
      );

      // 为每个历史对话创建独立卡片 
      conversationsWithMessages.forEach((conversation, index) => {
        const userMessages =
          conversation.messages?.filter((msg: any) => msg.role !== "system") ||
          [];
        const messageCount = userMessages.length;

        // 获取对话标题 - 优化标题显示逻辑
        const getConversationTitle = () => {
          if (conversation.title && !conversation.title.startsWith("AI分析:")) {
            return conversation.title;
          }
          
          if (conversation.messages && conversation.messages.length > 0) {
            // 查找第一条用户消息作为标题
            const firstUserMessage = conversation.messages.find(
              (msg: any) => msg.role === "user" && msg.content
            );
            if (firstUserMessage?.content) {
              const content = String(firstUserMessage.content);
              // 检查是否是prompt模板调用
              const metadata = firstUserMessage.metadata || {};
              if (metadata.isPromptBased && metadata.promptName) {
                return metadata.promptName;
              }
              // 使用原始用户输入作为标题
              if (metadata.originalUserInput) {
                const originalInput = String(metadata.originalUserInput);
                if (originalInput.startsWith("使用模板：")) {
                  return originalInput.replace("使用模板：", "");
                }
                return originalInput.length > 30 ? `${originalInput.substring(0, 30)}...` : originalInput;
              }
              return content.length > 30 ? `${content.substring(0, 30)}...` : content;
            }
          }
          
          return "AI回复";
        };
        
        const conversationTitle = getConversationTitle();

        cards.push({
          id: `conversation-${conversation.id}`,
          title: conversationTitle,
          subtitle: "AI分析结果",
          emoji: "🤖",
          content: {
            type: "custom",
            data: conversation,
          },
        });
      });
    }

    // 流式对话卡片
    if (streamingConversations.length > 0) {
      streamingConversations.forEach((conversation, index) => {
        // 获取流式对话标题 - 优化标题显示逻辑
        const getStreamingTitle = () => {
          if (conversation.title && !conversation.title.startsWith("AI分析:")) {
            return conversation.title;
          }
          
          if (conversation.messages && conversation.messages.length > 0) {
            // 查找第一条用户消息作为标题
            const firstUserMessage = conversation.messages.find(
              (msg: any) => msg.role === "user" && msg.content
            );
            if (firstUserMessage?.content) {
              const content = String(firstUserMessage.content);
              // 检查是否是prompt模板调用
              const metadata = firstUserMessage.metadata || {};
              if (metadata.isPromptBased && metadata.promptName) {
                return metadata.promptName;
              }
              // 使用原始用户输入作为标题
              if (metadata.originalUserInput) {
                const originalInput = String(metadata.originalUserInput);
                if (originalInput.startsWith("使用模板：")) {
                  return originalInput.replace("使用模板：", "");
                }
                return originalInput.length > 30 ? `${originalInput.substring(0, 30)}...` : originalInput;
              }
              return content.length > 30 ? `${content.substring(0, 30)}...` : content;
            }
          }
          
          return "AI回复";
        };

        cards.push({
          id: `streaming-${conversation.id}-${index}`,
          title: getStreamingTitle(),
          subtitle: isStreaming ? "正在生成回复..." : "AI分析结果",
          emoji: "🤖",
          content: {
            type: "custom",
            data: conversation,
          },
        });
      });
    }

    return cards;
  }, [
    stableAnalysisResult,
    stableMetaInfo,
    content.id,
    streamingConversations,
    isStreaming,
    showPreprocessedContent,
    conversations,
  ]);

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

  const containerClasses = useMemo(() => {
    const baseClasses = "flex flex-col";
    const heightClass = height === "fixed" ? "h-80" : "h-full";
    return `${baseClasses} ${heightClass} ${className}`.trim();
  }, [height, className]);

  const scrollAreaClasses = useMemo(() => {
    // 🚨 Preview模式下移除内层滚动，让外层 ContentAnalysisView 统一管理
    if (variant === "preview") {
      return "flex-1"; // 移除 overflow-y-auto，禁用内层滚动
    }
    
    const baseClasses = "flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-300";
    return baseClasses;
  }, [variant]);

  const scrollContainerStyle = useMemo(
    () => ({
      contain: "layout style paint" as const,
    }),
    [],
  );

  const headerClasses = useMemo(() => {
    const baseClasses = "px-6 py-4";
    return baseClasses;
  }, []);

  // 早期返回检查 - 防制content为空导致的错误
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">加载内容中...</p>
        </div>
      </div>
    );
  }

  // 构建分析卡片
  const cards = buildAnalysisCards();

  // 主内容渲染
  return (
    <div className={containerClasses} data-exclude-selection>
      {/* 可滚动的主内容区域 */}
      <div
        ref={scrollContainerRef}
        className={scrollAreaClasses}
        style={scrollContainerStyle}
      >
        {/* 页面标题 - 根据配置条件渲染 */}
        {!hideHeader && (
          <div className={headerClasses} data-exclude-selection>
            <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
              {content.title || "内容分析"}
            </h1>
          </div>
        )}

        {/* 卡片列表 */}
        <div className="px-8 pt-4 pb-6">
          <div
            className={`space-y-6 ${
              variant === "preview" ? "max-w-2xl mx-auto" : ""
            }`}
          >
            {cards.length > 0 ? (
              <AnalysisCardsContainer
                cards={cards}
                content={content}
                collapsedCards={collapsedCards}
                onToggleCardCollapse={toggleCardCollapse}
                onExpandLine={handleJsonLineExpand}
                selectedBlock={selectedBlock}
                isAnalyzing={false}
                variant={variant}
              />
            ) : (
              <div className="flex items-center justify-center p-8 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50/30 dark:bg-neutral-900/30">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 text-neutral-400 mx-auto" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    暂无分析结果，使用下方AI助手开始分析
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 固定底部AI助手 - Preview模式下由外层管理 */}
      {variant !== "preview" && (
        <div
          className="flex-shrink-0 backdrop-blur-md border-t linear-bg-1 border-border dark:border-neutral-800"
          data-exclude-selection
        >
          <div className="px-6 py-3">
            <AIAssistantPanel
              onAnalysis={handleAnalysis}
              showHistory={showHistory}
              historyRecords={historyRecords}
              loadingHistory={isLoadingHistory}
              onHistoryClick={handleHistoryClick}
              prompts={prompts}
              loadingPrompts={loadingPrompts}
              onPromptClick={handlePromptClick}
              variant={variant}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export { EnhancedModernAnalysisInterface };

