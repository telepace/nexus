"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIChat } from "@/components/ui/ai-chat";
import { AIAnalysisCard } from "@/components/ui/ai-analysis-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Brain, Settings, Sparkles, Zap } from "lucide-react";

export default function TestAISDKPage() {
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  );
  const [model, setModel] = useState("or-llama-3-1-8b-instruct");
  const [analysisInstruction, setAnalysisInstruction] = useState(
    "请对以下内容进行深入分析，提取主要观点和关键信息。",
  );
  const [originalContent, setOriginalContent] = useState(
    "人工智能技术正在快速发展，它将如何改变我们的生活和工作方式？",
  );
  const [contentId, setContentId] = useState("");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI SDK 功能演示
        </h1>
        <p className="text-muted-foreground">
          基于 Vercel AI SDK 的流式 AI 对话和分析功能
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="outline">Vercel AI SDK</Badge>
          <Badge variant="outline">FastAPI</Badge>
          <Badge variant="outline">LiteLLM</Badge>
          <Badge variant="outline">流式响应</Badge>
        </div>
      </div>

      <Separator />

      {/* 配置面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            配置设置
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">API 地址</Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">AI 模型</Label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="or-llama-3-1-8b-instruct">Llama 3.1 8B</option>
              <option value="or-llama-3-3-70b-instruct">Llama 3.3 70B</option>
              <option value="github-llama-3-2-11b-vision">
                Llama 3.2 11B Vision
              </option>
              <option value="deepseek-v3-ensemble">DeepSeek V3</option>
              <option value="volcengine-doubao-pro-32k">Doubao Pro 32K</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-id">内容 ID (可选)</Label>
            <Input
              id="content-id"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="输入内容ID进行分析"
            />
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <div className="flex items-center gap-2 pt-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">服务正常</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 功能演示 */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI 对话
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            内容分析
          </TabsTrigger>
          <TabsTrigger
            value="content-analysis"
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            内容ID分析
          </TabsTrigger>
        </TabsList>

        {/* AI 对话演示 */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI 对话演示
                <Badge variant="secondary">useChat</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                基于 Vercel AI SDK 的 useChat
                hook，支持流式对话、消息历史、错误处理等功能。
              </p>

              <div className="h-[600px]">
                <AIChat
                  title="AI 助手"
                  api={`${apiUrl}/api/v1/chat/completions`}
                  model={model}
                  showExportButton={true}
                  initialMessages={[
                    {
                      id: "welcome",
                      role: "system",
                      content:
                        "你好！我是 AI 助手，基于 Vercel AI SDK 构建。我可以帮您回答问题、分析内容、编写代码等。有什么我可以帮助您的吗？",
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 内容分析演示 */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 配置面板 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  分析配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">原文内容</Label>
                  <Textarea
                    id="system-prompt"
                    value={originalContent}
                    onChange={(e) => setOriginalContent(e.target.value)}
                    placeholder="输入要分析的原文内容..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-content">分析指令</Label>
                  <Textarea
                    id="user-content"
                    value={analysisInstruction}
                    onChange={(e) => setAnalysisInstruction(e.target.value)}
                    placeholder="输入分析指令..."
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 分析结果 */}
            <AIAnalysisCard
              title="AI 内容分析"
              systemPrompt={originalContent}
              userContent={analysisInstruction}
              api={`${apiUrl}/api/v1/chat/completions`}
              model={model}
              onComplete={(result) => {
                console.log("分析完成:", result);
              }}
              onError={(error) => {
                console.error("分析失败:", error);
              }}
            />
          </div>

          {/* 预设分析示例 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AIAnalysisCard
              title="文本情感分析"
              userContent="请分析以下文本的情感倾向，包括积极、消极或中性，并给出详细的理由。"
              systemPrompt="今天的天气真不错，阳光明媚，心情也变得很好。"
              api={`${apiUrl}/api/v1/chat/completions`}
              model={model}
            />

            <AIAnalysisCard
              title="技术文档总结"
              userContent="请对以下技术内容进行总结，提取关键要点和技术特性。"
              systemPrompt="React 是一个用于构建用户界面的 JavaScript 库。它采用组件化的开发模式，支持虚拟 DOM，具有高效的渲染性能。"
              api={`${apiUrl}/api/v1/chat/completions`}
              model={model}
            />
          </div>
        </TabsContent>

        {/* 内容ID分析演示 */}
        <TabsContent value="content-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                内容ID分析演示
                <Badge variant="secondary">优化流式渲染</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                使用新的流式端点进行内容分析，基于 Vercel AI SDK
                原生流式处理，获得真正的实时渲染效果。
              </p>

              {contentId ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 配置面板 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">分析配置</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>内容 ID</Label>
                        <Input
                          value={contentId}
                          onChange={(e) => setContentId(e.target.value)}
                          placeholder="内容ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="system-prompt-content">分析指令</Label>
                        <Textarea
                          id="system-prompt-content"
                          value={analysisInstruction}
                          onChange={(e) =>
                            setAnalysisInstruction(e.target.value)
                          }
                          placeholder="输入分析指令..."
                          rows={5}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>💡 新特性：</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>真正的流式渲染（逐字显示）</li>
                          <li>优化的 Vercel AI SDK 集成</li>
                          <li>更好的错误处理</li>
                          <li>打字机效果显示</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 分析结果 */}
                  <AIAnalysisCard
                    title="优化流式分析"
                    userContent={analysisInstruction}
                    contentId={contentId}
                    model={model}
                    onComplete={(result) => {
                      console.log("内容分析完成:", result);
                    }}
                    onError={(error) => {
                      console.error("内容分析失败:", error);
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      请在配置面板中输入内容 ID 来测试优化的流式分析功能
                    </p>
                    <p className="text-xs text-muted-foreground">
                      示例: c982e045-c638-4f45-bf17-9f47fbaf1432
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
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            技术特性
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">流式对话</h3>
              <p className="text-sm text-muted-foreground">
                基于 useChat hook 的实时流式对话
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">智能分析</h3>
              <p className="text-sm text-muted-foreground">
                基于 useCompletion hook 的内容分析
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">高性能</h3>
              <p className="text-sm text-muted-foreground">
                Data Stream Protocol 优化的流式响应
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">易于集成</h3>
              <p className="text-sm text-muted-foreground">
                与现有 LiteLLM 架构无缝集成
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
