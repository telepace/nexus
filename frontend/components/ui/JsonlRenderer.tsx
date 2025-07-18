"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonLineWithExpandButton } from "./JsonLineWithExpandButton";
import {
  EnhancedReferenceIndicator,
  useReferenceManagerSafe,
} from "./ReferenceManager";
import { jsonlStyles } from "./jsonlStyles";
import { ContentSkeleton } from "./ContentSkeleton";

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
  showReferenceIndicators = false,
  enableDelayedRendering = false,
  renderDelay = 400,
}: JsonlRendererProps) {
  // 延迟渲染状态
  const [isContentReady, setIsContentReady] = useState(!enableDelayedRendering);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用安全的 ReferenceManager
  const { actions } = useReferenceManagerSafe();

  // 根据是否显示引用指示器，决定传递哪个组件
  const ReferenceIndicatorComponent: typeof EnhancedReferenceIndicator =
    showReferenceIndicators
      ? EnhancedReferenceIndicator
      : ((() => null) as unknown as typeof EnhancedReferenceIndicator);

  // 根據 styleName 取得區塊渲染器
  const styleRenderer = jsonlStyles[styleName] || jsonlStyles["default"];

  // 延迟渲染逻辑 - 简化版本
  useEffect(() => {
    if (!enableDelayedRendering) {
      setIsContentReady(true);
      return;
    }

    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 重置状态
    setIsContentReady(false);

    // 启动延迟定时器
    timeoutRef.current = setTimeout(() => {
      setIsContentReady(true);
    }, renderDelay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, enableDelayedRendering, renderDelay]);

  if (!content) {
    return (
      <div
        data-testid="jsonl-renderer"
        className={cn("space-y-1", className)}
      />
    );
  }

  // 如果启用延迟渲染且内容未准备好，显示骨架屏
  if (enableDelayedRendering && !isContentReady) {
    return (
      <div
        data-testid="jsonl-renderer"
        className={cn("space-y-1", className)}
      >
        <ContentSkeleton 
          variant="simple" 
          blocks={3} 
          animated={true}
          className="!p-0"
        />
      </div>
    );
  }

  // Split into lines & parse
  // 修复常见的 JSON 语法错误
  function sanitizeJsonLine(line: string): string {
    // 修复单引号包围的字符串值（如：'文本"内容'）
    return line.replace(/:\s*'([^']*?)'/g, (match, content) => {
      // 转义内部的双引号
      const escaped = content.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });
  }

  const blocks = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        // 先尝试清理 JSON 语法错误，然后解析
        const sanitizedLine = sanitizeJsonLine(line);
        return JSON.parse(sanitizedLine) as Record<string, unknown>;
      } catch {
        // If parsing fails, wrap line as a paragraph block so we still show it
        return { type: "p", content: line } as Record<string, unknown>;
      }
    });

  const BlockWrapper: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    if (!enableHoverEffects) {
      return <>{children}</>;
    }

    return (
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-200 ease-out",
          "px-2 py-1 -mx-2 my-0.5",
          "border border-transparent",
          "overflow-visible",
          // 移除 hover 高亮效果（藍色背景 / 邊框）
          // 如需保留 hover 樣式，可在此添加其他類名
        )}
      >
        {/* 主要内容 */}
        <div className="relative">{children}</div>
      </div>
    );
  };

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const ref = block["ref"] as string | undefined;

    // 解析引用
    const references = actions.parseReferences(ref);

    const blockElement = styleRenderer({
      block,
      references,
      hasReferences: references.length > 0,
      MarkdownRenderer,
      EnhancedReferenceIndicator: ReferenceIndicatorComponent,
    });

    // 统一封装：先用 BlockWrapper 提供引用高亮，再在内部使用 JsonLineWithExpandButton
    return (
      <BlockWrapper key={idx}>
        <JsonLineWithExpandButton
          jsonLine={block}
          onExpand={onExpandLine}
          enableHoverEffects={false}
        >
          {blockElement}
        </JsonLineWithExpandButton>
      </BlockWrapper>
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
      {blocks.map(renderBlock)}
    </div>
  );
}
