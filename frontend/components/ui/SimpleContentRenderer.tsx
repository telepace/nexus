"use client";

import React from "react";
import { ShareMarkdownRenderer } from "@/components/ui/ShareMarkdownRenderer";
import { TextSelectionFloater } from "@/components/ui/text-selection-floater";

interface SimpleContentRendererProps {
  content: string;
  title?: string;
  className?: string;
  /** 是否启用文本选择浮层 */
  enableTextSelection?: boolean;
  /** 文本选择回调 */
  onTextAction?: (
    action: { id: string; label: string; prompt: string },
    selectedText: string,
  ) => void;
}

/**
 * SimpleContentRenderer provides clean, straightforward content rendering
 * Similar to the share page layout but optimized for the reader experience
 * No virtual scrolling complexity - just clean, readable content
 */
export const SimpleContentRenderer: React.FC<SimpleContentRendererProps> = ({
  content,
  title,
  className = "",
  enableTextSelection = true,
  onTextAction,
}) => {
  return (
    <div className={`h-full overflow-y-auto ${className}`}>
      <div className="max-w-none content-area" data-testid="content-renderer">
        {/* Title section - if provided */}
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold leading-tight text-neutral-900 dark:text-neutral-100">
              {title}
            </h1>
          </div>
        )}

        {/* Content Area - 使用与分享页面一致的渲染器 */}
        <ShareMarkdownRenderer
          content={content}
          className="
            leading-relaxed text-foreground
            [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
            [&_p]:break-words [&_div]:break-words [&_span]:break-words
            [&_pre]:break-words [&_code]:break-words
            [&_table]:table-auto [&_table]:w-full
            selection:bg-blue-100 dark:selection:bg-blue-900/30
          "
        />
      </div>

      {/* 文本选择浮层 */}
      {enableTextSelection && (
        <TextSelectionFloater
          enabled={true}
          containerSelector=".content-area"
          excludeSelector=".sidebar, .panel, .analysis-card, .llm-analysis-card, .ai-analysis-card, .content-analysis-sidebar, [data-exclude-selection]"
          onAction={onTextAction}
          zIndex={1050}
        />
      )}
    </div>
  );
};

export default SimpleContentRenderer;
