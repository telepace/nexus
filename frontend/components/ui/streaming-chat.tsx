"use client";

import React, { useState, useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { useStreamingText, StreamingOptions } from "@/hooks/use-streaming-text";
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
}

export interface StreamingChatProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  /** 聊天标题 */
  title?: string;
  /** 初始消息 */
  initialMessages?: ChatMessage[];
  /** 流式请求的基础 URL */
  baseUrl?: string;
  /** 请求选项 */
  requestOptions?: RequestInit;
  /** 流式配置选项 */
  streamingOptions?: StreamingOptions;
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
  /** 消息提交回调 */
  onSubmit?: (message: string, messages: ChatMessage[]) => Promise<void> | void;
  /** 自定义消息渲染器 */
  messageRenderer?: (message: ChatMessage) => React.ReactNode;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 是否显示复制按钮 */
  showCopyButton?: boolean;
  /** 是否显示清空按钮 */
  showClearButton?: boolean;
  /** 是否显示导出按钮 */
  showExportButton?: boolean;
}

export const StreamingChat = forwardRef<HTMLDivElement, StreamingChatProps>(
  (
    {
      title = "AI 对话",
      initialMessages = [],
      baseUrl,
      requestOptions,
      streamingOptions,
      enableMarkdown = true,
      placeholder = "输入消息...",
      maxMessages = 100,
      userAvatar,
      assistantAvatar,
      onSubmit,
      messageRenderer,
      showTimestamp = true,
      showCopyButton = true,
      showClearButton = true,
      showExportButton = false,
      className,
      ...props
    },
    ref,
  ) => {
    const { toast } = useToast();
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [, streamingControls] = useStreamingText({
      ...streamingOptions,
      onUpdate: (content) => {
        setMessages((prev) =>
          prev.map((msg) => (msg.isStreaming ? { ...msg, content } : msg)),
        );
      },
      onComplete: (content) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isStreaming ? { ...msg, content, isStreaming: false } : msg,
          ),
        );
        setIsSubmitting(false);
      },
      onError: (error) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isStreaming
              ? { ...msg, error: error.message, isStreaming: false }
              : msg,
          ),
        );
        setIsSubmitting(false);
        toast({
          title: "消息发送失败",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    // 自动滚动到底部
    useEffect(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }, [messages]);

    // 生成消息 ID
    const generateMessageId = () =>
      `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 发送消息
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!input.trim() || isSubmitting) return;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      // 添加用户消息和流式助手消息
      const newMessages = [...messages, userMessage, assistantMessage];
      setMessages(newMessages);
      setInput("");
      setIsSubmitting(true);

      // 限制消息数量
      if (newMessages.length > maxMessages) {
        setMessages((prev) => prev.slice(-maxMessages));
      }

      try {
        if (onSubmit) {
          await onSubmit(userMessage.content, newMessages);
        } else if (baseUrl) {
          // 默认的流式请求
          const url = `${baseUrl}/chat/completions`;
          const payload = {
            messages: newMessages
              .filter((msg) => !msg.isStreaming)
              .map((msg) => ({
                role: msg.role,
                content: msg.content,
              })),
            stream: true,
          };

          await streamingControls.start(url, {
            method: "POST",
            body: JSON.stringify(payload),
            ...requestOptions,
          });
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isStreaming
              ? {
                  ...msg,
                  error: error instanceof Error ? error.message : "发送失败",
                  isStreaming: false,
                }
              : msg,
          ),
        );
        setIsSubmitting(false);
      }
    };

    // 重试消息
    const handleRetry = (messageId: string) => {
      const message = messages.find((msg) => msg.id === messageId);
      if (!message) return;

      // 找到对应的用户消息
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      const userMessage = messages[messageIndex - 1];

      if (userMessage && userMessage.role === "user") {
        // 重置助手消息状态
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: "",
                  error: undefined,
                  isStreaming: true,
                }
              : msg,
          ),
        );

        setIsSubmitting(true);

        // 重新发送
        if (onSubmit) {
          onSubmit(userMessage.content, messages.slice(0, messageIndex + 1));
        }
      }
    };

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
      streamingControls.reset();
    };

    // 导出对话
    const handleExport = () => {
      const content = messages
        .map(
          (msg) =>
            `[${msg.timestamp.toLocaleString()}] ${msg.role}: ${msg.content}`,
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
    const renderMessage = (message: ChatMessage) => {
      if (messageRenderer) {
        return messageRenderer(message);
      }

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
                  {message.timestamp.toLocaleTimeString()}
                </span>
              )}
              {message.isStreaming && (
                <Badge variant="outline" className="text-xs">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  输入中
                </Badge>
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
                message.error && "border border-destructive",
              )}
            >
              {message.error ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">发送失败</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {message.error}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetry(message.id)}
                    className="w-full"
                  >
                    <RotateCcw className="h-3 w-3 mr-2" />
                    重试
                  </Button>
                </div>
              ) : enableMarkdown && !isUser ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MarkdownRenderer content={message.content} />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                  )}
                </div>
              )}
            </div>

            {showCopyButton && message.content && !message.error && (
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
      <Card
        ref={ref}
        className={cn("flex flex-col h-full", className)}
        {...props}
      >
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                开始对话吧...
              </div>
            ) : (
              <div className="space-y-1">{messages.map(renderMessage)}</div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isSubmitting}
                size="sm"
              >
                {isSubmitting ? (
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
  },
);

StreamingChat.displayName = "StreamingChat";
