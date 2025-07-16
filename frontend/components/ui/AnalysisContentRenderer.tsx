"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  Lightbulb,
  Quote,
  BookOpen,
  Target,
  Info,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 分析块数据类型定义
export interface AnalysisBlockData {
  t: string; // 类型：h1, h2, h3, insight, concept, p, list, quote, qa, action
  c: string; // 内容
  ref?: string; // 引用（逗号分隔的数字）
  expandable?: string; // 可展开内容的标题
  meta?: Record<string, unknown>; // 额外元数据
}

// 引用信息
export interface ReferenceInfo {
  id: number;
  title?: string;
  source?: string;
  snippet?: string;
}

// 组件属性
export interface AnalysisContentRendererProps {
  content: string; // JSONL 格式的内容
  references?: ReferenceInfo[]; // 引用数据
  onReferenceClick?: (refId: number) => void;
  className?: string;
}

// 解析 JSONL 内容
const parseAnalysisContent = (content: string): AnalysisBlockData[] => {
  try {
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const blocks: AnalysisBlockData[] = [];

    for (const line of lines) {
      try {
        const block = JSON.parse(line.trim()) as AnalysisBlockData;
        if (block.t && block.c) {
          blocks.push(block);
        }
      } catch (lineError) {
        console.warn("无法解析分析块:", line, lineError);
      }
    }

    return blocks;
  } catch {
    console.warn("分析内容解析失败");
    return [];
  }
};

// 解析引用字符串
const parseReferences = (refString?: string): number[] => {
  if (!refString) return [];
  return refString
    .split(",")
    .map((ref) => parseInt(ref.trim(), 10))
    .filter((num) => !isNaN(num));
};

// 引用指示器组件
const ReferenceIndicator: React.FC<{
  references: number[];
  referenceData?: ReferenceInfo[];
  onReferenceClick?: (refId: number) => void;
}> = ({ references, referenceData, onReferenceClick }) => {
  if (references.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 ml-2">
      {references.slice(0, 3).map((refId) => {
        const refInfo = referenceData?.find((r) => r.id === refId);

        return (
          <TooltipProvider key={refId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  className={cn(
                    "inline-flex items-center justify-center",
                    "w-5 h-5 rounded-full text-xs font-medium",
                    "bg-blue-100 text-blue-700 border border-blue-200",
                    "hover:bg-blue-200 hover:border-blue-300",
                    "dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
                    "dark:hover:bg-blue-800/50 dark:hover:border-blue-600",
                    "transition-all duration-200 cursor-pointer",
                  )}
                  onClick={() => onReferenceClick?.(refId)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {refId}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-medium">引用 #{refId}</p>
                  {refInfo?.title && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {refInfo.title}
                    </p>
                  )}
                  {refInfo?.snippet && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {refInfo.snippet}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      {references.length > 3 && (
        <Badge variant="outline" className="h-5 px-1.5 text-xs">
          +{references.length - 3}
        </Badge>
      )}
    </div>
  );
};

// 标题块组件
const HeadingBlock: React.FC<{
  block: AnalysisBlockData;
  references: number[];
  referenceData?: ReferenceInfo[];
  onReferenceClick?: (refId: number) => void;
}> = ({ block, references, referenceData, onReferenceClick }) => {
  const HeadingTag = block.t as keyof JSX.IntrinsicElements;

  const getHeadingStyles = (type: string) => {
    switch (type) {
      case "h1":
        return "text-2xl font-bold text-gray-900 dark:text-gray-100 py-4 border-b-2 border-gradient-to-r from-blue-500 to-purple-500";
      case "h2":
        return "text-xl font-semibold text-gray-900 dark:text-gray-100 py-3";
      case "h3":
        return "text-lg font-medium text-gray-800 dark:text-gray-200 py-2";
      default:
        return "text-base font-medium text-gray-700 dark:text-gray-300 py-2";
    }
  };

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 装饰性左侧条 */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />

      <div className="pl-6">
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg px-4 py-3 border border-blue-100 dark:border-blue-800/30">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <HeadingTag className={cn(getHeadingStyles(block.t), "flex-1 py-0")}>
            {block.c}
          </HeadingTag>
          <ReferenceIndicator
            references={references}
            referenceData={referenceData}
            onReferenceClick={onReferenceClick}
          />
        </div>
      </div>
    </motion.div>
  );
};

// 洞察块组件
const InsightBlock: React.FC<{
  block: AnalysisBlockData;
  references: number[];
  referenceData?: ReferenceInfo[];
  onReferenceClick?: (refId: number) => void;
}> = ({ block, references, referenceData, onReferenceClick }) => {
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.c);
      toast({ title: "已复制", description: "洞察内容已复制到剪贴板" });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
              核心洞察
            </div>
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              {block.c}
            </p>

            {references.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <Quote className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  基于 {references.length} 个来源
                </span>
                <ReferenceIndicator
                  references={references}
                  referenceData={referenceData}
                  onReferenceClick={onReferenceClick}
                />
              </div>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 概念块组件（可展开）
const ConceptBlock: React.FC<{
  block: AnalysisBlockData;
  references: number[];
  referenceData?: ReferenceInfo[];
  onReferenceClick?: (refId: number) => void;
}> = ({ block, references, referenceData, onReferenceClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30 overflow-hidden">
        <button
          className="w-full p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors duration-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Info className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {block.c}
              </p>
              {block.expandable && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  点击了解：{block.expandable}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ReferenceIndicator
                references={references}
                referenceData={referenceData}
                onReferenceClick={onReferenceClick}
              />
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </motion.div>
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="px-4 pb-4 border-t border-blue-200/50 dark:border-blue-800/30 bg-blue-25 dark:bg-blue-950/10">
                <div className="mt-3 text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  <p>
                    这里可以显示关于 &quot;{block.expandable}&quot;
                    的详细解释和扩展内容。
                  </p>
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    * 此功能可以连接到知识库或提供更详细的背景信息
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// 段落块组件
const ParagraphBlock: React.FC<{
  block: AnalysisBlockData;
  references: number[];
  referenceData?: ReferenceInfo[];
  onReferenceClick?: (refId: number) => void;
}> = ({ block, references, referenceData, onReferenceClick }) => {
  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gray-50/50 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/20 transition-colors duration-200">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mt-0.5">
            <Target className="h-3 w-3 text-gray-600 dark:text-gray-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {block.c}
            </p>

            {references.length > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <ReferenceIndicator
                  references={references}
                  referenceData={referenceData}
                  onReferenceClick={onReferenceClick}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 主渲染组件
export const AnalysisContentRenderer: React.FC<
  AnalysisContentRendererProps
> = ({ content, onReferenceClick, className }) => {
  const blocks = parseAnalysisContent(content);

  if (blocks.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-gray-500 dark:text-gray-400">暂无分析内容</p>
      </div>
    );
  }

  const renderBlock = (block: AnalysisBlockData, index: number) => {
    const blockProps = {
      block,
      references: parseReferences(block.ref),
      referenceData: [],
      onReferenceClick,
    };

    switch (block.t) {
      case "h1":
      case "h2":
      case "h3":
        return <HeadingBlock key={index} {...blockProps} />;

      case "insight":
        return <InsightBlock key={index} {...blockProps} />;

      case "concept":
        return <ConceptBlock key={index} {...blockProps} />;

      case "p":
      default:
        return <ParagraphBlock key={index} {...blockProps} />;
    }
  };

  // 计算智能间距
  const getBlockSpacing = (
    currentBlock: AnalysisBlockData,
    nextBlock?: AnalysisBlockData,
  ) => {
    // 标题前后需要更大间距
    if (currentBlock.t.startsWith("h") || nextBlock?.t.startsWith("h")) {
      return "mb-6";
    }

    // 洞察块后需要中等间距
    if (currentBlock.t === "insight") {
      return "mb-5";
    }

    // 相同类型块使用较小间距
    if (nextBlock && currentBlock.t === nextBlock.t) {
      return "mb-3";
    }

    // 默认间距
    return "mb-4";
  };

  return (
    <div className={cn("space-y-0", className)}>
      {blocks.map((block, index) => (
        <div key={index} className={getBlockSpacing(block, blocks[index + 1])}>
          {renderBlock(block, index)}
        </div>
      ))}
    </div>
  );
};

export default AnalysisContentRenderer;
