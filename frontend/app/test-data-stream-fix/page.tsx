"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AIAnalysisCard } from "@/components/ui/ai-analysis-card";
import { Badge } from "@/components/ui/badge";
import { Brain, TestTube, Bug, CheckCircle } from "lucide-react";

export default function TestDataStreamFixPage() {
  const [contentId, setContentId] = useState(
    "c982e045-c638-4f45-bf17-9f47fbaf1432",
  );
  const [analysisInstruction, setAnalysisInstruction] = useState(
    "请对以下内容进行深入分析，提取主要观点和关键信息。",
  );
  const [testResults, setTestResults] = useState<{
    started: boolean;
    completed: boolean;
    error: string | null;
    hasJsonl: boolean;
  }>({
    started: false,
    completed: false,
    error: null,
    hasJsonl: false,
  });

  const handleAnalysisComplete = (result: string) => {
    console.log("�� 分析完成，结果:", result);

    // 检查是否包含 JSONL 结构
    const hasJsonlStructure =
      result.includes('{"t":') || result.includes('{"type":');

    setTestResults((prev) => ({
      ...prev,
      completed: true,
      hasJsonl: hasJsonlStructure,
    }));
  };

  const handleAnalysisError = (error: Error) => {
    console.error("❌ 分析失败:", error);
    setTestResults((prev) => ({
      ...prev,
      error: error.message,
      completed: false,
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Bug className="h-8 w-8 text-primary" />
          Data Stream Protocol 修复测试
        </h1>
        <p className="text-muted-foreground">
          测试 JSONL 内容的正确渲染（修复 Data Stream Protocol 处理）
        </p>

        {/* 测试状态指示器 */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge variant={testResults.started ? "default" : "outline"}>
            {testResults.started ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : null}
            测试开始
          </Badge>
          <Badge variant={testResults.completed ? "default" : "outline"}>
            {testResults.completed ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : null}
            分析完成
          </Badge>
          <Badge variant={testResults.hasJsonl ? "default" : "outline"}>
            {testResults.hasJsonl ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : null}
            JSONL 渲染
          </Badge>
          {testResults.error && (
            <Badge variant="destructive">错误: {testResults.error}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 配置面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              测试配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content-id">内容 ID</Label>
              <Input
                id="content-id"
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                placeholder="输入内容ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="analysis-instruction">分析指令</Label>
              <Textarea
                id="analysis-instruction"
                value={analysisInstruction}
                onChange={(e) => setAnalysisInstruction(e.target.value)}
                placeholder="输入分析指令..."
                rows={5}
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">期望的修复效果:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• LLM 返回 Data Stream Protocol 格式 (0:, 8:)</li>
                <li>• 正确提取 JSONL 内容</li>
                <li>• 渲染为结构化视图（标题、段落、洞察等）</li>
                <li>• 不再显示原始协议数据</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 分析结果 */}
        <AIAnalysisCard
          title="Data Stream Protocol 测试"
          userContent={analysisInstruction}
          contentId={contentId}
          model="or-llama-3-1-8b-instruct"
          onComplete={handleAnalysisComplete}
          onError={handleAnalysisError}
        />
      </div>

      {/* 调试信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            调试信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>预期 LLM 输出格式:</strong>
              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                {`0:{"t":"h1","c":"标题内容"}
0:{"t":"p","c":"段落内容"}  
0:{"t":"insight","c":"洞察内容"}
8:[{"finishReason":"stop"}]`}
              </pre>
            </div>
            <div>
              <strong>修复要点:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• 识别 Data Stream Protocol</li>
                <li>• 提取 0: 开头的业务数据</li>
                <li>• 忽略 8: 控制信号</li>
                <li>• 选择 JSONL 渲染器</li>
              </ul>
            </div>
            <div>
              <strong>测试状态:</strong>
              <div className="mt-1 space-y-1 text-xs">
                <div>开始: {testResults.started ? "✅" : "⏳"}</div>
                <div>完成: {testResults.completed ? "✅" : "⏳"}</div>
                <div>JSONL: {testResults.hasJsonl ? "✅" : "❌"}</div>
                {testResults.error && (
                  <div className="text-red-500">错误: {testResults.error}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
