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
}) => {
  const { toast } = useToast();
  const { t } = useI18nSafe();
  const pathname = usePathname(); // 🎯 获取当前路由

  // 🔍 渲染追踪日志 - 分析重新渲染原因
  const renderCount = React.useRef(0);
  const prevProps = React.useRef<any>({});

  renderCount.current += 1;

  React.useEffect(() => {
    const currentProps = {
      contentId: content?.id,
      variant,
      isLoading,
      conversationsLength: conversations?.length || 0,
      hasAnalysisResult: !!analysisResult,
      sharedContentId,
      sceneSpecificId,
      pathname,
    };

    const changes = Object.keys(currentProps).filter(
      (key) => prevProps.current[key] !== currentProps[key],
    );

    console.log(
      `📊 EnhancedModernAnalysisInterface [${variant}] render #${renderCount.current}:`,
      {
        ...currentProps,
        changes: changes.length > 0 ? changes : "no prop changes",
        timestamp: new Date().toISOString().split("T")[1],
        stack: new Error().stack
          ?.split("\n")
          .slice(2, 5)
          .map((line) => line.replace(/^\s+at\s+/, "").split("(")[0]),
      },
    );

    prevProps.current = currentProps;
  });

  // 早期返回检查 - 防止 content 为空导致的错误
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

  // 内存优化：preview模式下优化性能，但保留核心交互功能
  const isPreviewMode = variant === "preview";

  // 模式优化配置（使用useMemo避免对象重新创建）
  const previewOptimizations = useMemo(
    () => ({
      disableStreamingConversations: false, // 🎯 保留流式对话功能
      disablePromptLoading: false, // 🎯 保留prompt加载功能
      disableHistoryLoading: isPreviewMode, // 预览模式可以禁用历史记录以提升性能
      reduceEventListeners: isPreviewMode, // 减少事件监听器
      disableInteraction: false, // 🎯 保留所有交互功能
      optimizeRendering: isPreviewMode, // 🎯 预览模式优化渲染
      // 🚨 临时禁用卡片高度管理以解决无限循环问题
      disableCardHeight: variant === "sidebar" || isPreviewMode,
    }),
    [isPreviewMode, variant],
  );

  // 🎯 状态下沉完成：移除inputValue状态，由AIAssistantPanel内部管理
  // inputValue 和 setInputValue 已移动到 AIAssistantPanel 内部
  const showHistory = showHistoryProp;
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true); // 🎯 所有模式都支持prompt加载

  // 🎯 状态下沉后的文本设置机制
  const inputPanelRef = useRef<{ setText: (text: string) => void }>(null);

  // 🎯 重新设计：区分API调用、共享状态存储和场景特定存储
  const originalContentId = useMemo(() => {
    // API调用始终使用原始的content.id
    return content?.id || "";
  }, [content?.id]);

  const aiAnalysisStorageId = useMemo(() => {
    // AI分析状态：跨场景共享，让用户在Preview和Reader看到一致的结果
    return sharedContentId || content?.id || "";
  }, [sharedContentId, content?.id]);

  const uiStateStorageId = useMemo(() => {
    // UI状态：场景隔离，避免不同使用场景的UI冲突
    return sceneSpecificId || content?.id || "";
  }, [sceneSpecificId, content?.id]);

  // 🎯 重新设计：AI分析历史跨场景共享
  const {
    historyRecords,
    isLoadingHistory: loadingHistory,
    refreshHistory,
    addHistoryRecord,
  } = useConversationHistory({
    contentId: originalContentId, // API调用使用原始ID
    storageId: aiAnalysisStorageId, // AI分析历史：跨场景共享
    onError: (error) => {
      if (!previewOptimizations.disableHistoryLoading) {
        console.error("历史记录加载失败:", error);
        toast({
          title: "加载失败",
          description: error,
          variant: "destructive",
        });
      }
    },
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

  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(
    getInitialCollapsedCards,
  );

  // 🎯 添加滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 🎯 优化滚动处理，添加节流
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  }, []);

  // 🎯 重新设计：流式对话AI分析跨场景共享
  const stableStreamingContentId = useMemo(() => {
    // 🎯 流式对话AI分析：跨场景共享，确保用户体验一致性
    // 让用户在Preview和Reader页面看到相同的AI分析对话
    return aiAnalysisStorageId;
  }, [aiAnalysisStorageId]);

  // 稳定的回调函数，避免重新创建
  const handleConversationUpdate = useCallback((conversation: any) => {
    // 🎯 所有模式都处理对话更新
    // 可以在这里添加额外的处理逻辑
  }, []);

  const handleStreamingError = useCallback(
    (error: any) => {
      toast({
        title: "处理失败",
        description: error,
        variant: "destructive",
      });
    },
    [toast],
  );

  // 🎯 新的对话管理 - 使用分离的API调用ID和存储ID
  const {
    conversations: streamingConversations,
    sendMessage,
    retryMessage,
    deleteConversation,
    cancelCurrentProcessing,
  } = useStreamingConversation({
    contentId: originalContentId, // API调用使用原始UUID
    storageId: stableStreamingContentId, // 存储使用场景感知ID
    onConversationUpdate: handleConversationUpdate,
    onError: handleStreamingError,
  });

  // 🎯 监听路由变化，重置折叠状态 - 优化：避免Preview模式下的频繁重置
  useEffect(() => {
    // Preview模式下不需要根据路由变化重置折叠状态，避免闪烁
    if (variant === "preview") {
      return;
    }

    setCollapsedCards(getInitialCollapsedCards());
  }, [pathname, getInitialCollapsedCards, variant]);

  // 组件卸载时的清理机制
  useEffect(() => {
    return () => {
      // 🎯 所有模式都需要取消正在进行的请求
      cancelCurrentProcessing();
      // 清理定时器和事件监听器在各自的useEffect中已经处理
    };
  }, [cancelCurrentProcessing]);

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

  // 🎯 优化AI处理状态变化监听 - 使用memo避免重复计算
  const aiStatusInfo = useMemo(() => {
    const hasConversations = streamingConversations.length > 0;

    // 如果没有对话，直接返回idle状态
    if (!hasConversations) {
      return { status: "idle" as const, hasConversations: false };
    }

    // 使用标志位避免重复遍历
    let hasProcessing = false;
    let hasCompleted = false;

    // 单次遍历检查所有状态
    for (const conv of streamingConversations) {
      for (const msg of conv.messages) {
        if (msg.role === "assistant") {
          const status = msg.status;
          if (
            status === "pending" ||
            status === "thinking" ||
            status === "streaming"
          ) {
            hasProcessing = true;
            break; // 找到processing状态就可以跳出
          } else if (status === "completed") {
            hasCompleted = true;
          }
        }
      }

      // 如果已经找到processing状态，可以提前结束外层循环
      if (hasProcessing) break;
    }

    const status = hasProcessing
      ? "processing"
      : hasCompleted || hasConversations
        ? "completed"
        : "idle";

    return { status, hasConversations };
  }, [streamingConversations]);

  // 分离的effect用于通知状态变化，避免在memo计算中产生副作用
  useEffect(() => {
    onStatusChange?.(aiStatusInfo.status, aiStatusInfo.hasConversations);
  }, [aiStatusInfo.status, aiStatusInfo.hasConversations, onStatusChange]);

  // 获取prompts - 所有模式都支持
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
  }, []); // 🎯 只在组件挂载时加载一次

  // 监听历史记录数量变化
  useEffect(() => {
    onHistoryCountChange?.(historyRecords.length);
  }, [historyRecords.length, onHistoryCountChange]);

  // 监听来自正文区域的文本选择事件 - preview模式下禁用
  useEffect(() => {
    if (previewOptimizations.reduceEventListeners) {
      return; // preview模式下不添加事件监听器
    }

    const handleTextSelectionAction = (event: CustomEvent) => {
      const { action, selectedText } = event.detail;
      const prompt = `${action.prompt}\n\n${selectedText}`;
      inputPanelRef.current?.setText(prompt);
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
  }, [previewOptimizations.reduceEventListeners]);

  // 监听点击外部，清除选中的 JSONL 块 - preview模式下禁用
  useEffect(() => {
    if (previewOptimizations.reduceEventListeners) {
      return; // preview模式下不添加事件监听器
    }

    const handleClickOutside = (event: MouseEvent) => {
      // 如果点击的不是可选择的文本区域，清除选择
      const target = event.target as HTMLElement;
      if (
        !target.closest(".select-text") &&
        !target.closest(".jsonl-line-hover")
      ) {
        setSelectedBlock(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [previewOptimizations.reduceEventListeners]);

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
            content.content_text || content.title || "内容",
          );
        }

        console.log("📝 处理后的 prompt 内容:", {
          originalContent: prompt.content,
          processedContent: promptContent,
          promptName: prompt.name,
        });

        // 🎯 修复：用户消息显示prompt名称，但实际发送的是完整内容
        await sendMessage(prompt.name, "simple_chat.j2", {
          promptName: prompt.name,
          promptId: prompt.id,
          originalUserInput: prompt.name, // 用户界面显示的简洁内容
          actualPromptContent: promptContent, // 实际发送给AI的完整prompt内容
        });

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
    [content, sendMessage, toast],
  );

  // 处理历史记录点击 - 状态下沉后通过ref设置输入值
  const handleHistoryClick = useCallback((conversation: ConversationPublic) => {
    let text: string;
    if (conversation.summary) {
      text = `继续关于"${conversation.title}"的对话：${conversation.summary}`;
    } else {
      text = `继续关于"${conversation.title}"的对话`;
    }
    inputPanelRef.current?.setText(text);
  }, []);

  // 处理手动输入的分析 - 状态下沉后通过参数接收输入值
  const handleAnalysis = useCallback(
    async (inputText: string) => {
      try {
        console.log("🔘 手动输入分析事件");
        if (!inputText.trim()) {
          console.warn("⚠️ 输入值为空，跳过分析");
          return;
        }

        console.log("📝 手动输入内容:", inputText);

        await sendMessage(inputText, "simple_chat.j2", {
          type: "manual_input",
          originalUserInput: inputText, // 手动输入直接显示用户输入的内容
        });

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
    },
    [sendMessage, toast],
  );

  // 处理JSON行展开请求
  const handleJsonLineExpand = useCallback(
    async (jsonContent: Record<string, unknown>) => {
      console.log(
        "[EnhancedModernAnalysisInterface] JSON line expand requested:",
        jsonContent,
      );

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
    [sendMessage, toast],
  );

  // 构建分析卡片数据 - 优化依赖项稳定性
  const stableAnalysisResult = useMemo(() => analysisResult, [analysisResult]);
  const stableMetaInfo = useMemo(
    () => (content.meta_info ? JSON.parse(content.meta_info) : null),
    [content.meta_info],
  );

  const buildAnalysisCards = useCallback((): AnalysisCard[] => {
    if (!stableAnalysisResult) return [];

    const cards: AnalysisCard[] = [];
    const adaptedData = adaptAnalysisData(stableAnalysisResult, stableMetaInfo);

    // 只有在显示预处理内容时才添加这些卡片
    if (showPreprocessedContent) {
      // 内容摘要卡片
      if (adaptedData.summary) {
        cards.push({
          id: "summary",
          title: t("analysis.contentSummary"),
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
          title: t("analysis.questionList"),
          subtitle: "",
          emoji: "🤔",
          content: {
            type: "keyPoints",
            data: adaptedData.keyPoints,
          },
        });
      }
    }

    return cards;
  }, [
    stableAnalysisResult,
    stableMetaInfo,
    showPreprocessedContent,
    t, // 添加 t 函数依赖，确保完整性
  ]);

  const cards = buildAnalysisCards();

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

  // 根据变体计算样式 - 使用useMemo避免重复计算
  const containerClasses = useMemo(() => {
    const baseClasses = "flex flex-col";
    const heightClass = height === "fixed" ? "h-80" : "h-full";
    const previewClass = variant === "preview" ? "linear-bg-1" : "";

    return `${baseClasses} ${heightClass} ${previewClass} ${className}`.trim();
  }, [variant, height, className]);

  const scrollAreaClasses = useMemo(() => {
    const baseClasses =
      "flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-300 hover:scrollbar-thumb-neutral-400 dark:scrollbar-thumb-neutral-600 dark:hover:scrollbar-thumb-neutral-500";
    const previewBg =
      variant === "preview" ? "bg-[var(--color-linear-bg-1)]" : "";

    return `${baseClasses} ${previewBg}`.trim();
  }, [variant]);

  // 稳定的内联样式，避免对象重新创建
  const scrollContainerStyle = useMemo(
    () => ({
      contain: "layout style paint" as const,
      overscrollBehavior: "contain" as const,
      // 移除willChange以避免与其他变化冲突
    }),
    [],
  );

  // 稳定的标题样式
  const headerClasses = useMemo(() => {
    const baseClasses = "px-6 py-4";
    const previewBg =
      variant === "preview" ? "bg-[var(--color-linear-bg-1)]" : "";

    return `${baseClasses} ${previewBg}`.trim();
  }, [variant]);

  return (
    <div className={containerClasses} data-exclude-selection>
      {/* 可滚动的主内容区域 - 优化滚动性能 */}
      <div
        className={scrollAreaClasses}
        data-exclude-selection
        ref={scrollContainerRef}
        style={scrollContainerStyle}
      >
        {/* 页面标题 */}
        {!hideHeader && (
          <div className={headerClasses} data-exclude-selection>
            <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
              {content.title || "内容分析"}
            </h1>
          </div>
        )}

        {/* 原有的分析卡片 - 使用新的容器组件 */}
        <div className="px-8 pt-4 pb-2" data-exclude-selection>
          <AnalysisCardsContainer
            cards={cards}
            content={content}
            variant={variant}
            onExpandLine={handleJsonLineExpand}
            collapsedCards={collapsedCards}
            onToggleCardCollapse={toggleCardCollapse}
            selectedBlock={selectedBlock}
            onBlockSelect={setSelectedBlock}
            hasActiveConversations={streamingConversations.length > 0}
          />
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
                contentId={content?.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 固定底部AI助手 - 状态下沉后的新接口 */}
      <AIAssistantPanel
        ref={inputPanelRef}
        onAnalysis={handleAnalysis}
        onTextSelection={undefined} // 这里用ref方式处理
        showHistory={showHistory}
        historyRecords={historyRecords}
        loadingHistory={loadingHistory}
        onHistoryClick={handleHistoryClick}
        prompts={prompts}
        loadingPrompts={loadingPrompts}
        onPromptClick={handlePromptClick}
        variant={variant}
      />
    </div>
  );
};

export { EnhancedModernAnalysisInterface };
