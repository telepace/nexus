"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Trash2,
  Download,
  Settings,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { EnhancedChatInput } from "./enhanced-chat-input";
import { EnhancedMessageCard, ChatMessage } from "./enhanced-message-card";
import { getCookie } from "@/lib/utils";

interface OptimizedChatContainerProps {
  /** 聊天标题 */
  title?: string;
  /** 初始消息 */
  initialMessages?: ChatMessage[];
  /** 内容ID（用于上下文对话） */
  contentId?: string;
  /** API端点 */
  apiEndpoint?: string;
  /** 模型名称 */
  model?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 用户头像 */
  userAvatar?: string;
  /** 助手头像 */
  assistantAvatar?: string;
  /** 最大消息数 */
  maxMessages?: number;
  /** 是否显示清空按钮 */
  showClearButton?: boolean;
  /** 是否显示导出按钮 */
  showExportButton?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 消息发送完成回调 */
  onMessageSent?: (message: ChatMessage) => void;
  /** 消息接收完成回调 */
  onMessageReceived?: (message: ChatMessage) => void;
}

export function OptimizedChatContainer({
  title = "AI 对话",
  initialMessages = [],
  contentId,
  apiEndpoint,
  model = "or-llama-3-1-8b-instruct",
  systemPrompt,
  userAvatar,
  assistantAvatar,
  maxMessages = 100,
  showClearButton = true,
  showExportButton = false,
  className,
  onMessageSent,
  onMessageReceived,
}: OptimizedChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "error"
  >("connected");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 生成消息ID
  const generateMessageId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // 当消息更新时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 发送消息
  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: messageContent.trim(),
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    // 添加消息到列表
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);
    setConnectionStatus("connecting");

    // 触发用户消息发送回调
    onMessageSent?.(userMessage);

    try {
      // 准备API请求
      const apiUrl =
        apiEndpoint ||
        (contentId
          ? `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/content/${contentId}/completion-updated`
          : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/chat/completions`);

      const requestBody = contentId
        ? {
            analysis_instruction: messageContent.trim(),
            model: model,
            template_name: "simple_chat.j2", // 🎯 聊天容器使用简单聊天模板
          }
        : {
            messages: [
              ...(systemPrompt
                ? [{ role: "system", content: systemPrompt }]
                : []),
              ...messages
                .filter((msg) => !msg.isStreaming && !msg.error)
                .map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                })),
              { role: "user", content: messageContent.trim() },
            ],
            model: model,
            stream: true,
          };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("accessToken")}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setConnectionStatus("connected");

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let rawBuffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawBuffer += chunk;

        const lines = rawBuffer.split("\n");
        rawBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // 处理Data Stream Protocol格式
          if (trimmed.startsWith("0:")) {
            const jsonContent = trimmed.slice(2);
            if (jsonContent) {
              accumulatedContent += jsonContent + "\n";

              // 实时更新助手消息
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: accumulatedContent }
                    : msg,
                ),
              );
            }
          } else if (trimmed.startsWith("8:")) {
            // 完成信号
            break;
          } else if (trimmed.startsWith("9:")) {
            // 错误信号
            try {
              const errorObj = JSON.parse(trimmed.slice(2));
              throw new Error(errorObj.error || "Stream error");
            } catch {
              throw new Error("Stream error");
            }
          } else if (trimmed.startsWith("data: ")) {
            // OpenAI SSE格式兼容
            const data = trimmed.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                accumulatedContent += parsed.choices[0].delta.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: accumulatedContent }
                      : msg,
                  ),
                );
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 完成流式传输
      const finalMessage: ChatMessage = {
        ...assistantMessage,
        content: accumulatedContent,
        isStreaming: false,
        metadata: {
          model: model,
          tokens: Math.ceil(accumulatedContent.length / 3), // 估算token数
        },
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id ? finalMessage : msg,
        ),
      );

      // 触发消息接收回调
      onMessageReceived?.(finalMessage);
    } catch (error) {
      console.error("发送消息失败:", error);
      setConnectionStatus("error");

      // 更新错误状态
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? {
                ...msg,
                isStreaming: false,
                error: error instanceof Error ? error.message : "发送失败",
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }

    // 限制消息数量
    if (messages.length > maxMessages) {
      setMessages((prev) => prev.slice(-maxMessages));
    }
  };

  // 重试失败的消息
  const handleRetryMessage = (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message) return;

    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    const userMessage = messages[messageIndex - 1];

    if (userMessage && userMessage.role === "user") {
      // 重置助手消息状态
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: "", error: undefined, isStreaming: true }
            : msg,
        ),
      );

      // 重新发送
      handleSendMessage(userMessage.content);
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    setInput("");
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

  // 渲染连接状态指示器
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case "connecting":
        return (
          <Badge variant="outline" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            连接中
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            连接错误
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* 头部 */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle className="text-base">{title}</CardTitle>
            {renderConnectionStatus()}
          </div>

          <div className="flex items-center gap-1">
            {showExportButton && messages.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="h-8"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            {showClearButton && messages.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClear}
                className="h-8"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* 消息列表 */}
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">开始新的对话吧...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <EnhancedMessageCard
                  key={message.id}
                  message={message}
                  userAvatar={userAvatar}
                  assistantAvatar={assistantAvatar}
                  contentId={contentId}
                  onRetry={handleRetryMessage}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 输入区域 */}
        <div className="p-4 border-t">
          <EnhancedChatInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder={
              contentId ? "询问关于这个内容的任何问题..." : "输入消息..."
            }
            disabled={isLoading}
            maxLength={2000}
          />
        </div>
      </CardContent>
    </Card>
  );
}
