"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { contentApi } from "@/lib/api/content";
import type { ContentChunk, ContentChunksResponse } from "@/lib/api/content";
import { ChunkItem } from "./ChunkItem";
import { Loading } from "@/components/ui/loading";
import { TextSelectionFloater } from "@/components/ui/text-selection-floater";
import { AlertCircle } from "lucide-react";

interface OptimizedContentRendererProps {
  contentId: string;
  className?: string;
  initialChunkSize?: number;
  showProgressIndicator?: boolean;
  /** 是否启用文本选择浮层 */
  enableTextSelection?: boolean;
  /** 文本选择回调 */
  onTextAction?: (
    action: { id: string; label: string; prompt: string },
    selectedText: string,
  ) => void;
}

/**
 * OptimizedContentRenderer 提供最佳用户体验：
 * 1. 首屏快速加载（300ms内）
 * 2. 后台预取全部内容
 * 3. 无感知内容替换
 * 4. 没有"正在加载"和"End of content"提示
 * 5. 不删除已渲染的内容
 */
export const OptimizedContentRenderer: React.FC<
  OptimizedContentRendererProps
> = ({
  contentId,
  className = "",
  initialChunkSize = 5,
  showProgressIndicator = false,
  enableTextSelection = true,
  onTextAction,
}) => {
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullContentLoaded, setIsFullContentLoaded] = useState(false);
  const [showProgressIndicator, setShowProgressIndicator] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // 阶段1：快速加载首屏内容
  const loadInitialContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response: ContentChunksResponse = await contentApi.getContentChunks(
        contentId,
        1,
        initialChunkSize,
        false, // 使用分页获取首屏
      );

      setChunks(response.chunks);
      setTotalChunks(response.pagination?.total_chunks || 0);
      setLoading(false);

      // 如果还有更多内容，显示加载进度指示器
      if (response.pagination?.has_next) {
        setShowProgressIndicator(true);
      } else {
        setIsFullContentLoaded(true);
      }
    } catch (err) {
      console.error("Error loading initial content:", err);
      setError(err instanceof Error ? err.message : "Failed to load content");
      setLoading(false);
    }
  }, [contentId, initialChunkSize]);

  // 阶段2：后台加载完整内容
  const loadFullContent = useCallback(async () => {
    try {
      const response: ContentChunksResponse =
        await contentApi.getAllContentChunks(contentId);

      // 无缝替换为完整内容
      setChunks(response.chunks);
      setTotalChunks(response.chunks.length);
      setIsFullContentLoaded(true);
      setShowProgressIndicator(false);
    } catch (err) {
      console.error("Error loading full content:", err);
      // 后台加载失败不影响用户，首屏内容仍然可用
      setShowProgressIndicator(false);
    }
  }, [contentId]);

  // 智能加载策略
  useEffect(() => {
    const executeLoadingStrategy = async () => {
      // 步骤1：立即加载首屏内容
      await loadInitialContent();

      // 步骤2：首屏加载完成后，在下一个事件循环中开始后台加载
      // 这确保首屏渲染不被阻塞
      setTimeout(() => {
        loadFullContent();
      }, 0);
    };

    executeLoadingStrategy();
  }, [loadInitialContent, loadFullContent]);

  // 重试处理
  const retryLoad = useCallback(() => {
    setError(null);
    loadInitialContent();
  }, [loadInitialContent]);

  if (loading && chunks.length === 0) {
    return <Loading />;
  }

  if (error && chunks.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={retryLoad}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ minHeight: "100%" }}
    >
      {/* 顶部进度指示器 - 非常不显眼 */}
      {showProgressIndicator && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="h-0.5 bg-primary/20">
            <div
              className="h-full bg-primary animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div
        className="space-y-0 content-area"
        data-testid="optimized-content-renderer"
      >
        {chunks.map((chunk, index) => (
          <ChunkItem key={`${chunk.id}-${index}`} chunk={chunk} />
        ))}
      </div>

      {/* 底部状态指示器 - 位置固定，不影响滚动 */}
      <div className="mt-8 p-4 text-center">
        {isFullContentLoaded ? (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>已加载全部 {totalChunks} 个段落</span>
          </div>
        ) : showProgressIndicator ? (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>正在加载完整内容...</span>
          </div>
        ) : null}
      </div>

      {/* 文本选择浮层 */}
      {enableTextSelection && (
        <TextSelectionFloater
          enabled={true}
          containerSelector=".content-area"
          excludeSelector=".sidebar, .panel, .analysis-card, .llm-analysis-card, .ai-analysis-card, .content-analysis-sidebar, [data-exclude-selection]"
          onAction={onTextAction}
          zIndex={1050}
        />
      )}
    </div>
  );
};
