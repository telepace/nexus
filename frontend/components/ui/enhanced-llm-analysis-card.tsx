"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StreamingText } from "@/components/ui/streaming-text";
import { LLMAnalysis } from "@/lib/stores/llm-analysis-store";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  Copy,
  Download,
  Edit,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface EnhancedLLMAnalysisCardProps {
  /** 分析数据 */
  analysis: LLMAnalysis;
  /** 是否展开 */
  isExpanded?: boolean;
  /** 展开/收起回调 */
  onToggleExpanded?: (id: string) => void;
  /** 删除回调 */
  onDelete?: (id: string) => void;
  /** 重新生成回调 */
  onRegenerate?: (id: string) => void;
  /** 编辑回调 */
  onEdit?: (id: string) => void;
  /** 是否显示控制按钮 */
  showControls?: boolean;
  /** 自定义类名 */
  className?: string;
  /** API 基础 URL */
  apiUrl?: string;
}

export function EnhancedLLMAnalysisCard({
  analysis,
  isExpanded = false,
  onToggleExpanded,
  onDelete,
  onRegenerate,
  onEdit,
  showControls = true,
  className,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
}: EnhancedLLMAnalysisCardProps) {
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 获取类型对应的图标和颜色
  const getTypeInfo = (type: LLMAnalysis["type"]) => {
    switch (type) {
      case "summary":
        return {
          icon: "📝",
          label: "摘要",
          color:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        };
      case "key_points":
        return {
          icon: "🎯",
          label: "要点",
          color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        };
      case "questions":
        return {
          icon: "❓",
          label: "问题",
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        };
      case "insights":
        return {
          icon: "💡",
          label: "洞察",
          color:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        };
      case "custom":
        return {
          icon: "✨",
          label: "自定义",
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        };
      default:
        return {
          icon: "📄",
          label: "分析",
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        };
    }
  };

  const typeInfo = getTypeInfo(analysis.type);

  // 复制内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(analysis.content);
      toast({
        title: "已复制",
        description: "分析内容已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容到剪贴板",
        variant: "destructive",
      });
    }
  };

  // 导出内容
  const handleExport = () => {
    const content = `# ${analysis.title}\n\n**类型**: ${typeInfo.label}\n**创建时间**: ${new Date(analysis.created_at).toLocaleString()}\n\n## 内容\n\n${analysis.content}`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analysis.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 重新生成分析
  const handleRegenerate = async () => {
    if (!onRegenerate) return;

    setIsRegenerating(true);
    try {
      await onRegenerate(analysis.id);
    } finally {
      setIsRegenerating(false);
    }
  };

  // 如果分析正在加载，使用流式组件
  if (analysis.isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeInfo.icon}</span>
              <CardTitle className="text-base">{analysis.title}</CardTitle>
              <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
            </div>
            {showControls && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete?.(analysis.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <StreamingText
            title="AI 正在分析中..."
            placeholder="正在生成分析内容..."
            url={`${apiUrl}/api/v1/content/${analysis.contentId}/analyze-ai-sdk`}
            requestOptions={{
              method: "POST",
              body: JSON.stringify({
                analysis_instruction: analysis.prompt || "请分析以下内容",
                model: "or-llama-3-1-8b-instruct",
              }),
            }}
            streamingOptions={{
              typewriterDelay: 30,
              enableTypewriter: true,
              maxRetries: 3,
              onComplete: (content) => {
                console.log("分析完成:", content);
              },
              onError: (error) => {
                toast({
                  title: "分析失败",
                  description: error.message,
                  variant: "destructive",
                });
              },
            }}
            showControls={false}
            showStatus={true}
            showProgress={true}
            enableMarkdown={true}
            className="border-0 shadow-none"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full transition-all duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeInfo.icon}</span>
            <CardTitle className="text-base">{analysis.title}</CardTitle>
            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
            {analysis.error && <Badge variant="destructive">错误</Badge>}
          </div>

          <div className="flex items-center gap-1">
            {showControls && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  title="复制内容"
                >
                  <Copy className="h-3 w-3" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExport}
                  title="导出为 Markdown"
                >
                  <Download className="h-3 w-3" />
                </Button>

                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(analysis.id)}
                    title="编辑"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}

                {onRegenerate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    title="重新生成"
                  >
                    <RefreshCw
                      className={cn(
                        "h-3 w-3",
                        isRegenerating && "animate-spin",
                      )}
                    />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete?.(analysis.id)}
                  title="删除"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleExpanded?.(analysis.id)}
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* 元数据 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <span>创建于 {new Date(analysis.created_at).toLocaleString()}</span>
          {analysis.content && <span>{analysis.content.length} 字符</span>}
          {analysis.promptId && <span>使用提示词: {analysis.promptId}</span>}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 px-6 pb-6">
          {analysis.error ? (
            <div className="space-y-3">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium mb-2">
                  分析失败
                </p>
                <p className="text-sm text-muted-foreground">
                  {analysis.error}
                </p>
              </div>

              {onRegenerate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="w-full"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 mr-2",
                      isRegenerating && "animate-spin",
                    )}
                  />
                  重新生成分析
                </Button>
              )}
            </div>
          ) : analysis.content ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {analysis.content}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <div className="text-center space-y-2">
                <Sparkles className="h-8 w-8 mx-auto opacity-50" />
                <p className="text-sm">暂无分析内容</p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
