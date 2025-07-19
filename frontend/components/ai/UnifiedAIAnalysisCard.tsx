"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import { UniversalContentRenderer } from "@/components/ui/UniversalContentRenderer";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import {
  useAIAnalysis,
  isJsonlContent,
  extractJsonlFromDataStream,
  AIAnalysisConfig,
} from "@/hooks/use-ai-analysis";

export interface UnifiedAIAnalysisCardProps {
  /** 分析标题 */
  title: string;
  /** 分析指令 */
  instruction: string;
  /** 分析配置 */
  config: AIAnalysisConfig;
  /** 自定义样式 */
  className?: string;
  /** 是否显示控制按钮 */
  showControls?: boolean;
  /** 是否自动开始分析 */
  autoStart?: boolean;
  /** 预设内容（用于只读模式） */
  initialContent?: string;
  /** 渲染器类型 */
  renderType?: "auto" | "markdown" | "jsonl" | "universal";
  /** 完成回调 */
  onComplete?: (result: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 开始回调 */
  onStart?: () => void;
}

export function UnifiedAIAnalysisCard({
  title,
  instruction,
  config,
  className,
  showControls = true,
  autoStart = false,
  initialContent,
  renderType = "auto",
  onComplete,
  onError,
  onStart,
}: UnifiedAIAnalysisCardProps) {
  const { state, actions } = useAIAnalysis(config);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // 处理初始内容设置（只读模式）
  useEffect(() => {
    if (config.mode === "display" && initialContent) {
      actions.setContent(initialContent);
    }
  }, [config.mode, initialContent, actions]);

  // 开始分析
  const handleStartAnalysis = useCallback(async () => {
    try {
      onStart?.();
      await actions.startAnalysis(instruction);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("分析失败");
      onError?.(err);
      toast.error(`分析失败: ${err.message}`);
    }
  }, [actions, instruction, onError, onStart]);

  // 自动开始分析
  useEffect(() => {
    if (
      autoStart &&
      !hasAutoStarted &&
      instruction &&
      config.mode !== "display"
    ) {
      setHasAutoStarted(true);
      handleStartAnalysis();
    }
  }, [
    autoStart,
    hasAutoStarted,
    instruction,
    config.mode,
    handleStartAnalysis,
  ]);

  // 停止分析
  const handleStopAnalysis = () => {
    actions.stopAnalysis();
  };

  // 重试分析
  const handleRetryAnalysis = async () => {
    try {
      await actions.retryAnalysis();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("重试失败");
      onError?.(err);
      toast.error(`重试失败: ${err.message}`);
    }
  };

  // 复制结果
  const handleCopyResult = async () => {
    const success = await actions.copyResult();
    if (success) {
      toast.success("分析结果已复制到剪贴板");
    } else {
      toast.error("无法复制内容到剪贴板");
    }
  };

  // 清空结果
  const handleClearResult = () => {
    actions.clearResult();
  };

  // 智能内容渲染器 - 修复 Data Stream Protocol 处理
  const renderContent = (content: string, streaming: boolean = false) => {
    if (!content) return null;

    console.log("🎨 渲染内容:", {
      content: content.substring(0, 100),
      streaming,
      isJsonl: isJsonlContent(content),
      contentLength: content.length,
      lineCount: content.split("\n").filter(Boolean).length,
    });

    // 如果是 Data Stream Protocol 格式，先提取纯 JSONL
    let processedContent = content;
    if (content.includes("0:") && isJsonlContent(content)) {
      processedContent = extractJsonlFromDataStream(content);
      console.log("📦 提取的 JSONL 内容:", processedContent.substring(0, 100));
    }

    // 根据渲染类型选择渲染器
    switch (renderType) {
      case "markdown":
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownRenderer content={processedContent} />
          </div>
        );

      case "jsonl":
        return streaming ? (
          <StreamingJsonlRenderer
            content={processedContent}
            isLoading={streaming}
          />
        ) : (
          <JsonlRenderer content={processedContent} />
        );

      case "universal":
        return <UniversalContentRenderer content={processedContent} />;

      case "auto":
      default:
        // 自动检测内容类型
        if (isJsonlContent(content)) {
          return streaming ? (
            <StreamingJsonlRenderer
              content={processedContent}
              isLoading={streaming}
            />
          ) : (
            <JsonlRenderer content={processedContent} />
          );
        } else {
          return (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer content={processedContent} />
            </div>
          );
        }
    }
  };

  // 监听完成事件
  useEffect(() => {
    if (state.isCompleted && state.content) {
      onComplete?.(state.content);
      toast.success("AI 分析已成功完成");
    }
  }, [state.isCompleted, state.content, onComplete]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>

            {/* 状态指示器 */}
            {state.isLoading && (
              <Badge variant="outline" className="text-xs">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                分析中
              </Badge>
            )}
            {state.isCompleted && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 mr-1" />
                已完成
              </Badge>
            )}
            {state.retryCount > 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                重试 {state.retryCount}
              </Badge>
            )}
          </div>

          {/* 控制按钮 */}
          {showControls && config.mode !== "display" && (
            <div className="flex items-center gap-1">
              {!state.hasStarted && !state.content && (
                <Button
                  size="sm"
                  onClick={handleStartAnalysis}
                  disabled={state.isLoading || !instruction}
                >
                  <Play className="h-3 w-3 mr-1" />
                  开始分析
                </Button>
              )}

              {state.isLoading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopAnalysis}
                >
                  <Square className="h-3 w-3 mr-1" />
                  停止
                </Button>
              )}

              {state.content && !state.isLoading && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyResult}
                    title="复制结果"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryAnalysis}
                    title="重新分析"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearResult}
                    title="清空结果"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* 只读模式的复制按钮 */}
          {config.mode === "display" && state.content && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyResult}
              title="复制内容"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        {/* 错误状态 */}
        {state.error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">分析失败</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {state.error.message}
            </p>
            {config.mode !== "display" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetryAnalysis}
                className="mt-2"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                重试
              </Button>
            )}
          </div>
        )}

        {/* 空状态 */}
        {!state.hasStarted &&
          !state.content &&
          !state.error &&
          config.mode !== "display" && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  点击&ldquo;开始分析&rdquo;来生成 AI 分析
                </p>
              </div>
            </div>
          )}

        {/* 加载状态 */}
        {state.isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">AI 正在分析中...</span>
            </div>

            {/* 实时流式内容 */}
            {state.streamContent && (
              <div className="min-h-[100px]">
                {renderContent(state.streamContent, true)}
              </div>
            )}
          </div>
        )}

        {/* 完成状态的内容 */}
        {state.content && !state.isLoading && (
          <div className="min-h-[100px]">
            {renderContent(state.content, false)}
          </div>
        )}

        {/* 只读模式的空状态 */}
        {config.mode === "display" && !state.content && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无内容</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
