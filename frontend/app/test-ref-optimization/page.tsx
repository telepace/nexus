"use client";

import React from "react";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";
import { EnhancedContentReader } from "@/components/ui/EnhancedContentReader";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

const mockChunks = [
  {
    id: "chunk-1",
    index: 1,
    content: "这是第一段内容。包含了重要的概念和定义，为后续分析提供基础。",
    type: "paragraph",
  },
  {
    id: "chunk-2",
    index: 2,
    content:
      "第二段继续深入讨论相关主题。引用了多个研究来源，增强了论点的可信度。",
    type: "paragraph",
  },
  {
    id: "chunk-3",
    index: 3,
    content:
      "第三段提供了实际案例分析。通过具体例子展示了理论在实践中的应用效果。",
    type: "paragraph",
  },
  {
    id: "chunk-4",
    index: 4,
    content: "第四段总结了前面的讨论。强调了关键观点并指出了未来研究的方向。",
    type: "paragraph",
  },
  {
    id: "chunk-5",
    index: 5,
    content: "第五段是结论部分。综合了所有分析结果，提出了最终的建议和意见。",
    type: "paragraph",
  },
];

const markdownContent = `
# Ref优化测试文档

这是一个测试文档，用于验证ref优化功能。

## 第一节：基础概念

这一节介绍了基础概念和定义。包含重要的理论框架。

## 第二节：详细分析

这一节进行了详细的分析和讨论。提供了深入的见解。

## 第三节：实践应用

这一节展示了理论在实践中的应用。包含了具体的案例研究。

## 第四节：结论

这一节总结了所有的发现和建议。
`;

export default function TestRefOptimization() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Ref优化系统测试</h1>

      {/* 测试分块模式 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">分块模式测试</h2>
        <p className="text-muted-foreground">
          测试chunks模式下的ref tooltip和跳转功能
        </p>

        <ReferenceManagerProvider contentId="test-chunks">
          <EnhancedContentReader
            chunks={mockChunks}
            contentId="test-chunks"
            className="border rounded-lg p-4"
          />
        </ReferenceManagerProvider>

        {/* 测试引用渲染 */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">AI分析结果 (带引用)</h3>
          <ReferenceManagerProvider contentId="test-chunks">
            <MarkdownRenderer
              content="根据文档分析，第一段提供了基础概念，第二段深入讨论了相关主题。"
              ref="1,2"
              contentId="test-chunks"
              enableEnhancedTooltip={true}
            />
          </ReferenceManagerProvider>
        </div>
      </section>

      {/* 测试Markdown模式 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Markdown模式测试</h2>
        <p className="text-muted-foreground">
          测试markdown模式下的ref tooltip和跳转功能
        </p>

        <ReferenceManagerProvider contentId="test-markdown">
          <EnhancedContentReader
            content={markdownContent}
            contentId="test-markdown"
            className="border rounded-lg p-4"
          />
        </ReferenceManagerProvider>

        {/* 测试引用渲染 */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">AI分析结果 (带引用)</h3>
          <ReferenceManagerProvider contentId="test-markdown">
            <MarkdownRenderer
              content="文档的第一节和第二节提供了理论基础，第三节展示了实践应用。"
              ref="1,2,3"
              contentId="test-markdown"
              enableEnhancedTooltip={true}
            />
          </ReferenceManagerProvider>
        </div>
      </section>

      {/* 使用说明 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">测试说明</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>悬浮测试：</strong>{" "}
            将鼠标悬停在引用编号上，应该显示增强的tooltip
          </p>
          <p>
            • <strong>点击测试：</strong>{" "}
            点击引用编号，应该跳转到对应的段落并高亮显示
          </p>
          <p>
            • <strong>自动清除：</strong> 高亮效果会在4秒后自动清除
          </p>
          <p>
            • <strong>缓存测试：</strong>{" "}
            tooltip数据会被缓存，再次悬停应该更快显示
          </p>
          <p>
            • <strong>错误处理：</strong> 无效的引用编号会显示适当的错误信息
          </p>
        </div>
      </section>
    </div>
  );
}
