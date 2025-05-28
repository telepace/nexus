"use client";

import { useState } from "react";
import { LLMAnalysisPanel } from "@/components/ui/llm-analysis-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, Sparkles } from "lucide-react";

export default function TestAIAnalysisPage() {
  const [testContentId] = useState<string>("test-content-123");
  const [testContent] = useState<string>(`
这是一个测试文档的内容。

## 主要内容

这里包含了一些测试文本，用于验证AI分析功能。我们可以测试以下功能：

1. **滚动功能**：当分析结果很多时，应该能够正常滚动
2. **点击隐藏**：点击过的推荐类型应该被隐藏
3. **显示控制**：可以切换显示全部或隐藏已使用的选项

### 测试场景

- 生成多个分析结果
- 测试滚动是否流畅
- 验证推荐项目的隐藏逻辑
- 检查重置功能是否正常

这个测试内容足够长，可以用来验证各种AI分析功能的正常工作。
  `);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                AI 分析模块测试
              </h1>
              <p className="text-muted-foreground">
                测试滚动功能和点击隐藏特性
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              功能测试
            </Badge>
            <Badge variant="outline">UI/UX 验证</Badge>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* 左侧：测试内容 - 占4列 */}
          <div className="col-span-12 lg:col-span-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  测试内容
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg border">
                      {testContent}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：AI分析面板 - 占8列 */}
          <div className="col-span-12 lg:col-span-8">
            <div className="h-full">
              <LLMAnalysisPanel
                contentId={testContentId}
                contentText={testContent}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* 测试说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">🧪 测试说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">滚动测试</h4>
                <p className="text-sm text-muted-foreground">
                  点击多个推荐分析，观察结果列表是否可以正常滚动
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">隐藏功能</h4>
                <p className="text-sm text-muted-foreground">
                  点击推荐后，该选项应该被标记为&ldquo;已使用&rdquo;并可选择隐藏
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">显示控制</h4>
                <p className="text-sm text-muted-foreground">
                  使用&ldquo;显示全部&rdquo;和&ldquo;隐藏已用&rdquo;按钮切换显示模式
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">重置功能</h4>
                <p className="text-sm text-muted-foreground">
                  点击&ldquo;重置&rdquo;按钮清除所有已使用状态
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">
                  响应式布局
                </h4>
                <p className="text-sm text-muted-foreground">
                  调整窗口大小测试布局适应性
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">视觉效果</h4>
                <p className="text-sm text-muted-foreground">
                  验证新的设计是否美观且易用
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
