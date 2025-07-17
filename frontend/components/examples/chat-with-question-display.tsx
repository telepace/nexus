"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactQuestionDisplay } from "@/components/ui/compact-question-display";
import { UserQuestionDisplay } from "@/components/ui/user-question-display";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, Settings } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatWithQuestionDisplayProps {
  /** 聊天标题 */
  title?: string;
  /** 是否显示详细的用户问题 */
  showDetailedQuestions?: boolean;
  /** 初始消息 */
  initialMessages?: ChatMessage[];
}

export function ChatWithQuestionDisplay({
  title = "AI 对话",
  showDetailedQuestions = false,
  initialMessages = [],
}: ChatWithQuestionDisplayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 模拟发送消息
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // 模拟AI回复
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `我收到了您的问题："${input.substring(0, 50)}${input.length > 50 ? "..." : ""}"。这是一个模拟的AI回复，展示了如何处理用户提问的展示。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  // 渲染消息
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    if (isUser) {
      // 用户消息使用问题展示组件
      return showDetailedQuestions ? (
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%]">
            <UserQuestionDisplay
              question={message.content}
              title="您的问题"
              showUserIcon={false}
              className="border-primary/20 bg-primary/5"
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%]">
            <CompactQuestionDisplay
              question={message.content}
              variant="bubble"
              showUserIcon={false}
              className="ml-auto"
            />
          </div>
        </div>
      );
    }

    if (isSystem) {
      return (
        <div className="flex justify-center mb-4">
          <Badge variant="outline" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            {message.content}
          </Badge>
        </div>
      );
    }

    // AI回复
    return (
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 max-w-[80%]">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {messages.length} 条消息
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessages([])}
              className="h-8"
            >
              清空
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* 消息列表 */}
        <ScrollArea className="flex-1 px-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Bot className="h-12 w-12 mx-auto opacity-50" />
                <p className="text-sm">开始对话吧...</p>
                <p className="text-xs">
                  {showDetailedQuestions ? "详细模式" : "紧凑模式"}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message) => (
                <div key={message.id}>{renderMessage(message)}</div>
              ))}

              {/* 加载状态 */}
              {isLoading && (
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    <Bot className="h-4 w-4 text-muted-foreground animate-pulse" />
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">
                        AI 正在思考中...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* 输入框 */}
        <div className="p-2 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入您的问题..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="sm"
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

// 使用示例
export function ChatExamples() {
  const sampleMessages: ChatMessage[] = [
    {
      id: "1",
      role: "system",
      content: "对话开始",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      role: "user",
      content:
        "你好！我想了解一下这个用户提问展示组件的具体实现原理。它是如何智能地截断文本的？为什么要优先在句号、问号、感叹号处截断？这样的设计有什么好处？",
      timestamp: new Date(Date.now() - 240000),
    },
    {
      id: "3",
      role: "assistant",
      content:
        "您好！很高兴为您解答关于用户提问展示组件的问题。\n\n关于智能截断的实现原理：\n1. 组件会先检查文本长度是否超过设定的阈值\n2. 如果需要截断，会在指定长度范围内寻找最佳的截断点\n3. 优先选择句号、问号、感叹号等标点符号作为截断点\n\n这样设计的好处是：\n- 保持语义完整性，避免在句子中间截断\n- 提供更好的阅读体验\n- 让用户能够快速理解问题的核心内容",
      timestamp: new Date(Date.now() - 180000),
    },
    {
      id: "4",
      role: "user",
      content:
        "很棒的解释！那么在实际项目中，应该如何选择使用完整版还是紧凑版组件呢？",
      timestamp: new Date(Date.now() - 120000),
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">聊天界面集成示例</h1>
        <p className="text-muted-foreground">
          展示如何在实际聊天界面中集成用户提问展示组件
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* 紧凑模式 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">紧凑模式（推荐用于聊天）</h2>
          <ChatWithQuestionDisplay
            title="紧凑聊天界面"
            showDetailedQuestions={false}
            initialMessages={sampleMessages}
          />
        </div>

        {/* 详细模式 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">详细模式（适合重要对话）</h2>
          <ChatWithQuestionDisplay
            title="详细聊天界面"
            showDetailedQuestions={true}
            initialMessages={sampleMessages}
          />
        </div>
      </div>

      {/* 使用建议 */}
      <div className="bg-muted/30 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">集成建议</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>紧凑模式：</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>适合日常聊天对话</li>
              <li>节省屏幕空间</li>
              <li>用户体验更流畅</li>
            </ul>
          </div>
          <div>
            <strong>详细模式：</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>适合重要的客服对话</li>
              <li>突出显示用户问题</li>
              <li>便于问题追踪和管理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
