"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonLineWithExpandButton } from "./JsonLineWithExpandButton";
import { EnhancedReferenceIndicator, useReferenceManagerSafe } from "./ReferenceManager";

interface JsonlRendererProps {
  content: string;
  className?: string;
  enableHoverEffects?: boolean;
  /** callback when expand button is clicked on a JSON line */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  contentId?: string; // 用于引用管理器
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
  contentId,
}: JsonlRendererProps) {
  // 使用安全的 ReferenceManager
  const { actions } = useReferenceManagerSafe();

  if (!content) {
    return (
      <div
        data-testid="jsonl-renderer"
        className={cn("space-y-2", className)}
      />
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
    hasReferences?: boolean;
  }> = ({ children, hasReferences = false }) => {
    if (!enableHoverEffects) {
      return <>{children}</>;
    }

    return (
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-200 ease-out",
          "px-3 py-2 -mx-3 -my-2",
          "border border-transparent",
          hasReferences && "hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
        )}
      >
        {/* 主要内容 */}
        <div className="relative">{children}</div>
      </div>
    );
  };

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const type = (block["type"] || block["t"]) as string | undefined;
    const c = (block["content"] ?? block["c"]) as React.ReactNode;
    const ref = block["ref"] as string | undefined;
    const lead = block["lead"] as string | undefined;

    // 解析引用
    const references = actions.parseReferences(ref);
    const hasReferences = references.length > 0;

    const blockElement = (() => {
      switch (type) {
        case "h1":
          return (
            <div className="flex items-center justify-between">
              <h1 className="scroll-m-16 text-xl font-bold tracking-tight lg:text-2xl select-text leading-[1.3] flex-1">
                <MarkdownRenderer content={String(c)} />
              </h1>
              {hasReferences && (
                <EnhancedReferenceIndicator
                  references={references}
                  className="ml-4"
                />
              )}
            </div>
          );
        case "h2":
          return (
            <div className="flex items-center justify-between">
              <h2 className="scroll-m-16 border-b pb-1.5 text-lg font-semibold tracking-tight first:mt-0 select-text leading-[1.3] flex-1">
                <MarkdownRenderer content={String(c)} />
              </h2>
              {hasReferences && (
                <EnhancedReferenceIndicator
                  references={references}
                  className="ml-4"
                />
              )}
            </div>
          );
        case "h3":
          return (
            <div className="flex items-center justify-between">
              <h3 className="scroll-m-16 text-base font-semibold tracking-tight select-text leading-[1.3] flex-1">
                <MarkdownRenderer content={String(c)} />
              </h3>
              {hasReferences && (
                <EnhancedReferenceIndicator
                  references={references}
                  className="ml-4"
                />
              )}
            </div>
          );
        case "quote": {
          return (
            <blockquote className="italic border-l-2 pl-4 my-2 select-text">
              <div className="mb-1">
                <MarkdownRenderer content={String(c)} />
              </div>
              <div className="flex items-center justify-between mt-2">
                {ref && (
                  <cite className="text-xs text-gray-500 dark:text-gray-400 not-italic">
                    — {ref}
                  </cite>
                )}
                {hasReferences && (
                  <EnhancedReferenceIndicator
                    references={references}
                    className="ml-auto"
                  />
                )}
              </div>
            </blockquote>
          );
        }
        case "list": {
          // Expect c to be string or array
          let items: string[] = [];
          if (Array.isArray(c)) {
            items = c.map(String);
          } else if (typeof c === "string") {
            // Try splitting by common delimiters
            items = c.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
          }
          return (
            <div>
              <ul className="list-disc ml-4 space-y-1 my-2 select-text">
                {items.map((item, i) => (
                  <li key={i} className="select-text">
                    <MarkdownRenderer content={item} />
                  </li>
                ))}
              </ul>
              {hasReferences && (
                <div className="mt-2 flex justify-end">
                  <EnhancedReferenceIndicator references={references} />
                </div>
              )}
            </div>
          );
        }
        case "insight": {
          // Special insight styling
          return (
            <div className="my-3 rounded-md border-l-4 border-blue-500 bg-blue-50 p-3 dark:bg-blue-900/20 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <strong className="text-blue-600 dark:text-blue-400 text-sm font-medium mr-2">
                    💡 洞察:
                  </strong>
                  <span>
                    <MarkdownRenderer content={String(c)} />
                  </span>
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
        case "concept": {
          return (
            <div className="my-3 rounded-md border-l-4 border-purple-500 bg-purple-50 p-3 dark:bg-purple-900/20 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <strong className="text-purple-600 dark:text-purple-400 text-sm font-medium mr-2">
                    🎯 概念:
                  </strong>
                  <span>
                    <MarkdownRenderer content={String(c)} />
                  </span>
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
        case "qa": {
          // Expect c to be {q: string, a: string}
          if (typeof c === "object" && c !== null) {
            const q = (c as any)["q"] || (c as any)["question"];
            const a = (c as any)["a"] || (c as any)["answer"];
            return (
              <div className="my-3 space-y-1 select-text">
                <p className="font-semibold select-text">
                  Q: <MarkdownRenderer content={String(q)} />
                </p>
                <p className="select-text">
                  A: <MarkdownRenderer content={String(a)} />
                </p>
                {hasReferences && (
                  <div className="mt-2 flex justify-end">
                    <EnhancedReferenceIndicator references={references} />
                  </div>
                )}
              </div>
            );
          }
          return (
            <div>
              <p className="my-2 select-text">
                <MarkdownRenderer content={String(c)} />
              </p>
              {hasReferences && (
                <div className="mt-2 flex justify-end">
                  <EnhancedReferenceIndicator references={references} />
                </div>
              )}
            </div>
          );
        }
        case "action":
          return (
            <div className="my-3 rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-900/20 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <strong className="text-green-600 dark:text-green-400 text-sm font-medium mr-2">
                    ⚡ 行动:
                  </strong>
                  <span>
                    <MarkdownRenderer content={String(c)} />
                  </span>
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
        default: {
          // Default paragraph with lead support
          const finalContent = lead ? `**${lead}:** ${String(c)}` : String(c);
          return (
            <div className="leading-6 my-2 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <MarkdownRenderer content={finalContent} />
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
      }
    })();

    // 统一封装：先用 BlockWrapper 提供引用高亮，再在内部使用 JsonLineWithExpandButton
    return (
      <BlockWrapper key={idx} hasReferences={hasReferences}>
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
        "max-w-none space-y-1",
        // 确保整个容器支持文本选择
        "select-text",
        className,
      )}
    >
      {blocks.map(renderBlock)}
    </div>
  );
} 