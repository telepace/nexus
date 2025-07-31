"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { HoverableBlock } from "./HoverableBlock";
import { Badge } from "@/components/ui/badge";

import {
  EnhancedReferenceIndicator,
  useReferenceManagerSafe,
} from "./ReferenceManager";

interface StreamingJsonlRendererProps {
  /** 流式 JSONL 内容 */
  content: string;
  /** 是否正在加载中 */
  isLoading?: boolean;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 是否启用悬停效果 */
  enableHoverEffects?: boolean;
  /** 是否显示流式指示器 */
  showStreamingIndicator?: boolean;
  contentId?: string; // 用于引用管理器
}

interface JsonlBlock {
  type: string;
  content: string;
  lead?: string; // 添加 lead 字段支持
  ref?: string; // 添加 ref 字段支持
  raw: string;
  index: number;
  isComplete: boolean;
}

/**
 * 流式 JSONL 渲染器 - 支持实时块级渲染
 *
 * 特点：
 * 1. 实时解析每个完整的 JSON 行
 * 2. 即时渲染完整的块，无需等待防抖
 * 3. 处理不完整的 JSON 行（流式传输中）
 * 4. 支持多种块类型的视觉渲染
 */
export function StreamingJsonlRenderer({
  content,
  isLoading = false,
  className,
  enableHoverEffects = true,
  showStreamingIndicator = true,
  contentId,
}: StreamingJsonlRendererProps) {
  // 使用安全的 ReferenceManager
  const { actions } = useReferenceManagerSafe();

  // 解析 JSONL 内容为可渲染的块
  const blocks = useMemo(() => {
    if (!content || typeof content !== 'string') return [];

    const lines = content.split("\n");
    const parsedBlocks: JsonlBlock[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      try {
        // 尝试解析完整的 JSON 行
        const parsed = JSON.parse(trimmedLine);
        const type = String(parsed.type || parsed.t || "p");
        const blockContent = String(parsed.content || parsed.c || "");
        const lead = parsed.lead ? String(parsed.lead) : undefined; // 提取 lead 字段
        const ref = parsed.ref ? String(parsed.ref) : undefined; // 提取 ref 字段

        parsedBlocks.push({
          type,
          content: blockContent,
          lead,
          ref,
          raw: trimmedLine,
          index,
          isComplete: true,
        });
      } catch {
        // 如果解析失败，可能是不完整的行（流式传输中）
        // 只在非加载状态或者看起来是完整行时显示错误行
        if (!isLoading || trimmedLine.includes("}")) {
          parsedBlocks.push({
            type: "p",
            content: trimmedLine,
            raw: trimmedLine,
            index,
            isComplete: false,
          });
        }
      }
    });

    return parsedBlocks;
  }, [content, isLoading]);

  // 复制功能
  const handleCopyBlock = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  // 渲染单个块
  const renderBlock = (block: JsonlBlock) => {
    const { type, content: blockContent, lead, ref, isComplete } = block;

    // 解析引用
    const references = actions?.parseReferences ? actions.parseReferences(ref) : [];

    // 根据类型选择样式
    const getBlockStyles = () => {
      switch (type) {
        case "h1":
          return "text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4";
        case "h2":
          return "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-200 dark:border-border pb-2";
        case "h3":
          return "text-lg font-medium text-gray-800 dark:text-gray-200 mb-2";
        case "insight":
          return "text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-blue-400 dark:border-blue-500";
        case "summary":
          return "text-sm leading-relaxed text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg";
        case "list":
          return "text-sm leading-relaxed text-gray-700 dark:text-gray-300";
        case "code":
          return "text-sm font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-border";
        default:
          return "text-sm leading-relaxed text-gray-700 dark:text-gray-300";
      }
    };

    // 🎯 右侧操作按钮
    const rightActions = enableHoverEffects ? (
      <div className="flex items-center gap-2">
        {/* 复制按钮 */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(blockContent || "");
          }}
          className="w-6 h-6 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-border hover:shadow-sm transition-all duration-200"
          title="复制内容"
        >
          <Copy className="w-3 h-3 text-muted-foreground" />
        </button>

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
        className={cn(
          "my-1",
          !isComplete && "opacity-70"
        )}
      >
        <div className={cn(getBlockStyles(), "relative")}>
          {/* Lead 文本（如果存在） */}
          {lead && (
            <div className="text-xs text-muted-foreground mb-2 font-medium">
              {lead}
            </div>
          )}
          
          {/* 主要内容 */}
          {type === "list" ? (
            <div className="space-y-2">
              {(blockContent || "").split("\n").map((listItem, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span className="whitespace-pre-wrap">{(listItem || "").trim()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{blockContent || ""}</div>
          )}
        </div>
      </HoverableBlock>
    );
  };

  if (!content && !isLoading) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        暂无内容
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {blocks.map(renderBlock)}
      
      {/* 流式指示器 */}
      {isLoading && showStreamingIndicator && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>AI 正在分析中...</span>
        </div>
      )}
    </div>
  );
}
