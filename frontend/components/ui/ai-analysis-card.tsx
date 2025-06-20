"use client";

import React, { useState } from "react";
import { useCompletion } from "ai/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  Play,
  Square,
  RotateCcw,
  Copy,
  Trash2,
  Loader2,
  AlertCircle,
  Sparkles,
  Brain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCookie } from "@/lib/utils";

export interface AIAnalysisCardProps {
  /** 分析标题 */
  title: string;
  /** 分析指令 */
  userContent: string;
  /** 原文内容（当没有 contentId 时使用） */
  systemPrompt?: string;
  /** 内容 ID */
  contentId?: string;
  /** API 端点 */
  api?: string;
  /** 模型选择 */
  model?: string;
  /** 是否启用 Markdown 渲染 */
  enableMarkdown?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 是否显示控制按钮 */
  showControls?: boolean;
  /** 完成回调 */
  onComplete?: (result: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

export function AIAnalysisCard({
  title,
  userContent,
  systemPrompt = "",
  contentId,
  api,
  model = "or-llama-3-1-8b-instruct",
  enableMarkdown = true,
  className,
  showControls = true,
  onComplete,
  onError,
}: AIAnalysisCardProps) {
  const { toast } = useToast();
  const [hasStarted, setHasStarted] = useState(false);

  // 动态构建 API 端点
  const getApiEndpoint = () => {
    if (contentId) {
      // 使用新的内容完成端点
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      return `${apiUrl}/api/v1/content/${contentId}/completion`;
    } else {
      // 使用通用聊天端点
      return api || "/api/v1/chat/completions";
    }
  };

  const {
    completion,
    setInput,
    isLoading,
    error,
    stop,
    complete,
    setCompletion,
  } = useCompletion({
    api: getApiEndpoint(),
    body: {
      model,
      // 如果是内容分析，只传递 prompt 参数
      ...(contentId ? { prompt: userContent } : {}),
    },
    headers: {
      Authorization: `Bearer ${getCookie("accessToken")}`,
    },
    onResponse: (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    },
    onFinish: (prompt, completion) => {
      setHasStarted(false);
      onComplete?.(completion);
      toast({
        title: "分析完成",
        description: "AI 分析已成功完成",
      });
    },
    onError: (error) => {
      setHasStarted(false);
      onError?.(error);
      toast({
        title: "分析失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 开始分析
  const handleStartAnalysis = async () => {
    setHasStarted(true);

    if (contentId) {
      // 对于内容分析，直接传入分析指令
      try {
        await complete(userContent);
      } catch (error) {
        setHasStarted(false);
        console.error("Content analysis failed:", error);
      }
    } else {
      // 使用通用完成端点（需要 systemPrompt）
      if (!systemPrompt) {
        toast({
          title: "参数错误",
          description: "需要提供要分析的内容",
          variant: "destructive",
        });
        setHasStarted(false);
        return;
      }

      const fullPrompt = `${userContent}\n\n以下是要分析的内容：\n${systemPrompt}`;

      try {
        await complete(fullPrompt);
      } catch (error) {
        setHasStarted(false);
        console.error("Analysis failed:", error);
      }
    }
  };

  // 停止分析
  const handleStopAnalysis = () => {
    stop();
    setHasStarted(false);
  };

  // 重新开始分析
  const handleRetryAnalysis = () => {
    setCompletion("");
    handleStartAnalysis();
  };

  // 复制结果
  const handleCopyResult = async () => {
    try {
      await navigator.clipboard.writeText(completion);
      toast({
        title: "已复制",
        description: "分析结果已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容到剪贴板",
        variant: "destructive",
      });
    }
  };

  // 清空结果
  const handleClearResult = () => {
    setCompletion("");
    setInput("");
    setHasStarted(false);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
            {isLoading && (
              <Badge variant="outline" className="text-xs">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                分析中
              </Badge>
            )}
            {completion && !isLoading && (
              <Badge variant="outline" className="text-xs text-green-600">
                <Sparkles className="h-3 w-3 mr-1" />
                已完成
              </Badge>
            )}
          </div>

          {showControls && (
            <div className="flex items-center gap-1">
              {!hasStarted && !completion && (
                <Button
                  size="sm"
                  onClick={handleStartAnalysis}
                  disabled={isLoading}
                >
                  <Play className="h-3 w-3 mr-1" />
                  开始分析
                </Button>
              )}

              {isLoading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopAnalysis}
                >
                  <Square className="h-3 w-3 mr-1" />
                  停止
                </Button>
              )}

              {completion && !isLoading && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyResult}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryAnalysis}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearResult}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">分析失败</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryAnalysis}
              className="mt-2"
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              重试
            </Button>
          </div>
        )}

        {!hasStarted && !completion && !error && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                点击&ldquo;开始分析&rdquo;来生成 AI 分析
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">AI 正在分析中...</span>
            </div>

            {completion && (
              <div className="min-h-[100px]">
                {enableMarkdown ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <MarkdownRenderer content={completion} />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm relative font-mono">
                    <span className="streaming-text">{completion}</span>
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-bottom opacity-75" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {completion && !isLoading && (
          <div className="min-h-[100px]">
            {enableMarkdown ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={completion} />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">{completion}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
