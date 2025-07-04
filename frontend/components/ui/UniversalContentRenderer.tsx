"use client";

import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonlRenderer } from "./JsonlRenderer";
import { cn } from "@/lib/utils";

interface UniversalContentRendererProps {
  /** Content string that could be JSONL or Markdown format */
  content: string | null | undefined;
  /** Additional class names for the container */
  className?: string;
}

/**
 * Universal content renderer that automatically detects format and renders accordingly.
 * Supports both JSONL and Markdown content with automatic fallback.
 */
export function UniversalContentRenderer({ 
  content, 
  className 
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
        <JsonlRenderer content={content} />
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