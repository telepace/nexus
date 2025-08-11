"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ElegantReferenceTooltip } from "./ElegantReferenceTooltip";

interface InlineReferenceProps {
  refId: number;
  contentId?: string;
  variant?: "default" | "minimal" | "elegant";
  className?: string;
}

/**
 * 🎯 内联引用组件
 *
 * 用于在文本中内联显示引用标记，支持优雅的悬浮卡片
 *
 * 使用方式：
 * - 在 markdown 中：这是一段文本[^1]，继续文本内容
 * - 在 JSONL 中：{"t": "p", "c": "文本内容 [ref:1] 更多文本"}
 */
export const InlineReference: React.FC<InlineReferenceProps> = ({
  refId,
  contentId,
  variant = "elegant",
  className,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "minimal":
        return "inline-flex items-center justify-center w-4 h-4 text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors cursor-pointer";

      case "elegant":
        return "inline-flex items-center justify-center w-5 h-5 mx-0.5 text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md cursor-pointer";

      default:
        return "inline-flex items-center justify-center w-4 h-4 text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-all cursor-pointer";
    }
  };

  const referenceElement = (
    <span
      className={cn(getVariantStyles(), className)}
      role="button"
      tabIndex={0}
      aria-label={`引用第${refId}段`}
    >
      {refId}
    </span>
  );

  // 如果有contentId，使用优雅的悬浮卡片
  if (contentId) {
    return (
      <ElegantReferenceTooltip refId={refId} contentId={contentId} delay={200}>
        {referenceElement}
      </ElegantReferenceTooltip>
    );
  }

  // 否则返回基础的引用标记
  return referenceElement;
};

/**
 * 🔄 文本处理工具：将引用标记转换为内联组件
 *
 * 支持的格式：
 * - [ref:1] → <InlineReference refId={1} />
 * - [1] → <InlineReference refId={1} />
 * - [^1] → <InlineReference refId={1} />
 */
export const processInlineReferences = (
  text: string,
  contentId?: string,
  variant?: "default" | "minimal" | "elegant",
): React.ReactNode[] => {
  // 匹配引用模式：[ref:1], [1], [^1]
  const referencePattern = /\[(ref:)?(\^)?(\d+)\]/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = referencePattern.exec(text)) !== null) {
    const [fullMatch, refPrefix, caretPrefix, refIdStr] = match;
    const refId = parseInt(refIdStr, 10);

    // 添加引用前的文本
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // 添加引用组件
    parts.push(
      <InlineReference
        key={`ref-${refId}-${match.index}`}
        refId={refId}
        contentId={contentId}
        variant={variant}
      />,
    );

    lastIndex = match.index + fullMatch.length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

export default InlineReference;
