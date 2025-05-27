"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useStreamingText, StreamingOptions } from "@/hooks/use-streaming-text";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Copy,
  FastForward,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface StreamingTextProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  /** 流式请求的 URL */
  url?: string;
  /** 请求选项 */
  requestOptions?: RequestInit;
  /** 流式配置选项 */
  streamingOptions?: StreamingOptions;
  /** 是否渲染为 Markdown */
  enableMarkdown?: boolean;
  /** 是否显示控制按钮 */
  showControls?: boolean;
  /** 是否显示状态指示器 */
  showStatus?: boolean;
  /** 是否显示进度信息 */
  showProgress?: boolean;
  /** 标题 */
  title?: string;
  /** 占位符文本 */
  placeholder?: string;
  /** 自动开始 */
  autoStart?: boolean;
  /** 自定义内容渲染器 */
  contentRenderer?: (content: string) => React.ReactNode;
  /** 自定义错误渲染器 */
  errorRenderer?: (error: string, retry: () => void) => React.ReactNode;
}

export const StreamingText = forwardRef<HTMLDivElement, StreamingTextProps>(
  (
    {
      url,
      requestOptions,
      streamingOptions,
      enableMarkdown = true,
      showControls = true,
      showStatus = true,
      showProgress = false,
      title,
      placeholder = "等待内容...",
      autoStart = false,
      contentRenderer,
      errorRenderer,
      className,
      ...props
    },
    ref,
  ) => {
    const { toast } = useToast();
    const contentRef = useRef<HTMLDivElement>(null);

    const [state, controls] = useStreamingText({
      ...streamingOptions,
      onError: (error) => {
        toast({
          title: "流式请求失败",
          description: error.message,
          variant: "destructive",
        });
        streamingOptions?.onError?.(error);
      },
      onComplete: (content) => {
        toast({
          title: "内容加载完成",
          description: `已接收 ${content.length} 个字符`,
        });
        streamingOptions?.onComplete?.(content);
      },
    });

    // 自动开始
    useEffect(() => {
      if (autoStart && url) {
        controls.start(url, requestOptions);
      }
    }, [autoStart, url, requestOptions, controls]);

    // 自动滚动到底部
    useEffect(() => {
      if (contentRef.current && state.isLoading) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    }, [state.content, state.isLoading]);

    // 复制内容
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(state.rawContent || state.content);
        toast({
          title: "已复制",
          description: "内容已复制到剪贴板",
        });
      } catch {
        toast({
          title: "复制失败",
          description: "无法复制内容到剪贴板",
          variant: "destructive",
        });
      }
    };

    // 手动开始
    const handleStart = () => {
      if (url) {
        controls.start(url, requestOptions);
      }
    };

    // 渲染状态指示器
    const renderStatusIndicator = () => {
      if (!showStatus) return null;

      let icon;
      let text;
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "default";

      if (state.error) {
        icon = <AlertCircle className="h-3 w-3" />;
        text = "错误";
        variant = "destructive";
      } else if (state.isConnecting) {
        icon = <WifiOff className="h-3 w-3 animate-pulse" />;
        text = "连接中";
        variant = "outline";
      } else if (state.isLoading) {
        icon = <Wifi className="h-3 w-3" />;
        text = "接收中";
        variant = "default";
      } else if (state.isComplete) {
        icon = <CheckCircle2 className="h-3 w-3" />;
        text = "完成";
        variant = "secondary";
      } else {
        icon = <Square className="h-3 w-3" />;
        text = "就绪";
        variant = "outline";
      }

      return (
        <Badge variant={variant} className="flex items-center gap-1">
          {icon}
          {text}
        </Badge>
      );
    };

    // 渲染进度信息
    const renderProgress = () => {
      if (!showProgress) return null;

      const contentLength = state.content.length;
      const rawContentLength = state.rawContent.length;
      const progress =
        rawContentLength > 0 ? (contentLength / rawContentLength) * 100 : 0;

      return (
        <div className="text-xs text-muted-foreground">
          {state.isLoading && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>
                {contentLength} / {rawContentLength}
              </span>
            </div>
          )}
          {state.isComplete && <span>共 {state.content.length} 个字符</span>}
          {state.retryCount > 0 && <span>重试次数: {state.retryCount}</span>}
        </div>
      );
    };

    // 渲染控制按钮
    const renderControls = () => {
      if (!showControls) return null;

      return (
        <div className="flex items-center gap-1">
          {!state.isLoading && !state.isComplete && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStart}
              disabled={!url}
            >
              <Play className="h-3 w-3" />
            </Button>
          )}

          {state.isLoading && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={controls.togglePause}
              >
                {state.isPaused ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={controls.stop}>
                <Square className="h-3 w-3" />
              </Button>
            </>
          )}

          {state.content &&
            !state.isLoading &&
            state.content !== state.rawContent && (
              <Button
                size="sm"
                variant="outline"
                onClick={controls.skipTypewriter}
                title="跳过打字机效果"
              >
                <FastForward className="h-3 w-3" />
              </Button>
            )}

          {state.error && (
            <Button
              size="sm"
              variant="outline"
              onClick={controls.retry}
              disabled={state.retryCount >= (streamingOptions?.maxRetries || 3)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={controls.reset}>
            重置
          </Button>

          {state.content && (
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    };

    // 渲染内容
    const renderContent = () => {
      if (state.error && errorRenderer) {
        return errorRenderer(state.error, controls.retry);
      }

      if (state.error) {
        return (
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{state.error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={controls.retry}
                disabled={
                  state.retryCount >= (streamingOptions?.maxRetries || 3)
                }
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重试 ({state.retryCount}/{streamingOptions?.maxRetries || 3})
              </Button>
            </div>
          </div>
        );
      }

      if (!state.content && !state.isLoading) {
        return (
          <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
            {placeholder}
          </div>
        );
      }

      if (state.isConnecting) {
        return (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">正在连接...</span>
            </div>
          </div>
        );
      }

      if (contentRenderer) {
        return contentRenderer(state.content);
      }

      if (enableMarkdown) {
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownRenderer content={state.content} />
          </div>
        );
      }

      return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {state.content}
          {state.isLoading && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          )}
        </div>
      );
    };

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        {(title || showStatus || showControls) && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {title && <CardTitle className="text-base">{title}</CardTitle>}
                {renderStatusIndicator()}
              </div>
              {renderControls()}
            </div>
            {renderProgress()}
          </CardHeader>
        )}

        <CardContent className="pt-0">
          <div
            ref={contentRef}
            className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          >
            {renderContent()}
          </div>
        </CardContent>
      </Card>
    );
  },
);

StreamingText.displayName = "StreamingText";
