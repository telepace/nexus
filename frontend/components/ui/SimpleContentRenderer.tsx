"use client";

import React from "react";
import { ShareMarkdownRenderer } from "./ShareMarkdownRenderer";

interface SimpleContentRendererProps {
  content: string;
  title?: string;
  className?: string;
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
}) => {
  return (
    <div className={`h-full overflow-y-auto ${className}`}>
      <div className="max-w-none">
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
    </div>
  );
};

export default SimpleContentRenderer; 