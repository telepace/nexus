"use client";

import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ContentChunk } from "@/lib/api/content";

interface ChunkItemProps {
  chunk: ContentChunk & { key?: string };
}

export const ChunkItem = React.memo<ChunkItemProps>(({ chunk }) => (
  <div
    className="chunk-item py-4 border-b border-muted/5 last:border-b-0 min-h-[200px]"
    data-chunk-id={chunk.id}
    data-paragraph-index={chunk.index}
    data-paragraph-content={chunk.content.substring(0, 100)} // 用于调试
  >
    <div className="chunk-content max-w-none">
      <MarkdownRenderer
        content={chunk.content}
        className="prose prose-base lg:prose-lg dark:prose-invert max-w-none 
                   prose-headings:text-foreground prose-headings:font-semibold prose-headings:leading-tight
                   prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-3
                   prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-4 prose-h1:first:mt-0
                   prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 
                   prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
                   prose-h4:text-base prose-h4:mt-3 prose-h4:mb-2
                   prose-li:text-foreground prose-li:mb-1 prose-li:leading-relaxed
                   prose-ul:mb-3 prose-ol:mb-3
                   prose-strong:text-foreground prose-strong:font-semibold
                   prose-em:text-foreground
                   prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary/30 prose-blockquote:pl-4 prose-blockquote:italic
                   prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                   prose-pre:bg-muted prose-pre:border prose-pre:border-muted prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:text-sm
                   prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:transition-colors
                   prose-img:rounded-lg prose-img:shadow-sm prose-img:max-w-full prose-img:h-auto
                   prose-table:border prose-table:border-muted
                   prose-th:border prose-th:border-muted prose-th:bg-muted/30 prose-th:px-3 prose-th:py-2
                   prose-td:border prose-td:border-muted prose-td:px-3 prose-td:py-2
                   [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                   [&_p]:break-words [&_div]:break-words [&_span]:break-words
                   line-height-[1.6]"
      />
    </div>
  </div>
));

ChunkItem.displayName = "ChunkItem";
