"use client";

import React, { useState } from "react";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { ReferenceHyperlinkRenderer, InlineReferences, BadgeReferences, MinimalReferences } from "@/components/ui/ReferenceHyperlinkRenderer";
import { AnimatedReferenceIndicator, FloatingReferences, PulseReferences, GlowReferences, BounceReferences } from "@/components/ui/AnimatedReferenceIndicator";
import { SmartReferenceHighlighter, ReferenceHighlightManager } from "@/components/ui/SmartReferenceHighlighter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * 🎨 引用超链接功能演示页面
 * 
 * 展示所有引用格式的渲染效果和交互体验
 */
export default function TestRefHyperlinksPage() {
  const [selectedStyle, setSelectedStyle] = useState<'default' | 'minimal' | 'badge' | 'inline'>('default');

  // 测试数据 - 模拟AI分析结果
  const testJsonlData = `{"t": "insight", "c": "这篇文章为独立开发者提供了一份极其详尽且实用的"生存指南"，核心是**如何利用一套现代化的、低成本的工具栈，快速、高效地将想法变成真实产品**。", "ref": "1-2"}
{"t": "p", "lead": "第一步：打造低成本、高效率的"兵器库"", "c": "文章开篇就给出一张详尽的工具清单，堪称独立开发者的"军火库"。其核心选型策略是**优先使用有慷慨免费额度的云服务和开源工具**，实现低成本启动。", "ref": "1"}
{"t": "h2", "c": "技术栈推荐", "ref": "3,5,7"}
{"t": "list", "c": "前端用Next.js + Tailwind CSS，因为它们开发快、性能好、对SEO友好；后端和数据库首选Supabase，它是一个开源的后端即服务平台；部署用 Vercel，与 GitHub联动，代码一提交就自动部署上线", "ref": "5-8"}
{"t": "quote", "c": "把钱和精力花在最核心的产品逻辑上", "ref": "10"}
{"t": "action", "c": "开始搭建你的第一个MVP产品原型", "ref": "15,18,20-22"}
{"t": "concept", "c": "**MVP（最小可行产品）** 是指包含最核心功能的产品版本，用于快速验证市场需求。", "ref": "25"}
{"t": "qa", "c": {"q": "如何选择合适的技术栈？", "a": "根据团队技能、项目需求和预算来决定，优先选择生态成熟、文档完善的技术。"}, "ref": "30-32"}`;

  // 单独演示数据
  const refExamples = [
    { ref: "1", description: "单个引用" },
    { ref: "1-3", description: "范围引用" },
    { ref: "1,3,5", description: "多个引用" },
    { ref: "1-3,5,7-9,12", description: "复杂引用" },
    { ref: "10,15,20-25,30,35-40", description: "大量引用" },
  ];

  const handleReferenceClick = (refId: number) => {
    console.log(`🎯 用户点击了引用 ${refId}`);
    // 这里可以添加实际的跳转逻辑
  };

  return (
    <ReferenceManagerProvider contentId="demo-content">
      <ReferenceHighlightManager>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="max-w-6xl mx-auto p-6 space-y-8">
          
          {/* 页面标题 */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              🎨 引用超链接渲染系统
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              将JSON数据中的ref字段转换为优雅的超链接，支持单个引用、范围引用、多个引用等多种格式，
              提供4种不同的视觉风格和流畅的交互体验。
            </p>
          </div>

          {/* 风格选择器 */}
          <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎛️ 选择引用风格
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {(['default', 'minimal', 'badge', 'inline'] as const).map((style) => (
                  <Button
                    key={style}
                    variant={selectedStyle === style ? "default" : "outline"}
                    onClick={() => setSelectedStyle(style)}
                    className="capitalize"
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 高级功能演示 */}
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">🔗 基础渲染</TabsTrigger>
              <TabsTrigger value="animated">🎭 动画效果</TabsTrigger>
              <TabsTrigger value="highlighting">🎨 智能高亮</TabsTrigger>
              <TabsTrigger value="integration">🚀 完整集成</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>🔗 引用格式演示</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {refExamples.map((example, index) => (
                      <div key={index} className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">ref: "{example.ref}"</Badge>
                          <span className="text-sm text-muted-foreground">{example.description}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">渲染效果:</span>
                          <ReferenceHyperlinkRenderer
                            refString={example.ref}
                            variant={selectedStyle}
                            onReferenceClick={handleReferenceClick}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>✨ 预设风格组件</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-medium">InlineReferences</h4>
                      <div className="p-3 bg-muted/30 rounded">
                        <InlineReferences refString="1,3,5-7" onReferenceClick={handleReferenceClick} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">BadgeReferences</h4>
                      <div className="p-3 bg-muted/30 rounded">
                        <BadgeReferences refString="1,3,5-7" onReferenceClick={handleReferenceClick} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">MinimalReferences</h4>
                      <div className="p-3 bg-muted/30 rounded">
                        <MinimalReferences refString="1,3,5-7" onReferenceClick={handleReferenceClick} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="animated" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🎭 动画引用指示器</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-medium text-lg">FloatingReferences</h4>
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg">
                        <FloatingReferences references={[1, 3, 5, 7]} onReferenceClick={handleReferenceClick} />
                      </div>
                      
                      <h4 className="font-medium text-lg">PulseReferences</h4>
                      <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg">
                        <PulseReferences references={[2, 4, 6, 8]} onReferenceClick={handleReferenceClick} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-lg">GlowReferences</h4>
                      <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg">
                        <GlowReferences references={[10, 12, 14]} onReferenceClick={handleReferenceClick} />
                      </div>
                      
                      <h4 className="font-medium text-lg">BounceReferences</h4>
                      <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg">
                        <BounceReferences references={[15, 17, 19]} onReferenceClick={handleReferenceClick} />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-lg mb-4">自定义动画配置</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h5 className="font-medium mb-2">不同大小</h5>
                        <div className="space-y-2">
                          <AnimatedReferenceIndicator references={[1, 2]} size="sm" variant="glow" color="blue" />
                          <AnimatedReferenceIndicator references={[1, 2]} size="md" variant="glow" color="purple" />
                          <AnimatedReferenceIndicator references={[1, 2]} size="lg" variant="glow" color="green" />
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h5 className="font-medium mb-2">不同颜色</h5>
                        <div className="space-y-2">
                          <AnimatedReferenceIndicator references={[1, 2]} color="blue" variant="pulse" />
                          <AnimatedReferenceIndicator references={[1, 2]} color="purple" variant="pulse" />
                          <AnimatedReferenceIndicator references={[1, 2]} color="green" variant="pulse" />
                          <AnimatedReferenceIndicator references={[1, 2]} color="orange" variant="pulse" />
                          <AnimatedReferenceIndicator references={[1, 2]} color="pink" variant="pulse" />
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h5 className="font-medium mb-2">错开动画</h5>
                        <AnimatedReferenceIndicator 
                          references={[1, 2, 3, 4, 5]} 
                          variant="bounce" 
                          color="purple" 
                          staggerDelay={200}
                          onReferenceClick={handleReferenceClick}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="highlighting" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🎨 智能引用高亮系统</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">自动高亮演示</h4>
                      <p className="text-sm text-muted-foreground">悬停在下面的内容上查看高亮效果</p>
                      
                      <SmartReferenceHighlighter references={[1, 2, 3]} autoHighlight={true}>
                        <div className="p-4 bg-muted/30 rounded-lg cursor-pointer">
                          <h5 className="font-medium">包含引用 1, 2, 3 的内容块</h5>
                          <p className="text-sm text-muted-foreground mt-2">
                            这是一个示例内容块，当你悬停在这里时，相关的引用会自动高亮显示。
                          </p>
                          <div className="mt-3">
                            <ReferenceHyperlinkRenderer refString="1,2,3" variant="badge" />
                          </div>
                        </div>
                      </SmartReferenceHighlighter>
                      
                      <SmartReferenceHighlighter references={[5, 6, 7, 8]} autoHighlight={true}>
                        <div className="p-4 bg-muted/30 rounded-lg cursor-pointer">
                          <h5 className="font-medium">包含引用 5-8 的内容块</h5>
                          <p className="text-sm text-muted-foreground mt-2">
                            另一个示例内容块，演示多个引用的高亮效果。
                          </p>
                          <div className="mt-3">
                            <ReferenceHyperlinkRenderer refString="5-8" variant="badge" />
                          </div>
                        </div>
                      </SmartReferenceHighlighter>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">高亮效果配置</h4>
                      <div className="space-y-3">
                        <div className="p-3 border rounded">
                          <h6 className="text-sm font-medium">短时高亮 (1秒)</h6>
                          <SmartReferenceHighlighter references={[10]} highlightDuration={1000}>
                            <div className="p-2 bg-muted/20 rounded text-sm">快速高亮内容</div>
                          </SmartReferenceHighlighter>
                        </div>
                        
                        <div className="p-3 border rounded">
                          <h6 className="text-sm font-medium">持久高亮 (5秒)</h6>
                          <SmartReferenceHighlighter references={[11]} highlightDuration={5000}>
                            <div className="p-2 bg-muted/20 rounded text-sm">长时间高亮内容</div>
                          </SmartReferenceHighlighter>
                        </div>
                        
                        <div className="p-3 border rounded">
                          <h6 className="text-sm font-medium">无自动高亮</h6>
                          <SmartReferenceHighlighter references={[12]} autoHighlight={false}>
                            <div className="p-2 bg-muted/20 rounded text-sm">需要手动触发高亮</div>
                          </SmartReferenceHighlighter>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-4">批量高亮管理</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { refs: [20, 21, 22], title: "第一组引用" },
                        { refs: [25, 26, 27], title: "第二组引用" },
                        { refs: [30, 31, 32], title: "第三组引用" },
                      ].map((group, index) => (
                        <SmartReferenceHighlighter key={index} references={group.refs}>
                          <Card className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <h5 className="font-medium">{group.title}</h5>
                              <p className="text-sm text-muted-foreground mt-1">
                                悬停查看高亮效果
                              </p>
                              <div className="mt-2">
                                <ReferenceHyperlinkRenderer 
                                  refString={group.refs.join(',')} 
                                  variant="minimal" 
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </SmartReferenceHighlighter>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integration" className="space-y-6">
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎯 完整JSONL渲染演示
                    <Badge variant="secondary">所有功能集成</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border">
                      <h4 className="font-medium mb-2">完整功能演示</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        下面展示的是一个完整的AI分析结果，集成了所有引用功能：超链接渲染、动画效果、智能高亮、悬停预览等。
                      </p>
                    </div>
                    
                    <JsonlRenderer
                      content={testJsonlData}
                      styleName="notebook"
                      showReferenceIndicators={false} // 使用新的集成引用系统
                      enableHoverEffects={true}
                      onExpandLine={(jsonContent) => {
                        console.log("🔍 展开内容:", jsonContent);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* MarkdownRenderer集成演示 */}
          <Card>
            <CardHeader>
              <CardTitle>📝 MarkdownRenderer 集成演示</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">行内模式 (inline)</h4>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <MarkdownRenderer
                      content="这是一段包含**粗体**和*斜体*的文本内容"
                      inline={true}
                      ref="1,3,5"
                      refVariant={selectedStyle}
                      onReferenceClick={handleReferenceClick}
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">块级模式 (block)</h4>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <MarkdownRenderer
                      content="## 这是一个标题\n\n包含多行内容的markdown文本，支持各种格式化。"
                      ref="10-12"
                      refVariant={selectedStyle}
                      onReferenceClick={handleReferenceClick}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* JSONL渲染器完整演示 */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 完整JSONL渲染演示
                <Badge variant="secondary">Notebook Style</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border">
                  <h4 className="font-medium mb-2">模拟AI分析结果 (包含各种ref格式)</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    下面展示的是一个完整的AI分析结果，每个块都包含不同格式的引用信息，
                    点击引用数字可以跳转到对应的原文段落。
                  </p>
                </div>
                
                <JsonlRenderer
                  content={testJsonlData}
                  styleName="notebook"
                  showReferenceIndicators={false} // 使用新的集成引用系统
                  enableHoverEffects={true}
                  onExpandLine={(jsonContent) => {
                    console.log("🔍 展开内容:", jsonContent);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200">📖 使用说明</CardTitle>
            </CardHeader>
            <CardContent className="text-green-700 dark:text-green-300 space-y-2">
              <p>• <strong>ref格式支持:</strong> "1" (单个), "1-3" (范围), "1,3,5" (多个), "1-3,5,7-9" (混合)</p>
              <p>• <strong>四种风格:</strong> default (圆形徽章), minimal (简约文本), badge (彩色徽章), inline (内联链接)</p>
              <p>• <strong>智能分组:</strong> 自动将连续数字合并为范围显示，如 [1,2,3,5] → "1-3, 5"</p>
              <p>• <strong>交互体验:</strong> 悬停效果、工具提示、点击跳转、键盘导航支持</p>
              <p>• <strong>响应式设计:</strong> 适配不同屏幕尺寸，支持明暗主题</p>
            </CardContent>
          </Card>

          </div>
        </div>
      </ReferenceHighlightManager>
    </ReferenceManagerProvider>
  );
}