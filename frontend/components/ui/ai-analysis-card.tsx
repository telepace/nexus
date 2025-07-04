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
  Clock,
  TrendingUp,
  Star,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCookie } from "@/lib/utils";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";

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
      // 使用更新版本的内容完成端点，有更好的消息结构
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      return `${apiUrl}/api/v1/content/${contentId}/completion-updated`;
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
      // 不要在这里预设 prompt，让 complete 方法来处理
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
      // 对于内容分析，使用自定义的请求体格式
      try {
        // 直接使用 fetch 发送请求，更新版本的端点期望 { analysis_instruction: string } 格式
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(
          `${apiUrl}/api/v1/content/${contentId}/completion-updated`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getCookie("accessToken")}`,
            },
            body: JSON.stringify({
              analysis_instruction: userContent,
              model: model,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 处理流式响应
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("无法获取响应流");
        }

        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // 实时更新显示的内容
          setCompletion(accumulatedContent);
        }

        setHasStarted(false);
        onComplete?.(accumulatedContent);
        toast({
          title: "分析完成",
          description: "AI 分析已成功完成",
        });
      } catch (error) {
        setHasStarted(false);
        
        // 智能错误处理 - 识别不同类型的错误并提供相应提示
        let errorMessage = "分析失败";
        let suggestion = "请稍后重试";
        
        if (error instanceof Error) {
          const errorStr = error.message.toLowerCase();
          
          if (errorStr.includes("not bound to a session") || 
              errorStr.includes("数据库连接问题")) {
            errorMessage = "数据库连接异常";
            suggestion = "请刷新页面后重试，或联系技术支持";
          } else if (errorStr.includes("timeout") || errorStr.includes("超时")) {
            errorMessage = "分析超时";
            suggestion = "内容较长导致处理时间过长，请稍后重试";
          } else if (errorStr.includes("network") || errorStr.includes("网络")) {
            errorMessage = "网络连接问题";
            suggestion = "请检查网络连接后重试";
          } else if (errorStr.includes("unauthorized") || errorStr.includes("401")) {
            errorMessage = "认证失效";
            suggestion = "请重新登录后重试";
          } else if (errorStr.includes("forbidden") || errorStr.includes("403")) {
            errorMessage = "权限不足";
            suggestion = "您没有权限执行此操作";
          } else if (errorStr.includes("not found") || errorStr.includes("404")) {
            errorMessage = "内容不存在";
            suggestion = "请确认内容是否已被删除";
          } else if (errorStr.includes("500") || errorStr.includes("internal")) {
            errorMessage = "服务器内部错误";
            suggestion = "服务器出现问题，请稍后重试或联系技术支持";
          } else {
            errorMessage = error.message || "未知错误";
          }
        }
        
        const finalError = new Error(`${errorMessage}: ${suggestion}`);
        onError?.(finalError);
        
        toast({
          title: errorMessage,
          description: suggestion,
          variant: "destructive",
          action: (
            <button
              onClick={handleRetryAnalysis}
              className="text-sm underline hover:no-underline"
            >
              重试
            </button>
          ),
        });
        
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
    <Card 
      className={cn("w-full", className)}
    >
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

      <CardContent className="px-6 pb-6">
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
                    <span className="inline-block w-2 h-4 bg-primary animate-shimmer ml-1 align-bottom opacity-75" />
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
