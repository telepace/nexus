"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Play, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TestJsonlParsingPage() {
  const { toast } = useToast();

  // 你提供的测试数据
  const originalJsonl = `{"t": "h1", "c": "全文最主要传达的重点是什么？"}
{"t": "insight", "c": "这是一篇2024年度个人成长总结，作者熊鑫伟通过旅居生活、创业经历和跨文化思考，分享了自己从外企离职转型为数字游民的心路历程。核心观点是：人生需要不断突破舒适区，通过实践和反思实现自我蜕变（transformation）。", "ref": "3"}
{"t": "h1", "c": "全文的完整脉络"}
{"t": "p", "lead": "个人定位与转型", "c": "作者详细描述了自己从外企稳定工作离职，选择成为数字游民的心路历程。在尼泊尔ACT徒步时面临生死考验（冰坠路段险些滑落悬崖），开始思考生命意义。通过旅居清迈、大理等地，逐渐找到远程工作与生活平衡的方式。", "ref": "4,34"}
{"t": "p", "lead": "创业与AI产品思考", "c": "分享创业过程中踩过的坑：0到1阶段要快速验证MVP（最小可行产品），1到N阶段需要标准化复制。特别强调AI时代产品设计要注重人机协同，而非简单替代人类工作。", "ref": "62,63"}
{"t": "p", "lead": "跨文化观察与反思", "c": "记录在泰国、尼泊尔等地的文化见闻：清迈的"sabai sabai"（放松）生活方式、大理古城的文艺青年群体、尼泊尔老人晒太阳的朴素幸福。对比中西方价值观差异，反思快节奏生活的弊端。", "ref": "18,7"}
{"t": "p", "lead": "个人成长方法论", "c": "总结出三大成长支柱：保持记录习惯（使用flomo笔记）、定期冥想专注当下、通过徒步等户外活动突破极限。强调要建立动态平衡的价值系统，在自由与安全间找到个人舒适区。", "ref": "91,44"}
{"t": "h1", "c": "有趣的细节"}
{"t": "p", "lead": "生死时刻的顿悟", "c": "在尼泊尔ACT徒步时遭遇冰坠路段，险些滑落悬崖。这个濒死体验让作者开始认真思考："如果今天是我最后一天，我有什么遗憾？"最终得出的答案是：已经活得很尽兴，没有遗憾。", "ref": "34"}
{"t": "p", "lead": "清迈的生活哲学", "c": "在清迈学会泰国人"sabai sabai"（放松）的生活态度。观察到当地理发店虽然被小红书差评"剪得慢"，但实际上包含洗发、头部按摩等完整服务流程，体现对工作本身的热爱。", "ref": "18"}
{"t": "p", "lead": "数字游民工作场景", "c": "典型的工作日常：早晨可能在热带海岛咖啡馆办公，下午与当地创业者碰撞点子。没有固定办公场所，需要极强自律性，但也获得前所未有的自由体验。", "ref": "4"}`;

  const [testContent, setTestContent] = useState(originalJsonl);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // 模拟流式传输
  const simulateStreaming = async () => {
    setIsStreaming(true);
    setStreamingContent("");

    const lines = testContent.split("\n").filter((line) => line.trim());
    let accumulated = "";

    for (let i = 0; i < lines.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      accumulated += lines[i] + "\n";
      setStreamingContent(accumulated);

      console.log(`📦 Stream chunk ${i + 1}:`, lines[i]);
      console.log(`📋 Accumulated:`, accumulated);
    }

    setIsStreaming(false);
    toast({
      title: "流式传输完成",
      description: `已传输 ${lines.length} 行JSONL数据`,
    });
  };

  // 复制内容
  const copyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "已复制",
        description: "内容已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制内容到剪贴板",
        variant: "destructive",
      });
    }
  };

  // 解析JSONL行
  const parseJsonlLines = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim());
    const results = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      try {
        const parsed = JSON.parse(line);
        results.push({
          lineNumber: i + 1,
          status: "success",
          content: parsed,
          raw: line,
        });
      } catch (error) {
        results.push({
          lineNumber: i + 1,
          status: "error",
          error: error instanceof Error ? error.message : "Parse error",
          raw: line,
        });
      }
    }

    return results;
  };

  const parseResults = parseJsonlLines(testContent);
  const successCount = parseResults.filter(
    (r) => r.status === "success",
  ).length;
  const errorCount = parseResults.filter((r) => r.status === "error").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">JSONL 解析问题诊断</h1>
        <p className="text-muted-foreground">
          测试和调试JSONL格式的解析与渲染问题
        </p>

        {/* 统计信息 */}
        <div className="flex gap-2">
          <Badge variant="outline">总行数: {parseResults.length}</Badge>
          <Badge variant="default" className="text-green-700 bg-green-100">
            成功: {successCount}
          </Badge>
          {errorCount > 0 && (
            <Badge variant="destructive">错误: {errorCount}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="renderer" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="renderer">渲染器测试</TabsTrigger>
          <TabsTrigger value="parser">解析诊断</TabsTrigger>
          <TabsTrigger value="editor">内容编辑</TabsTrigger>
          <TabsTrigger value="streaming">流式测试</TabsTrigger>
        </TabsList>

        {/* 渲染器测试 */}
        <TabsContent value="renderer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 静态渲染器 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">静态 JSONL 渲染器</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyContent(testContent)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <JsonlRenderer content={testContent} />
              </CardContent>
            </Card>

            {/* 流式渲染器 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">流式 JSONL 渲染器</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={simulateStreaming}
                    disabled={isStreaming}
                  >
                    {isStreaming ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <StreamingJsonlRenderer
                  content={streamingContent}
                  isLoading={isStreaming}
                  showStreamingIndicator={true}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 解析诊断 */}
        <TabsContent value="parser" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>JSON 解析结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {parseResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border text-sm ${
                      result.status === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={
                          result.status === "success"
                            ? "default"
                            : "destructive"
                        }
                      >
                        行 {result.lineNumber}
                      </Badge>
                      {result.status === "success" ? (
                        <span className="text-green-700">✓ 解析成功</span>
                      ) : (
                        <span className="text-red-700">✗ {result.error}</span>
                      )}
                    </div>

                    {result.status === "success" && result.content && (
                      <div className="space-y-1">
                        <div>
                          <strong>类型:</strong>{" "}
                          {result.content.t || result.content.type || "unknown"}
                        </div>
                        {result.content.lead && (
                          <div>
                            <strong>标题:</strong> {result.content.lead}
                          </div>
                        )}
                        <div>
                          <strong>内容:</strong>{" "}
                          {String(
                            result.content.c || result.content.content || "",
                          ).substring(0, 100)}
                          ...
                        </div>
                        {result.content.ref && (
                          <div>
                            <strong>引用:</strong> {result.content.ref}
                          </div>
                        )}
                      </div>
                    )}

                    <details className="mt-2">
                      <summary className="cursor-pointer text-muted-foreground">
                        原始内容
                      </summary>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                        {result.raw}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 内容编辑 */}
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>编辑 JSONL 内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="在此输入JSONL内容..."
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setTestContent(originalJsonl)}
                >
                  重置为原始数据
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyContent(testContent)}
                >
                  复制内容
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 流式测试 */}
        <TabsContent value="streaming" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>流式传输测试</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={simulateStreaming}
                    disabled={isStreaming}
                    size="sm"
                  >
                    {isStreaming ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        传输中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        开始流式传输
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStreamingContent("");
                      setIsStreaming(false);
                    }}
                    size="sm"
                  >
                    清空
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 min-h-[400px]">
                <StreamingJsonlRenderer
                  content={streamingContent}
                  isLoading={isStreaming}
                  showStreamingIndicator={true}
                />
              </div>

              {/* 调试信息 */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  调试信息 (
                  {streamingContent.split("\n").filter(Boolean).length} 行)
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32">
                  {streamingContent || "暂无内容"}
                </pre>
              </details>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
