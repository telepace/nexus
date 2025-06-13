"use client";

import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

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

export default function TestMarkdownPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
    </div>
  );
}
