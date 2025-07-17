"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OptimizedChatContainer } from "@/components/ui/optimized-chat-container";
import { ChatMessage } from "@/components/ui/enhanced-message-card";
import { 
  MessageSquare, 
  Sparkles, 
  Settings, 
  Play,
  Zap
} from "lucide-react";

export default function TestOptimizedChatPage() {
  const [contentId, setContentId] = useState("");
  const [model, setModel] = useState("or-llama-3-1-8b-instruct");
  const [systemPrompt, setSystemPrompt] = useState(
    "你是一个专业的AI助手，擅长分析内容并提供有见地的回答。请用中文回复，并尽量使用结构化的JSONL格式输出。"
  );

  // 模拟初始消息
  const mockMessages: ChatMessage[] = [
    {
      id: "msg_1",
      role: "assistant",
      content: `{"t":"h2","c":"欢迎使用优化的聊天界面！"}
{"t":"p","c":"这是一个展示优化聊天功能的测试页面，包含以下特性："}
{"t":"list","c":"实时流式JSONL渲染、增强的输入体验、智能消息卡片、自动滚动和错误处理"}
{"t":"insight","c":"你可以尝试发送消息，体验流式输出和卡片渲染效果","ref":"1,2"}`,
      timestamp: new Date(Date.now() - 10000),
      metadata: {
        model: "or-llama-3-1-8b-instruct",
        tokens: 156,
      }
    }
  ];

  const handleMessageSent = (message: ChatMessage) => {
    console.log("消息已发送:", message);
  };

  const handleMessageReceived = (message: ChatMessage) => {
    console.log("消息已接收:", message);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          优化的聊天模式测试
        </h1>
        <p className="text-muted-foreground">
          测试增强的输入体验、卡片显示和JSONL流式输出效果
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="outline">🎯 发送体验优化</Badge>
          <Badge variant="outline">🎨 卡片显示增强</Badge>
          <Badge variant="outline">⚡ 流式JSONL渲染</Badge>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            通用聊天
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            内容分析
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            配置设置
          </TabsTrigger>
        </TabsList>

        {/* 通用聊天模式 */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 基础聊天 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  基础聊天模式
                  <Badge variant="secondary">通用AI对话</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[600px] p-0">
                <OptimizedChatContainer
                  title="AI助手"
                  systemPrompt={systemPrompt}
                  model={model}
                  showExportButton={true}
                  onMessageSent={handleMessageSent}
                  onMessageReceived={handleMessageReceived}
                  className="h-full border-0"
                />
              </CardContent>
            </Card>

            {/* 功能展示 */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">✨ 主要特性</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-semibold">🎯 发送体验</h4>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>• Enter 发送，Shift+Enter 换行</li>
                      <li>• 自动高度调整</li>
                      <li>• 字符计数提示</li>
                      <li>• 发送状态反馈</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">🎨 卡片显示</h4>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>• 流式JSONL实时渲染</li>
                      <li>• 悬停操作按钮</li>
                      <li>• 错误状态处理</li>
                      <li>• 自动滚动跟随</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">⚡ 流式处理</h4>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      <li>• Data Stream Protocol</li>
                      <li>• 实时内容更新</li>
                      <li>• 连接状态监控</li>
                      <li>• 错误重试机制</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📝 测试建议</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      // 这里可以自动填充测试消息
                    }}
                  >
                    <Play className="h-3 w-3 mr-2" />
                    "请用JSONL格式分析人工智能的发展历程"
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      // 这里可以自动填充测试消息
                    }}
                  >
                    <Play className="h-3 w-3 mr-2" />
                    "解释区块链技术的核心概念"
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      // 这里可以自动填充测试消息
                    }}
                  >
                    <Play className="h-3 w-3 mr-2" />
                    "分析云计算的优势和挑战"
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 内容分析模式 */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  内容分析模式
                  <Badge variant="secondary">基于特定内容的对话</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[600px] p-0">
                {contentId ? (
                  <OptimizedChatContainer
                    title={`内容分析 - ${contentId}`}
                    contentId={contentId}
                    initialMessages={mockMessages}
                    systemPrompt="你是一个专业的内容分析师，请基于提供的内容回答用户问题，并使用JSONL格式结构化输出。"
                    model={model}
                    showExportButton={true}
                    onMessageSent={handleMessageSent}
                    onMessageReceived={handleMessageReceived}
                    className="h-full border-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center space-y-3">
                      <Zap className="h-12 w-12 mx-auto opacity-50" />
                      <p>请在右侧设置内容ID以启用内容分析模式</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">⚙️ 内容设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contentId">内容ID</Label>
                  <Input
                    id="contentId"
                    value={contentId}
                    onChange={(e) => setContentId(e.target.value)}
                    placeholder="输入内容ID（如：01930f7d-...）"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    输入有效的内容ID以启用基于内容的对话分析
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">💡 使用说明</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• 基于特定内容进行AI分析</li>
                    <li>• 支持上下文相关的问答</li>
                    <li>• 自动引用原文段落</li>
                    <li>• JSONL格式结构化输出</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📋 测试内容ID</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setContentId("example-content-001")}
                  >
                    设置示例内容ID
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 配置设置 */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🤖 模型设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI模型</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="输入模型名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">系统提示词</Label>
                  <textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full h-24 p-2 border rounded-md text-sm"
                    placeholder="输入系统提示词..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">🎨 界面预览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 border rounded bg-muted/50">
                    <h4 className="font-semibold mb-2">当前配置</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><span className="font-medium">模型:</span> {model}</p>
                      <p><span className="font-medium">系统提示:</span> {systemPrompt.slice(0, 50)}...</p>
                      <p><span className="font-medium">内容ID:</span> {contentId || "未设置"}</p>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded bg-blue-50 dark:bg-blue-950/20">
                    <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">优化效果</h4>
                    <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                      <li>✅ 智能输入框，支持多行和快捷键</li>
                      <li>✅ 实时流式JSONL渲染</li>
                      <li>✅ 增强的消息卡片设计</li>
                      <li>✅ 自动滚动和错误处理</li>
                      <li>✅ 连接状态实时监控</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 