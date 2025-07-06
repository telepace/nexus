"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface JsonlRendererProps {
  /** raw JSONL string, each line is a JSON object */
  content: string | null | undefined;
  /** additional class names for the outer container */
  className?: string;
  /** whether to enable hover effects for each block */
  enableHoverEffects?: boolean;
}

/**
 * Minimalistic JSON-Line renderer with Notion-style hover effects.
 *
 * The LLM returns one JSON object per line, each object contains at least:
 * - `type` | `t`: block type
 * - `content` | `c`: block content
 * - `mapping`: optional mapping id
 *
 * Additional custom fields are preserved and passed to specialised renderers
 * (e.g. priority on `insight`).
 */
export function JsonlRenderer({ 
  content, 
  className, 
  enableHoverEffects = true 
}: JsonlRendererProps) {
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);

  if (!content) {
    return (
      <div
        data-testid="jsonl-renderer"
        className={cn("space-y-2", className)}
      />
    );
  }

  // Split into lines & parse
  const blocks = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        // If parsing fails, wrap line as a paragraph block so we still show it
        return { type: "p", content: line } as Record<string, unknown>;
      }
    });

  const handleCopyBlock = async (blockContent: string, blockType: string) => {
    try {
      await navigator.clipboard.writeText(blockContent);
      toast.success(`已复制${getBlockTypeLabel(blockType)}内容`);
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      h1: "标题",
      h2: "副标题", 
      h3: "小标题",
      p: "段落",
      quote: "引用",
      list: "列表",
      insight: "洞察",
      concept: "概念",
      qa: "问答",
      action: "行动"
    };
    return labels[type] || "内容";
  };

  const BlockWrapper: React.FC<{
    children: React.ReactNode;
    blockIndex: number;
    blockType: string;
    blockContent: string;
  }> = ({ children, blockIndex, blockType, blockContent }) => {
    if (!enableHoverEffects) {
      return <>{children}</>;
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
          isHovered && "bg-slate-50/60 dark:bg-slate-800/40 shadow-sm border-slate-200/60 dark:border-slate-700/60"
        )}
        onMouseEnter={() => setHoveredBlock(blockIndex)}
        onMouseLeave={() => setHoveredBlock(null)}
      >
        {/* 主要内容 */}
        <div className="relative">
          {children}
        </div>

        {/* 悬停时显示的操作按钮 */}
        <div className={cn(
          "absolute top-2 right-2 flex items-center gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyBlock(blockContent, blockType);
            }}
            className={cn(
              "p-1.5 rounded-md text-slate-500 hover:text-slate-700",
              "hover:bg-white dark:hover:bg-slate-700 transition-colors duration-150",
              "shadow-sm border border-slate-200/60 dark:border-slate-600/60",
              "backdrop-blur-sm bg-white/80 dark:bg-slate-800/80"
            )}
            title={`复制${getBlockTypeLabel(blockType)}`}
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const type = (block["type"] || block["t"]) as string | undefined;
    const c = block["content"] ?? block["c"];
    const blockContent = typeof c === "string" ? c : JSON.stringify(c);

    const blockElement = (() => {
      switch (type) {
        case "h1":
          return (
            <h1 className="scroll-m-16 text-2xl font-bold tracking-tight lg:text-3xl select-text">
              {c as React.ReactNode}
            </h1>
          );
        case "h2":
          return (
            <h2 className="scroll-m-16 border-b pb-1.5 text-xl font-semibold tracking-tight first:mt-0 select-text">
              {c as React.ReactNode}
            </h2>
          );
        case "h3":
          return (
            <h3 className="scroll-m-16 text-lg font-medium tracking-tight select-text">
              {c as React.ReactNode}
            </h3>
          );
        case "quote":
          {
            const ref = block["ref"] as string | undefined;
            return (
              <blockquote className="italic border-l-2 pl-4 my-2 select-text">
                <div className="mb-1">{c as React.ReactNode}</div>
                {ref && (
                  <cite className="text-xs text-gray-500 dark:text-gray-400 not-italic">
                    — {ref}
                  </cite>
                )}
              </blockquote>
            );
          }
        case "list": {
          // Content can be array or string (comma separated)
          const items: string[] = Array.isArray(c)
            ? (c as string[])
            : typeof c === "string"
              ? (c as string).split(/[\n,；;]/).map((s) => s.trim()).filter(Boolean)
              : [];
          return (
            <ul className="list-disc ml-4 space-y-1 my-2 select-text">
              {items.map((item, i) => (
                <li key={i} className="select-text">{item}</li>
              ))}
            </ul>
          );
        }
        case "insight": {
          const priority = (block["priority"] as string) || "normal";
          const color = priority === "high" ? "border-red-500" : "border-blue-500";
          return (
            <div
              className={cn(
                "my-3 rounded-md border-l-4 bg-blue-50 p-3 dark:bg-blue-900/20 select-text",
                color,
              )}
            >
              {c as React.ReactNode}
            </div>
          );
        }
        case "concept": {
          return (
            <div className="my-3 rounded-md border-l-4 border-purple-500 bg-purple-50 p-3 dark:bg-purple-900/20 select-text">
              <strong className="mr-2">概念:</strong>
              {c as React.ReactNode}
            </div>
          );
        }
        case "qa": {
          // Expect c to be {q: string, a: string}
          if (typeof c === "object" && c !== null) {
            const q = (c as any)["q"] || (c as any)["question"];
            const a = (c as any)["a"] || (c as any)["answer"];
            return (
              <div className="my-3 space-y-1 select-text">
                <p className="font-semibold select-text">Q: {q}</p>
                <p className="select-text">A: {a}</p>
              </div>
            );
          }
          return (
            <p className="my-2 select-text">
              {c as React.ReactNode}
            </p>
          );
        }
        case "action":
          return (
            <div className="my-3 rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-900/20 select-text">
              <strong className="mr-2">行动:</strong>
              {c as React.ReactNode}
            </div>
          );
        default:
          // Default paragraph
          return (
            <p className="leading-6 my-2 select-text">
              {c as React.ReactNode}
            </p>
          );
      }
    })();

    return (
      <BlockWrapper
        key={idx}
        blockIndex={idx}
        blockType={type || "p"}
        blockContent={blockContent}
      >
        {blockElement}
      </BlockWrapper>
    );
  };

  return (
    <div
      data-testid="jsonl-renderer"
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none space-y-1",
        // 确保整个容器支持文本选择
        "select-text",
        className
      )}
    >
      {blocks.map(renderBlock)}
    </div>
  );
} 