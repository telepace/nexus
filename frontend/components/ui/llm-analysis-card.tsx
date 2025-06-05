"use client";

import { FC } from "react";
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

export const LLMAnalysisCard: FC<LLMAnalysisCardProps> = ({
  analysis,
  onToggleExpanded,
  onRemove,
  onRegenerate,
  onCopy,
}) => {
  const handleCopy = () => {
    if (onCopy) {
      onCopy(analysis.content);
    } else {
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
            <span className="font-medium text-sm">{analysis.title}</span>
          </Button>

          <div className="flex items-center gap-1">
            {analysis.isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {!analysis.isLoading && !analysis.error && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="复制内容"
                >
                  <Copy className="h-3 w-3" />
                </Button>

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
        <CardContent className="pt-0">
          {analysis.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">正在生成分析...</span>
              </div>
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
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.content}
                </div>
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
