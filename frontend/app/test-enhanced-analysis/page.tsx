"use client";

import React, { useState } from "react";
import { EnhancedModernAnalysisInterface } from "@/components/ai/EnhancedModernAnalysisInterface";
import { ContentItemPublic } from "@/lib/api/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";

// 模拟内容数据
const mockContent: ContentItemPublic = {
  id: "test-content-001",
  title: "人工智能与未来教育：变革与机遇",
  description: "探讨人工智能技术如何改变教育模式，以及未来教育的发展方向",
  content_text: `
    人工智能正在深刻改变着我们的教育方式。随着机器学习、自然语言处理和计算机视觉等技术的不断发展，AI正在为教育带来前所未有的机遇和挑战。

    ## 个性化学习的新时代

    AI技术使得个性化学习成为可能。通过分析学生的学习行为、能力水平和兴趣偏好，AI可以为每个学生量身定制学习路径和内容。这种个性化的教学方法不仅提高了学习效率，还能激发学生的学习兴趣。

    ## 智能辅导系统

    AI驱动的智能辅导系统能够提供24/7的学习支持。这些系统可以即时回答学生的问题，提供解释和反馈，并根据学生的进度调整教学策略。

    ## 自动评估与反馈

    传统的评估方式往往耗时且主观。AI技术可以实现自动化的评估，不仅提高了效率，还能提供更客观、一致的评价标准。

    ## 挑战与考虑

    虽然AI在教育中的应用前景广阔，但也面临着一些挑战：

    1. **数据隐私和安全**：学生数据的收集和使用需要严格的隐私保护措施
    2. **数字鸿沟**：技术差异可能加剧教育不公平
    3. **教师角色转变**：教师需要适应新的教学模式和技术工具
    4. **伦理考量**：AI决策的透明度和公平性需要持续关注

    ## 未来展望

    随着技术的不断进步，我们可以期待：
    - 更加智能的虚拟教师和学习伙伴
    - 沉浸式的虚拟现实学习环境
    - 跨学科的智能知识图谱
    - 终身学习的智能支持系统

    教育的未来将是人工智能与人类智慧的完美结合，为每个学习者创造最佳的学习体验。
  `,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: true,
  meta_info: JSON.stringify({
    summary: "本文探讨了人工智能在教育领域的应用和影响，分析了个性化学习、智能辅导系统等创新技术，以及面临的挑战和未来发展趋势。",
    key_points: [
      "AI技术实现个性化学习，为每个学生定制专属学习路径",
      "智能辅导系统提供24/7学习支持，即时回答问题和反馈",
      "自动评估技术提高效率，提供客观一致的评价标准",
      "数据隐私、数字鸿沟和教师角色转变是主要挑战",
      "未来将实现虚拟教师、VR学习环境和终身学习支持"
    ],
    tags: ["人工智能", "教育科技", "个性化学习", "智能辅导", "教育创新"]
  }),
  tags: ["AI", "教育", "技术", "创新"],
  source_type: "article",
  source_url: "https://example.com/ai-education-future",
  author: "测试作者",
  language: "zh-CN",
  ai_processing_status: "completed",
  created_by: "test-user",
  owner_id: "test-user"
};

// 模拟对话数据
const mockConversations = [
  {
    id: "conv-001",
    title: "个性化学习的实现方式",
    summary: "讨论了AI如何通过数据分析实现个性化学习",
    conversation_type: "prompt_analysis",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      {
        id: "msg-001",
        role: "user",
        content: "AI是如何实现个性化学习的？",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "msg-002",
        role: "assistant",
        content: "AI通过以下方式实现个性化学习：1. 学习行为分析 2. 能力评估 3. 兴趣偏好识别 4. 动态调整学习路径",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      }
    ]
  },
  {
    id: "conv-002",
    title: "教育中的AI伦理问题",
    summary: "探讨了AI在教育应用中的伦理考量",
    conversation_type: "user_chat",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    messages: [
      {
        id: "msg-003",
        role: "user",
        content: "AI教育中有哪些伦理问题需要关注？",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "msg-004",
        role: "assistant",
        content: "主要的伦理问题包括：数据隐私保护、算法偏见、决策透明度、教育公平性等。",
        timestamp: new Date(Date.now() - 7100000).toISOString(),
      }
    ]
  }
];

export default function TestEnhancedAnalysisPage() {
  const [showHistory, setShowHistory] = useState(false);
  const [variant, setVariant] = useState<"preview" | "sidebar" | "fullscreen">("fullscreen");
  const [showPreprocessedContent, setShowPreprocessedContent] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);

  const handleHistoryCountChange = (count: number) => {
    setHistoryCount(count);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            增强版AI分析界面测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试优化后的对话体验：立即响应、实时渲染、优雅等待
          </p>
        </div>

        {/* 控制面板 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              界面控制
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 变体选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">显示变体</label>
                <Tabs value={variant} onValueChange={(value) => setVariant(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="fullscreen">全屏</TabsTrigger>
                    <TabsTrigger value="sidebar">侧边栏</TabsTrigger>
                    <TabsTrigger value="preview">预览</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 历史记录显示 */}
              <div>
                <label className="block text-sm font-medium mb-2">历史记录</label>
                <Button
                  variant={showHistory ? "default" : "outline"}
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full"
                >
                  {showHistory ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showHistory ? "隐藏" : "显示"} ({historyCount})
                </Button>
              </div>

              {/* 预处理内容 */}
              <div>
                <label className="block text-sm font-medium mb-2">预处理内容</label>
                <Button
                  variant={showPreprocessedContent ? "default" : "outline"}
                  onClick={() => setShowPreprocessedContent(!showPreprocessedContent)}
                  className="w-full"
                >
                  {showPreprocessedContent ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  {showPreprocessedContent ? "显示" : "隐藏"}
                </Button>
              </div>

              {/* 状态指示 */}
              <div>
                <label className="block text-sm font-medium mb-2">系统状态</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    正常运行
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 功能特性说明 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              优化特性
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">立即响应</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    点击Prompt后立即显示对话卡片，无需等待
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">实时渲染</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    流式响应直接在卡片中实时显示
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">优雅等待</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    显示AI思考状态，避免界面冻结
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 主要演示区域 */}
        <Card className="h-[800px]">
          <CardContent className="p-0 h-full">
            <EnhancedModernAnalysisInterface
              content={mockContent}
              conversations={mockConversations}
              analysisResult={{
                summary: "本文全面探讨了人工智能在教育领域的应用现状和未来发展趋势。",
                key_points: [
                  "AI技术推动个性化学习革命",
                  "智能辅导系统提供全天候支持",
                  "自动评估提高教育效率",
                  "数据隐私等挑战需要重视"
                ],
                tags: ["AI", "教育", "个性化学习", "智能辅导"],
                insights: "人工智能将深刻改变教育模式，实现真正的个性化学习。"
              }}
              variant={variant}
              showPreprocessedContent={showPreprocessedContent}
              showHistory={showHistory}
              onHistoryCountChange={handleHistoryCountChange}
              className="h-full"
            />
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">1. 测试Prompt点击</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  点击底部的AI指令标签（如"总结要点"、"深度分析"等），观察立即出现的对话卡片和实时的AI响应流
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">2. 测试手动输入</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  在输入框中输入问题并发送，体验优化后的对话体验
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">3. 测试JSON行展开</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  点击AI响应中的可展开按钮，测试深度分析功能
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">4. 测试界面变体</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  使用上方的控制面板切换不同的显示模式和配置
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}