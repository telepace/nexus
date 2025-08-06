"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Bot,
  User,
  Sparkles,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { StreamingJsonlRenderer } from "./StreamingJsonlRenderer";
import { isJsonlContent } from "@/hooks/use-ai-analysis";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}

interface EnhancedMessageCardProps {
  message: ChatMessage;
  /** 是否显示头像 */
  showAvatar?: boolean;
  /** 用户头像URL */
  userAvatar?: string;
  /** 助手头像URL */
  assistantAvatar?: string;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 是否启用Markdown渲染 */
  enableMarkdown?: boolean;
  /** 重试回调 */
  onRetry?: (messageId: string) => void;
  /** 复制回调 */
  onCopy?: (content: string) => void;
  /** 反馈回调 */
  onFeedback?: (messageId: string, feedback: "positive" | "negative") => void;
  /** 自定义样式 */
  className?: string;
  /** 内容ID（用于引用系统） */
  contentId?: string;
}

export function EnhancedMessageCard({
  message,
  showAvatar = true,
  userAvatar,
  assistantAvatar,
  showTimestamp = true,
  showActions = true,
  enableMarkdown = true,
  onRetry,
  onCopy,
  onFeedback,
  className,
  contentId,
}: EnhancedMessageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(
    null,
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  // 自动滚动到新消息
  useEffect(() => {
    if (message.isStreaming && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [message.content, message.isStreaming]);

  // 复制消息内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("已复制到剪贴板");
      onCopy?.(message.content);
    } catch {
      toast.error("复制失败");
    }
  };

  // 处理反馈
  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type);
    onFeedback?.(message.id, type);
    toast.success(type === "positive" ? "感谢您的反馈" : "我们会改进的");
  };

  // 渲染消息内容
  const renderContent = () => {
    if (message.error) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium">发送失败</span>
          </div>
          <p className="text-sm text-muted-foreground">{message.error}</p>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(message.id)}
              className="w-full"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              重试
            </Button>
          )}
        </div>
      );
    }

    if (!message.content && message.isStreaming) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在思考中...</span>
        </div>
      );
    }

    // 智能内容渲染
    if (isAssistant && isJsonlContent(message.content)) {
      return (
        <StreamingJsonlRenderer
          content={message.content}
          isLoading={message.isStreaming}
          showStreamingIndicator={true}
          contentId={contentId}
          className="max-w-none"
        />
      );
    } else if (enableMarkdown && isAssistant) {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MarkdownRenderer content={message.content} />
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 rounded-sm" />
          )}
        </div>
      );
    } else {
      return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 rounded-sm" />
          )}
        </div>
      );
    }
  };

  // 系统消息特殊处理
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <Badge variant="outline" className="text-xs px-3 py-1">
          <Sparkles className="h-3 w-3 mr-1" />
          {message.content}
        </Badge>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative transition-all duration-200",
        isUser ? "ml-auto max-w-[85%]" : "mr-auto max-w-[85%]",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      >
        {/* 头像 */}
        {showAvatar && (
          <Avatar className="h-8 w-8 shrink-0">
            {(isUser ? userAvatar : assistantAvatar) && (
              <AvatarImage src={isUser ? userAvatar : assistantAvatar} />
            )}
            <AvatarFallback
              className={cn(
                isUser ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {isUser ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
        )}

        {/* 消息内容区域 */}
        <div className={cn("flex-1 space-y-2", isUser && "text-right")}>
          {/* 头部信息 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{isUser ? "你" : "AI助手"}</span>
            {showTimestamp && (
              <span>
                {formatDistanceToNow(message.timestamp, {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </span>
            )}
            {message.isStreaming && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                输入中
              </Badge>
            )}
            {message.metadata?.model && (
              <Badge variant="secondary" className="text-xs">
                {message.metadata.model}
              </Badge>
            )}
          </div>

          {/* 消息卡片 */}
          <Card
            className={cn(
              "overflow-hidden transition-all duration-200",
              isUser
                ? "bg-primary text-primary-foreground border-primary/20"
                : "bg-card hover:shadow-md",
              message.error && "border-destructive bg-destructive/5",
              message.isStreaming && "border-primary/40 shadow-sm",
            )}
          >
            <CardContent className="p-4">{renderContent()}</CardContent>
          </Card>

          {/* 操作按钮 */}
          {showActions && !message.isStreaming && message.content && (
            <div
              className={cn(
                "flex items-center gap-1 transition-all duration-200",
                isUser ? "justify-end" : "justify-start",
                isHovered ? "opacity-100" : "opacity-0",
              )}
            >
              {/* 复制按钮 */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>

              {/* AI回复的反馈按钮 */}
              {isAssistant && onFeedback && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFeedback("positive")}
                    className={cn(
                      "h-7 px-2",
                      feedback === "positive" && "text-green-600 bg-green-50",
                    )}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFeedback("negative")}
                    className={cn(
                      "h-7 px-2",
                      feedback === "negative" && "text-red-600 bg-red-50",
                    )}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </>
              )}

              {/* 更多操作 */}
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* 元数据信息 */}
          {message.metadata?.tokens && !message.isStreaming && (
            <div className="text-xs text-muted-foreground">
              <span>{message.metadata.tokens} tokens</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
