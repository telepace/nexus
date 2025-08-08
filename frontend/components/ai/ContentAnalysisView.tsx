"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useMemoryManager, useSmartState } from "@/lib/utils/memory-manager";
import { Library, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnhancedModernAnalysisInterface } from "./EnhancedModernAnalysisInterface";
import { StaticPreviewInterface } from "./StaticPreviewInterface";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";
import { useI18nSafe } from "@/lib/i18n-fallback";
import type { ContentItemPublic } from "@/lib/api/content";
import { AIResult, ConversationListResponse } from "@/lib/api/content";
import {
  contentDataManager,
  ContentData,
} from "@/lib/services/content-data-manager";
import { useAuth } from "@/lib/client-auth";
import { useScrollManager } from "@/hooks/useScrollManager";
import { fetchPrompts, PromptData } from "@/components/actions/prompts-action";
import { useStreamingConversation } from "@/hooks/use-streaming-conversation";
import { useConversationHistory } from "@/hooks/use-conversation-history";
import { useToast } from "@/hooks/use-toast";

/**
 * 分析场景类型定义
 *
 * 🎯 核心问题解决：不同使用场景需要独立的状态空间
 *
 * - preview: 内容库预览面板 (/content-library)
 *   特点：快速切换，轻量级展示，需要独立状态避免串扰
 *
 * - reader: 阅读器页面 (/content-library/reader/[id])
 *   特点：完整功能，长时间使用，需要持久化状态
 *
 * - standalone: 独立测试页面或其他场景
 *   特点：隔离环境，不与其他场景共享状态
 */
export type AnalysisScene = "preview" | "reader" | "standalone";

export interface ContentAnalysisViewProps {
  /** 内容项 */
  item: ContentItemPublic | null;
  /** 对话历史 */
  conversations?: ConversationListResponse["conversations"];
  /** AI分析结果 */
  analysisResult?: AIResult | null;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 显示模式 */
  variant?: "preview" | "sidebar" | "fullscreen";
  /**
   * 🎯 新增：分析场景标识
   * 用于创建独立的状态空间，解决不同场景间的状态串扰问题
   */
  scene?: AnalysisScene;
  /** 是否隐藏头部 */
  hideHeader?: boolean;
  /** 头部标题 */
  headerTitle?: string;
  /** 空状态提示文本 */
  emptyStateText?: string;
  /** 历史记录数量变化回调 */
  onHistoryCountChange?: (count: number) => void;
  /** 是否显示历史面板 */
  showHistory?: boolean;
  /** 无缝模式 - 隐藏边框和标题，用于右侧预览 */
  seamless?: boolean;
  /** 是否显示头部边框 */
  showHeaderBorder?: boolean;
  /** 是否显示头部标题 */
  showHeaderTitle?: boolean;
}

export const ContentAnalysisView: React.FC<ContentAnalysisViewProps> = ({
  item,
  conversations: externalConversations = [],
  analysisResult: externalAnalysisResult = null,
  isLoading = false,
  className = "",
  variant = "preview",
  scene: explicitScene,
  hideHeader = false,
  headerTitle,
  emptyStateText,
  onHistoryCountChange,
  showHistory: externalShowHistory,
  seamless = false,
  showHeaderBorder = true,
  showHeaderTitle = true,
}) => {
  const { t } = useI18nSafe();
  const memoryManager = useMemoryManager();

  // Performance optimization: Remove debug logging

  // 🎯 场景自动检测和状态隔离逻辑
  const currentScene = useMemo((): AnalysisScene => {
    // 优先使用显式指定的场景
    if (explicitScene) {
      return explicitScene;
    }

    // 根据当前环境自动检测场景
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;

      if (pathname.includes("/content-library/reader/")) {
        return "reader";
      } else if (pathname.includes("/content-library")) {
        return "preview";
      }
    }

    // 默认为独立场景
    return "standalone";
  }, [explicitScene]);

  // 🎯 重新设计：AI分析状态基于内容共享，UI状态可以场景隔离
  // 解决用户期望：同一文章的AI分析在Preview和Reader页面应该一致
  const sharedContentId = useMemo(() => {
    // AI分析状态跨场景共享，确保用户体验一致性
    return item?.id || null;
  }, [item?.id]);

  const sceneSpecificId = useMemo(() => {
    // UI状态（如卡片折叠状态）可以场景隔离
    if (!item?.id) return null;
    return `${currentScene}_${item.id}`;
  }, [currentScene, item?.id]);

  // 使用翻译的默认值
  const defaultHeaderTitle = headerTitle || t("analysis.contentAnalysis");
  const defaultEmptyStateText =
    emptyStateText || t("analysis.selectContentForPreview");

  // 智能状态管理 - 减少不必要的重渲染
  const [currentItem, setCurrentItem] = useSmartState<ContentItemPublic | null>(
    item,
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [internalShowHistory, setInternalShowHistory] = useState(false);
  const [aiStatus, setAiStatus] = useSmartState<
    "idle" | "processing" | "completed"
  >("idle");
  const [hasAnyConversations, setHasAnyConversations] = useState(false);

  // 内部数据获取状态
  const [internalAnalysisResult, setInternalAnalysisResult] =
    useSmartState<AIResult | null>(null);
  const [internalConversations, setInternalConversations] = useSmartState<
    ConversationListResponse["conversations"]
  >([]);
  const [dataLoading, setDataLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // 🎯 新增：统一滚动管理
  const scrollManager = useScrollManager({
    enableUserIntentDetection: true,
    debug: process.env.NODE_ENV === "development",
  });

  // 🎯 Preview模式下的AI助手面板所需状态
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [promptsRefreshKey, setPromptsRefreshKey] = useState(0);

  // AI聊天相关hooks（仅Preview模式）
  const stableContentId = useMemo(() => {
    return sharedContentId || item?.id || "";
  }, [sharedContentId, item?.id]);

  // 🎯 AI聊天相关hooks - 总是调用但只在Preview模式下使用结果
  const {
    conversations: streamingConversations,
    isStreaming,
    sendMessage,
    cancelCurrentProcessing,
  } = useStreamingConversation({
    contentId: stableContentId,
    scene: currentScene,
    onConversationUpdate: () => {},
    onError: (error: any) => {
      if (variant === "preview") {
        toast({
          title: "处理失败",
          description: error?.message || "处理过程中发生错误，请稍后重试",
          variant: "destructive",
        });
      }
    },
  });

  const { historyRecords, isLoadingHistory } = useConversationHistory({
    contentId: stableContentId,
    scene: currentScene,
  });

  // 🎯 加载AI提示词
  useEffect(() => {
    if (variant !== "preview") return;
    
    async function loadPrompts() {
      try {
        setLoadingPrompts(true);
        const promptsData = await fetchPrompts();
        
        // 🚨 修复：正确处理fetchPrompts的返回类型
        if (Array.isArray(promptsData)) {
          // 如果返回的是数组，直接使用
          setPrompts(promptsData);
          console.log("🎯 成功加载prompts数据:", promptsData.length, "个");
          console.log("🎯 Prompts详情:", promptsData.map(p => ({ id: p.id, name: p.name })));
        } else {
          // 如果返回的是错误对象，记录错误并使用空数组
          console.error("🚨 fetchPrompts返回错误对象:", promptsData);
          setPrompts([]);
          
          // 开发模式fallback已移除 - API连接正常
        }
      } catch (error) {
        console.error("🚨 加载提示词失败:", error);
        setPrompts([]);
      } finally {
        setLoadingPrompts(false);
      }
    }

    loadPrompts();
  }, [variant, promptsRefreshKey]);

  // 🎯 AI助手面板处理函数
  const handleAnalysis = useCallback(async (inputValue: string) => {
    if (variant !== "preview" || !currentItem?.id || !sendMessage) return;
    
    try {
      await sendMessage(inputValue);
    } catch (error) {
      console.error("发送消息失败:", error);
    }
  }, [variant, currentItem?.id, sendMessage]);

  const handlePromptClick = useCallback((prompt: PromptData) => {
    if (variant !== "preview") return;
    
    if (prompt.content) {
      handleAnalysis(prompt.content);
    }
  }, [variant, handleAnalysis]);

  const handleHistoryClick = useCallback((conversation: any) => {
    if (variant !== "preview") return;
    
    // 处理历史记录点击 - 可以根据需要实现
    console.log("点击历史记录:", conversation);
  }, [variant]);

  // 🛠️ 开发模式：手动刷新prompts
  const handleRefreshPrompts = useCallback(() => {
    console.log("🔄 手动刷新prompts数据");
    setPromptsRefreshKey(prev => prev + 1);
  }, []);

  // 是否使用外部历史面板控制
  const showHistory =
    externalShowHistory !== undefined
      ? externalShowHistory
      : internalShowHistory;

  // 无缝模式下的样式控制
  const finalHideHeader = hideHeader || seamless;
  const finalShowHeaderBorder = showHeaderBorder && !seamless;
  const finalShowHeaderTitle = showHeaderTitle && !seamless;

  // 🎯 内容切换逻辑 - 确保状态完全隔离，但移除视觉过渡避免闪烁
  useEffect(() => {
    if (item?.id === currentItem?.id) {
      return;
    }

    // 🎯 修复闪烁：直接切换状态，不使用过渡动画
    setInternalAnalysisResult(null);
    setInternalConversations([]);
    setAiStatus("idle");
    setHasAnyConversations(false);
    setHistoryCount(0);
    setCurrentItem(item);

    // 🎯 减少过渡时间，避免用户察觉到闪烁
    setIsTransitioning(true);
    const timer = memoryManager.setTimeout(() => {
      setIsTransitioning(false);
    }, 50); // 从200ms减少到50ms

    return () => memoryManager.clearTimeout(timer);
  }, [
    item,
    setCurrentItem,
    currentItem?.id,
    memoryManager,
    setInternalAnalysisResult,
    setInternalConversations,
    setAiStatus,
  ]);

  // 优化的数据获取逻辑 - 使用智能数据管理器，避免重复请求导致闪烁
  useEffect(() => {
    let isMounted = true;

    async function fetchMissingData() {
      if (!currentItem?.id || !user?.token || !isMounted) return;

      // 如果外部已经提供了完整数据，不需要重新获取
      const hasExternalAnalysis = externalAnalysisResult !== null;
      const hasExternalConversations = externalConversations.length > 0;

      // 🎯 Preview模式优化：如果已有外部数据，直接使用，避免重复请求
      if (variant === "preview" && hasExternalAnalysis) {
        return;
      }

      if (
        hasExternalAnalysis &&
        (variant === "preview" || hasExternalConversations)
      ) {
        return;
      }

      try {
        // 🎯 Preview模式不显示内部loading状态，避免闪烁
        if (variant !== "preview") {
          setDataLoading(true);
        }

        // 使用智能数据管理器获取数据
        const data =
          variant === "preview"
            ? await contentDataManager.getPreviewData(currentItem.id)
            : await contentDataManager.getFullData(currentItem.id);

        if (!isMounted || !data) return;

        // 只设置缺失的数据
        if (!hasExternalAnalysis) {
          setInternalAnalysisResult(data.analysisResult || null);
        }

        // 🎯 修复：Preview模式也需要对话历史以支持引用功能
        if (!hasExternalConversations) {
          setInternalConversations(data.conversations || []);
        }
      } catch (error) {
        console.error("获取分析数据失败:", error);
      } finally {
        if (isMounted && variant !== "preview") {
          setDataLoading(false);
        }
      }
    }

    // 🎯 Preview模式减少延迟，立即获取数据
    if (variant === "preview") {
      fetchMissingData();
    } else {
      // 其他模式保持轻微延迟
      const timer = setTimeout(fetchMissingData, 100);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [
    currentItem?.id,
    user?.token,
    externalAnalysisResult,
    externalConversations.length,
    variant,
    setInternalAnalysisResult,
    setInternalConversations,
  ]);

  // 🎯 重新设计：智能滚动管理 - 解决Preview模式滚动冲突
  const prevItemIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!containerRef.current || !currentItem) return;

    // 🚨 关键修复：检测真实的内容变化，而不是对象引用变化
    const hasRealContentChange = prevItemIdRef.current !== currentItem.id;
    
    // 更新引用
    prevItemIdRef.current = currentItem.id;
    
    // 🎯 只有真实内容变化时才可能滚动到顶部
    if (!hasRealContentChange) {
      // 相同内容，完全跳过滚动管理
      return;
    }

    // 内容变化时的滚动策略
    const scenario = {
      variant: variant as "preview" | "sidebar" | "fullscreen",
      scene: currentScene,
      contentChanged: hasRealContentChange,
      userHasScrolled: scrollManager.userHasScrolled,
      hasNewContent: false,
    };

    // 使用智能滚动管理器
    const timer = memoryManager.setTimeout(() => {
      scrollManager.smartScroll(containerRef, scenario);
    }, 50); // 减少延迟，提升响应性

    return () => memoryManager.clearTimeout(timer);
  }, [currentItem?.id, memoryManager, variant, currentScene, scrollManager]);

  // 🎯 新增：监听用户滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (event: Event) => {
      scrollManager.handleScroll(event);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [scrollManager]);

  // 🎯 内容切换时重置滚动意图 - 改为更智能的重置策略
  useEffect(() => {
    // 🚨 只有在真实内容切换时才重置滚动意图
    if (item?.id !== currentItem?.id && item?.id && currentItem?.id) {
      // 延迟重置，给用户时间完成当前滚动操作
      const resetTimer = setTimeout(() => {
        scrollManager.resetUserScrollIntent();
      }, 1000); // 1秒延迟，确保用户滚动操作完成
      
      return () => clearTimeout(resetTimer);
    }
  }, [item?.id, currentItem?.id, scrollManager]);

  // 监听AI状态变化 - 使用内存管理器
  useEffect(() => {
    const handleAIStatusUpdate = (event: CustomEvent) => {
      const { status, hasConversations } = event.detail;
      setAiStatus(status);
      if (hasConversations !== undefined) {
        setHasAnyConversations(hasConversations);
      }
    };

    const listenerId = memoryManager.addEventListener(
      window,
      "aiStatusUpdate",
      handleAIStatusUpdate as EventListener,
    );

    return () => {
      memoryManager.removeEventListener(listenerId);
    };
  }, [memoryManager, setAiStatus]);

  // 历史记录计数处理
  const handleHistoryCountChange = useCallback(
    (count: number) => {
      setHistoryCount(count);
      onHistoryCountChange?.(count);
    },
    [onHistoryCountChange],
  );

  // 切换历史面板（仅内部控制时）
  const toggleHistoryPanel = () => {
    if (externalShowHistory === undefined) {
      setInternalShowHistory((prev) => !prev);
    }
  };

  // 动态头部标题
  const getHeaderTitle = () => {
    if (headerTitle && headerTitle !== t("analysis.contentAnalysis")) {
      return headerTitle; // 使用自定义标题
    }

    if (aiStatus === "processing") {
      return "AI分析中";
    }
    if (aiStatus === "completed" || hasAnyConversations) {
      return "分析结果";
    }
    return variant === "preview" ? "内容预览" : "AI分析";
  };

  // 样式配置
  const containerClasses = useMemo(() => {
    const baseClasses = "flex flex-col h-full overflow-hidden";
    const variantClasses = {
      preview: seamless
        ? ""
        : "bg-gradient-to-br from-background via-background to-muted/20",
      sidebar: "linear-bg-1",
      fullscreen: "",
    };

    return `${baseClasses} ${variantClasses[variant]} ${className}`;
  }, [variant, className, seamless]);

  // 智能选择数据源：优先使用外部提供的数据，其次使用内部获取的数据
  const finalAnalysisResult = externalAnalysisResult || internalAnalysisResult;
  const finalConversations =
    externalConversations.length > 0
      ? externalConversations
      : internalConversations;
  const finalIsLoading = isLoading || dataLoading;

  // 🎯 分析界面Props - AI分析状态共享，UI状态场景隔离
  const analysisProps = useMemo(
    () => ({
      content: currentItem,
      conversations: finalConversations,
      analysisResult: finalAnalysisResult,
      isLoading: finalIsLoading,
      variant,
      hideHeader: true, // 由ContentAnalysisView统一管理头部
      onHistoryCountChange: handleHistoryCountChange,
      showHistory,
      sharedContentId, // 🎯 AI分析状态：跨场景共享
      sceneSpecificId, // 🎯 UI状态：场景隔离
      scene: currentScene, // 🎯 新增：传递场景信息用于缓存隔离
      onStatusChange: (status: string, hasConversations: boolean) => {
        window.dispatchEvent(
          new CustomEvent("aiStatusUpdate", {
            detail: { status, hasConversations },
          }),
        );
      },
    }),
    [
      currentItem,
      sharedContentId,
      sceneSpecificId,
      currentScene,
      finalConversations,
      finalAnalysisResult,
      finalIsLoading,
      variant,
      handleHistoryCountChange,
      showHistory,
    ],
  );

  // 空状态渲染
  if (!currentItem) {
    return (
      <ReferenceManagerProvider contentId={undefined}>
        <div className={`${containerClasses} flex flex-col h-full`}>
          {!finalHideHeader && (
            <div
              className={`flex items-center h-header px-4 flex-shrink-0 ${finalShowHeaderBorder ? "border-b" : ""}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Library className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                {finalShowHeaderTitle && (
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {getHeaderTitle()}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Library className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-muted-foreground">
                  {defaultEmptyStateText}
                </h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  在左侧列表中选择或悬停内容项目来查看详细信息
                </p>
              </div>
            </div>
          </div>
        </div>
      </ReferenceManagerProvider>
    );
  }

  // 主内容渲染
  return (
    <ReferenceManagerProvider contentId={currentItem?.id}>
      <div
        ref={containerRef}
        className={`${containerClasses} flex flex-col`} // 🎯 改为Flexbox布局
        style={{
          contain: "layout style paint",
          willChange: "auto",
          height: "100%", // 🎯 确保容器占满高度
        }}
        data-exclude-selection
      >
        {/* 统一头部 */}
        {!finalHideHeader && (
          <div
            className={`flex items-center justify-between h-header px-4 flex-shrink-0 ${finalShowHeaderBorder ? "border-b" : ""}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Library className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {finalShowHeaderTitle && (
                <span className="text-sm font-medium text-muted-foreground truncate">
                  {getHeaderTitle()}
                </span>
              )}
              {aiStatus === "processing" && finalShowHeaderTitle && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0 ml-1" />
              )}
            </div>

            {/* 历史面板切换按钮 */}
            <div className="flex items-center gap-2">
              {historyCount > 0 && externalShowHistory === undefined && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={toggleHistoryPanel}
                  title="切换历史记录"
                >
                  <MessageSquare className="h-4 w-4" />
                  <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                    {historyCount}
                  </div>
                </Button>
              )}
              
              {/* 🛠️ 开发模式：刷新prompts按钮 */}
              {process.env.NODE_ENV === "development" && variant === "preview" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleRefreshPrompts}
                  title="刷新Prompts数据 (开发模式)"
                  disabled={loadingPrompts}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPrompts ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 分析界面内容 - 独立区块，自动计算高度 */}
        <div
          className={`flex-1 relative min-h-0 ${
            variant === "preview" 
              ? "overflow-auto" // 🎯 移除padding，使用flex布局自动分割空间
              : "overflow-hidden"
          }`}
        >
          {/* 🎯 暂时所有模式都使用增强版组件，待静态组件修复后再启用 */}
          <EnhancedModernAnalysisInterface {...analysisProps} />
        </div>

        {/* 🎯 Preview模式下的底部AI助手面板 - 独立区块 */}
        {variant === "preview" && currentItem && (
          <div 
            className="flex-shrink-0 backdrop-blur-md bg-background/90 border-t border-border shadow-lg"
            data-exclude-selection
            style={{
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="px-6 py-3 max-w-7xl mx-auto">
              <AIAssistantPanel
                onAnalysis={handleAnalysis}
                showHistory={false} // Preview模式下暂时禁用历史记录面板
                historyRecords={historyRecords || []}
                loadingHistory={isLoadingHistory}
                onHistoryClick={handleHistoryClick}
                prompts={prompts.slice(0, 4)} // Preview模式下只显示前4个prompts
                loadingPrompts={loadingPrompts}
                onPromptClick={handlePromptClick}
                variant={variant}
              />
            </div>
          </div>
        )}
      </div>
    </ReferenceManagerProvider>
  );
};

// 向后兼容的导出
export default ContentAnalysisView;
