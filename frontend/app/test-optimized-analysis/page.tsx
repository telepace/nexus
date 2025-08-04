"use client";

import React, { useState } from "react";

// 防止预渲染
export const dynamic = 'force-dynamic';
import { ModernAnalysisInterface } from "@/components/ai/ModernAnalysisInterface";
import { ContentItemPublic } from "@/lib/api/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  Zap,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

// 模拟内容数据
const mockContent: ContentItemPublic = {
  id: "test-content-optimized",
  title: "交互优化测试：立即响应的AI分析界面",
  summary: "测试点击prompt后立即显示卡片、实时渲染流式响应的优化效果",
  content_text: `
    这是一个用于测试优化后交互效果的示例内容。

    ## 测试要点

    1. **立即响应**：点击Prompt按钮后应立即显示分析卡片
    2. **加载状态**：卡片应显示优雅的加载动画
    3. **实时渲染**：流式响应应在卡片中实时显示
    4. **无界面冻结**：整个界面应保持响应状态

    ## 测试场景

    ### 场景1：点击Prompt标签
    - 点击"总结要点"等标签
    - 观察是否立即显示卡片
    - 观察加载状态和实时更新

    ### 场景2：手动输入问题
    - 在输入框中输入问题
    - 点击发送按钮
    - 观察相同的优化效果

    ### 场景3：JSON行展开
    - 点击AI响应中的展开按钮
    - 观察深度分析的加载过程

    ## 期望效果

    - ✅ 点击后立即显示卡片
    - ✅ 显示加载动画而非界面冻结
    - ✅ 实时更新内容
    - ✅ 优雅的用户体验
  `,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  meta_info: JSON.stringify({
    summary: "这是一个测试优化后AI分析界面交互效果的示例内容，重点测试立即响应、实时渲染等特性。",
    key_points: [
      "点击Prompt后立即显示分析卡片",
      "卡片内显示优雅的加载动画",
      "流式响应实时更新内容",
      "整个界面保持响应状态",
      "提供良好的用户体验"
    ],
    tags: ["交互优化", "实时渲染", "用户体验", "AI分析"]
  }),
  source_uri: "https://example.com/test-optimized-analysis",
  type: "article",
  processing_status: "completed",
  user_id: "test-user"
};

export default function TestOptimizedAnalysisPage() {
  const [showHistory, setShowHistory] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [testResults, setTestResults] = useState<{
    promptClick: boolean;
    immediateCard: boolean;
    streamingUpdate: boolean;
    noFreeze: boolean;
  }>({
    promptClick: false,
    immediateCard: false,
    streamingUpdate: false,
    noFreeze: false
  });

  const handleHistoryCountChange = (count: number) => {
    setHistoryCount(count);
  };

  const updateTestResult = (key: keyof typeof testResults, value: boolean) => {
    setTestResults(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            优化后AI分析界面测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试点击prompt后立即显示卡片、实时渲染流式响应的交互优化效果
          </p>
        </div>

        {/* 测试结果面板 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              测试结果追踪
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${testResults.promptClick ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Prompt点击响应</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${testResults.immediateCard ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">立即显示卡片</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${testResults.streamingUpdate ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">实时流式更新</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${testResults.noFreeze ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">界面无冻结</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 测试说明 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              关键优化特性
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  即时响应
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 点击Prompt按钮后立即显示分析卡片</li>
                  <li>• 无需等待API响应即可看到界面反馈</li>
                  <li>• 消除用户等待时的不确定感</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-green-500" />
                  实时渲染
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 流式响应直接在卡片中显示</li>
                  <li>• 打字机效果和动画增强体验</li>
                  <li>• 支持JSONL格式的实时解析</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  简洁加载
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 使用统一的Loader2组件</li>
                  <li>• 简洁的加载动画</li>
                  <li>• 减少视觉干扰</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-orange-500" />
                  无界面冻结
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 发送后输入框立即可用</li>
                  <li>• 支持多个对话并行处理</li>
                  <li>• 整个界面保持响应状态</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 控制面板 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>界面控制</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant={showHistory ? "default" : "outline"}
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                {showHistory ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                历史记录 ({historyCount})
              </Button>
              <Badge variant="outline" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                系统就绪
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 测试步骤 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>测试步骤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-blue-700 dark:text-blue-300">步骤1：测试Prompt点击</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  点击下方界面中的"总结要点"、"深度分析"等标签，观察是否立即显示分析卡片
                </p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-medium text-green-700 dark:text-green-300">步骤2：观察加载状态</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  注意卡片中是否显示简洁的Loader2加载动画
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-medium text-purple-700 dark:text-purple-300">步骤3：验证实时更新</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  观察AI响应是否在卡片中实时显示，是否有打字机效果
                </p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-medium text-orange-700 dark:text-orange-300">步骤4：测试手动输入</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  在输入框中输入问题并发送，验证相同的优化效果
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 主要测试区域 */}
        <Card className="h-[800px]">
          <CardContent className="p-0 h-full">
            <ModernAnalysisInterface
              content={mockContent}
              conversations={[]}
              analysisResult={{
                summary: { text: "这是一个测试优化后AI分析界面交互效果的示例内容。" },
                key_points: { 
                  points: [
                    "点击Prompt后立即显示分析卡片",
                    "卡片内显示简洁的加载动画",
                    "流式响应实时更新内容",
                    "整个界面保持响应状态"
                  ]
                },
                labels: ["交互优化", "实时渲染", "用户体验"],
                content_analysis: { text: "通过立即响应和实时渲染，大大提升了用户的交互体验。" }
              }}
              variant="fullscreen"
              showPreprocessedContent={true}
              showHistory={showHistory}
              onHistoryCountChange={handleHistoryCountChange}
              className="h-full"
            />
          </CardContent>
        </Card>

        {/* 技术说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>技术实现说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                <strong>立即响应机制：</strong> 在 handlePromptClick 中直接调用 performCompletion，无需用户二次点击
              </p>
              <p>
                <strong>加载状态管理：</strong> 使用 LOADING_PLACEHOLDER_ 前缀标识加载状态，显示简洁的Loader2组件
              </p>
              <p>
                <strong>流式响应处理：</strong> 检测到真实数据时清空占位符，开始实时更新内容
              </p>
              <p>
                <strong>错误处理优化：</strong> 发生错误时清空 streamingResponse，避免显示无效加载状态
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}