"use client";

import React from "react";
import { AnalysisCard, ContentBlock, CardAction, ReferenceInfo } from "@/components/ui/analysis-card";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, 
  Download, 
  Edit, 
  Target,
  Eye,
  Info
} from "lucide-react";

export default function TestAnalysisCardPage() {
  const { toast } = useToast();

  // 示例引用数据
  const sampleReferences: ReferenceInfo[] = [
    {
      id: "ref1",
      title: "深度学习基础理论",
      source: "《人工智能概论》第3章",
      url: "https://example.com/ai-basics",
      snippet: "深度学习是机器学习的一个分支，它试图通过多层神经网络来模拟人脑的工作方式...",
      relevanceScore: 0.95,
    },
    {
      id: "ref2", 
      title: "神经网络的历史发展",
      source: "AI研究期刊 2023年第2期",
      snippet: "从感知机到深度神经网络，人工智能领域经历了多次重要的技术突破...",
      relevanceScore: 0.87,
    },
    {
      id: "ref3",
      title: "现代AI应用案例分析",
      source: "技术前沿报告",
      url: "https://example.com/ai-applications",
      snippet: "在医疗诊断、自动驾驶、自然语言处理等领域，AI技术正在产生深远影响...",
      relevanceScore: 0.92,
    },
  ];

  // 示例内容块
  const aiContentBlocks: ContentBlock[] = [
    {
      id: "summary",
      type: "summary",
      content: `人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，它试图理解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大，可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。`,
      tooltip: "这是对人工智能的基础定义和概述",
      expandable: true,
      references: sampleReferences,
    },
    {
      id: "keypoints",
      type: "list",
      content: (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <span>模拟人类智能的计算机系统</span>
          </div>
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <span>包括机器学习、深度学习、自然语言处理等技术</span>
          </div>
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <span>广泛应用于医疗、教育、交通、金融等领域</span>
          </div>
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
            <span>持续发展中的前沿科技，具有巨大发展潜力</span>
          </div>
        </div>
      ),
      tooltip: "人工智能的核心特点和应用领域",
      references: sampleReferences.slice(0, 2),
    },
    {
      id: "technical",
      type: "text",
      content: "技术实现方面，现代AI主要依赖于深度神经网络、大数据处理和高性能计算。通过训练大规模的神经网络模型，AI系统能够在图像识别、语音识别、文本理解等任务上达到甚至超越人类的表现水平。",
      tooltip: "AI的核心技术实现原理",
      expandable: true,
    },
  ];

  // 示例操作
  const aiActions: CardAction[] = [
    {
      id: "favorite",
      label: "收藏",
      icon: Star,
      onClick: () => toast({ title: "已收藏", description: "内容已添加到收藏夹" }),
      group: "actions",
    },
    {
      id: "download",
      label: "下载",
      icon: Download,
      onClick: () => toast({ title: "下载", description: "正在准备下载..." }),
      group: "actions",
      separator: true,
    },
    {
      id: "edit",
      label: "编辑",
      icon: Edit,
      onClick: () => toast({ title: "编辑", description: "打开编辑器..." }),
      group: "edit",
    },
  ];

  // 自定义复制内容函数
  const handleCopyContent = async () => {
    const content = `# AI技术发展概述

现代人工智能（AI）是一个快速发展的技术领域，涵盖了机器学习、深度学习、自然语言处理等多个分支。通过模拟人类的认知过程，AI系统能够在特定任务上表现出类似或超越人类的能力。

## 核心技术
- 深度神经网络
- 大数据处理
- 高性能计算
- 自然语言理解`;

    await navigator.clipboard.writeText(content);
    toast({ 
      title: "已复制", 
      description: "AI技术内容已复制到剪贴板",
    });
  };

  // 删除处理函数
  const handleDelete = () => {
    toast({ 
      title: "删除成功", 
      description: "AI技术卡片已删除",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              增强卡片组件演示
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              展示新的增强卡片组件，具有美观的设计、完整的交互功能、增强的三个点菜单、
              内容复制、删除功能、悬浮效果、展开功能以及引用显示等特性。
            </p>
          </div>

          {/* 功能说明 */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-6 border border-blue-200/40 dark:border-blue-800/40">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              ✨ 新增功能特性
            </h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
              <div className="space-y-2">
                <div>• <strong>增强的三个点菜单</strong> - 分组显示，更清晰的操作分类</div>
                <div>• <strong>复制内容功能</strong> - 一键复制卡片主要内容到剪贴板</div>
                <div>• <strong>删除确认对话框</strong> - 优雅的删除操作确认</div>
                <div>• <strong>自定义菜单项</strong> - 支持分组、条件显示、快捷键</div>
              </div>
              <div className="space-y-2">
                <div>• <strong>美学提升</strong> - 更好的间距、颜色和微交互</div>
                <div>• <strong>操作反馈</strong> - 即时的操作状态提示</div>
                <div>• <strong>响应式设计</strong> - 在各种屏幕尺寸下优雅显示</div>
                <div>• <strong>无障碍支持</strong> - 键盘导航和屏幕阅读器支持</div>
              </div>
            </div>
          </div>

          {/* 卡片示例 */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              📋 卡片功能演示
            </h2>

            <div className="grid gap-8 md:grid-cols-2">
              {/* 主要功能演示卡片 */}
              <AnalysisCard
                title="AI技术发展概述"
                subtitle="现代人工智能的核心概念与应用"
                emoji="🤖"
                contentBlocks={aiContentBlocks}
                actions={aiActions}
                defaultActions={true}
                onCopyContent={handleCopyContent}
                onDelete={handleDelete}
                variant="featured"
                onCardClick={() => toast({ title: "卡片点击", description: "查看 AI 技术详情" })}
              />

              {/* 简化版卡片 */}
              <AnalysisCard
                title="简化卡片示例"
                subtitle="仅包含基础菜单功能"
                emoji="📝"
                contentBlocks={[
                  {
                    id: "simple-content",
                    type: "text",
                    content: "这是一个简化的卡片示例，展示了基础的三个点菜单功能。点击右上角的三个点查看可用操作。",
                    tooltip: "简单文本内容",
                  },
                ]}
                defaultActions={true}
                onCopyContent={async () => {
                  await navigator.clipboard.writeText("简化卡片示例内容");
                  toast({ title: "已复制", description: "简化卡片内容已复制" });
                }}
                variant="default"
              />

              {/* 无删除功能的卡片 */}
              <AnalysisCard
                title="只读内容卡片"
                subtitle="仅支持复制，不支持删除"
                emoji="👁️"
                contentBlocks={[
                  {
                    id: "readonly-content",
                    type: "summary",
                    content: "这是一个只读卡片，用户只能复制内容，但不能删除。这在展示重要信息或受保护内容时很有用。",
                    tooltip: "受保护的内容",
                  },
                ]}
                actions={[
                  {
                    id: "info",
                    label: "详细信息",
                    icon: Info,
                    onClick: () => toast({ title: "详细信息", description: "显示更多内容详情" }),
                    group: "info",
                  },
                ]}
                defaultActions={true}
                onCopyContent={async () => {
                  await navigator.clipboard.writeText("只读内容卡片 - 受保护信息");
                  toast({ title: "已复制", description: "只读内容已复制" });
                }}
                // 注意：没有提供 onDelete，所以删除选项不会显示
                variant="default"
              />

              {/* 带快捷键的卡片 */}
              <EnhancedCard
                title="快捷键演示卡片"
                subtitle="展示菜单项的快捷键提示"
                emoji="⌨️"
                contentBlocks={[
                  {
                    id: "shortcut-content",
                    type: "text",
                    content: "这个卡片演示了菜单项的快捷键功能。虽然快捷键在这个演示中不是真正可用的，但显示了如何在菜单中展示快捷键提示。",
                    tooltip: "快捷键演示",
                  },
                ]}
                actions={[
                  {
                    id: "quick-edit",
                    label: "快速编辑",
                    icon: Edit,
                    onClick: () => toast({ title: "快速编辑", description: "使用 Ctrl+E 快捷键" }),
                    shortcut: "⌘E",
                    group: "edit",
                  },
                  {
                    id: "quick-save",
                    label: "快速保存",
                    icon: Download,
                    onClick: () => toast({ title: "快速保存", description: "使用 Ctrl+S 快捷键" }),
                    shortcut: "⌘S",
                    group: "edit",
                  },
                ]}
                defaultActions={true}
                onCopyContent={async () => {
                  await navigator.clipboard.writeText("快捷键演示卡片内容");
                  toast({ title: "已复制", description: "快捷键演示内容已复制" });
                }}
                onDelete={handleDelete}
                variant="default"
              />
            </div>
          </div>

          {/* JSON 内容解析说明 */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-200/40 dark:border-blue-800/40">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              🎯 JSON 内容解析功能
            </h2>
            <div className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
              <div>
                <strong>智能识别：</strong>
                自动识别并去除 <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">\`\`\`json</code> 和 <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">\`\`\`</code> 标记
              </div>
              <div>
                <strong>支持的类型：</strong>
                h1, h2, h3 (标题), insight (洞察), summary (摘要), list (列表), code (代码), warning (警告), error (错误), success (成功)
              </div>
              <div>
                <strong>引用系统：</strong>
                通过 <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">"ref":"3,6,8"</code> 格式支持引用标记，点击数字可查看引用详情
              </div>
              <div>
                <strong>回退机制：</strong>
                如果内容不是有效的 JSON 格式，会自动回退到普通文本显示
              </div>
            </div>
          </div>

          {/* 预设分析卡片 */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">预设分析卡片</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              <AnalysisCard
                title="自然语言处理技术分析"
                summary={`自然语言处理（NLP）是人工智能和语言学领域的分支学科。此领域探讨如何处理及运用自然语言；自然语言认知则是指让电脑"懂"人类的语言。自然语言生成系统把计算机数据转化为自然语言。自然语言理解系统把自然语言转化为计算机程序更易于处理的形式。`}
                keyPoints={[
                  "文本分析与理解",
                  "语言模型训练",
                  "机器翻译系统",
                  "对话系统开发",
                  "情感分析应用"
                ]}
                references={sampleReferences}
                onViewDetails={() => {
                  toast({
                    title: "查看详情",
                    description: "正在打开NLP技术详细分析...",
                  });
                }}
              />

              <AnalysisCard
                title="计算机视觉应用案例"
                summary={`计算机视觉是一门研究如何使机器"看"的科学，更进一步的说，就是指用摄影机和电脑代替人眼对目标进行识别、跟踪和测量等机器视觉，并进一步做图形处理。`}
                keyPoints={[
                  "图像识别与分类",
                  "目标检测与跟踪",
                  "人脸识别技术",
                  "医学图像分析",
                  "自动驾驶视觉系统"
                ]}
                actions={[
                  {
                    id: "demo",
                    label: "查看演示",
                    icon: Eye,
                    onClick: () => toast({ title: "演示", description: "启动CV演示程序..." }),
                  },
                ]}
              />
            </div>
          </div>

          {/* 状态示例 */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">不同状态示例</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* 加载状态 */}
              <EnhancedCard
                title="内容加载中"
                subtitle="请稍候..."
                emoji="⏳"
                contentBlocks={[
                  {
                    id: "loading",
                    type: "text",
                    content: "正在获取最新的AI研究数据...",
                  },
                ]}
                loading={true}
                variant="compact"
              />

              {/* 错误状态 */}
              <EnhancedCard
                title="加载失败"
                subtitle="数据获取错误"
                emoji="⚠️"
                contentBlocks={[
                  {
                    id: "error",
                    type: "text",
                    content: "无法连接到服务器，请检查网络连接。",
                  },
                ]}
                error="网络连接失败"
                variant="compact"
                actions={[
                  {
                    id: "retry",
                    label: "重试",
                    icon: Download,
                    onClick: () => toast({ title: "重试", description: "正在重新加载..." }),
                  },
                ]}
              />

              {/* 选中状态 */}
              <EnhancedCard
                title="已选中的卡片"
                subtitle="当前选中状态"
                emoji="✅"
                contentBlocks={[
                  {
                    id: "selected",
                    type: "text",
                    content: "这张卡片处于选中状态，有蓝色边框高亮显示。",
                  },
                ]}
                selected={true}
                variant="compact"
              />
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">💡 使用提示</h2>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div>• <strong>三个点菜单</strong>：点击卡片右上角的三个点按钮，查看所有可用操作</div>
              <div>• <strong>复制内容</strong>：菜单中的"复制内容"可以复制卡片的主要文本内容</div>
              <div>• <strong>复制全部</strong>：菜单中的"复制全部"会复制卡片中的所有内容块</div>
              <div>• <strong>删除功能</strong>：点击删除会弹出确认对话框，确保误操作的安全性</div>
              <div>• <strong>分组菜单</strong>：菜单项会根据功能自动分组，用分隔符区分不同类型的操作</div>
              <div>• <strong>快捷键提示</strong>：某些操作会在菜单中显示对应的快捷键（仅为展示）</div>
              <div>• <strong>条件显示</strong>：菜单项会根据权限和状态动态显示或隐藏</div>
              <div>• <strong>内容块操作</strong>：悬浮在单个内容块上可以复制该块的内容</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 