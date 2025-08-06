"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import { HoverableBlock } from "./HoverableBlock";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonLineWithExpandButton } from "./JsonLineWithExpandButton";
import {
  EnhancedReferenceIndicator,
  useReferenceManagerSafe,
} from "./ReferenceManager";
import { jsonlStyles } from "./jsonlStyles";
import { ContentSkeleton } from "./ContentSkeleton";
import { Button } from "./button";
import { Badge } from "./badge";
import { Alert, AlertDescription } from "./alert";
import { Copy, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface JsonlBlock {
  type: string;
  content: string;
  lead?: string;
  ref?: string;
  raw: string;
  index: number;
  isComplete: boolean;
  isValid: boolean;
  error?: string;
}

interface ParseStats {
  totalLines: number;
  validBlocks: number;
  errorBlocks: number;
  emptyLines: number;
}

export interface UnifiedJsonlRendererProps {
  content: string;
  className?: string;
  /** 是否启用悬浮效果 */
  enableHoverEffects?: boolean;
  /** 是否为流式模式 */
  isStreaming?: boolean;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 是否启用错误恢复 */
  enableErrorRecovery?: boolean;
  /** 是否显示错误详情 */
  showErrorDetails?: boolean;
  /** 渲染样式名称 */
  styleName?: string;
  /** 是否显示引用指示器 */
  showReferenceIndicators?: boolean;
  /** 是否启用延迟渲染 */
  enableDelayedRendering?: boolean;
  /** 延迟渲染时间 */
  renderDelay?: number;
  /** 内容ID（用于引用管理） */
  contentId?: string;
  /** 展开回调 */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  /** 错误回调 */
  onError?: (errors: string[]) => void;
}

/**
 * 统一的JSONL渲染器
 *
 * 整合了多个渲染器的优点：
 * - JsonlRenderer: 基础JSONL解析和样式系统
 * - StreamingJsonlRenderer: 实时流式渲染
 * - RobustJsonlRenderer: 错误恢复和容错处理
 * - 统一的HoverableBlock悬浮效果
 */
export function UnifiedJsonlRenderer({
  content,
  className,
  enableHoverEffects = true,
  isStreaming = false,
  isLoading = false,
  enableErrorRecovery = true,
  showErrorDetails = false,
  styleName = "notebook",
  showReferenceIndicators = false,
  enableDelayedRendering = false,
  renderDelay = 200,
  contentId,
  onExpandLine,
  onError,
}: UnifiedJsonlRendererProps) {
  const [isContentReady, setIsContentReady] = useState(!enableDelayedRendering);
  const [showErrors, setShowErrors] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { actions } = useReferenceManagerSafe();

  // 根据是否显示引用指示器，决定传递哪个组件
  const ReferenceIndicatorComponent: typeof EnhancedReferenceIndicator =
    showReferenceIndicators
      ? EnhancedReferenceIndicator
      : ((() => null) as unknown as typeof EnhancedReferenceIndicator);

  // 根据样式名称获取渲染器
  const styleRenderer = jsonlStyles[styleName] || jsonlStyles["default"];

  // 延迟渲染逻辑
  useEffect(() => {
    if (!enableDelayedRendering) {
      setIsContentReady(true);
      return;
    }

    if (!content || typeof content !== "string" || content.trim() === "") {
      setIsContentReady(true);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isContentReady) {
      setIsContentReady(false);
    }

    timeoutRef.current = setTimeout(
      () => {
        setIsContentReady(true);
      },
      Math.min(renderDelay, 200),
    );

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, enableDelayedRendering, renderDelay, isContentReady]);

  // 智能JSON修复函数
  const fixJsonLine = (line: string): string => {
    let sanitized = line.trim();

    // 修复单引号包围的字符串值
    sanitized = sanitized.replace(/:\s*'([^']*?)'/g, (match, content) => {
      const escaped = content.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });

    // 处理截断的JSON
    if (sanitized && !sanitized.endsWith("}")) {
      const openBraceCount = (sanitized.match(/{/g) || []).length;
      const closeBraceCount = (sanitized.match(/}/g) || []).length;
      if (openBraceCount > closeBraceCount) {
        if (sanitized.includes('"') && !sanitized.trim().endsWith('"')) {
          sanitized = sanitized.trim() + '"}';
        } else {
          sanitized = sanitized.trim() + "}";
        }
      }
    }

    return sanitized;
  };

  // 解析JSONL内容
  const { blocks, stats } = useMemo(() => {
    if (!content || typeof content !== "string")
      return {
        blocks: [],
        stats: { totalLines: 0, validBlocks: 0, errorBlocks: 0, emptyLines: 0 },
      };

    const lines = content.split("\n");
    const parsedBlocks: JsonlBlock[] = [];
    const errors: string[] = [];
    let validCount = 0;
    let errorCount = 0;
    let emptyCount = 0;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        emptyCount++;
        return;
      }

      try {
        // 尝试直接解析
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(trimmedLine);
        } catch (parseError) {
          // 如果启用错误恢复，尝试修复
          if (enableErrorRecovery) {
            const fixedLine = fixJsonLine(trimmedLine);
            try {
              parsed = JSON.parse(fixedLine);
            } catch {
              throw parseError; // 修复失败，抛出原始错误
            }
          } else {
            throw parseError;
          }
        }

        const type = parsed.type || parsed.t || "p";
        const blockContent = parsed.content || parsed.c || "";
        const lead = parsed.lead;
        const ref = parsed.ref;

        parsedBlocks.push({
          type: String(type),
          content: String(blockContent),
          lead: lead ? String(lead) : undefined,
          ref: ref ? String(ref) : undefined,
          raw: trimmedLine,
          index,
          isComplete: true,
          isValid: true,
        });
        validCount++;
      } catch (error) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : "解析错误";
        errors.push(`第${index + 1}行: ${errorMessage}`);

        // 在流式模式下，只显示看起来完整的错误行
        if (!isStreaming || trimmedLine.includes("}")) {
          parsedBlocks.push({
            type: "error",
            content: trimmedLine,
            raw: trimmedLine,
            index,
            isComplete: false,
            isValid: false,
            error: errorMessage,
          });
        }
      }
    });

    // 触发错误回调
    if (errors.length > 0 && onError) {
      onError(errors);
    }

    const parseStats: ParseStats = {
      totalLines: lines.length,
      validBlocks: validCount,
      errorBlocks: errorCount,
      emptyLines: emptyCount,
    };

    return { blocks: parsedBlocks, stats: parseStats };
  }, [content, enableErrorRecovery, isStreaming, onError]);

  // 🎯 复制功能
  const handleCopyBlock = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      // 可以添加toast通知
    });
  }, []);

  // 渲染单个块
  const renderBlock = (block: JsonlBlock) => {
    const ref = block["ref"] as string | undefined;
    const type = block.type || "p";
    const blockContent = block.content || "";
    const lead = block.lead;

    // 解析引用
    const references = actions?.parseReferences
      ? actions.parseReferences(ref)
      : [];

    const renderResult = styleRenderer({
      block: { type, content: blockContent, lead, ref },
      references,
      hasReferences: (references || []).length > 0,
      MarkdownRenderer,
      EnhancedReferenceIndicator: ReferenceIndicatorComponent,
      onExpand: onExpandLine,
      contentId,
    });

    // 🎯 右侧操作按钮
    const rightActions = enableHoverEffects ? (
      <div className="flex items-center gap-2">
        {/* 复制按钮 */}
        <button
          onClick={() => handleCopyBlock(blockContent)}
          className="w-6 h-6 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-border hover:shadow-sm transition-all duration-200"
          title="复制内容"
        >
          <Copy className="w-3 h-3 text-muted-foreground" />
        </button>

        {/* 展开按钮 */}
        {onExpandLine && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpandLine({ type, content: blockContent, lead, ref });
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
              <EnhancedReferenceIndicator
                key={refNum}
                referenceNumber={refNum}
                contentId={contentId}
                className="w-5 h-5 text-xs"
              />
            ))}
            {(references || []).length > 3 && (
              <Badge variant="outline" className="h-5 px-1.5 text-xs">
                +{(references || []).length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    ) : undefined;

    return (
      <HoverableBlock
        key={block.index}
        enableHover={enableHoverEffects}
        hoverIntensity="subtle"
        showRightActions={!!rightActions}
        rightActions={rightActions}
        className="my-0.5"
      >
        <div className="relative">{renderResult.element}</div>
      </HoverableBlock>
    );
  };

  // 如果没有内容
  if (!content) {
    return <div className={cn("space-y-1", className)} />;
  }

  // 延迟渲染骨架屏
  if (enableDelayedRendering && !isContentReady) {
    return (
      <div className={cn("space-y-1", className)}>
        <ContentSkeleton
          variant="simple"
          blocks={3}
          animated={true}
          className="!p-0"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "max-w-none space-y-0.5 overflow-visible select-text",
        className,
      )}
    >
      {/* 错误统计 */}
      {stats.errorBlocks > 0 && showErrorDetails && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                解析了 {stats.validBlocks} 个有效块，{stats.errorBlocks}{" "}
                个错误块
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowErrors(!showErrors)}
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 mr-1 transition-transform",
                    showErrors && "rotate-180",
                  )}
                />
                {showErrors ? "隐藏" : "显示"}详情
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 渲染块 */}
      {blocks.map(renderBlock)}

      {/* 流式指示器 */}
      {isLoading && isStreaming && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>AI 正在分析中...</span>
        </div>
      )}
    </div>
  );
}

export default UnifiedJsonlRenderer;
