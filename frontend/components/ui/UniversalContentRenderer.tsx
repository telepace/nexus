"use client";

import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonlRenderer } from "./JsonlRenderer";
import { JsonObjectRenderer } from "./JsonObjectRenderer";
import { cn } from "@/lib/utils";

interface UniversalContentRendererProps {
  /** Content string that could be JSONL, JSON object, or Markdown format */
  content: string | null | undefined;
  /** Additional class names for the container */
  className?: string;
  /** Callback when expand button is clicked on a JSON line */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  /** 是否启用延迟渲染（仅对JSONL内容有效） */
  enableDelayedRendering?: boolean;
  /** 延迟渲染的延迟时间（毫秒） */
  renderDelay?: number;
  /** 内容ID，用于获取引用数据 */
  contentId?: string;
  /** 是否启用增强的引用tooltip */
  enableEnhancedTooltip?: boolean;
  /** 引用点击回调 */
  onReferenceClick?: (refId: number) => void;
}

/**
 * Universal content renderer that automatically detects format and renders accordingly.
 * Supports JSONL, JSON objects, and Markdown content with automatic fallback.
 */
export function UniversalContentRenderer({
  content,
  className,
  onExpandLine,
  enableDelayedRendering = false,
  renderDelay = 400,
  contentId,
  enableEnhancedTooltip = true,
  onReferenceClick,
}: UniversalContentRendererProps) {
  // Helper to detect JSONL format (same logic as in llm-analysis-card)
  const isJsonl = (str: string): boolean => {
    try {
      const firstLine = str.trim().split("\n").find(Boolean);
      if (!firstLine) return false;
      const parsed = JSON.parse(firstLine);
      return (
        typeof parsed === "object" &&
        parsed !== null &&
        ("type" in parsed || "t" in parsed) &&
        ("content" in parsed || "c" in parsed)
      );
    } catch {
      return false;
    }
  };

  // Helper to detect JSON object format
  const isJsonObject = (str: string): boolean => {
    try {
      const trimmed = str.trim();
      // Check if it starts and ends with {} or []
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        JSON.parse(trimmed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  if (!content) {
    return (
      <div
        data-testid="universal-content-renderer"
        className={cn("space-y-2", className)}
      />
    );
  }

  // Auto-detect format and render accordingly
  if (isJsonl(content)) {
    return (
      <JsonlRenderer
        content={content}
        className={className}
        enableHoverEffects={true} // 🎯 确保启用悬浮效果
        onExpandLine={onExpandLine}
        enableDelayedRendering={enableDelayedRendering}
        renderDelay={renderDelay}
        contentId={contentId}
        enableEnhancedTooltip={enableEnhancedTooltip}
        onReferenceClick={onReferenceClick}
      />
    );
  } else if (isJsonObject(content)) {
    return (
      <div data-testid="universal-content-renderer" className={className}>
        <JsonObjectRenderer data={content} />
      </div>
    );
  } else {
    return (
      <div data-testid="universal-content-renderer" className={className}>
        <MarkdownRenderer 
          content={content} 
          contentId={contentId}
          enableEnhancedTooltip={enableEnhancedTooltip}
          onReferenceClick={onReferenceClick}
        />
      </div>
    );
  }
}
