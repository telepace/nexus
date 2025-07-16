"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { toast } from "sonner";

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
}: StreamingJsonlRendererProps) {
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);

  // 使用安全的 ReferenceManager
  const { actions } = useReferenceManagerSafe();

  // 解析 JSONL 内容为可渲染的块
  const blocks = useMemo(() => {
    if (!content) return [];

    const lines = content.split("\n");
    const parsedBlocks: JsonlBlock[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      try {
        // 尝试解析完整的 JSON 行
        const parsed = JSON.parse(trimmedLine);
        const type = parsed.type || parsed.t || "p";
        const blockContent = parsed.content || parsed.c || "";
        const lead = parsed.lead; // 提取 lead 字段
        const ref = parsed.ref; // 提取 ref 字段

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

  const handleCopyBlock = async (blockContent: string, blockType: string) => {
    try {
      await navigator.clipboard.writeText(blockContent);
      toast.success(`已复制${getBlockTypeLabel(blockType)}内容`);
    } catch {
      toast.error("复制失败");
    }
  };

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      h1: "一级标题",
      h2: "二级标题",
      h3: "三级标题",
      p: "段落",
      quote: "引用",
      list: "列表",
      insight: "洞察",
      concept: "概念",
      qa: "问答",
      action: "行动",
    };
    return labels[type] || "内容";
  };

  const BlockWrapper: React.FC<{
    children: React.ReactNode;
    blockIndex: number;
    blockType: string;
    blockContent: string;
    isComplete: boolean;
  }> = ({ children, blockIndex, blockType, blockContent, isComplete }) => {
    if (!enableHoverEffects) {
      return <div className={cn(!isComplete && "opacity-60")}>{children}</div>;
    }

    const isHovered = hoveredBlock === blockIndex;

    return (
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-200 ease-out",
          "hover:bg-slate-50/60 dark:hover:bg-slate-800/40",
          "hover:shadow-sm hover:border-slate-200/60 dark:hover:border-slate-700/60",
          "px-3 py-2 -mx-3 -my-2",
          "border border-transparent",
          isHovered &&
            "bg-slate-50/60 dark:bg-slate-800/40 shadow-sm border-slate-200/60 dark:border-slate-700/60",
          !isComplete &&
            "opacity-60 border-dashed border-gray-300 dark:border-gray-600",
        )}
        onMouseEnter={() => setHoveredBlock(blockIndex)}
        onMouseLeave={() => setHoveredBlock(null)}
      >
        {/* 主要内容 */}
        <div className="relative">{children}</div>

        {/* 悬停时显示的操作按钮 */}
        {isComplete && (
          <div
            className={cn(
              "absolute top-2 right-2 flex items-center gap-1",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyBlock(blockContent, blockType);
              }}
              className={cn(
                "p-1.5 rounded-md text-slate-500 hover:text-slate-700",
                "hover:bg-white dark:hover:bg-slate-700 transition-colors duration-150",
                "shadow-sm border border-slate-200/60 dark:border-slate-600/60",
                "backdrop-blur-sm bg-white/80 dark:bg-slate-800/80",
              )}
              title={`复制${getBlockTypeLabel(blockType)}`}
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderBlock = (block: JsonlBlock) => {
    const { type, content, lead, ref, index, isComplete } = block;

    const blockElement = (() => {
      switch (type) {
        case "h1":
          return (
            <h1 className="scroll-m-16 text-2xl font-bold tracking-tight lg:text-3xl select-text">
              {content}
            </h1>
          );
        case "h2":
          return (
            <h2 className="scroll-m-16 border-b pb-1.5 text-xl font-semibold tracking-tight first:mt-0 select-text">
              {content}
            </h2>
          );
        case "h3":
          return (
            <h3 className="scroll-m-16 text-lg font-medium tracking-tight select-text">
              {content}
            </h3>
          );
        case "quote":
          return (
            <blockquote className="italic border-l-2 pl-4 my-2 select-text">
              <div className="mb-1">{content}</div>
              {ref && (
                <cite className="text-xs text-muted-foreground not-italic">
                  — {ref}
                </cite>
              )}
            </blockquote>
          );
        case "list": {
          // 处理列表内容
          const items = Array.isArray(content)
            ? content
            : typeof content === "string"
              ? content
                  .split(/[\n,；;]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
          return (
            <ul className="list-disc ml-4 space-y-1 my-2 select-text">
              {items.map((item, i) => (
                <li key={i} className="select-text">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        case "insight": {
          return (
            <div className="my-3 rounded-md border-l-4 border-blue-500 bg-blue-50 p-3 dark:bg-blue-900/20 select-text">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  💡 洞察
                </span>
                <span className="flex-1">{content}</span>
              </div>
              {ref && (
                <div className="text-xs text-muted-foreground mt-2">
                  参考: {ref}
                </div>
              )}
            </div>
          );
        }
        case "concept": {
          return (
            <div className="my-3 rounded-md border-l-4 border-purple-500 bg-purple-50 p-3 dark:bg-purple-900/20 select-text">
              <div className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                  🎯 概念
                </span>
                <span className="flex-1">{content}</span>
              </div>
            </div>
          );
        }
        case "qa": {
          // 如果内容包含 Q: 和 A:，则分别处理
          if (
            typeof content === "string" &&
            content.includes("Q:") &&
            content.includes("A:")
          ) {
            const parts = content.split("A:");
            const question = parts[0].replace("Q:", "").trim();
            const answer = parts[1]?.trim() || "";
            return (
              <div className="my-3 space-y-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md select-text">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  ❓ {question}
                </div>
                <div className="text-gray-700 dark:text-gray-300 ml-4">
                  💬 {answer}
                </div>
              </div>
            );
          }
          return (
            <div className="my-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md select-text">
              {content}
            </div>
          );
        }
        case "action":
          return (
            <div className="my-3 rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-900/20 select-text">
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                  ⚡ 行动
                </span>
                <span className="flex-1">{content}</span>
              </div>
            </div>
          );
        default:
          // 默认段落 - 处理 lead 字段和 ref 字段
          const references = actions.parseReferences(ref);
          const hasReferences = references.length > 0;

          return (
            <div className="leading-6 my-2 select-text text-foreground">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {lead && (
                    <span className="font-semibold text-foreground">
                      {lead}:{" "}
                    </span>
                  )}
                  <span>{content}</span>
                </div>
                {hasReferences && (
                  <EnhancedReferenceIndicator
                    references={references}
                    className="shrink-0"
                  />
                )}
              </div>
            </div>
          );
      }
    })();

    return (
      <BlockWrapper
        key={`${index}-${type}`}
        blockIndex={index}
        blockType={type}
        blockContent={content}
        isComplete={isComplete}
      >
        {blockElement}
      </BlockWrapper>
    );
  };

  if (!content && !isLoading) {
    return (
      <div
        data-testid="streaming-jsonl-renderer"
        className={cn("text-muted-foreground text-sm", className)}
      >
        暂无内容
      </div>
    );
  }

  return (
    <div
      data-testid="streaming-jsonl-renderer"
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none space-y-1",
        "select-text",
        className,
      )}
    >
      {blocks.map(renderBlock)}

      {/* 流式指示器 */}
      {isLoading && showStreamingIndicator && (
        <div className="flex items-center gap-2 mt-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />
            <span className="text-xs">正在生成内容...</span>
          </div>
        </div>
      )}
    </div>
  );
}
