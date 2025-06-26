"use client";

import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { SummaryCard, KeyPointsCard } from "@/components/ai/AnalysisCards";

const testMarkdownWithImages = `
# Markdown 图片渲染测试

这是一个测试页面，用于验证 markdown 中图片的渲染是否正确，不会出现 HTML 嵌套错误。

## 内联图片测试

这是一段包含图片的文本，![示例图片](https://picsum.photos/400/300) 图片应该正确显示在段落中。

## 单独行图片测试

下面是一个单独行的图片：

![大图片示例](https://picsum.photos/800/600)

## 多个图片测试

这里有多个图片：![图片1](https://picsum.photos/200/150) 和 ![图片2](https://picsum.photos/250/180) 在同一段落中。

## 图片与其他元素混合

这段包含 **粗体文本**，![内联图片](https://picsum.photos/300/200)，以及 [链接](https://example.com)。

## 代码和图片

\`\`\`javascript
console.log("Hello World");
\`\`\`

![代码后的图片](https://picsum.photos/600/400)

这样应该不会出现 "div cannot be a descendant of p" 的错误了。
`;

// 模拟AI分析结果数据 - 测试markdown格式
const mockSummaryData = {
  text: `**核心观点**：这篇文章介绍了AI时代初创企业的测试驱动开发（TDD）实践方案。

**主要内容**：
- TDD能够有效提升代码质量和开发效率
- *cubxxw* 框架提供了完整的简体中文开发支持
- 实际应用中需要注意测试用例的*覆盖率*和**可维护性**

**实用价值**：为初创团队提供了一套可操作的TDD实施指南，特别适合快速迭代的产品开发场景。`,
};

const mockKeyPointsData = {
  text: `## 关键要点

- **TDD核心理念**: 先写测试用例，再编写实现代码，确保每个功能都有*测试保障*
- **框架选择**: *cubxxw*框架具有**完善的中文支持**，适合国内开发团队使用
- **实施策略**: 采用渐进式导入，从核心模块开始逐步扩展到整个项目
- **质量保证**: 通过自动化测试确保代码质量，减少*生产环境*的bug数量
- **团队协作**: 建立清晰的测试规范，提升团队开发**一致性**

## 补充信息

- **关键数据**: 实施TDD后bug减少*70%*，开发效率提升**40%**
- **实用建议**: 定期进行代码审查，保持测试用例的时效性
- **延伸思考**: 考虑结合CI/CD流程，实现完全自动化的质量保障体系`,
};

// 模拟旧格式数据 - 测试向后兼容性
const mockLegacySummaryData = {
  summary: "这是一个传统格式的摘要文本，没有markdown格式。内容比较简单直接。",
};

const mockLegacyKeyPointsData = {
  points: [
    "第一个关键要点：使用传统数组格式",
    "第二个关键要点：测试向后兼容性",
    "第三个关键要点：**支持markdown**在数组项中使用",
    "第四个关键要点：确保*所有格式*都能正确显示",
  ],
};

export default function TestMarkdownPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        {/* 原有的图片测试 */}
        <div className="bg-card rounded-lg border p-6">
          <h1 className="text-2xl font-bold mb-4">Markdown 图片渲染测试</h1>
          <p className="text-muted-foreground mb-6">
            这个页面用于测试修复后的 markdown
            图片渲染功能。请打开浏览器开发者工具查看是否还有 HTML 嵌套错误。
          </p>

          <div className="border rounded-lg p-4">
            <MarkdownRenderer
              content={testMarkdownWithImages}
              className="max-w-none"
            />
          </div>
        </div>

        {/* AI分析结果markdown测试 */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">
            AI 分析结果 Markdown 渲染测试
          </h2>
          <p className="text-muted-foreground mb-6">
            测试AI生成的摘要和关键要点的markdown格式渲染效果。包括新的markdown格式和传统数组格式。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 新markdown格式测试 */}
            <div className="space-y-4">
              <h3 className="font-semibold">新 Markdown 格式</h3>
              <SummaryCard summary={mockSummaryData} variant="default" />
              <KeyPointsCard keyPoints={mockKeyPointsData} variant="default" />
            </div>

            {/* 传统格式测试 */}
            <div className="space-y-4">
              <h3 className="font-semibold">传统格式（向后兼容）</h3>
              <SummaryCard summary={mockLegacySummaryData} variant="default" />
              <KeyPointsCard
                keyPoints={mockLegacyKeyPointsData}
                variant="default"
              />
            </div>
          </div>
        </div>

        {/* 原始数据展示 */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">原始数据（调试用）</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">新格式摘要:</h3>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(mockSummaryData, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">新格式关键要点:</h3>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(mockKeyPointsData, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">传统格式摘要:</h3>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(mockLegacySummaryData, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">传统格式关键要点:</h3>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(mockLegacyKeyPointsData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
