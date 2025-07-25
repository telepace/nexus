"use client";

import React from "react";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { UnifiedJsonlRenderer } from "@/components/ui/UnifiedJsonlRenderer";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const testJsonlContent = `{"t":"h2","c":"测试标题"}
{"t":"p","c":"这是一个普通段落，应该有悬浮效果。"}
{"t":"insight","c":"这是一个洞察块，应该有不同的样式和悬浮效果。"}
{"t":"list","c":"项目1,项目2,项目3"}
{"t":"p","c":"另一个段落，用于测试悬浮效果的一致性。","ref":"1,2"}`;

export default function TestJsonlHoverPage() {
  const handleExpandLine = (jsonContent: Record<string, unknown>) => {
    console.log("展开请求:", jsonContent);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">JSONL 悬浮效果测试</h1>
        <p className="text-muted-foreground">
          测试各个 JSONL 渲染器的块级悬浮效果
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* JsonlRenderer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📝 JsonlRenderer
              <span className="text-sm font-normal text-muted-foreground">
                基础渲染器
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JsonlRenderer
              content={testJsonlContent}
              enableHoverEffects={true}
              onExpandLine={handleExpandLine}
              showReferenceIndicators={true}
            />
          </CardContent>
        </Card>

        {/* UnifiedJsonlRenderer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 UnifiedJsonlRenderer
              <span className="text-sm font-normal text-muted-foreground">
                统一渲染器
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedJsonlRenderer
              content={testJsonlContent}
              enableHoverEffects={true}
              onExpandLine={handleExpandLine}
              showReferenceIndicators={true}
            />
          </CardContent>
        </Card>

        {/* StreamingJsonlRenderer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚡ StreamingJsonlRenderer
              <span className="text-sm font-normal text-muted-foreground">
                流式渲染器
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StreamingJsonlRenderer
              content={testJsonlContent}
              enableHoverEffects={true}
              isLoading={false}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🧪 使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">测试步骤：</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>将鼠标悬浮在各个文本块上</li>
              <li>观察是否出现背景色变化</li>
              <li>检查右侧是否显示操作按钮</li>
              <li>点击💭按钮测试展开功能</li>
              <li>点击复制按钮测试复制功能</li>
              <li>观察引用指示器是否正确显示</li>
            </ol>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-blue-400">
            <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">预期效果：</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>每个文本块都应该有subtle级别的悬浮效果</li>
              <li>悬浮时右侧显示操作按钮</li>
              <li>有引用的块显示引用指示器</li>
              <li>动画应该流畅，无卡顿</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 