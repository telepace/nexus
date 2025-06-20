"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StreamingText } from "@/components/ui/streaming-text";
import { StreamingChat, ChatMessage } from "@/components/ui/streaming-chat";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  MessageSquare,
  FileText,
  Settings,
  Code,
  Brain,
} from "lucide-react";

export default function TestStreamingPage() {
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  );
  const [contentId, setContentId] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "你是一个有用的AI助手，请用中文回答问题。",
  );
  const [userPrompt, setUserPrompt] = useState(
    "请介绍一下人工智能的发展历史。",
  );

  // 模拟聊天消息提交
  const handleChatSubmit = async (message: string, messages: ChatMessage[]) => {
    // 这里可以调用实际的 API
    console.log("发送消息:", message);
    console.log("当前对话历史:", messages);

    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 这里应该调用实际的流式 API
    // 例如: await streamingControls.start(`${apiUrl}/api/v1/chat/completions`, { ... });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">LLM 流式输出演示</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          展示基于 LiteLLM 的流式文本输出功能，包括打字机效果、实时 Markdown
          渲染、错误处理等特性。
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline">React 18</Badge>
          <Badge variant="outline">Next.js</Badge>
          <Badge variant="outline">LiteLLM</Badge>
          <Badge variant="outline">Server-Sent Events</Badge>
          <Badge variant="outline">TypeScript</Badge>
        </div>
      </div>

      {/* 配置面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            配置设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API 基础 URL</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://127.0.0.1:8000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content-id">内容 ID (用于内容分析)</Label>
              <Input
                id="content-id"
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                placeholder="输入内容 ID"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="system-prompt">系统提示词</Label>
            <Input
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="输入系统提示词"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-prompt">用户提示词</Label>
            <Input
              id="user-prompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="输入用户提示词"
            />
          </div>
        </CardContent>
      </Card>

      {/* 演示组件 */}
      <Tabs defaultValue="streaming-text" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="streaming-text"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            流式文本
          </TabsTrigger>
          <TabsTrigger
            value="streaming-chat"
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            流式对话
          </TabsTrigger>
          <TabsTrigger
            value="content-analysis"
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            内容分析
          </TabsTrigger>
        </TabsList>

        {/* 流式文本演示 */}
        <TabsContent value="streaming-text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                StreamingText 组件演示
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                展示通用的流式文本显示组件，支持打字机效果、Markdown
                渲染、错误处理等功能。
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 基础流式文本 */}
                <StreamingText
                  title="基础流式文本"
                  placeholder="点击开始按钮开始演示..."
                  url={`${apiUrl}/api/v1/llm/completions`}
                  requestOptions={{
                    method: "POST",
                    body: JSON.stringify({
                      model: "gpt-3.5-turbo",
                      messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                      ],
                      stream: true,
                      temperature: 0.7,
                      max_tokens: 1000,
                    }),
                  }}
                  streamingOptions={{
                    typewriterDelay: 50,
                    enableTypewriter: true,
                    maxRetries: 3,
                  }}
                  showProgress={true}
                />

                {/* 快速流式文本 */}
                <StreamingText
                  title="快速流式文本 (无打字机效果)"
                  placeholder="点击开始按钮开始演示..."
                  url={`${apiUrl}/api/v1/llm/completions`}
                  requestOptions={{
                    method: "POST",
                    body: JSON.stringify({
                      model: "gpt-3.5-turbo",
                      messages: [
                        { role: "system", content: "请用简洁的方式回答问题。" },
                        { role: "user", content: "什么是机器学习？" },
                      ],
                      stream: true,
                      temperature: 0.5,
                      max_tokens: 500,
                    }),
                  }}
                  streamingOptions={{
                    enableTypewriter: false,
                    debounceDelay: 50,
                  }}
                  showProgress={true}
                />
              </div>

              <Separator />

              {/* 自定义渲染器示例 */}
              <div>
                <h4 className="text-sm font-medium mb-2">自定义内容渲染器</h4>
                <StreamingText
                  title="代码生成示例"
                  placeholder="生成 Python 代码示例..."
                  url={`${apiUrl}/api/v1/llm/completions`}
                  requestOptions={{
                    method: "POST",
                    body: JSON.stringify({
                      model: "gpt-3.5-turbo",
                      messages: [
                        {
                          role: "system",
                          content:
                            "你是一个编程助手，请生成高质量的 Python 代码。",
                        },
                        { role: "user", content: "写一个快速排序算法的实现" },
                      ],
                      stream: true,
                      temperature: 0.3,
                      max_tokens: 800,
                    }),
                  }}
                  enableMarkdown={false}
                  contentRenderer={(content) => (
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="h-4 w-4" />
                        <span className="text-xs text-slate-400">Python</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{content}</pre>
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 流式对话演示 */}
        <TabsContent value="streaming-chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                StreamingChat 组件演示
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                展示聊天式的流式对话组件，支持对话历史、实时流式回复、错误重试等功能。
              </p>

              <div className="h-[600px]">
                <StreamingChat
                  title="AI 助手对话"
                  baseUrl={`${apiUrl}/api/v1`}
                  onSubmit={handleChatSubmit}
                  streamingOptions={{
                    typewriterDelay: 30,
                    enableTypewriter: true,
                    maxRetries: 3,
                  }}
                  showExportButton={true}
                  initialMessages={[
                    {
                      id: "welcome",
                      role: "system",
                      content:
                        "欢迎使用 AI 助手！我可以帮您回答问题、分析内容、编写代码等。",
                      timestamp: new Date(),
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 内容分析演示 */}
        <TabsContent value="content-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                内容分析演示
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                展示内容分析功能，基于现有的内容分析 API 进行流式分析。
              </p>

              {contentId ? (
                <StreamingText
                  title="内容分析结果"
                  placeholder="点击开始按钮开始分析内容..."
                  url={`${apiUrl}/api/v1/content/${contentId}/analyze-ai-sdk`}
                  requestOptions={{
                    method: "POST",
                    body: JSON.stringify({
                      system_prompt: userPrompt,
                      user_prompt: systemPrompt,
                      model: "or-llama-3-1-8b-instruct",
                    }),
                  }}
                  streamingOptions={{
                    typewriterDelay: 40,
                    enableTypewriter: true,
                    maxRetries: 3,
                  }}
                  showProgress={true}
                />
              ) : (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      请在配置面板中输入内容 ID 来测试内容分析功能
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 技术说明 */}
      <Card>
        <CardHeader>
          <CardTitle>技术实现说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">前端技术栈</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• React 18 + Next.js 14</li>
                <li>• TypeScript 类型安全</li>
                <li>• Zustand 状态管理</li>
                <li>• shadcn/ui + Tailwind CSS</li>
                <li>• Fetch API ReadableStream</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">后端技术栈</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• FastAPI + Python</li>
                <li>• LiteLLM 多模型代理</li>
                <li>• Server-Sent Events (SSE)</li>
                <li>• StreamingResponse</li>
                <li>• 错误处理和重试机制</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">核心特性</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h5 className="text-sm font-medium">用户体验</h5>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 打字机效果</li>
                  <li>• 实时 Markdown 渲染</li>
                  <li>• 进度指示器</li>
                  <li>• 暂停/继续控制</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-medium">错误处理</h5>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 自动重试机制</li>
                  <li>• 断线重连</li>
                  <li>• 友好错误提示</li>
                  <li>• 手动重试按钮</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="text-sm font-medium">性能优化</h5>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 防抖更新</li>
                  <li>• 内存管理</li>
                  <li>• 组件懒加载</li>
                  <li>• 虚拟滚动支持</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
