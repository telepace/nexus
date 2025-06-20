"use client";

import React from "react";
import { useChat } from "ai/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  RotateCcw,
  Trash2,
  Copy,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCookie } from "@/lib/utils";

export interface AIChatProps {
  /** 聊天标题 */
  title?: string;
  /** 初始消息 */
  initialMessages?: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  /** API 端点 */
  api?: string;
  /** 是否启用 Markdown 渲染 */
  enableMarkdown?: boolean;
  /** 输入框占位符 */
  placeholder?: string;
  /** 最大消息数量 */
  maxMessages?: number;
  /** 用户头像 */
  userAvatar?: string;
  /** 助手头像 */
  assistantAvatar?: string;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 是否显示复制按钮 */
  showCopyButton?: boolean;
  /** 是否显示清空按钮 */
  showClearButton?: boolean;
  /** 是否显示导出按钮 */
  showExportButton?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 模型选择 */
  model?: string;
}

export function AIChat({
  title = "AI 对话",
  initialMessages = [],
  api = "/api/v1/chat/completions",
  enableMarkdown = true,
  placeholder = "输入消息...",
  maxMessages = 100,
  userAvatar,
  assistantAvatar,
  showTimestamp = true,
  showCopyButton = true,
  showClearButton = true,
  showExportButton = false,
  className,
  model = "or-llama-3-1-8b-instruct",
}: AIChatProps) {
  const { toast } = useToast();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    setMessages,
  } = useChat({
    api,
    initialMessages,
    body: {
      model,
    },
    headers: {
      Authorization: `Bearer ${getCookie("accessToken")}`,
    },
    onError: (error) => {
      toast({
        title: "消息发送失败",
        description: error.message,
        variant: "destructive",
      });
    },
    onFinish: () => {
      // 限制消息数量
      if (messages.length > maxMessages) {
        setMessages((prev) => prev.slice(-maxMessages));
      }
    },
  });

  // 复制消息
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "已复制",
        description: "消息内容已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容到剪贴板",
        variant: "destructive",
      });
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
  };

  // 重试最后一条消息
  const handleRetry = () => {
    reload();
  };

  // 导出对话
  const handleExport = () => {
    const content = messages
      .map(
        (msg) => `[${new Date().toLocaleString()}] ${msg.role}: ${msg.content}`,
      )
      .join("\n\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 渲染消息
  const renderMessage = (message: {
    id: string;
    role: string;
    content: string;
  }) => {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-3 p-4",
          isUser && "flex-row-reverse",
          isSystem && "justify-center",
        )}
      >
        {!isSystem && (
          <Avatar className="h-8 w-8 shrink-0">
            {(isUser ? userAvatar : assistantAvatar) ? (
              <AvatarImage src={isUser ? userAvatar : assistantAvatar} />
            ) : null}
            <AvatarFallback>
              {isUser ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn("flex-1 space-y-2", isUser && "text-right")}>
          <div className="flex items-center gap-2">
            {!isSystem && (
              <span className="text-sm font-medium">
                {isUser ? "你" : "AI"}
              </span>
            )}
            {showTimestamp && (
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleTimeString()}
              </span>
            )}
          </div>

          <div
            className={cn(
              "rounded-lg p-3 max-w-[80%]",
              isUser
                ? "bg-primary text-primary-foreground ml-auto"
                : isSystem
                  ? "bg-muted text-muted-foreground mx-auto text-center"
                  : "bg-muted",
            )}
          >
            {enableMarkdown && !isUser ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={message.content} />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            )}
          </div>

          {showCopyButton && message.content && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopyMessage(message.content)}
              className="h-6 px-2 text-xs"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-1">
            {showExportButton && messages.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-3 w-3" />
              </Button>
            )}
            {showClearButton && messages.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleClear}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            {isLoading && (
              <Button size="sm" variant="outline" onClick={stop}>
                停止
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              开始对话吧...
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex gap-3 p-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">AI</span>
                      <Badge variant="outline" className="text-xs">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        思考中
                      </Badge>
                    </div>
                    <div className="rounded-lg p-3 bg-muted">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">正在生成回复...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {error && (
          <div className="p-4 border-t bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">发送失败: {error.message}</span>
              <Button size="sm" variant="outline" onClick={handleRetry}>
                <RotateCcw className="h-3 w-3 mr-2" />
                重试
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
