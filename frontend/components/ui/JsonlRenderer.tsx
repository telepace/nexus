"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { JsonLineWithExpandButton } from "./JsonLineWithExpandButton";
<<<<<<< HEAD
import { EnhancedReferenceIndicator, useReferenceManagerSafe } from "./ReferenceManager";
import { Badge } from "@/components/ui/badge";
=======
import {
  EnhancedReferenceIndicator,
  useReferenceManagerSafe,
} from "./ReferenceManager";
>>>>>>> 53ab41b (fix: 修复AI卡片交互问题并完善CI/CD流水线)
import { jsonlStyles } from "./jsonlStyles";

interface JsonlRendererProps {
  content: string;
  className?: string;
  enableHoverEffects?: boolean;
  /** callback when expand button is clicked on a JSON line */
  onExpandLine?: (jsonContent: Record<string, unknown>) => void;
  contentId?: string; // 用于引用管理器
  /** 指定渲染風格，對應 jsonlStyles 註冊表 key */
  styleName?: string;
  /** 是否显示引用指示器，默认隐藏 */
  showReferenceIndicators?: boolean;
}

/**
 * Minimalistic JSON-Line renderer with Notion-style hover effects.
 *
 * The LLM returns one JSON object per line, each object contains at least:
 * - `type` | `t`: block type
 * - `content` | `c`: block content
 * - `ref`: reference to source paragraphs (comma-separated numbers)
 *
 * Enhanced with reference management for jumping to source paragraphs.
 */
export function JsonlRenderer({
  content,
  className,
  enableHoverEffects = true,
  onExpandLine,
  contentId,
  styleName = "notebook",
  showReferenceIndicators = false,
}: JsonlRendererProps) {
  // 使用安全的 ReferenceManager
  const { actions } = useReferenceManagerSafe();

  // 根据是否显示引用指示器，决定传递哪个组件
  const ReferenceIndicatorComponent: typeof EnhancedReferenceIndicator =
    showReferenceIndicators
      ? EnhancedReferenceIndicator
      : ((() => null) as unknown as typeof EnhancedReferenceIndicator);

  // 根據 styleName 取得區塊渲染器
  const styleRenderer = jsonlStyles[styleName] || jsonlStyles["default"];

  if (!content) {
    return (
      <div
        data-testid="jsonl-renderer"
        className={cn("space-y-1", className)}
      />
    );
  }

  // Split into lines & parse
  // 增强的 JSON 清理和修复函数
  function smartJsonFixer(line: string): string | null {
    const trimmed = line.trim();
    
    // 修复不完整的JSON
    if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
      // 检查是否包含基本的JSONL字段
      if (trimmed.includes('"t":') || trimmed.includes('"type":') || 
          trimmed.includes('"c":') || trimmed.includes('"content":')) {
        let fixed = trimmed;
        
        // 修复未闭合的字符串
        const openQuotes = (fixed.match(/"/g) || []).length;
        if (openQuotes % 2 !== 0) {
          fixed += '"';
        }
        
        // 尝试补全可能的字段结构
        if (fixed.includes('"c":') && !fixed.includes('"}')) {
          // 如果内容字段未闭合，尝试简单补全
          if (fixed.endsWith('"')) {
            fixed += '}';
          } else if (!fixed.endsWith('}')) {
            fixed += '"}';
          }
        } else if (!fixed.endsWith('}')) {
          fixed += '}';
        }
        
        // 验证修复结果
        try {
          const parsed = JSON.parse(fixed);
          if ((parsed.t || parsed.type) && (parsed.c !== undefined || parsed.content !== undefined)) {
            return fixed;
          }
        } catch {
          // 修复失败，尝试从原文提取信息
          return extractFromDamagedJson(trimmed);
        }
      }
    }
    
    return null;
  }

  // 从损坏的JSON中提取信息
  function extractFromDamagedJson(line: string): string | null {
    try {
      // 尝试提取可能的字段
      const typeMatch = line.match(/"(?:t|type)"\s*:\s*"([^"]*)/);
      const contentMatch = line.match(/"(?:c|content)"\s*:\s*"([^"]*)/);
      const leadMatch = line.match(/"lead"\s*:\s*"([^"]*)/);
      const refMatch = line.match(/"ref"\s*:\s*"([^"]*)/);

      if (typeMatch || contentMatch) {
        const recovered: any = {};
        
        if (typeMatch) recovered.t = typeMatch[1];
        if (contentMatch) recovered.c = contentMatch[1];
        if (leadMatch) recovered.lead = leadMatch[1];
        if (refMatch) recovered.ref = refMatch[1];

        // 如果内容为空但有类型，设置默认内容
        if (!recovered.c && recovered.t) {
          recovered.c = "(内容不完整)";
        }

        return JSON.stringify(recovered);
      }

      // 最后的努力：尝试从任何看起来像内容的部分提取
      const quotedStrings = Array.from(line.matchAll(/"([^"]+)"/g));
      if (quotedStrings.length >= 2) {
        return JSON.stringify({
          t: quotedStrings[0][1],
          c: quotedStrings[1][1]
        });
      }
    } catch (e) {
      // 完全无法恢复
    }
    
    return null;
  }

  // 修复常见的 JSON 语法错误
  function sanitizeJsonLine(line: string): string {
    let fixed = line;

    // 修复单引号包围的字符串值（如：'文本"内容'）
    fixed = fixed.replace(/:\s*'([^']*?)'/g, (match, content) => {
      // 转义内部的双引号
      const escaped = content.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });

    // 修复未引用的键
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // 修复多余的逗号
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    // 修复缺失的逗号（在字符串和新键之间）
    fixed = fixed.replace(/("\s*)\s*("[a-zA-Z_])/g, '$1,$2');

    return fixed;
  }

  const blocks = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const lineNumber = index + 1;
      
      try {
        // 首先尝试清理常见的 JSON 语法错误
        const sanitizedLine = sanitizeJsonLine(line);
        return JSON.parse(sanitizedLine) as Record<string, unknown>;
      } catch (firstError) {
        // 语法清理失败，尝试智能修复
        try {
          const fixedLine = smartJsonFixer(line);
          if (fixedLine) {
            const parsed = JSON.parse(fixedLine);
            // 标记为已恢复的内容
            return { 
              ...parsed, 
              _isRecovered: true, 
              _originalLine: line,
              _lineNumber: lineNumber
            } as Record<string, unknown>;
          }
        } catch (secondError) {
          // 智能修复也失败了
        }

        // 完全无法修复，创建错误回退块
        console.warn(`JSON parsing failed at line ${lineNumber}:`, line, firstError);
        return { 
          type: "error", 
          content: line,
          _isError: true,
          _lineNumber: lineNumber,
          _errorMessage: (firstError as Error).message
        } as Record<string, unknown>;
      }
    });

  const BlockWrapper: React.FC<{
    children: React.ReactNode;
    hasReferences?: boolean;
    isError?: boolean;
    isRecovered?: boolean;
  }> = ({ children, hasReferences = false, isError = false, isRecovered = false }) => {
    if (!enableHoverEffects) {
      return <>{children}</>;
    }

    return (
      <div
        className={cn(
          "group relative rounded-lg transition-all duration-200 ease-out",
          "px-2 py-1 -mx-2 my-0.5",
          "border border-transparent",
          "overflow-visible",
          !isError && !isRecovered && hasReferences && "hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
          isRecovered && "border-l-2 border-amber-400 bg-amber-50/30 dark:bg-amber-950/10",
          isError && "border-l-2 border-red-400 bg-red-50/30 dark:bg-red-950/10"
        )}
      >
        {/* 恢复标记 */}
        {isRecovered && (
          <div className="absolute -top-1 -left-1">
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 px-1 py-0">
              已恢复
            </Badge>
          </div>
        )}
        
        {/* 错误标记 */}
        {isError && (
          <div className="absolute -top-1 -left-1">
            <Badge variant="destructive" className="text-xs px-1 py-0">
              错误
            </Badge>
          </div>
        )}

        {/* 主要内容 */}
        <div className="relative">{children}</div>
      </div>
    );
  };

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const type = (block["type"] || block["t"]) as string | undefined;
    const c = (block["content"] ?? block["c"]) as React.ReactNode;
    const ref = block["ref"] as string | undefined;
    const lead = block["lead"] as string | undefined;

    // 解析引用
    const references = actions.parseReferences(ref);
    const hasReferences = references.length > 0;

    const blockElement = (() => {
      // 特殊处理错误块
      if (type === "error" || block._isError) {
        const errorMessage = block._errorMessage as string || "JSON解析失败";
        const lineNumber = block._lineNumber as number || 0;
        const originalLine = block._originalLine as string || String(c);
        
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <span>⚠️ 第 {lineNumber} 行解析失败</span>
            </div>
            <div className="text-xs text-muted-foreground">
              错误: {errorMessage}
            </div>
            <div className="p-2 bg-muted rounded-md">
              <code className="text-xs text-muted-foreground font-mono break-all">
                {originalLine || String(c)}
              </code>
            </div>
            <div className="text-xs text-muted-foreground">
              💡 提示：这可能是由于JSON格式错误或内容被截断导致的
            </div>
          </div>
        );
      }

      // 特殊处理恢复的块
      if (block._isRecovered) {
        const originalLine = block._originalLine as string;
        const lineNumber = block._lineNumber as number || 0;
        
        // 正常渲染，但添加恢复提示
        const normalContent = renderNormalBlock(type, c, lead, hasReferences, references);
        
        return (
          <div className="space-y-2">
            {normalContent}
            <div className="text-xs text-amber-600 dark:text-amber-400 italic">
              ⚠️ 此内容已从损坏的JSON自动恢复 (第 {lineNumber} 行)
            </div>
          </div>
        );
      }

      // 正常块渲染
      return renderNormalBlock(type, c, lead, hasReferences, references);
    })();

    // 正常块渲染逻辑
    function renderNormalBlock(
      type: string | undefined, 
      c: React.ReactNode, 
      lead: string | undefined,
      hasReferences: boolean, 
      references: number[]
    ) {
      switch (type) {
        case "h1":
          return (
            <div className="flex items-center justify-between">
              <h1 className="scroll-m-16 text-xl font-bold tracking-tight lg:text-2xl select-text leading-[1.3] flex-1">
                <MarkdownRenderer content={String(c)} />
              </h1>
              {hasReferences && (
                <EnhancedReferenceIndicator
                  references={references}
                  contentId={contentId}
                  className="ml-4"
                />
              )}
            </div>
          );
        case "h2":
          return (
            <div className="flex items-center justify-between">
              <h2 className="scroll-m-16 border-b pb-1.5 text-lg font-semibold tracking-tight first:mt-0 select-text leading-[1.3] flex-1">
                <MarkdownRenderer content={String(c)} />
              </h2>
              {hasReferences && (
                <EnhancedReferenceIndicator
                  references={references}
                  contentId={contentId}
                  className="ml-4"
                />
              )}
            </div>
          );
        case "h3":
          return (
            <div className="flex items-center justify-between">
              <h3 className="scroll-m-16 text-base font-semibold tracking-tight select-text leading-[1.3] flex-1">
                <MarkdownRenderer content={String(c)} />
              </h3>
              {hasReferences && (
                <EnhancedReferenceIndicator
                  references={references}
                  contentId={contentId}
                  className="ml-4"
                />
              )}
            </div>
          );
        case "quote": {
          return (
            <blockquote className="italic border-l-2 pl-4 my-2 select-text">
              <div className="mb-1">
                <MarkdownRenderer content={String(c)} />
              </div>
              <div className="flex items-center justify-between mt-2">
                {ref && (
                  <cite className="text-xs text-gray-500 dark:text-gray-400 not-italic">
                    — {ref}
                  </cite>
                )}
                {hasReferences && (
                  <EnhancedReferenceIndicator
                    references={references}
                    contentId={contentId}
                    className="ml-auto"
                  />
                )}
              </div>
            </blockquote>
          );
        }
        case "list": {
          // Expect c to be string or array
          let items: string[] = [];
          if (Array.isArray(c)) {
            items = c.map(String);
          } else if (typeof c === "string") {
            // Try splitting by common delimiters
            items = c.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
          }
          return (
            <div>
              <ul className="list-disc ml-4 space-y-1 my-2 select-text">
                {items.map((item, i) => (
                  <li key={i} className="select-text">
                    <MarkdownRenderer content={item} />
                  </li>
                ))}
              </ul>
              {hasReferences && (
                <div className="mt-2 flex justify-end">
                  <EnhancedReferenceIndicator references={references} contentId={contentId} />
                </div>
              )}
            </div>
          );
        }
        case "insight": {
          // Special insight styling
          return (
            <div className="my-3 rounded-md border-l-4 border-blue-500 bg-blue-50 p-3 dark:bg-blue-900/20 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <strong className="text-blue-600 dark:text-blue-400 text-sm font-medium mr-2">
                    💡 洞察:
                  </strong>
                  <span>
                    <MarkdownRenderer content={String(c)} />
                  </span>
                </div>
                {hasReferences && (
                  <EnhancedReferenceIndicator
                    references={references}
                    contentId={contentId}
                    className="shrink-0"
                  />
                )}
              </div>
            </div>
          );
        }
        case "concept": {
          return (
            <div className="my-3 rounded-md border-l-4 border-purple-500 bg-purple-50 p-3 dark:bg-purple-900/20 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <strong className="text-purple-600 dark:text-purple-400 text-sm font-medium mr-2">
                    🎯 概念:
                  </strong>
                  <span>
                    <MarkdownRenderer content={String(c)} />
                  </span>
                </div>
                {hasReferences && (
                  <EnhancedReferenceIndicator
                    references={references}
                    contentId={contentId}
                    className="shrink-0"
                  />
                )}
              </div>
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
                {hasReferences && (
                  <div className="mt-2 flex justify-end">
                    <EnhancedReferenceIndicator references={references} contentId={contentId} />
                  </div>
                )}
              </div>
            );
          }
          return (
            <div>
              <p className="my-2 select-text">
                <MarkdownRenderer content={String(c)} />
              </p>
              {hasReferences && (
                <div className="mt-2 flex justify-end">
                  <EnhancedReferenceIndicator references={references} contentId={contentId} />
                </div>
              )}
            </div>
          );
        }
        case "action":
          return (
            <div className="my-3 rounded-md border-l-4 border-green-500 bg-green-50 p-3 dark:bg-green-900/20 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <strong className="text-green-600 dark:text-green-400 text-sm font-medium mr-2">
                    ⚡ 行动:
                  </strong>
                  <span>
                    <MarkdownRenderer content={String(c)} />
                  </span>
                </div>
                {hasReferences && (
                  <EnhancedReferenceIndicator
                    references={references}
                    contentId={contentId}
                    className="shrink-0"
                  />
                )}
              </div>
            </div>
          );
        default: {
          // Default paragraph with lead support
          const finalContent = lead ? `**${lead}:** ${String(c)}` : String(c);
          return (
            <div className="leading-6 my-2 select-text">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <MarkdownRenderer content={finalContent} />
                </div>
                {hasReferences && (
                  <EnhancedReferenceIndicator
                    references={references}
                    contentId={contentId}
                    className="shrink-0"
                  />
                )}
              </div>
            </div>
          );
        }
      }
    }

    // 统一封装：先用 BlockWrapper 提供引用高亮，再在内部使用 JsonLineWithExpandButton
    return (
      <BlockWrapper key={idx} hasReferences={hasReferences} isError={block.type === "error" || block._isError} isRecovered={block._isRecovered}>
        <JsonLineWithExpandButton
          jsonLine={block}
          onExpand={onExpandLine}
          enableHoverEffects={false}
        >
          {blockElement}
        </JsonLineWithExpandButton>
      </BlockWrapper>
    );
  };

  return (
    <div
      data-testid="jsonl-renderer"
      className={cn(
        "max-w-none space-y-0.5 overflow-visible",
        // 确保整个容器支持文本选择
        "select-text",
        className,
      )}
    >
      {blocks.map(renderBlock)}
    </div>
  );
}
