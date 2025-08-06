"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonLineWithExpandButton } from "./JsonLineWithExpandButton";
import {
  EnhancedReferenceIndicator,
  useReferenceManagerSafe,
} from "./ReferenceManager";
import { ModernReferenceIndicator } from "./ModernReferenceIndicator";
import { jsonlStyles } from "./jsonlStyles";
import { ContentSkeleton } from "./ContentSkeleton";
import { HoverableBlock } from "./HoverableBlock";

interface JsonlRendererProps {
  content: string;
  className?: string;
  enableHoverEffects?: boolean;
  /** callback when expand button is clicked on a JSON line */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  /** 指定渲染風格，對應 jsonlStyles 註冊表 key */
  styleName?: string;
  /** 是否显示引用指示器，默认隐藏 */
  showReferenceIndicators?: boolean;
  /** 是否启用延迟渲染（用于预览模式优化性能） */
  enableDelayedRendering?: boolean;
  /** 延迟渲染的延迟时间（毫秒） */
  renderDelay?: number;
  /** 内容ID，用于获取引用数据 */
  contentId?: string;
  /** 是否启用增强的引用tooltip */
  enableEnhancedTooltip?: boolean;
  /** 引用点击回调 */
  onReferenceClick?: (refId: number) => void;
}

/**
 * Minimalistic JSON-Line renderer with Notion-style hover effects.
 *
 * The LLM returns one JSON object per line, each object contains at least:
 * - `type` | `t`: block type
 * - `content` | `c`: block content
 * - `ref`: reference to source paragraphs (comma-separated numbers)
 *
 * Enhanced with reference management for jumping to source paragraphs.
 */
export function JsonlRenderer({
  content,
  className,
  enableHoverEffects = true,
  onExpandLine,
  styleName = "notebook",
  showReferenceIndicators = true, // 🎯 修复：默认启用引用指示器，确保悬浮卡片正常显示
  enableDelayedRendering = false,
  renderDelay = 400,
  contentId,
  enableEnhancedTooltip = true,
  onReferenceClick,
}: JsonlRendererProps) {
  // 使用安全的 ReferenceManager
  const { actions } = useReferenceManagerSafe();

  // 根据是否显示引用指示器，决定传递哪个组件
  const ReferenceIndicatorComponent: typeof EnhancedReferenceIndicator =
    showReferenceIndicators
      ? EnhancedReferenceIndicator
      : ((() => null) as unknown as typeof EnhancedReferenceIndicator);

  // 根據 styleName 取得區塊渲染器
  const styleRenderer = jsonlStyles[styleName] || jsonlStyles["default"];

  // 统一的渲染状态管理 - 避免多个状态冲突
  const [renderState, setRenderState] = useState<{
    isReady: boolean;
    isLoading: boolean;
    blocks: Record<string, unknown>[];
  }>({
    isReady: !enableDelayedRendering,
    isLoading: false,
    blocks: [],
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<string>("");

  // 统一的内容处理逻辑 - 消除状态冲突
  useEffect(() => {
    // 避免重复处理相同内容
    if (contentRef.current === content) {
      return;
    }
    contentRef.current = content;

    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果内容为空，直接设为就绪状态
    if (!content || !content.trim()) {
      setRenderState({
        isReady: true,
        isLoading: false,
        blocks: [],
      });
      return;
    }

    // 立即开始解析，避免延迟造成的状态不一致
    const parseContentSync = () => {
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setRenderState({
          isReady: true,
          isLoading: false,
          blocks: [],
        });
        return;
      }

      const results: Record<string, unknown>[] = [];

      lines.forEach((line) => {
        try {
          // 简化的JSON修复
          let sanitized = line.trim();
          if (!sanitized.startsWith("{")) sanitized = "{" + sanitized;
          if (!sanitized.endsWith("}")) sanitized = sanitized + "}";

          const parsed = JSON.parse(sanitized) as Record<string, unknown>;
          results.push(parsed);
        } catch {
          // 解析失败时包装为段落块
          results.push({ type: "p", content: line } as Record<string, unknown>);
        }
      });

      // 根据是否启用延迟渲染决定显示时机
      if (enableDelayedRendering) {
        // 先设置加载状态
        setRenderState({
          isReady: false,
          isLoading: true,
          blocks: results,
        });

        // 延迟显示内容
        timeoutRef.current = setTimeout(
          () => {
            setRenderState({
              isReady: true,
              isLoading: false,
              blocks: results,
            });
          },
          Math.min(renderDelay, 200),
        );
      } else {
        // 立即显示
        setRenderState({
          isReady: true,
          isLoading: false,
          blocks: results,
        });
      }
    };

    parseContentSync();

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, enableDelayedRendering, renderDelay]);

  // Early return for empty content
  if (!content) {
    return (
      <div
        data-testid="jsonl-renderer"
        className={cn("space-y-1", className)}
      />
    );
  }

  // 如果启用延迟渲染且内容未准备好，显示骨架屏
  if (enableDelayedRendering && !renderState.isReady) {
    return (
      <div data-testid="jsonl-renderer" className={cn("space-y-1", className)}>
        <ContentSkeleton
          variant="simple"
          blocks={3}
          animated={true}
          className="!p-0"
        />
      </div>
    );
  }

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const ref = block["ref"] as string | undefined;

    // 解析引用
    const references = actions?.parseReferences
      ? actions.parseReferences(ref)
      : [];

    const renderResult = styleRenderer({
      block,
      references,
      hasReferences: (references || []).length > 0,
      MarkdownRenderer,
      EnhancedReferenceIndicator: ReferenceIndicatorComponent,
      onExpand: onExpandLine,
      contentId,
      disableInlineReferences: true, // 🎯 禁用MarkdownRenderer的内联引用处理，因为JsonlRenderer统一管理引用
    });

    // 🎯 修复：只保留展开按钮在rightActions中，移除引用指示器
    const rightActions = enableHoverEffects ? (
      <div className="flex items-center gap-2">
        {/* 展开按钮 */}
        {onExpandLine && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpandLine(block);
            }}
            className="w-6 h-6 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-border hover:shadow-sm transition-all duration-200"
            title="AI深度展开"
          >
            <span className="text-xs">💭</span>
          </button>
        )}
      </div>
    ) : undefined;

    return (
      <HoverableBlock
        key={idx}
        enableHover={enableHoverEffects}
        hoverIntensity="subtle"
        showRightActions={!!rightActions}
        rightActions={rightActions}
        className="my-0.5"
      >
        <div className="relative">
          {/* 🎯 修复：将引用指示器直接嵌入内容中，而不是放在rightActions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">{renderResult.element}</div>

            {/* 🎯 现代化引用指示器：点击触发，不自动悬浮 */}
            {(references || []).length > 0 && showReferenceIndicators && (
              <ModernReferenceIndicator
                references={references}
                className="ml-2 flex-shrink-0"
                contentId={contentId}
                onReferenceClick={onReferenceClick}
              />
            )}
          </div>
        </div>
      </HoverableBlock>
    );
  };

  return (
    <div
      data-testid="jsonl-renderer"
      className={cn(
        "max-w-none space-y-0.5 overflow-visible",
        // 确保整个容器支持文本选择
        "select-text",
        className,
      )}
    >
      {renderState.blocks.map(renderBlock)}
    </div>
  );
}
