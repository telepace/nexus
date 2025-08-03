"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { ReferenceManagerProvider } from '@/components/ui/ReferenceManager';

export default function TestElegantReferencesPage() {
  const [selectedExample, setSelectedExample] = useState(0);

  // 测试内容示例
  const examples = [
    {
      title: "基础内联引用",
      content: "这是一段包含引用的文本[1]，这里还有另一个引用[2]。我们可以看到引用是如何在文本中内联显示的[3]。",
      description: "测试基础的 [1] 格式引用"
    },
    {
      title: "多种引用格式",
      content: "支持多种格式：基础格式[1]，带前缀[ref:2]，以及学术格式[^3]。这些引用都会被正确解析并显示优雅的悬浮卡片。",
      description: "测试 [1], [ref:2], [^3] 等不同格式"
    },
    {
      title: "复杂段落引用",
      content: `人工智能的发展[1]正在深刻改变我们的世界。从机器学习[2]到深度学习[3]，技术的进步令人瞩目。

自然语言处理[4]领域的突破使得AI能够更好地理解人类语言[5]。这些技术不仅在学术研究中有重要价值[6]，在商业应用中也展现出巨大潜力[7]。

未来的AI发展[8]将更加注重可解释性和伦理考量[9]，确保技术发展与人类价值观保持一致[10]。`,
      description: "测试多段落、多引用的复杂场景"
    },
    {
      title: "混合内容引用",
      content: `## AI技术发展概述

**机器学习基础**[1]是现代AI的核心。主要包括：

- 监督学习[2]
- 无监督学习[3] 
- 强化学习[4]

> "人工智能将是人类历史上最重要的技术发展之一"[5] - 知名学者

这些技术的应用范围[6]包括：
1. 图像识别[7]
2. 自然语言处理[8]
3. 推荐系统[9]`,
      description: "测试包含标题、列表、引用等复杂markdown的引用"
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-screen">
        
        {/* 左侧控制面板 */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎨 优雅引用测试
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">选择测试示例：</h3>
                {examples.map((example, index) => (
                  <Button
                    key={index}
                    variant={selectedExample === index ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedExample(index)}
                  >
                    <div>
                      <div className="font-medium">{example.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {example.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">功能特性：</h3>
                <div className="space-y-2 text-xs">
                  <Badge variant="secondary" className="block text-center">✨ 优雅悬浮卡片</Badge>
                  <Badge variant="secondary" className="block text-center">🎯 内联引用标记</Badge>
                  <Badge variant="secondary" className="block text-center">🌈 渐变动画效果</Badge>
                  <Badge variant="secondary" className="block text-center">📱 响应式设计</Badge>
                  <Badge variant="secondary" className="block text-center">⚡ 智能位置调整</Badge>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-700">使用说明：</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 悬浮到引用数字上查看卡片</li>
                  <li>• 支持 [1], [ref:2], [^3] 格式</li>
                  <li>• 卡片包含段落内容预览</li>
                  <li>• 智能位置调整避免遮挡</li>
                  <li>• 优雅的动画和渐变效果</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧内容预览 */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{examples[selectedExample].title}</span>
                <Badge variant="outline">预览模式</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto">
              <ReferenceManagerProvider contentId="test-elegant-refs">
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <MarkdownRenderer 
                    content={examples[selectedExample].content}
                    contentId="test-elegant-refs"
                    enableEnhancedTooltip={true}
                  />
                </div>
              </ReferenceManagerProvider>
              
              {/* 提示文本 */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>提示：</strong>悬浮到文本中的数字引用（如 {' '}
                  <span className="inline-flex items-center justify-center w-5 h-5 mx-0.5 text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full">
                    1
                  </span>
                  {' '} ）上，查看优雅的悬浮卡片效果。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}