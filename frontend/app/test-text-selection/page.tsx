"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleContentRenderer } from "@/components/ui/SimpleContentRenderer";
import { TextSelectionFloater } from "@/components/ui/text-selection-floater";
import { Badge } from "@/components/ui/badge";
import { Brain, BookOpen, Target, Settings, Sparkles } from "lucide-react";

export default function TextSelectionTestPage() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [isFloaterEnabled, setIsFloaterEnabled] = useState(true);

  const handleTextAction = (
    action: { id: string; label: string; prompt: string },
    text: string
  ) => {
    setSelectedText(text);
    setSelectedAction(`${action.label}: ${action.prompt}`);
    console.log("文本操作:", { action, text });
  };

  const sampleContent = `
# 文本智能交互浮层测试

这是一个用于测试文本选择浮层功能的页面。请尝试选择以下任意文本片段，观察是否会弹出浮层。

## 功能特点

- **智能区域检测**: 浮层只在正文内容区域生效
- **精确排除**: 右侧卡片区域被完全排除
- **多种操作**: 支持解释、改善、翻译、搜索等操作
- **响应式设计**: 适配不同屏幕尺寸

## 测试内容

### 中文段落测试
人工智能技术正在快速发展，深度学习、自然语言处理、计算机视觉等领域都取得了突破性进展。这些技术的应用正在改变我们的生活方式，从智能手机的语音助手到自动驾驶汽车，再到医疗诊断系统。

### English Paragraph Test
Artificial intelligence is revolutionizing various industries through machine learning algorithms, neural networks, and advanced data processing techniques. These technologies enable computers to perform tasks that traditionally required human intelligence, such as pattern recognition, decision-making, and language understanding.

### 代码片段测试
\`\`\`javascript
function createTextSelectionFloater(options) {
  const floater = document.createElement('div');
  floater.className = 'text-selection-floater';
  floater.style.position = 'absolute';
  return floater;
}
\`\`\`

### 列表测试
1. 选择任意文本
2. 观察浮层是否出现
3. 点击操作按钮
4. 查看下方的操作结果

- 解释功能：详细说明选中内容
- 改善功能：优化文本表达
- 翻译功能：中英文互译
- 搜索功能：相关信息检索

## 技术实现

浮层使用以下技术实现：
- React Portal 技术实现全局浮层
- 智能定位算法自动调整位置
- CSS-in-JS 动态样式管理
- 事件委托优化性能

请尝试选择上述任何文本内容，测试浮层功能是否正常工作。
`;

  return (
    <div className="min-h-screen bg-background">
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-950 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                文本智能交互浮层测试
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                测试文本选择浮层在不同区域的表现
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isFloaterEnabled ? "default" : "secondary"}>
                浮层{isFloaterEnabled ? "启用" : "禁用"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFloaterEnabled(!isFloaterEnabled)}
              >
                <Settings className="h-4 w-4 mr-2" />
                切换状态
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：正文内容区域 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  正文内容区域（浮层生效）
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleContentRenderer
                  content={sampleContent}
                  enableTextSelection={isFloaterEnabled}
                  onTextAction={handleTextAction}
                  className="px-6 pb-6"
                />
              </CardContent>
            </Card>
          </div>

          {/* 右侧：卡片区域 */}
          <div className="space-y-6">
            {/* 操作结果显示 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  操作结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedText ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        选中文本:
                      </h4>
                      <p className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                        "{selectedText}"
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        执行操作:
                      </h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {selectedAction}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    请在左侧正文区域选择文本，查看浮层效果
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 模拟AI分析卡片1 - 增强版 */}
            <Card data-exclude-selection className="analysis-card ai-analysis-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI分析卡片（浮层无效）
                </CardTitle>
              </CardHeader>
              <CardContent data-exclude-selection>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    这是一个分析卡片区域。在此区域选择文本不会触发浮层，因为添加了 data-exclude-selection 属性和 analysis-card 类名。
                  </p>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded" data-exclude-selection>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">测试文本内容：</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      人工智能正在改变世界，深度学习算法能够处理复杂的数据模式，自然语言处理技术让机器理解人类语言，计算机视觉让机器能够"看见"世界。
                      请尝试选择这段文本，观察是否会出现浮层。如果功能正常，此处不应该有浮层出现。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      分析按钮1
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      分析按钮2
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 模拟洞察面板 */}
            <div className="insight-pane ai-analysis-panel" data-exclude-selection>
              <Card className="analysis-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    洞察面板测试
                  </CardTitle>
                </CardHeader>
                <CardContent data-exclude-selection>
                  <div className="space-y-2" data-exclude-selection>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">文本选择功能只在正文区域生效</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">右侧面板完全排除文本选择：这段文字应该不会触发浮层</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">支持多种智能操作：解释、改善、翻译、搜索</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">响应式设计适配移动端：这些文字都不应该触发浮层</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Card 测试 */}
                          <div className="analysis-card" data-exclude-selection>
              <Card className="analysis-card">
                <CardHeader>
                  <CardTitle>Enhanced Card 测试</CardTitle>
                </CardHeader>
                <CardContent data-exclude-selection>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    这个区域使用了 analysis-card 类名，选择文本不应该触发浮层。
                  </p>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded" data-exclude-selection>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      机器学习是人工智能的一个重要分支，它使计算机能够在没有明确编程的情况下从数据中学习。
                      深度学习作为机器学习的子集，通过多层神经网络模拟人脑的工作方式。
                      这段文字在 analysis-card 区域内，不应该触发文本选择浮层。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 测试说明更新 */}
            <Card>
              <CardHeader>
                <CardTitle>测试说明</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                      ✅ 预期行为
                    </h4>
                    <p className="text-green-700 dark:text-green-300">
                      在左侧正文区域选择文本时，应该出现浮层提供操作选项
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                      ❌ 不应出现
                    </h4>
                    <p className="text-red-700 dark:text-red-300">
                      在右侧任何卡片、面板、按钮区域选择文本时，都不应该出现浮层
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      🔧 排除机制
                    </h4>
                    <div className="text-yellow-700 dark:text-yellow-300 space-y-1">
                      <p>• <code>data-exclude-selection</code> 属性</p>
                      <p>• <code>.analysis-card</code> 类名</p>
                      <p>• <code>.analysis-card</code> 类名</p>
                      <p>• <code>.insight-pane</code> 类名</p>
                      <p>• <code>button</code> 元素</p>
                      <p>• 各种UI组件选择器</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 全局文本选择浮层 */}
      {isFloaterEnabled && (
        <TextSelectionFloater
          enabled={true}
          containerSelector=".content-area"
          excludeSelector=".card, .sidebar, .panel, .analysis-card, .llm-analysis-card, .ai-analysis-card, .content-analysis-sidebar, .content-analysis-panel, .ai-analysis-panel, .insight-pane, .floating-menu, .dropdown-menu, .tooltip, .popover, .modal, .dialog, [data-exclude-selection], [data-dropdown-trigger], [data-tooltip], [data-popover], [data-modal], [data-dialog], .shadcn-ui-card, .ui-card, .analysis-card, button, .button, input, textarea, select, .form-control, .toolbar, .header, .footer, .navigation, .nav, .menu"
          onAction={handleTextAction}
          zIndex={1050}
        />
      )}
    </div>
  );
} 