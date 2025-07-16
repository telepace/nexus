"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChunkItem } from "./ChunkItem";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  ReferenceManagerProvider,
  useReferenceManagerSafe,
  createParagraphHighlightStyles,
} from "./ReferenceManager";

interface EnhancedContentReaderProps {
  content?: string;
  chunks?: Array<{
    id: string;
    index: number;
    content: string;
    type?: string;
  }>;
  className?: string;
  contentId?: string;
}

export const EnhancedContentReader: React.FC<EnhancedContentReaderProps> = ({
  content,
  chunks,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedParagraphs, setHighlightedParagraphs] = useState<
    Set<number>
  >(new Set());
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(
    null,
  );

  // 处理跳转到段落的事件
  const handleJumpToParagraph = useCallback(
    (event: CustomEvent) => {
      const { refId, paragraphId } = event.detail;

      console.log("🔍 EnhancedContentReader: 收到跳转事件", {
        refId,
        paragraphId,
        chunks,
      });

      // 查找对应的段落元素
      if (containerRef.current) {
        // 如果是分块模式，查找对应的chunk
        if (chunks) {
          console.log("📊 分块模式：查找chunk", {
            refId,
            chunksLength: chunks.length,
          });

          // 查找匹配的chunk - 支持两种索引模式
          // 1. 直接匹配index（适用于已转换的数据，index从1开始）
          let targetChunk = chunks.find((chunk) => chunk.index === refId);

          // 2. 如果没找到，尝试用refId-1匹配（适用于原始API数据，index从0开始）
          if (!targetChunk && refId > 0) {
            targetChunk = chunks.find((chunk) => chunk.index === refId - 1);
          }

          // 3. 如果还没找到，按数组索引查找（最后的容错方案）
          if (!targetChunk && refId > 0 && refId <= chunks.length) {
            targetChunk = chunks[refId - 1]; // refId是1-based，数组是0-based
          }

          console.log("🎯 找到的目标chunk:", targetChunk, {
            searchMethod: targetChunk
              ? chunks.find((c) => c.index === refId)
                ? "direct-match"
                : chunks.find((c) => c.index === refId - 1)
                  ? "index-offset"
                  : "array-index"
              : "not-found",
            availableIndexes: chunks.map((c) => c.index).slice(0, 5), // 只显示前5个避免��志过长
          });

          if (targetChunk) {
            // 方法1: 通过data-chunk-id查找
            let chunkElement = containerRef.current.querySelector(
              `[data-chunk-id="${targetChunk.id}"]`,
            );

            // 方法2: 如果方法1失败，通过data-paragraph-index查找
            if (!chunkElement) {
              chunkElement = containerRef.current.querySelector(
                `[data-paragraph-index="${targetChunk.index}"]`,
              );
            }

            // 方法3: 如果还是没找到，尝试通过nth-child查找
            if (!chunkElement) {
              const allChunkElements = containerRef.current.querySelectorAll(
                ".chunk-item, [data-chunk-id], [data-paragraph-index]",
              );
              // 尝试多种索引匹配方式
              const possibleIndexes = [
                targetChunk.index - 1,
                refId - 1,
                targetChunk.index,
              ];
              for (const idx of possibleIndexes) {
                if (idx >= 0 && idx < allChunkElements.length) {
                  chunkElement = allChunkElements[idx];
                  if (chunkElement) break;
                }
              }
            }

            console.log("🎯 找到的DOM元素:", chunkElement, {
              method: chunkElement
                ? chunkElement.hasAttribute("data-chunk-id")
                  ? "data-chunk-id"
                  : chunkElement.hasAttribute("data-paragraph-index")
                    ? "data-paragraph-index"
                    : "nth-child"
                : "none",
              targetChunkId: targetChunk.id,
              targetChunkIndex: targetChunk.index,
            });

            if (chunkElement) {
              // 滚动到目标元素
              chunkElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });

              // 设置高亮状态 - 使用refId（引用编号，1-based）
              setSelectedParagraph(refId);
              setHighlightedParagraphs(new Set([refId]));

              console.log("✅ 跳转成功", {
                refId,
                targetChunk,
                element: chunkElement,
              });
              return;
            } else {
              console.warn("⚠️ 未找到对应的DOM元素", {
                targetChunk,
                containerChildren: containerRef.current.children.length,
                containerHTML: containerRef.current.innerHTML.substring(0, 200),
              });
            }
          } else {
            console.warn("⚠️ 未找到对应的chunk", {
              refId,
              availableChunks: chunks
                .map((c) => ({ id: c.id, index: c.index }))
                .slice(0, 10), // 限制日志长度
            });
          }
        }

        // 如果是markdown模式，尝试通过段落索引定位
        console.log("📄 Markdown模式：通过段落索引定位");
        const paragraphs = containerRef.current.querySelectorAll(
          "p, h1, h2, h3, h4, h5, h6, blockquote, li",
        );
        const targetParagraph = paragraphs[refId - 1]; // refId is 1-based

        console.log("📄 段落查找结果:", {
          refId,
          targetIndex: refId - 1,
          totalParagraphs: paragraphs.length,
          targetParagraph: targetParagraph?.textContent?.substring(0, 50),
        });

        if (targetParagraph) {
          targetParagraph.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
          setSelectedParagraph(refId);
          setHighlightedParagraphs(new Set([refId]));
          console.log("✅ Markdown模式跳转成功");
        } else {
          console.warn("⚠️ Markdown模式未找到目标段落");
        }
      } else {
        console.warn("⚠️ 容器引用为空");
      }
    },
    [chunks],
  );

  // 处理高亮段落的事件
  const handleHighlightParagraphs = useCallback((event: CustomEvent) => {
    const { refIds } = event.detail;
    setHighlightedParagraphs(new Set(refIds));
  }, []);

  // 处理清除高亮的事件
  const handleClearHighlights = useCallback(() => {
    setHighlightedParagraphs(new Set());
    setSelectedParagraph(null);
  }, []);

  // 注册事件监听器
  useEffect(() => {
    window.addEventListener(
      "jumpToParagraph",
      handleJumpToParagraph as EventListener,
    );
    window.addEventListener(
      "highlightParagraphs",
      handleHighlightParagraphs as EventListener,
    );
    window.addEventListener(
      "clearHighlights",
      handleClearHighlights as EventListener,
    );

    return () => {
      window.removeEventListener(
        "jumpToParagraph",
        handleJumpToParagraph as EventListener,
      );
      window.removeEventListener(
        "highlightParagraphs",
        handleHighlightParagraphs as EventListener,
      );
      window.removeEventListener(
        "clearHighlights",
        handleClearHighlights as EventListener,
      );
    };
  }, [handleJumpToParagraph, handleHighlightParagraphs, handleClearHighlights]);

  // 动态注入段落高亮样式
  useEffect(() => {
    const styleId = "paragraph-highlight-styles";
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.textContent = createParagraphHighlightStyles();
      document.head.appendChild(styleElement);
    }

    return () => {
      // 清理时不删除样式，因为可能有其他实例在使用
    };
  }, []);

  // 应用高亮样式到段落
  useEffect(() => {
    if (!containerRef.current) return;

    const paragraphs = containerRef.current.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, blockquote, li, .chunk-item",
    );

    paragraphs.forEach((paragraph, index) => {
      const paragraphIndex = index + 1; // 1-based indexing

      // 移除之前的样式
      paragraph.classList.remove("paragraph-highlight", "selected");

      // 应用新的样式
      if (highlightedParagraphs.has(paragraphIndex)) {
        paragraph.classList.add("paragraph-highlight");

        if (selectedParagraph === paragraphIndex) {
          paragraph.classList.add("selected");
        }
      }
    });
  }, [highlightedParagraphs, selectedParagraph]);

  // 渲染分块内容
  const renderChunks = () => {
    if (!chunks || chunks.length === 0) return null;

    return (
      <div className="space-y-0">
        {chunks.map((chunk) => (
          <div
            key={chunk.id}
            data-chunk-id={chunk.id}
            data-paragraph-index={chunk.index}
            className="transition-all duration-300"
          >
            <ChunkItem chunk={chunk} />
          </div>
        ))}
      </div>
    );
  };

  // 渲染markdown内容
  const renderMarkdown = () => {
    if (!content) return null;

    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <MarkdownRenderer content={content} />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "enhanced-content-reader relative",
        "transition-all duration-300",
        className,
      )}
    >
      {chunks ? renderChunks() : renderMarkdown()}

      {/* 调试信息 - 开发时可见 */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 p-2 bg-black/80 text-white text-xs rounded z-50 max-w-xs">
          <div>高亮段落: {Array.from(highlightedParagraphs).join(", ")}</div>
          <div>选中段落: {selectedParagraph || "None"}</div>
          <div>内容模式: {chunks ? "Chunks" : "Markdown"}</div>
        </div>
      )}
    </div>
  );
};

// 包装器组件，确保在ReferenceManagerProvider内使用
interface EnhancedContentReaderWithProviderProps
  extends EnhancedContentReaderProps {
  enableReferenceManager?: boolean;
}

const EnhancedContentReaderWithProviderInternal: React.FC<
  EnhancedContentReaderWithProviderProps
> = ({ ...props }) => {
  useReferenceManagerSafe();
  return <EnhancedContentReader {...props} />;
};

export const EnhancedContentReaderWithProvider: React.FC<
  EnhancedContentReaderWithProviderProps
> = ({ enableReferenceManager = true, ...props }) => {
  if (!enableReferenceManager) {
    return <EnhancedContentReader {...props} />;
  }

  return (
    <ReferenceManagerProvider contentId={props.contentId}>
      <EnhancedContentReaderWithProviderInternal {...props} />
    </ReferenceManagerProvider>
  );
};
