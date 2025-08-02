"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation"; // 🎯 添加路由检测
import {
  Brain,
  Loader2,
  Bot,
  User,
} from "lucide-react";
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
  onStatusChange?: (status: 'idle' | 'processing' | 'completed', hasConversations: boolean) => void;
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
  onStatusChange,
}) => {
  const { toast } = useToast();
  const { t } = useI18nSafe();
  const pathname = usePathname(); // 🎯 获取当前路由

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

  // 内存优化：preview模式下限制功能，减少组件复杂度
  const isPreviewMode = variant === "preview";
  const shouldLimitFeatures = isPreviewMode;

  // 状态管理
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const showHistory = showHistoryProp;
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  
  // 使用统一的历史记录管理hook - 在preview模式下禁用以节省资源
  const {
    historyRecords,
    isLoadingHistory: loadingHistory,
    refreshHistory,
    addHistoryRecord
  } = useConversationHistory({
    contentId: shouldLimitFeatures ? '' : (content?.id || ''), // preview模式下不加载历史
    onError: (error) => {
      if (!shouldLimitFeatures) { // 只在非preview模式下显示错误
        console.error('历史记录加载失败:', error);
        toast({
          title: "加载失败",
          description: error,
          variant: "destructive",
        });
      }
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

  // 新的对话管理 - 在preview模式下禁用以节省资源  
  const {
    conversations: streamingConversations,
    sendMessage,
    retryMessage,
    deleteConversation,
    cancelCurrentProcessing,
  } = useStreamingConversation({
    contentId: shouldLimitFeatures ? '' : (content?.id || ''), // preview模式下禁用
    onConversationUpdate: (conversation) => {
      // 只在非preview模式下处理对话更新
      if (!shouldLimitFeatures) {
        // 可以在这里添加额外的处理逻辑
      }
    },
    onError: (error) => {
      if (!shouldLimitFeatures) { // 只在非preview模式下显示错误
        toast({
          title: "处理失败",
          description: error,
          variant: "destructive",
        });
      }
    },
  });

  // 🎯 监听路由变化，重置折叠状态
  useEffect(() => {
    setCollapsedCards(getInitialCollapsedCards());
  }, [pathname, getInitialCollapsedCards]);

  // 组件卸载时的清理机制
  useEffect(() => {
    return () => {
      // 取消正在进行的请求
      if (!shouldLimitFeatures) {
        cancelCurrentProcessing();
      }
      // 清理定时器和事件监听器在各自的useEffect中已经处理
    };
  }, [cancelCurrentProcessing, shouldLimitFeatures]);

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

  // 🎯 监听AI处理状态变化，通知ContentPreview更新标题
  useEffect(() => {
    const hasConversations = streamingConversations.length > 0;
    
    // 检查是否有正在处理的对话
    const hasProcessing = streamingConversations.some(conv => 
      conv.messages.some(msg => 
        msg.role === "assistant" && 
        (msg.status === "pending" || msg.status === "thinking" || msg.status === "streaming")
      )
    );
    
    // 检查是否有已完成的对话
    const hasCompleted = streamingConversations.some(conv => 
      conv.messages.some(msg => 
        msg.role === "assistant" && msg.status === "completed"
      )
    );

    let status: 'idle' | 'processing' | 'completed' = 'idle';
    
    if (hasProcessing) {
      status = 'processing';
    } else if (hasCompleted || hasConversations) {
      status = 'completed';
    }
    
    // 通知父组件状态变化
    onStatusChange?.(status, hasConversations);
    
  }, [streamingConversations, onStatusChange]);

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

  // 监听点击外部，清除选中的 JSONL 块
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果点击的不是可选择的文本区域，清除选择
      const target = event.target as HTMLElement;
      if (!target.closest('.select-text') && !target.closest('.jsonl-line-hover')) {
        setSelectedBlock(null);
      }
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
          title: t('analysis.contentSummary'),
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
          title: t('analysis.questionList'),
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

  // 根据变体计算样式
  const containerHeight = height === "fixed" ? "h-80" : "h-full";
  const containerClasses =
    variant === "preview"
      ? `flex flex-col ${containerHeight} ${className} linear-bg-1`
      : `flex flex-col h-full ${className}`;

  return (
    <div className={containerClasses} data-exclude-selection>

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

      {/* 固定底部AI助手 - 使用新的组件 */}
      <AIAssistantPanel
        inputValue={inputValue}
        setInputValue={setInputValue}
        inputFocused={inputFocused}
        setInputFocused={setInputFocused}
        onAnalysis={handleAnalysis}
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