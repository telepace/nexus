"use client";

import React, { FC, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  Copy,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LLMAnalysis } from "@/lib/stores/llm-analysis-store";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import { FavoriteButton } from "@/components/actions/FavoriteButton";

interface LLMAnalysisCardProps {
  analysis: LLMAnalysis;
  onToggleExpanded: (id: string) => void;
  onRemove: (id: string) => void;
  onRegenerate?: (id: string) => void;
  onCopy?: (content: string) => void;
}

const getAnalysisIcon = (type: LLMAnalysis["type"]) => {
  switch (type) {
    case "summary":
      return "📝";
    case "key_points":
      return "🎯";
    case "questions":
      return "❓";
    case "insights":
      return "💡";
    case "tags_extractor":
      return "🏷️";
    default:
      return "";
  }
};

const getAnalysisColor = (type: LLMAnalysis["type"]) => {
  // 保留类型判断逻辑，但暂时统一使用灰色主题
  // TODO: 未来可能需要根据类型返回不同颜色
  switch (type) {
    case "summary":
    case "key_points":
    case "questions":
    case "insights":
    default:
      return "bg-neutral-50 border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800";
  }
};

// 新增评分星级渲染组件
const RatingStars: FC<{ score: number }> = ({ score }) => {
  const stars = [];
  // 分数范围 0~5，保留半星（0.5）
  for (let i = 1; i <= 5; i++) {
    if (score >= i) {
      stars.push("★");
    } else if (score >= i - 0.5) {
      stars.push("☆"); // 半星显示为空星，简化
    } else {
      stars.push("☆");
    }
  }
  return (
    <span className="text-yellow-500 dark:text-yellow-400 text-xs ml-1">
      {stars.join("")}
    </span>
  );
};

// Helper to detect JSONL (very naive)
const isJsonl = (str: string): boolean => {
  try {
    const firstLine = str.trim().split("\n").find(Boolean);
    if (!firstLine) return false;
    JSON.parse(firstLine);
    return true;
  } catch {
    return false;
  }
};

export const LLMAnalysisCard: FC<LLMAnalysisCardProps> = ({
  analysis,
  onToggleExpanded,
  onRemove,
  onRegenerate,
  onCopy,
}) => {
  // 优化流式内容显示，确保内容格式正确
  const formattedContent = useMemo(() => {
    if (!analysis?.content) return "";

    // 优化内容格式，确保 Markdown 渲染正确
    let content = analysis.content.trim();

    // 1. 确保标题前后有适当的换行
    content = content
      // 标题前确保有换行（除非是文档开头）
      .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2")
      // 标题后确保有换行
      .replace(/(#{1,6}[^\n]*)\n([^#\n\s])/g, "$1\n\n$2");

    // 2. 确保列表项格式正确
    content = content
      // 列表项前确保有换行
      .replace(/([^\n])\n([*+-]|\d+\.)\s/g, "$1\n\n$2 ")
      // 子列表项处理
      .replace(/\n(\s{2,})([*+-]|\d+\.)\s/g, "\n$1$2 ");

    // 3. 处理段落分隔（中文句号后的换行）
    content = content.replace(/([。！？])\s*([^。！？\n\s])/g, "$1\n$2");

    // 4. 处理代码块和引用块
    content = content
      // 代码块前后确保有换行
      .replace(/([^\n])\n```/g, "$1\n```")
      .replace(/```\n([^`])/g, "```\n$1")
      // 引用块前确保有换行
      .replace(/([^\n])\n>/g, "$1\n>");

    // 5. 清理多余的空行（保持最多一个换行符）
    content = content.replace(/\n{2,}/g, "\n");

    // 6. 确保文档末尾没有多余换行符
    content = content.replace(/\n+$/, "");

    return content;
  }, [analysis?.content]);

  // 标签提取器专用渲染
  if (analysis.type === "tags_extractor" && analysis.content) {
    try {
      const data = JSON.parse(analysis.content as unknown as string) as {
        tags?: string[];
        score?: number;
      };
      const tags = data.tags || [];
      const score = data.score ?? 0;

      return (
        <Card
          className={cn(
            "py-2 rounded-sm transition-all duration-200 shadow-sm hover:shadow-lg ",
            getAnalysisColor(analysis.type),
          )}
          data-exclude-selection
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏷️</span>
              <span className="font-medium text-sm">智能标签 & 评分</span>
              {score > 0 && <RatingStars score={score} />}
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-6 pb-6">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    } catch {
      /* fallthrough to default rendering */
    }
  }

  // 添加安全检查
  if (!analysis || !analysis.id) {
    return null;
  }

  const handleCopy = () => {
    if (onCopy && analysis.content) {
      onCopy(analysis.content);
    } else if (analysis.content) {
      navigator.clipboard.writeText(analysis.content);
    }
  };

  return (
    <Card
      className={cn(
        "py-2 rounded-sm transition-all duration-200 shadow-sm hover:shadow-lg ",
        getAnalysisColor(analysis.type),
        analysis.isExpanded ? "shadow-md" : "",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpanded(analysis.id)}
            className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
          >
            {analysis.isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-lg">{getAnalysisIcon(analysis.type)}</span>
            <span className="font-medium text-sm">
              {analysis.title || "未命名分析"}
            </span>
          </Button>

          <div className="flex items-center gap-1">
            {analysis.isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {!analysis.isLoading && !analysis.error && (
              <>
                {/* 收藏按钮 */}
                <FavoriteButton
                  itemId={analysis.contentId}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                />

                {/* 复制内容 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="复制内容"
                  disabled={!analysis.content}
                >
                  <Copy className="h-3 w-3" />
                </Button>

                {/* 重新生成 */}
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerate(analysis.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="重新生成"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(analysis.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* 状态显示 - 移除时间戳显示 */}
        {analysis.error && (
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              错误
            </Badge>
          </div>
        )}
      </CardHeader>

      {analysis.isExpanded && (
        <CardContent className="pt-0 px-6 pb-6">
          {analysis.isLoading ? (
            <div className="space-y-3">
              {/* 正在生成AI分析"灰色背景有border的提示元素 */}
              {/* <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI 正在分析中...</span>
              </div> */}

              {/* 流式内容实时渲染 */}
              {formattedContent && (
                <div className="relative">
                  {/* 流式内容区域 */}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {isJsonl(formattedContent) ? (
                      <StreamingJsonlRenderer 
                        content={formattedContent} 
                        isLoading={true}
                        showStreamingIndicator={true}
                      />
                    ) : (
                      <MarkdownRenderer content={formattedContent} />
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : analysis.error ? (
            <div className="py-4">
              <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                {analysis.error}
              </div>
              {onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRegenerate(analysis.id)}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* 分析内容 */}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {formattedContent ? (
                  isJsonl(formattedContent) ? (
                    <JsonlRenderer content={formattedContent} />
                  ) : (
                    <MarkdownRenderer content={formattedContent} />
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">暂无内容</div>
                )}
              </div>

              {/* 使用的prompt - 暂时隐藏，未来可能启用 */}
              {/* {analysis.prompt && (
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    查看使用的提示词
                  </summary>
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    {analysis.prompt}
                  </div>
                </details>
              )} */}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
