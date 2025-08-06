"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OptimizedContentRenderer } from "@/components/ui/OptimizedContentRenderer";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import { AnalysisContentRenderer } from "@/components/ui/AnalysisContentRenderer";
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor";
import { Lightbulb, Palette, Zap, Settings } from "lucide-react";

export default function TestOptimizedRendererPage() {
  // 测试数据 - 基于用户提供的示例
  const testContent = `{"t": "h2", "c": "个人成长与内心转变"}
{"t": "h3", "c": "为什么是现在的我"}
{"t": "h4", "c": "爵士"}
{"t": "p", "c": "作者对爵士乐的喜爱感到好奇，认为音乐本质上离不开数学和哲学，好的音乐能穿透文化、国界和时代限制，引起共鸣，帮助人寻找和了解自己。"}
{"t": "p", "c": "作者认为艺术家和科学家都具有好奇心，都在向世界提问，并对美好世界充满向往。艺术代表感性，而理工科世界也需要感性，感性与理性的交融能创造动人的事物。"}
{"t": "h4", "c": "技术与人文的融合"}
{"t": "p", "c": "在技术快速发展的今天，我们需要更多地思考技术与人文的关系，如何让技术更好地服务于人类的情感和精神需求。"}
{"t": "h5", "c": "具体实践方向"}
{"t": "list", "c": "在产品设计中融入人文关怀\n关注用户的情感体验\n平衡效率与温度"}
{"t": "h6", "c": "注意事项"}
{"t": "p", "c": "需要避免过度技术化，保持人性化的温度。"}
{"t": "quote", "c": "好的设计不仅仅是功能的实现，更是情感的传达。", "ref": "设计哲学"}`;

  const [selectedTheme, setSelectedTheme] = useState<
    "default" | "notebook" | "headspace" | "neumorphism"
  >("default");
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [enableHoverEffects, setEnableHoverEffects] = useState(true);
  const [showReferences, setShowReferences] = useState(true);

  const themes = [
    { id: "default", name: "默认", description: "简洁现代的设计风格" },
    { id: "notebook", name: "笔记本", description: "手写笔记风格" },
    { id: "headspace", name: "冥想", description: "渐变色彩风格" },
    { id: "neumorphism", name: "新拟态", description: "立体阴影效果" },
  ];

  const rendererConfig = {
    theme: selectedTheme,
    enableAnimations,
    enableHoverEffects,
    enableCopyButton: true,
    showReferences,
    contentId: "test-content",
  };

  // 计算内容块数量
  const blockCount = testContent
    .split("\n")
    .filter((line) => line.trim()).length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          优化内容渲染器测试
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          测试不同类型内容块的渲染效果，支持h1-h6标题、段落、列表、引用等多种类型，
          并提供多种主题和交互选项。
        </p>
      </div>

      {/* 配置面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            渲染配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 主题选择 */}
          <div>
            <h3 className="text-sm font-medium mb-3">选择主题</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {themes.map((theme) => (
                <Button
                  key={theme.id}
                  variant={selectedTheme === theme.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTheme(theme.id as any)}
                  className="flex flex-col h-auto p-3"
                >
                  <span className="font-medium">{theme.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {theme.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* 功能开关 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">动画效果</span>
              <Button
                variant={enableAnimations ? "default" : "outline"}
                size="sm"
                onClick={() => setEnableAnimations(!enableAnimations)}
              >
                {enableAnimations ? "开启" : "关闭"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">悬浮效果</span>
              <Button
                variant={enableHoverEffects ? "default" : "outline"}
                size="sm"
                onClick={() => setEnableHoverEffects(!enableHoverEffects)}
              >
                {enableHoverEffects ? "开启" : "关闭"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">显示引用</span>
              <Button
                variant={showReferences ? "default" : "outline"}
                size="sm"
                onClick={() => setShowReferences(!showReferences)}
              >
                {showReferences ? "显示" : "隐藏"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能监控面板 */}
      <PerformanceMonitor
        blockCount={blockCount}
        contentLength={testContent.length}
        className="mb-6"
      />

      {/* 渲染器对比 */}
      <Tabs defaultValue="optimized" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="optimized" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            优化渲染器
          </TabsTrigger>
          <TabsTrigger value="streaming" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            流式渲染器
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            分析渲染器
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optimized" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                OptimizedContentRenderer
                <Badge variant="secondary">新版本</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                支持完整的h1-h6标题层次，优化的性能和动画效果，多主题支持
              </p>
            </CardHeader>
            <CardContent>
              <OptimizedContentRenderer
                content={testContent}
                config={rendererConfig}
                className="border rounded-lg p-6 bg-background"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-green-500" />
                StreamingJsonlRenderer
                <Badge variant="outline">已更新</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                现已支持h4-h6标题，适用于流式内容展示
              </p>
            </CardHeader>
            <CardContent>
              <StreamingJsonlRenderer
                content={testContent}
                className="border rounded-lg p-6 bg-background"
                contentId="test-streaming"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-500" />
                AnalysisContentRenderer
                <Badge variant="outline">已更新</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                专为分析内容设计，现已支持完整标题层次
              </p>
            </CardHeader>
            <CardContent>
              <AnalysisContentRenderer
                content={testContent}
                className="border rounded-lg p-6 bg-background"
                contentId="test-analysis"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 功能特性说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            优化特性
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-foreground mb-2">完整标题支持</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  • <code>h1</code> - 主标题 (最大)
                </div>
                <div>
                  • <code>h2</code> - 章节标题 (带下划线)
                </div>
                <div>
                  • <code>h3</code> - 子章节标题
                </div>
                <div>
                  • <code>h4</code> - 小节标题
                </div>
                <div>
                  • <code>h5</code> - 子小节标题 (大写)
                </div>
                <div>
                  • <code>h6</code> - 最小标题 (灰色大写)
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">性能优化</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• React.memo 防止不必要重渲染</div>
                <div>• useMemo 缓存解析结果</div>
                <div>• 延迟动画减少初始负载</div>
                <div>• 条件渲染优化性能</div>
                <div>• 主题切换无需重新解析</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-2">JSONL 格式示例</h3>
            <div className="bg-muted rounded p-3 text-xs font-mono">
              {`{"t":"h2","c":"主要章节标题"}
{"t":"h3","c":"子章节标题"}
{"t":"h4","c":"小节标题"}
{"t":"p","c":"段落内容，支持引用","ref":"1,2"}
{"t":"list","c":"列表项1\\n列表项2\\n列表项3"}
{"t":"quote","c":"引用内容","ref":"来源"}`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
