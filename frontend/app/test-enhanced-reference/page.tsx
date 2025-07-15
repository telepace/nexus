"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewEnhancedReferenceIndicator } from '@/components/ui/ReferenceManager';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Eye, ArrowRight } from 'lucide-react';

export default function TestEnhancedReferencePage() {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  // 测试数据
  const examples = [
    {
      id: 'single',
      title: '单个引用',
      description: '引用单个段落',
      references: [3],
      contentId: 'test-content-1',
      text: '这是一个测试段落，包含对某个特定概念的引用。'
    },
    {
      id: 'multiple',
      title: '多个引用',
      description: '引用多个不连续的段落',
      references: [1, 3, 7, 12],
      contentId: 'test-content-2',
      text: '这个段落引用了多个不同的来源和观点。'
    },
    {
      id: 'consecutive',
      title: '连续引用',
      description: '引用连续的段落范围',
      references: [5, 6, 7, 8, 9],
      contentId: 'test-content-3',
      text: '这里讨论了一个完整的概念，跨越多个连续段落。'
    },
    {
      id: 'many',
      title: '大量引用',
      description: '引用很多段落时的省略显示',
      references: [1, 3, 5, 8, 12, 15, 18, 22, 25],
      contentId: 'test-content-4',
      text: '这是一个综合性的分析，引用了大量的资料和数据。'
    },
    {
      id: 'no-content',
      title: '无内容ID',
      description: '没有contentId时的简化显示',
      references: [2, 4, 6],
      text: '这种情况下只显示引用编号，无法预览内容。'
    }
  ];

  const handleReferenceClick = (refId: number) => {
    console.log('Reference clicked:', refId);
    alert(`跳转到段落 ${refId}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">增强引用指示器测试</h1>
          <p className="text-muted-foreground">
            展示新的引用指示器组件的各种使用场景和交互效果
          </p>
        </div>

        {/* 功能特性说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              功能特性
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">显示优化</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 显示具体段落编号，不再是简单计数</li>
                  <li>• 连续段落自动显示为范围（如：5-9）</li>
                  <li>• 多个段落智能省略显示</li>
                  <li>• 更好的视觉设计和动画效果</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">交互增强</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 悬浮显示引用内容预览</li>
                  <li>• 点击段落可跳转到原文位置</li>
                  <li>• 支持多段落引用的分组显示</li>
                  <li>• 响应式设计，适配移动端</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 示例展示 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">交互示例</h2>
          <p className="text-muted-foreground">
            点击下面的示例卡片查看不同场景下的引用显示效果：
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examples.map((example) => (
              <Card 
                key={example.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedExample === example.id ? 'border-primary shadow-md' : ''
                }`}
                onClick={() => setSelectedExample(example.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {example.title}
                    <Badge variant="outline" className="text-xs">
                      {example.references.length} 个引用
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {example.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm leading-relaxed">
                      {example.text}
                      <NewEnhancedReferenceIndicator
                        references={example.references}
                        contentId={example.id === 'no-content' ? undefined : example.contentId}
                        onReferenceClick={handleReferenceClick}
                      />
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>引用段落: {example.references.join(', ')}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 对比展示 */}
        <Separator />
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">新旧对比</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-destructive">旧版显示 ❌</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    这是一个包含多个引用的段落。
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 ml-1">
                      [9 refs]
                    </span>
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  问题：无法知道具体引用了哪些段落，缺乏预览功能
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-green-600">新版显示 ✅</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    这是一个包含多个引用的段落。
                    <NewEnhancedReferenceIndicator
                      references={[1, 3, 5, 8, 12, 15, 18, 22, 25]}
                      contentId="demo-content"
                      onReferenceClick={handleReferenceClick}
                    />
                  </p>
                </div>
                <div className="text-xs text-green-600">
                  优势：显示具体段落编号，支持悬浮预览和点击跳转
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 操作指南 */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              使用指南
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 dark:text-blue-300">
            <div className="space-y-2 text-sm">
              <p><strong>悬浮查看：</strong> 将鼠标悬浮在引用标签上可查看段落内容预览</p>
              <p><strong>点击跳转：</strong> 点击引用标签或预览中的段落可跳转到原文对应位置</p>
              <p><strong>多段落：</strong> 对于多个引用，预览框中会显示前几个段落，支持展开查看更多</p>
              <p><strong>智能显示：</strong> 连续段落会自动显示为范围，非连续段落会显示为列表</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 