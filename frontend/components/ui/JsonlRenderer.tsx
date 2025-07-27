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

  // 优化延迟渲染逻辑 - 避免频繁状态切换
  useEffect(() => {
    if (!enableDelayedRendering) {
      setIsContentReady(true);
      return;
    }

    // 如果内容为空或未变化，直接设为就绪
    if (!content || content.trim() === '') {
      setIsContentReady(true);
      return;
    }

    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 只有在内容变化时才重置状态
    if (isContentReady) {
      setIsContentReady(false);
    }

    // 启动延迟定时器，使用较短延迟减少等待时间
    timeoutRef.current = setTimeout(() => {
      setIsContentReady(true);
    }, Math.min(renderDelay, 200)); // 最大延迟200ms

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, enableDelayedRendering, renderDelay, isContentReady]);

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
  // 修复常见的 JSON 语法错误并处理截断内容
  function sanitizeJsonLine(line: string): string {
    // 修复单引号包围的字符串值（如：'文本"内容'）
    let sanitized = line.replace(/:\s*'([^']*?)'/g, (match, content) => {
      // 转义内部的双引号
      const escaped = content.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });
    
    // 处理截断的JSON - 如果行末没有闭合，尝试修复
    if (sanitized.trim() && !sanitized.trim().endsWith('}')) {
      // 检查是否是一个不完整的字符串值
      const openBraceCount = (sanitized.match(/{/g) || []).length;
      const closeBraceCount = (sanitized.match(/}/g) || []).length;
      if (openBraceCount > closeBraceCount) {
        // 尝试找到最后一个不完整的字符串并添加结束引号和括号
        if (sanitized.includes('"') && !sanitized.trim().endsWith('"')) {
          sanitized = sanitized.trim() + '"}';
        } else {
          sanitized = sanitized.trim() + '}';
        }
      }
    }
    
    return sanitized;
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

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const ref = block["ref"] as string | undefined;

    // 解析引用
    const references = actions?.parseReferences ? actions.parseReferences(ref) : [];

    const renderResult = styleRenderer({
      block,
      references,
      hasReferences: (references || []).length > 0,
      MarkdownRenderer,
      EnhancedReferenceIndicator: ReferenceIndicatorComponent,
      onExpand: onExpandLine,
    });

    // 🎯 使用优化的HoverableBlock组件，提供右侧操作按钮
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
        
        {/* 引用指示器 */}
        {(references || []).length > 0 && (
          <div className="flex gap-1">
            {(references || []).slice(0, 3).map((refNum) => (
              <ReferenceIndicatorComponent
                key={refNum}
                references={[refNum]}
                className="w-5 h-5 text-xs"
              />
            ))}
            {(references || []).length > 3 && (
              <div className="w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center">
                +{(references || []).length - 3}
              </div>
            )}
          </div>
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
          {renderResult.element}
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
      {blocks.map(renderBlock)}
    </div>
  );
}
