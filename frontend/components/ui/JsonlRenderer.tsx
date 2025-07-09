"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

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
  enableHoverEffects = true,
}: JsonlRendererProps) {
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
          "px-3 py-2 -mx-3 -my-2",
          "border border-transparent",
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

    const blockElement = (() => {
      switch (type) {
        case "h1":
          return (
            <h1 className="scroll-m-16 text-2xl font-bold tracking-tight lg:text-3xl select-text">
              <MarkdownRenderer content={String(c)} />
            </h1>
          );
        case "h2":
          return (
            <h2 className="scroll-m-16 border-b pb-1.5 text-xl font-semibold tracking-tight first:mt-0 select-text">
              <MarkdownRenderer content={String(c)} />
            </h2>
          );
        case "h3":
          return (
            <h3 className="scroll-m-16 text-lg font-medium tracking-tight select-text">
              <MarkdownRenderer content={String(c)} />
            </h3>
          );
        case "quote": {
          const ref = block["ref"] as string | undefined;
          return (
            <blockquote className="italic border-l-2 pl-4 my-2 select-text">
              <div className="mb-1">
                <MarkdownRenderer content={String(c)} />
              </div>
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
            ? (c as string)
                .split(/[\n,；;]/)
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
          return (
            <ul className="list-disc ml-4 space-y-1 my-2 select-text">
              {items.map((item, i) => (
                <li key={i} className="select-text">
                  <MarkdownRenderer content={item} />
                </li>
              ))}
            </ul>
          );
        }
        case "insight": {
          const priority = (block["priority"] as string) || "normal";
          const color =
            priority === "high" ? "border-red-500" : "border-blue-500";
          return (
            <div
              className={cn(
                "my-3 rounded-md border-l-4 bg-blue-50 p-3 dark:bg-blue-900/20 select-text",
                color,
              )}
            >
              <MarkdownRenderer content={String(c)} />
            </div>
          );
        }
        case "concept": {
          return (
            <div className="my-3 rounded-md border-l-4 border-purple-500 bg-purple-50 p-3 dark:bg-purple-900/20 select-text">
              <strong className="mr-2">概念:</strong>
              <MarkdownRenderer content={String(c)} />
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
              </div>
            );
          }
          return (
            <p className="my-2 select-text">
              <MarkdownRenderer content={String(c)} />
            </p>
          );
        }
        case "action":
          return (
            <div className="my-3 rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-900/20 select-text">
              <strong className="mr-2">行动:</strong>
              <MarkdownRenderer content={String(c)} />
            </div>
          );
        default:
          // Default paragraph
          return (
            <div className="leading-6 my-2 select-text">
              <MarkdownRenderer content={String(c)} />
            </div>
          );
      }
    })();

    return <BlockWrapper key={idx}>{blockElement}</BlockWrapper>;
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