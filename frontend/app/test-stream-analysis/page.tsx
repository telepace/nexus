"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AIAnalysisCard } from "@/components/ui/ai-analysis-card";
import { StreamDebug } from "@/components/debug/stream-debug";
import { Brain, TestTube, Bug } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestStreamAnalysisPage() {
  const [contentId, setContentId] = useState(
    "c982e045-c638-4f45-bf17-9f47fbaf1432",
  );
  const [analysisInstruction, setAnalysisInstruction] = useState(
    "请对以下内容进行深入分析，提取主要观点和关键信息。",
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <TestTube className="h-8 w-8 text-primary" />
          流式分析测试
        </h1>
        <p className="text-muted-foreground">测试基于内容ID的流式AI分析功能</p>
      </div>

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            内容分析
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            调试模式
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 配置面板 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  分析配置
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
              </CardContent>
            </Card>

            {/* 分析结果 */}
            <AIAnalysisCard
              title="流式内容分析"
              userContent={analysisInstruction}
              contentId={contentId}
              model="or-llama-3-1-8b-instruct"
              onComplete={(result) => {
                console.log("分析完成:", result);
              }}
              onError={(error) => {
                console.error("分析失败:", error);
              }}
            />
          </div>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">1. 输入有效的内容ID（如示例中的ID）</p>
              <p className="text-sm">2. 修改分析指令</p>
              <p className="text-sm">
                3. 点击&ldquo;开始分析&rdquo;按钮查看流式效果
              </p>
              <p className="text-sm text-muted-foreground">
                注意：需要确保后端服务正在运行且LiteLLM配置正确
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <StreamDebug />
        </TabsContent>
      </Tabs>
    </div>
  );
}
