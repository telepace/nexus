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
  /** Original content ID used for reference resolution */
  contentId?: string;
  /** Callback when expand button is clicked on a JSON line */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
}

/**
 * Universal content renderer that automatically detects format and renders accordingly.
 * Supports JSONL, JSON objects, and Markdown content with automatic fallback.
 */
export function UniversalContentRenderer({ 
  content, 
  className,
  contentId,
  onExpandLine
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
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
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
      <div data-testid="universal-content-renderer" className={className}>
        <JsonlRenderer content={content} contentId={contentId} onExpandLine={onExpandLine} />
      </div>
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
        <MarkdownRenderer content={content} />
      </div>
    );
  }
} 