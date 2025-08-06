"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  UnifiedReferenceSystem,
  MinimalReference,
  StandardReference,
  ElegantReference,
  QuickReference,
  BatchReferenceSystem,
  InlineReferenceProcessor,
} from "@/components/ui/UnifiedReferenceSystem";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";

export default function TestElegantReferencesPage() {
  const [selectedTab, setSelectedTab] = useState("components");
  const sampleContentId = "test-content-elegant-refs";

  const tabs = [
    { id: "components", label: "组件演示", icon: "🎯" },
    { id: "interactions", label: "交互测试", icon: "🔮" },
    { id: "examples", label: "实际应用", icon: "📝" },
    { id: "guide", label: "使用指南", icon: "📚" },
  ];

  const renderTabContent = () => {
    switch (selectedTab) {
      case "components":
        return (
          <div className="space-y-8">
            {/* 基础组件演示 */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 基础引用指示器</CardTitle>
                <p className="text-sm text-muted-foreground">
                  展示不同变体和尺寸的引用指示器
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium w-16">Minimal:</span>
                  <MinimalReference
                    refId={1}
                    contentId={sampleContentId}
                    size="sm"
                  />
                  <MinimalReference
                    refId={2}
                    contentId={sampleContentId}
                    size="md"
                  />
                  <MinimalReference
                    refId={3}
                    contentId={sampleContentId}
                    size="lg"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium w-16">Standard:</span>
                  <StandardReference
                    refId={4}
                    contentId={sampleContentId}
                    size="sm"
                  />
                  <StandardReference
                    refId={5}
                    contentId={sampleContentId}
                    size="md"
                  />
                  <StandardReference
                    refId={6}
                    contentId={sampleContentId}
                    size="lg"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium w-16">Elegant:</span>
                  <ElegantReference
                    refId={7}
                    contentId={sampleContentId}
                    size="sm"
                  />
                  <ElegantReference
                    refId={8}
                    contentId={sampleContentId}
                    size="md"
                  />
                  <ElegantReference
                    refId={9}
                    contentId={sampleContentId}
                    size="lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 批量引用 */}
            <Card>
              <CardHeader>
                <CardTitle>📦 批量引用组件</CardTitle>
                <p className="text-sm text-muted-foreground">
                  展示批量引用的显示和折叠功能
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">少量引用:</span>
                  <BatchReferenceSystem
                    references={[
                      { refId: 10, contentId: sampleContentId },
                      { refId: 11, contentId: sampleContentId },
                      { refId: 12, contentId: sampleContentId },
                    ]}
                    variant="standard"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">大量引用:</span>
                  <BatchReferenceSystem
                    references={Array.from({ length: 8 }, (_, i) => ({
                      refId: 13 + i,
                      contentId: sampleContentId,
                    }))}
                    variant="elegant"
                    maxVisible={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "interactions":
        return (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>🔮 交互行为测试</CardTitle>
                <p className="text-sm text-muted-foreground">
                  测试悬浮预览和点击模态框功能
                </p>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    这是一段包含引用的测试文本。悬浮到引用标记上可以看到预览
                    <StandardReference refId={21} contentId={sampleContentId} />
                    ， 点击引用可以打开详细的模态框
                    <StandardReference refId={22} contentId={sampleContentId} />
                    。 你还可以尝试键盘导航功能
                    <StandardReference refId={23} contentId={sampleContentId} />
                    。
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚙️ 自定义配置</CardTitle>
                <p className="text-sm text-muted-foreground">
                  展示不同的配置选项
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">禁用悬浮:</span>
                  <UnifiedReferenceSystem
                    refId={24}
                    contentId={sampleContentId}
                    variant="standard"
                    enableHover={false}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">快速引用:</span>
                  <QuickReference refId={25} contentId={sampleContentId} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "examples":
        return (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>📝 内联文本处理</CardTitle>
                <p className="text-sm text-muted-foreground">
                  自动处理文本中的引用标记
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <InlineReferenceProcessor
                    content="人工智能的发展[1]正在深刻改变我们的世界。机器学习技术[ref:2]使得计算机能够从数据中学习，而深度学习[^3]更是推动了计算机视觉和自然语言处理的重大突破[4]。"
                    contentId={sampleContentId}
                    variant="standard"
                  />
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <InlineReferenceProcessor
                    content="在学术写作中[1]，引用的重要性不言而喻[2]。正确的引用格式[^3]不仅体现了学术严谨性[4]，也是对原作者工作的尊重[5]。"
                    contentId={sampleContentId}
                    variant="elegant"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎭 复杂场景演示</CardTitle>
                <p className="text-sm text-muted-foreground">
                  模拟真实使用场景中的复杂情况
                </p>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3">学术论文摘要示例</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    近年来，深度学习技术
                    <ElegantReference refId={31} contentId={sampleContentId} />
                    在计算机视觉领域取得了显著进展。卷积神经网络
                    <StandardReference refId={32} contentId={sampleContentId} />
                    作为核心架构，结合注意力机制
                    <StandardReference refId={33} contentId={sampleContentId} />
                    和残差连接
                    <StandardReference refId={34} contentId={sampleContentId} />
                    ， 使得模型能够处理更复杂的视觉任务。Transformer架构
                    <ElegantReference refId={35} contentId={sampleContentId} />
                    的引入更是开启了视觉理解的新篇章
                    <BatchReferenceSystem
                      references={[
                        { refId: 36, contentId: sampleContentId },
                        { refId: 37, contentId: sampleContentId },
                        { refId: 38, contentId: sampleContentId },
                        { refId: 39, contentId: sampleContentId },
                      ]}
                      variant="standard"
                      maxVisible={2}
                    />
                    。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "guide":
        return (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>📚 使用指南</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">基础使用</h4>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-sm overflow-x-auto">
                    {`import { StandardReference } from '@/components/ui/UnifiedReferenceSystem'

<StandardReference refId={1} contentId="your-content-id" />`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">内联文本处理</h4>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-sm overflow-x-auto">
                    {`import { InlineReferenceProcessor } from '@/components/ui/UnifiedReferenceSystem'

<InlineReferenceProcessor
  content="文本中的引用[1]会自动转换[^2]为可交互组件[ref:3]"
  contentId="your-content-id"
  variant="standard"
/>`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">交互提示</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>
                      •{" "}
                      <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                        悬浮
                      </kbd>{" "}
                      引用数字查看预览
                    </li>
                    <li>
                      •{" "}
                      <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                        点击
                      </kbd>{" "}
                      引用数字打开详情
                    </li>
                    <li>
                      •{" "}
                      <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                        Tab
                      </kbd>{" "}
                      键可以聚焦引用
                    </li>
                    <li>
                      •{" "}
                      <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                        Enter
                      </kbd>{" "}
                      键激活聚焦的引用
                    </li>
                    <li>
                      •{" "}
                      <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                        ESC
                      </kbd>{" "}
                      键关闭模态框
                    </li>
                    <li>• 模态框支持拖拽移动</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ReferenceManagerProvider contentId={sampleContentId}>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🎨 优雅引用系统演示
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            体验极简设计、智能交互、无障碍友好的现代引用系统
          </p>

          <div className="flex items-center gap-2 mt-4">
            <Badge variant="secondary">TDD 驱动开发</Badge>
            <Badge variant="secondary">60fps 流畅动画</Badge>
            <Badge variant="secondary">完整无障碍支持</Badge>
            <Badge variant="secondary">智能响应式设计</Badge>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="flex space-x-1 mb-8 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedTab === tab.id
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 标签页内容 */}
        {renderTabContent()}

        <Separator className="my-8" />

        {/* 功能特性概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✨ 核心特性
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">🎯 极简交互</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 150ms 智能防抖</li>
                  <li>• 18px 圆形设计</li>
                  <li>• 三种视觉变体</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🔮 智能悬浮</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 自动位置计算</li>
                  <li>• 磨砂玻璃效果</li>
                  <li>• 丰富内容预览</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🎭 优雅模态</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 支持拖拽移动</li>
                  <li>• 完整内容展示</li>
                  <li>• 键盘 ESC 关闭</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReferenceManagerProvider>
  );
}
