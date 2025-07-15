"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Lightbulb, 
  Bug, 
  Wrench,
  Zap,
  AlertCircle
} from 'lucide-react';
import { OptimizedReferenceIndicator } from '@/components/ui/OptimizedReferenceIndicator';
import { ReferenceManagerProvider } from '@/components/ui/ReferenceManager';

export default function TestOptimizedReferencePage() {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  // 测试数据
  const examples = [
    {
      id: 'tooltip-variant',
      title: 'Tooltip 变体',
      description: '悬浮时显示预览，适合内联使用',
      references: [3, 5, 7],
      contentId: 'test-content-tooltip',
      variant: 'tooltip' as const,
      text: '这段文字讨论了三个关键概念'
    },
    {
      id: 'popover-variant',
      title: 'Popover 变体',
      description: '点击显示详细预览，适合复杂引用',
      references: [1, 3, 5, 8, 12, 15],
      contentId: 'test-content-popover',
      variant: 'popover' as const,
      text: '这是一个包含大量引用的综合分析'
    },
    {
      id: 'simple-variant',
      title: 'Simple 变体',
      description: '简化显示，无预览功能',
      references: [2, 4, 6],
      variant: 'simple' as const,
      text: '这是一个简单的引用示例'
    },
    {
      id: 'consecutive-refs',
      title: '连续引用',
      description: '自动识别连续段落并简化显示',
      references: [10, 11, 12, 13, 14, 15],
      contentId: 'test-content-consecutive',
      variant: 'tooltip' as const,
      text: '这段内容引用了一个连续的段落范围'
    },
    {
      id: 'single-ref',
      title: '单个引用',
      description: '单个段落引用的优化显示',
      references: [19],
      contentId: 'test-content-single',
      variant: 'tooltip' as const,
      text: '这里引用了一个特定的观点'
    },
    {
      id: 'auto-load',
      title: '自动加载',
      description: '组件加载时自动获取预览内容',
      references: [1, 5, 9],
      contentId: 'test-content-autoload',
      variant: 'tooltip' as const,
      autoLoad: true,
      text: '这个示例会自动加载预览内容'
    }
  ];

  const handleReferenceClick = (refId: number) => {
    setSelectedExample(`点击了引用 #${refId}`);
    setTimeout(() => setSelectedExample(null), 3000);
  };

  const issues = [
    {
      type: 'error',
      title: 'TooltipProvider 嵌套问题',
      description: '原来的组件中存在多层 TooltipProvider 嵌套，导致悬浮功能异常',
      solution: '使用单一的 Tooltip 组件，避免嵌套'
    },
    {
      type: 'error', 
      title: '异步加载状态处理',
      description: '悬浮内容依赖异步数据，但缺少完善的加载和错误状态',
      solution: '添加 loading、error 状态管理和重试机制'
    },
    {
      type: 'warning',
      title: '组件使用不一致',
      description: '项目中存在多个引用组件，使用方式混乱',
      solution: '统一为 OptimizedReferenceIndicator 组件'
    },
    {
      type: 'info',
      title: '性能优化',
      description: '重复加载相同内容，缺少缓存机制',
      solution: '使用 useRef 防止重复请求，利用现有缓存系统'
    }
  ];

  const features = [
    '🎯 三种显示变体：Tooltip、Popover、Simple',
    '⚡ 智能加载：悬浮时才加载内容，避免性能问题',
    '🔄 错误处理：完善的加载、错误状态和重试机制',
    '📱 响应式：自适应不同屏幕尺寸',
    '🎨 平滑动画：使用 Framer Motion 提供流畅体验',
    '🔗 智能标签：自动识别连续引用并简化显示',
    '💾 缓存优化：防止重复请求，提升性能',
    '🎮 交互优化：支持键盘导航和无障碍访问'
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">优化的引用悬浮显示</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          解决了悬浮显示问题，提供了更好的用户体验和开发者体验
        </p>
        
        {selectedExample && (
          <Alert className="max-w-md mx-auto">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{selectedExample}</AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="demo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">演示</TabsTrigger>
          <TabsTrigger value="issues">问题分析</TabsTrigger>
          <TabsTrigger value="features">功能特点</TabsTrigger>
          <TabsTrigger value="usage">使用指南</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <ReferenceManagerProvider contentId="demo-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {examples.map((example) => (
                <Card 
                  key={example.id} 
                  className="hover:shadow-lg transition-all duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{example.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {example.variant}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {example.description}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm leading-relaxed">
                        {example.text}
                        <OptimizedReferenceIndicator
                          references={example.references}
                          contentId={example.contentId}
                          variant={example.variant}
                          autoLoad={example.autoLoad}
                          onReferenceClick={handleReferenceClick}
                        />
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>引用: {example.references.join(', ')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ReferenceManagerProvider>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Bug className="h-6 w-6 text-destructive" />
              问题分析与解决方案
            </h2>
            
            <div className="grid gap-4">
              {issues.map((issue, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        {issue.type === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                        {issue.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-500" />}
                        {issue.type === 'info' && <Lightbulb className="h-5 w-5 text-blue-500" />}
                      </div>
                      
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold">{issue.title}</h3>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Wrench className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-medium">解决方案:</span>
                          <span>{issue.solution}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              功能特点
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <p className="text-sm">{feature}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>对比效果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">修复前</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                      <li>• 悬浮窗不显示或显示异常</li>
                      <li>• 加载状态不明确</li>
                      <li>• 错误处理不完善</li>
                      <li>• 组件使用混乱</li>
                      <li>• 性能问题</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">修复后</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                      <li>• 稳定的悬浮显示</li>
                      <li>• 清晰的加载反馈</li>
                      <li>• 完善的错误处理和重试</li>
                      <li>• 统一的组件接口</li>
                      <li>• 优化的性能表现</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">使用指南</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>基本用法</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. 简单引用（推荐）</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">
{`<OptimizedReferenceIndicator
  references={[1, 3, 5]}
  contentId="your-content-id"
  variant="tooltip"
/>`}
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">2. 复杂引用</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">
{`<OptimizedReferenceIndicator
  refString="6-24"
  contentId="your-content-id"
  variant="popover"
  maxPreviewItems={5}
  onReferenceClick={handleClick}
/>`}
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. 无内容预览</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">
{`<OptimizedReferenceIndicator
  references={[2, 4, 6]}
  variant="simple"
/>`}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Props 说明</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">属性</th>
                        <th className="text-left py-2 px-3">类型</th>
                        <th className="text-left py-2 px-3">说明</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 px-3 font-mono">references</td>
                        <td className="py-2 px-3">number[]</td>
                        <td className="py-2 px-3">引用的段落编号数组</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 font-mono">refString</td>
                        <td className="py-2 px-3">string</td>
                        <td className="py-2 px-3">引用字符串，如 "6-24" 或 "6,8,10"</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 font-mono">variant</td>
                        <td className="py-2 px-3">'tooltip' | 'popover' | 'simple'</td>
                        <td className="py-2 px-3">显示变体</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 font-mono">contentId</td>
                        <td className="py-2 px-3">string</td>
                        <td className="py-2 px-3">内容ID，用于获取预览内容</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 font-mono">autoLoad</td>
                        <td className="py-2 px-3">boolean</td>
                        <td className="py-2 px-3">是否自动加载预览内容</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>建议：</strong>对于内联引用使用 tooltip 变体，对于包含大量引用的场景使用 popover 变体，
                对于无需预览的简单场景使用 simple 变体。
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 