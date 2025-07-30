"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Library, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnhancedModernAnalysisInterface } from "./EnhancedModernAnalysisInterface";
import type { ContentItemPublic } from "@/lib/api/content";
import { AIResult, ConversationListResponse, contentApi } from "@/lib/api/content";
import { useAuth } from "@/lib/client-auth";

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
  hideHeader = false,
  headerTitle = "内容分析",
  emptyStateText = "选择内容进行预览",
  onHistoryCountChange,
  showHistory: externalShowHistory,
  seamless = false,
  showHeaderBorder = true,
  showHeaderTitle = true,
}) => {
  // 状态管理
  const [currentItem, setCurrentItem] = useState<ContentItemPublic | null>(item);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [internalShowHistory, setInternalShowHistory] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [hasAnyConversations, setHasAnyConversations] = useState(false);
  
  // 内部数据获取状态
  const [internalAnalysisResult, setInternalAnalysisResult] = useState<AIResult | null>(null);
  const [internalConversations, setInternalConversations] = useState<ConversationListResponse["conversations"]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // 是否使用外部历史面板控制
  const showHistory = externalShowHistory !== undefined ? externalShowHistory : internalShowHistory;

  // 无缝模式下的样式控制
  const finalHideHeader = hideHeader || seamless;
  const finalShowHeaderBorder = showHeaderBorder && !seamless;
  const finalShowHeaderTitle = showHeaderTitle && !seamless;

  // 内容切换逻辑
  useEffect(() => {
    if (item?.id === currentItem?.id) {
      return;
    }

    setIsTransitioning(true);
    
    Promise.resolve().then(() => {
      setCurrentItem(item);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
    });
  }, [item?.id, currentItem?.id]);

  // 自动获取缺失的分析数据（当外部没有提供时）
  useEffect(() => {
    async function fetchMissingData() {
      if (!currentItem?.id || !user?.token) return;
      
      // 如果外部已经提供了数据，不需要重新获取
      const hasExternalAnalysis = externalAnalysisResult !== null;
      const hasExternalConversations = externalConversations.length > 0;
      
      if (hasExternalAnalysis && hasExternalConversations) {
        return;
      }

      try {
        setDataLoading(true);
        
        const promises: Promise<unknown>[] = [];
        
        // 只获取缺失的数据
        if (!hasExternalAnalysis) {
          promises.push(contentApi.getContentItem(currentItem.id));
        }
        
        if (!hasExternalConversations) {
          promises.push(contentApi.getContentConversations(currentItem.id, false));
        }

        const results = await Promise.allSettled(promises);
        
        let resultIndex = 0;
        
        // 处理分析结果
        if (!hasExternalAnalysis && results[resultIndex]) {
          const analysisResult = results[resultIndex];
          if (analysisResult.status === 'fulfilled') {
            const analysisData = (analysisResult.value as { ai_result?: AIResult }).ai_result;
            setInternalAnalysisResult(analysisData || null);
          }
          resultIndex++;
        }
        
        // 处理对话历史
        if (!hasExternalConversations && results[resultIndex]) {
          const conversationsResult = results[resultIndex];
          if (conversationsResult.status === 'fulfilled') {
            setInternalConversations((conversationsResult.value as ConversationListResponse).conversations || []);
          }
        }
        
      } catch (error) {
        console.error('获取分析数据失败:', error);
      } finally {
        setDataLoading(false);
      }
    }

    fetchMissingData();
  }, [currentItem?.id, user?.token, externalAnalysisResult, externalConversations.length]);

  // 滚动到顶部
  useEffect(() => {
    if (containerRef.current && currentItem) {
      Promise.resolve().then(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, [currentItem?.id]);

  // 监听AI状态变化
  useEffect(() => {
    const handleAIStatusUpdate = (event: CustomEvent) => {
      const { status, hasConversations } = event.detail;
      setAiStatus(status);
      if (hasConversations !== undefined) {
        setHasAnyConversations(hasConversations);
      }
    };

    window.addEventListener('aiStatusUpdate' as keyof WindowEventMap, handleAIStatusUpdate);
    
    return () => {
      window.removeEventListener('aiStatusUpdate' as keyof WindowEventMap, handleAIStatusUpdate);
    };
  }, []);

  // 历史记录计数处理
  const handleHistoryCountChange = useCallback((count: number) => {
    setHistoryCount(count);
    onHistoryCountChange?.(count);
  }, [onHistoryCountChange]);

  // 切换历史面板（仅内部控制时）
  const toggleHistoryPanel = () => {
    if (externalShowHistory === undefined) {
      setInternalShowHistory(prev => !prev);
    }
  };

  // 动态头部标题
  const getHeaderTitle = () => {
    if (headerTitle !== "内容分析") {
      return headerTitle; // 使用自定义标题
    }
    
    if (aiStatus === 'processing') {
      return 'AI分析中';
    }
    if (aiStatus === 'completed' || hasAnyConversations) {
      return '分析结果';
    }
    return variant === "preview" ? '内容预览' : 'AI分析';
  };

  // 样式配置
  const containerClasses = useMemo(() => {
    const baseClasses = "flex flex-col h-full overflow-hidden";
    const variantClasses = {
      preview: seamless ? "" : "bg-gradient-to-br from-background via-background to-muted/20",
      sidebar: "linear-bg-1",
      fullscreen: ""
    };
    
    return `${baseClasses} ${variantClasses[variant]} ${className}`;
  }, [variant, className, seamless]);

  // 智能选择数据源：优先使用外部提供的数据，其次使用内部获取的数据
  const finalAnalysisResult = externalAnalysisResult || internalAnalysisResult;
  const finalConversations = externalConversations.length > 0 ? externalConversations : internalConversations;
  const finalIsLoading = isLoading || dataLoading;

  // 分析界面Props
  const analysisProps = useMemo(() => ({
    content: currentItem,
    conversations: finalConversations,
    analysisResult: finalAnalysisResult,
    isLoading: finalIsLoading,
    variant,
    hideHeader: true, // 由ContentAnalysisView统一管理头部
    onHistoryCountChange: handleHistoryCountChange,
    showHistory,
    onStatusChange: (status: string, hasConversations: boolean) => {
      window.dispatchEvent(new CustomEvent('aiStatusUpdate', {
        detail: { status, hasConversations }
      }));
    },
  }), [currentItem?.id, finalConversations, finalAnalysisResult, finalIsLoading, variant, handleHistoryCountChange, showHistory]);

  // 空状态渲染
  if (!currentItem) {
    return (
      <div className={containerClasses}>
        {!finalHideHeader && (
          <div className={`flex items-center h-header px-4 flex-shrink-0 ${finalShowHeaderBorder ? 'border-b' : ''}`}>
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
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Library className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-muted-foreground">
                {emptyStateText}
              </h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                在左侧列表中选择或悬停内容项目来查看详细信息
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主内容渲染
  return (
    <div 
      ref={containerRef}
      className={`
        ${containerClasses}
        transition-opacity duration-200 ease-out
        ${isTransitioning ? 'opacity-70' : 'opacity-100'}
      `}
      style={{
        contain: 'layout style paint',
        willChange: 'auto',
      }}
      data-exclude-selection
    >
      {/* 统一头部 */}
      {!finalHideHeader && (
        <div className={`flex items-center justify-between h-header px-4 flex-shrink-0 ${finalShowHeaderBorder ? 'border-b' : ''}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Library className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {finalShowHeaderTitle && (
              <span className="text-sm font-medium text-muted-foreground truncate">
                {getHeaderTitle()}
              </span>
            )}
            {aiStatus === 'processing' && finalShowHeaderTitle && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0 ml-1" />
            )}
          </div>
          
          {/* 历史面板切换按钮 */}
          {historyCount > 0 && externalShowHistory === undefined && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
      )}

      {/* 分析界面内容 */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <EnhancedModernAnalysisInterface {...analysisProps} />
      </div>
    </div>
  );
};

// 向后兼容的导出
export default ContentAnalysisView;