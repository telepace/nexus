"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";

// 动态导入组件，避免预渲染问题
import dynamic from "next/dynamic";

const StreamingJsonlRenderer = dynamic(
  () =>
    import("@/components/ui/StreamingJsonlRenderer").then((mod) => ({
      default: mod.StreamingJsonlRenderer,
    })),
  { ssr: false },
);

const JsonlRenderer = dynamic(
  () =>
    import("@/components/ui/JsonlRenderer").then((mod) => ({
      default: mod.JsonlRenderer,
    })),
  { ssr: false },
);

// 将组件数据移到组件外部，避免预渲染时的状态问题
const sampleJsonlData = `{"t":"h2","c":"核心观点"}
{"t":"insight","c":"类似NotebookLM的RAG系统通过文档解析、文本分块和来源映射技术，实现从多样化文档中提取信息并确保答案可追溯","ref":"2,3,4"}
{"t":"insight","c":"开源替代方案在文档处理流程上各有侧重，但与商业产品在成熟度上仍有差距","ref":"18,20,29"}
{"t":"h2","c":"主要内容"}
{"t":"p","c":"文档解析技术从简单文本提取演进到布局感知和多模态解析，以应对PDF/Office/网页等多样化格式","ref":"6,7"}
{"t":"p","c":"文本分块需平衡语义连贯性与检索效率，结构感知分块正成为新趋势","ref":"9,10,11,12"}
{"t":"p","c":"来源映射通过元数据存储和引用机制确保答案可追溯，是RAG可信度的基础","ref":"14,15,16"}
{"t":"h2","c":"关键细节"}
{"t":"concept","c":"表格解析是文档处理最大难点，布局感知和多模态方法是最有希望的解决方案","ref":"7","expandable":"表格解析技术"}
{"t":"concept","c":"字符偏移量是实现精确引用的关键元数据，支持在原始文档中高亮显示","ref":"15","expandable":"字符偏移量"}
{"t":"list","c":"多种分块策略：Token级分块、句子级分块、语义分块、递归分块、混合分块、自适应分块"}
{"t":"action","c":"建议开发者评估不同开源方案的成熟度和维护状态，选择最适合自己需求的技术栈"}`;

export default function TestStreamingJsonlPage() {
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(100); // ms per character
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const contentIndexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0); // 添加状态来跟踪进度
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            流式 JSONL 渲染器测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  const startStreaming = () => {
    if (isStreaming) return;

    setIsStreaming(true);
    contentIndexRef.current = 0;
    setCurrentIndex(0);
    setStreamingContent("");

    intervalRef.current = setInterval(() => {
      const currentIdx = contentIndexRef.current;
      if (currentIdx >= sampleJsonlData.length) {
        stopStreaming();
        return;
      }

      // 模拟流式传输：每次添加几个字符
      const nextIndex = Math.min(
        currentIdx + Math.random() * 10 + 1,
        sampleJsonlData.length,
      );
      const newContent = sampleJsonlData.slice(0, nextIndex);
      setStreamingContent(newContent);
      contentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
    }, streamSpeed);
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetStream = () => {
    stopStreaming();
    setStreamingContent("");
    contentIndexRef.current = 0;
    setCurrentIndex(0);
  };

  const fastStream = () => {
    stopStreaming();
    setStreamingContent(sampleJsonlData);
    contentIndexRef.current = sampleJsonlData.length;
    setCurrentIndex(sampleJsonlData.length);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 安全获取当前进度，避免预渲染时的错误
  const getCurrentProgress = () => {
    return typeof window !== "undefined" ? currentIndex : 0;
  };

  const getTotalLength = () => {
    return sampleJsonlData?.length || 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          流式 JSONL 渲染器测试
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          测试和对比流式 JSONL 渲染器与常规渲染器的效果
        </p>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🎮 控制面板</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={startStreaming}
              disabled={isStreaming}
              variant="default"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              开始流式传输
            </Button>

            <Button
              onClick={stopStreaming}
              disabled={!isStreaming}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4 mr-2" />
              暂停
            </Button>

            <Button onClick={resetStream} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>

            <Button onClick={fastStream} variant="secondary" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              立即完成
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">流式速度:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="500"
                value={streamSpeed}
                onChange={(e) => setStreamSpeed(Number(e.target.value))}
                className="w-32"
                disabled={isStreaming}
              />
              <Badge variant="outline">{streamSpeed}ms</Badge>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            进度: {getCurrentProgress()} / {getTotalLength()} 字符
            {isStreaming && " (正在传输...)"}
          </div>
        </CardContent>
      </Card>

      {/* 对比渲染 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 流式渲染器 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🌊 StreamingJsonlRenderer
              <Badge variant="default">实时块级渲染</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50 min-h-[400px]">
              <StreamingJsonlRenderer
                content={streamingContent}
                isLoading={isStreaming}
                showStreamingIndicator={true}
                enableHoverEffects={true}
                contentId="test-streaming-jsonl"
              />
            </div>
          </CardContent>
        </Card>

        {/* 常规渲染器 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📄 JsonlRenderer (对照组)
              <Badge variant="secondary">常规渲染</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50 min-h-[400px]">
              <JsonlRenderer
                content={streamingContent}
                enableHoverEffects={true}
                showReferenceIndicators={false}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 完整示例 */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 完整示例 (StreamingJsonlRenderer)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50">
            <StreamingJsonlRenderer
              content={sampleJsonlData}
              isLoading={false}
              showStreamingIndicator={false}
              enableHoverEffects={true}
              contentId="test-streaming-jsonl-complete"
            />
          </div>
        </CardContent>
      </Card>

      {/* 原始数据预览 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 原始 JSONL 数据</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {sampleJsonlData}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
