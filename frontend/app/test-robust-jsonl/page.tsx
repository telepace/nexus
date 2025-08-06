"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RobustJsonlRenderer } from "@/components/ui/RobustJsonlRenderer";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { AlertTriangle, CheckCircle, RefreshCw, Copy, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function TestRobustJsonlPage() {
  const [customContent, setCustomContent] = useState("");
  const [showErrorDetails, setShowErrorDetails] = useState(true);
  const [autoRecover, setAutoRecover] = useState(true);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  // 测试用例数据
  const testCases = [
    {
      id: "complete",
      title: "正常JSONL",
      description: "完整、正确的JSONL格式",
      severity: "success",
      content: `{"t": "h1", "c": "全文最主要传达的重点是什么？"}
{"t": "insight", "c": "这篇指南就像给独立开发者量身定制的"武功秘籍"", "ref": "1-2"}
{"t": "h2", "c": "技术栈选择"}
{"t": "p", "lead": "前端基础", "c": "掌握HTML、CSS和JavaScript是基础", "ref": "6-10"}`,
    },
    {
      id: "incomplete",
      title: "不完整JSON",
      description: "模拟流式输出中断的情况",
      severity: "error",
      content: `{"t": "h1", "c": "全文最主要传达的重点是什么？"}
{"t": "insight", "c": "这篇指南就像给独立开发者量身定制的"武功秘籍"，核心思想就是：想单打独斗搞出点名堂，光会写代码可不行", "ref": "1-2"}
{"t": "h1", "c": "全文的完整脉络"}
{"t": "p", "lead": "工具箱：选对工具事半功倍。", "c": "合适的工具能让独立开发者效率倍增（"ref": "34"）。代码编辑器/IDE（集成开发环境）方面，VS Code（轻量、免费、开源，拥有庞大的扩展生态系统，可以支持几乎所有编程语言）是首选，功能强大且免费；JetBrains 系列（如 PyCharm, GoLand）则更专业，但需要付费（"ref": "35"）。项目管理工具方面，Trello（基于看板（Kanban）的可视化任务管理工具，简单直观，适合管理流程化的任务）简单直观，Notion（高度灵活的工作空间工具，集笔记、`,
    },
    {
      id: "syntax_errors",
      title: "语法错误",
      description: "包含各种JSON语法错误",
      severity: "warning",
      content: `{"t": "h1", "c": "标题内容"}
{"t": "insight", 'c': "单引号字符串", "ref": "1,2"}
{t: "missing_quotes", "c": "键没有引号"}
{"t": "p", "c": "正常内容", "extra_comma": true,}
{"t": "p", "c": "内容中有"引号"问题", "ref": "5"}`,
    },
    {
      id: "mixed_errors",
      title: "混合错误",
      description: "包含多种类型的错误",
      severity: "error",
      content: `{"t": "h1", "c": "开始部分"}
{"t": "insight", "c": "正常的洞察内容", "ref": "1-3"}
invalid json line without braces
{"t": "p", 'lead': '引号问题', "c": "内容"}
{"incomplete": "没有结束
{"t": "p", "c": "最后的正常内容"}`,
    },
    {
      id: "real_example",
      title: "真实案例",
      description: "您提供的实际问题案例",
      severity: "error",
      content: `{"t": "h1", "c": "全文最主要传达的重点是什么？"}
{"t": "insight", "c": "这篇指南就像给独立开发者量身定制的"武功秘籍"，核心思想就是：想单打独斗搞出点名堂，光会写代码可不行，你得是个"多面手"——从前端到后端，从数据库到部署，甚至连怎么测试、怎么管理项目都得门儿清。文章手把手教你如何用最省钱、最快速的方式把想法变成产品，并且强调，别光顾着埋头写代码，得学会用数据说话，用工具提效，把产品质量搞上去，这样才能在"独立开发"这条路上走得更远、更稳。", "ref": "1-2"}
{"t": "h1", "c": "全文的完整脉络"}
{"t": "p", "lead": "工具箱：选对工具事半功倍。", "c": "合适的工具能让独立开发者效率倍增（"ref": "34"）。代码编辑器/IDE（集成开发环境）方面，VS Code（轻量、免费、开源，拥有庞大的扩展生态系统，可以支持几乎所有编程语言）是首选，功能强大且免费；JetBrains 系列（如 PyCharm, GoLand）则更专业，但需要付费（"ref": "35"）。项目管理工具方面，Trello（基于看板（Kanban）的可视化任务管理工具，简单直观，适合管理流程化的任务）简单直观，Notion（高度灵活的工作空间工具，集笔记、`,
    },
  ];

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "已复制",
      description: "内容已复制到剪贴板",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">增强JSONL渲染器测试</h1>
          <p className="text-muted-foreground">
            测试智能错误恢复和容错处理能力，解决流式输出中断和语法错误问题
          </p>
        </div>

        {/* 功能控制 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              渲染器设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-errors"
                checked={showErrorDetails}
                onCheckedChange={setShowErrorDetails}
              />
              <label htmlFor="show-errors" className="text-sm font-medium">
                显示错误详情
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-recover"
                checked={autoRecover}
                onCheckedChange={setAutoRecover}
              />
              <label htmlFor="auto-recover" className="text-sm font-medium">
                启用自动恢复
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 测试用例 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">测试用例</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {testCases.map((testCase) => (
              <Card
                key={testCase.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedExample === testCase.id
                    ? "border-primary shadow-md"
                    : ""
                }`}
                onClick={() =>
                  setSelectedExample(
                    selectedExample === testCase.id ? null : testCase.id,
                  )
                }
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{testCase.title}</span>
                    <Badge
                      className={`text-xs ${getSeverityColor(testCase.severity)}`}
                    >
                      {getSeverityIcon(testCase.severity)}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {testCase.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomContent(testCase.content);
                      }}
                    >
                      加载到编辑器
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyContent(testCase.content);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 自定义内容测试 */}
        <Card>
          <CardHeader>
            <CardTitle>自定义内容测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="粘贴您的JSONL内容进行测试..."
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCustomContent("")}>
                <RefreshCw className="h-4 w-4 mr-2" />
                清空
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCopyContent(customContent)}
                disabled={!customContent}
              >
                <Copy className="h-4 w-4 mr-2" />
                复制
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 渲染结果对比 */}
        {(customContent || selectedExample) && (
          <>
            <Separator />

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">渲染结果对比</h2>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* 增强渲染器 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      增强版渲染器 ✨
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      具备智能错误恢复和容错处理能力
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 bg-muted/20 max-h-96 overflow-y-auto">
                      <RobustJsonlRenderer
                        content={
                          customContent ||
                          (selectedExample
                            ? testCases.find((t) => t.id === selectedExample)
                                ?.content || ""
                            : "")
                        }
                        showErrorDetails={showErrorDetails}
                        autoRecover={autoRecover}
                        contentId="test-content"
                        onError={(errors) => {
                          console.log("错误回调:", errors);
                        }}
                        onRecover={(recoveredBlocks) => {
                          console.log("恢复回调:", recoveredBlocks);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 原版渲染器 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      原版渲染器
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      基础JSONL渲染，错误处理有限
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 bg-muted/20 max-h-96 overflow-y-auto">
                      <JsonlRenderer
                        content={
                          customContent ||
                          (selectedExample
                            ? testCases.find((t) => t.id === selectedExample)
                                ?.content || ""
                            : "")
                        }
                        contentId="test-content"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* 使用说明 */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">
              增强功能说明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 dark:text-blue-300 space-y-3 text-sm">
            <div>
              <strong>🔧 智能错误恢复：</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>
                  自动修复常见JSON语法错误（单引号、缺失引号、多余逗号等）
                </li>
                <li>智能补全不完整的JSON对象</li>
                <li>从损坏的JSON中提取可用信息</li>
              </ul>
            </div>

            <div>
              <strong>📊 详细错误报告：</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>显示具体的错误位置和错误类型</li>
                <li>提供修复建议和最佳实践</li>
                <li>统计解析成功率和恢复情况</li>
              </ul>
            </div>

            <div>
              <strong>🎯 优雅降级：</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>确保部分内容仍能正常显示</li>
                <li>错误内容以特殊样式显示，不影响整体阅读</li>
                <li>恢复的内容有明显标记，提醒用户注意</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
