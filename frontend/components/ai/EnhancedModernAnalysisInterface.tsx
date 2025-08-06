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

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      });
    }
  }, []);

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
    onConversationUpdate: handleConversationUpdate,
    onError: handleStreamingError,
  });

  const { historyRecords, refreshHistory, addHistoryRecord } = useConversationHistory({
    contentId: uiStateStorageId,
    disabled: previewOptimizations.disableHistoryLoading,
  });

  // Effects
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
      },
    );

    prevProps.current = currentProps;
  });

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

  useEffect(() => {
    if (streamingConversations.length > 0) {
      scrollToBottom();
    }
  }, [streamingConversations, scrollToBottom]);

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
        const data = await fetchPrompts();
        setPrompts(data);
      } catch (error) {
        console.error("Failed to load prompts:", error);
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
        // Handle prompt click
      } catch (error) {
        console.error("Prompt click error:", error);
      }
    },
    [],
  );

  const handleHistoryClick = useCallback((conversation: ConversationPublic) => {
    // Handle history click
  }, []);

  const handleAnalysis = useCallback(
    async (inputText: string) => {
      try {
        // Handle analysis
      } catch (error) {
        console.error("Analysis error:", error);
      }
    },
    [],
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
    if (!stableAnalysisResult) return [];
    return [];
  }, [stableAnalysisResult]);

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
    const baseClasses = "flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-300";
    return baseClasses;
  }, []);

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

  // Simple return for now to fix hooks issues
  return (
    <div className={containerClasses}>
      <div className="text-center p-4">
        <p>Component temporarily simplified to fix React hooks issues</p>
        <AIAssistantPanel
          onAnalysis={handleAnalysis}
          showHistory={showHistory}
          historyRecords={historyRecords}
          prompts={prompts}
          loadingPrompts={loadingPrompts}
          onPromptClick={handlePromptClick}
          variant={variant}
        />
      </div>
    </div>
  );
};

export { EnhancedModernAnalysisInterface };

