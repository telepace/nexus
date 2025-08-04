"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonObjectRenderer } from "./JsonObjectRenderer";
import { cn } from "@/lib/utils";
import { useAsyncContentParser, JsonlBlock } from "@/lib/utils/async-content-parser";
import { performanceMonitor } from "@/lib/utils/performance-monitor";

interface OptimizedUniversalContentRendererProps {
  /** Content string that could be JSONL, JSON object, or Markdown format */
  content: string | null | undefined;
  /** Additional class names for the container */
  className?: string;
  /** Callback when expand button is clicked on a JSON line */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  /** 内容ID，用于获取引用数据 */
  contentId?: string;
  /** 是否启用增强的引用tooltip */
  enableEnhancedTooltip?: boolean;
  /** 引用点击回调 */
  onReferenceClick?: (refId: number) => void;
  /** 渲染模式 - preview模式下禁用交互功能 */
  mode?: 'preview' | 'full';
  /** 是否启用hover效果 */
  enableHoverEffects?: boolean;
}

// 轻量级JSONL渲染器 - 专为Preview模式优化
const LightweightJsonlRenderer: React.FC<{
  blocks: JsonlBlock[];
  className?: string;
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  enableHoverEffects?: boolean;
  mode?: 'preview' | 'full';
}> = ({ blocks, className, onExpandLine, enableHoverEffects = false, mode = 'full' }) => {
  
  const renderBlock = useCallback((block: JsonlBlock, index: number) => {
    const { type, content } = block;
    
    // 基于type选择合适的标签和样式
    const getBlockElement = () => {
      switch (type) {
        case 'h1':
          return (
            <h1 className="text-xl font-bold mb-2 text-foreground">
              {content}
            </h1>
          );
        case 'h2':
          return (
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              {content}
            </h2>
          );
        case 'h3':
          return (
            <h3 className="text-base font-semibold mb-1 text-foreground">
              {content}
            </h3>
          );
        case 'quote':
          return (
            <blockquote className="border-l-4 border-primary/30 pl-4 py-2 my-2 italic text-muted-foreground bg-muted/20 rounded-r">
              {content}
            </blockquote>
          );
        case 'list':
          const items = content.split(/[\n,；;]/).map(s => s.trim()).filter(Boolean);
          return (
            <ul className="list-disc ml-4 space-y-1 my-2">
              {items.map((item, i) => (
                <li key={i} className="text-foreground leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          );
        default:
          return (
            <p className="text-foreground leading-relaxed my-2">
              {content}
            </p>
          );
      }
    };

    const blockElement = getBlockElement();

    // Preview模式下简化渲染，不添加hover效果和交互
    if (mode === 'preview' || !enableHoverEffects) {
      return (
        <div key={index} className="block-item">
          {blockElement}
        </div>
      );
    }

    // 完整模式下添加交互功能
    return (
      <div
        key={index}
        className="group relative block-item p-2 rounded transition-colors hover:bg-muted/10"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {blockElement}
          </div>
          
          {onExpandLine && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onExpandLine(block)}
                className="w-6 h-6 rounded bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-border hover:shadow-sm transition-all"
                title="AI深度展开"
              >
                <span className="text-xs">💭</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }, [onExpandLine, enableHoverEffects, mode]);

  return (
    <div className={cn("space-y-1", className)}>
      {blocks.map(renderBlock)}
    </div>
  );
};

/**
 * 优化的通用内容渲染器 - 解决主线程阻塞问题
 * 使用异步解析避免同步JSON.parse阻塞
 * Preview模式下禁用不必要的功能
 */
export function OptimizedUniversalContentRenderer({
  content,
  className,
  onExpandLine,
  contentId,
  enableEnhancedTooltip = true,
  onReferenceClick,
  mode = 'full',
  enableHoverEffects = true,
}: OptimizedUniversalContentRendererProps) {
  const [contentType, setContentType] = useState<'jsonl' | 'json' | 'markdown' | 'empty'>('empty');
  const [jsonlBlocks, setJsonlBlocks] = useState<JsonlBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { parseJsonlContent, isJsonlContent, isJsonObject } = useAsyncContentParser();

  // Preview模式下的优化配置
  const isPreviewMode = mode === 'preview';
  const shouldEnableHover = enableHoverEffects && !isPreviewMode;
  const shouldEnableTooltip = enableEnhancedTooltip && !isPreviewMode;

  // 异步内容分析和解析
  useEffect(() => {
    async function analyzeAndParseContent() {
      if (!content) {
        setContentType('empty');
        setJsonlBlocks([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 性能监控
        const measureKey = `content-parse:${mode}:${content.length}`;
        performanceMonitor.start(measureKey, { 
          mode, 
          contentLength: content.length,
          isPreview: isPreviewMode 
        });

        // 快速同步检测内容格式（只检查第一行）
        if (isJsonlContent(content)) {
          setContentType('jsonl');
          
          // 异步解析JSONL内容
          const blocks = await parseJsonlContent(content);
          setJsonlBlocks(blocks);
        } else if (isJsonObject(content)) {
          setContentType('json');
        } else {
          setContentType('markdown');
        }

        performanceMonitor.end(measureKey);
      } catch (parseError) {
        console.error('Content parsing failed:', parseError);
        setError(parseError instanceof Error ? parseError.message : 'Unknown parsing error');
        setContentType('markdown'); // 降级到markdown渲染
      } finally {
        setIsLoading(false);
      }
    }

    analyzeAndParseContent();
  }, [content, parseJsonlContent, isJsonlContent, isJsonObject, mode, isPreviewMode]);

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className={cn("p-4 border border-destructive/20 rounded-lg bg-destructive/5", className)}>
        <p className="text-sm text-destructive">
          内容解析失败: {error}
        </p>
        {/* 降级到原始内容显示 */}
        {content && (
          <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
            {content.substring(0, 200)}...
          </pre>
        )}
      </div>
    );
  }

  // 根据内容类型渲染
  if (!content) {
    return (
      <div
        data-testid="optimized-content-renderer"
        className={cn("space-y-2", className)}
      />
    );
  }

  switch (contentType) {
    case 'jsonl':
      return (
        <div data-testid="optimized-content-renderer" className={className}>
          <LightweightJsonlRenderer
            blocks={jsonlBlocks}
            onExpandLine={onExpandLine}
            enableHoverEffects={shouldEnableHover}
            mode={mode}
          />
        </div>
      );

    case 'json':
      return (
        <div data-testid="optimized-content-renderer" className={className}>
          <JsonObjectRenderer data={content} />
        </div>
      );

    case 'markdown':
    default:
      return (
        <div data-testid="optimized-content-renderer" className={className}>
          <MarkdownRenderer 
            content={content} 
            contentId={shouldEnableTooltip ? contentId : undefined}
            enableEnhancedTooltip={shouldEnableTooltip}
            onReferenceClick={shouldEnableTooltip ? onReferenceClick : undefined}
          />
        </div>
      );
  }
}