"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface JsonlRendererProps {
  /** raw JSONL string, each line is a JSON object */
  content: string | null | undefined;
  /** additional class names for the outer container */
  className?: string;
}

/**
 * Minimalistic JSON-Line renderer.
 *
 * The LLM returns one JSON object per line, each object contains at least:
 * - `type` | `t`: block type
 * - `content` | `c`: block content
 * - `mapping`: optional mapping id
 *
 * Additional custom fields are preserved and passed to specialised renderers
 * (e.g. priority on `insight`).
 */
export function JsonlRenderer({ content, className }: JsonlRendererProps) {
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

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const type = (block["type"] || block["t"]) as string | undefined;
    const c = block["content"] ?? block["c"];

    switch (type) {
      case "h1":
        return (
          <h1
            key={idx}
            className="scroll-m-16 text-2xl font-bold tracking-tight lg:text-3xl"
          >
            {c as React.ReactNode}
          </h1>
        );
      case "h2":
        return (
          <h2
            key={idx}
            className="scroll-m-16 border-b pb-1.5 text-xl font-semibold tracking-tight first:mt-0"
          >
            {c as React.ReactNode}
          </h2>
        );
      case "h3":
        return (
          <h3
            key={idx}
            className="scroll-m-16 text-lg font-medium tracking-tight"
          >
            {c as React.ReactNode}
          </h3>
        );
      case "quote":
        return (
          <blockquote key={idx} className="italic border-l-2 pl-4 my-2">
            {c as React.ReactNode}
          </blockquote>
        );
      case "list": {
        // Content can be array or string (comma separated)
        const items: string[] = Array.isArray(c)
          ? (c as string[])
          : typeof c === "string"
            ? (c as string).split(/[\n,；;]/).map((s) => s.trim()).filter(Boolean)
            : [];
        return (
          <ul key={idx} className="list-disc ml-4 space-y-1 my-2">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }
      case "insight": {
        const priority = (block["priority"] as string) || "normal";
        const color = priority === "high" ? "border-red-500" : "border-blue-500";
        return (
          <div
            key={idx}
            className={cn(
              "my-3 rounded-md border-l-4 bg-blue-50 p-3 dark:bg-blue-900/20",
              color,
            )}
          >
            {c as React.ReactNode}
          </div>
        );
      }
      case "concept": {
        return (
          <div
            key={idx}
            className="my-3 rounded-md border-l-4 border-purple-500 bg-purple-50 p-3 dark:bg-purple-900/20"
          >
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
            <div key={idx} className="my-3 space-y-1">
              <p className="font-semibold">Q: {q}</p>
              <p>A: {a}</p>
            </div>
          );
        }
        return (
          <p key={idx} className="my-2">
            {c as React.ReactNode}
          </p>
        );
      }
      case "action":
        return (
          <div
            key={idx}
            className="my-3 rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-900/20"
          >
            <strong className="mr-2">行动:</strong>
            {c as React.ReactNode}
          </div>
        );
      default:
        // Default paragraph
        return (
          <p key={idx} className="leading-6 my-2">
            {c as React.ReactNode}
          </p>
        );
    }
  };

  return (
    <div
      data-testid="jsonl-renderer"
      className={cn("prose prose-slate dark:prose-invert max-w-none", className)}
    >
      {blocks.map(renderBlock)}
    </div>
  );
} 