"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Copy, Lightbulb, RefreshCw } from "lucide-react";

// 动态导入组件，避免预渲染问题
import dynamic from "next/dynamic";

const HoverableBlock = dynamic(
  () =>
    import("@/components/ui/HoverableBlock").then((mod) => ({
      default: mod.HoverableBlock,
    })),
  { ssr: false },
);

const NotionStyleBlock = dynamic(
  () =>
    import("@/components/ui/HoverableBlock").then((mod) => ({
      default: mod.NotionStyleBlock,
    })),
  { ssr: false },
);

const SimpleHoverBlock = dynamic(
  () =>
    import("@/components/ui/HoverableBlock").then((mod) => ({
      default: mod.SimpleHoverBlock,
    })),
  { ssr: false },
);

const UnifiedJsonlRenderer = dynamic(
  () =>
    import("@/components/ui/UnifiedJsonlRenderer").then((mod) => ({
      default: mod.UnifiedJsonlRenderer,
    })),
  { ssr: false },
);

const JsonlRenderer = dynamic(
  () =>
    import("@/components/ui/JsonlRenderer").then((mod) => ({
      default: mod.JsonlRenderer,
    })),
  { ssr: false },
);

const StreamingJsonlRenderer = dynamic(
  () =>
    import("@/components/ui/StreamingJsonlRenderer").then((mod) => ({
      default: mod.StreamingJsonlRenderer,
    })),
  { ssr: false },
);

const testJsonlContent = `{"type": "h2", "content": "AI产品设计原则"}
{"type": "p", "content": "最好的AI产品设计是让用户感受不到AI的存在，技术应该像空气一样自然融入用户的工作流程中。"}
{"type": "insight", "content": "当用户专注于完成任务时，AI在背后默默地提供智能支持。", "ref": "1,2"}
{"type": "list", "content": "渐进式智能披露\\n避免认知过载\\n精心设计的信息架构"}`;

export default function TestHoverFixPage() {
  const [selectedRenderer, setSelectedRenderer] = useState<
    "unified" | "jsonl" | "streaming"
  >("unified");
  const [enableHover, setEnableHover] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                加载中...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const leftActions = (
    <button className="w-5 h-5 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 rounded transition-all">
      <GripVertical className="w-3.5 h-3.5" />
    </button>
  );

  const rightActions = (
    <div className="flex items-center gap-2">
      <button className="w-5 h-5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-border hover:shadow-sm transition-all duration-200">
        <Copy className="w-3 h-3 text-muted-foreground" />
      </button>
      <button className="w-5 h-5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background hover:border-border hover:shadow-sm transition-all duration-200">
        <Lightbulb className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              AI分析模块悬浮效果修复测试
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableHover}
                    onChange={(e) => setEnableHover(e.target.checked)}
                    className="rounded"
                  />
                  启用悬浮效果
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={
                    selectedRenderer === "unified" ? "default" : "outline"
                  }
                  onClick={() => setSelectedRenderer("unified")}
                  size="sm"
                >
                  统一渲染器
                </Button>
                <Button
                  variant={selectedRenderer === "jsonl" ? "default" : "outline"}
                  onClick={() => setSelectedRenderer("jsonl")}
                  size="sm"
                >
                  JSONL渲染器
                </Button>
                <Button
                  variant={
                    selectedRenderer === "streaming" ? "default" : "outline"
                  }
                  onClick={() => setSelectedRenderer("streaming")}
                  size="sm"
                >
                  流式渲染器
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HoverableBlock 基础测试 */}
        <Card>
          <CardHeader>
            <CardTitle>HoverableBlock 基础测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="outline" className="mb-2">
                微妙效果 (subtle)
              </Badge>
              <HoverableBlock
                enableHover={enableHover}
                hoverIntensity="subtle"
                className="p-4 border rounded-lg"
              >
                这是一个微妙的悬浮效果示例。将鼠标悬停在这里查看效果。
              </HoverableBlock>
            </div>

            <div>
              <Badge variant="outline" className="mb-2">
                中等效果 (medium)
              </Badge>
              <HoverableBlock
                enableHover={enableHover}
                hoverIntensity="medium"
                className="p-4 border rounded-lg"
              >
                这是一个中等的悬浮效果示例。将鼠标悬停在这里查看效果。
              </HoverableBlock>
            </div>

            <div>
              <Badge variant="outline" className="mb-2">
                强烈效果 (strong)
              </Badge>
              <HoverableBlock
                enableHover={enableHover}
                hoverIntensity="strong"
                className="p-4 border rounded-lg"
              >
                这是一个强烈的悬浮效果示例。将鼠标悬停在这里查看效果。
              </HoverableBlock>
            </div>
          </CardContent>
        </Card>

        {/* NotionStyleBlock 测试 */}
        <Card>
          <CardHeader>
            <CardTitle>Notion风格块测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NotionStyleBlock
              leftActions={leftActions}
              rightActions={rightActions}
            >
              <h3 className="text-lg font-semibold mb-2">
                这是一个Notion风格的块
              </h3>
              <p className="text-muted-foreground">
                悬停时会在左侧显示拖拽句柄，右侧显示操作按钮。这模拟了Notion编辑器的交互体验。
              </p>
            </NotionStyleBlock>

            <NotionStyleBlock
              leftActions={leftActions}
              rightActions={rightActions}
            >
              <p>另一个示例块。每个块都有独立的悬浮效果，不会相互干扰。</p>
            </NotionStyleBlock>
          </CardContent>
        </Card>

        {/* JSONL渲染器测试 */}
        <Card>
          <CardHeader>
            <CardTitle>JSONL渲染器悬浮效果测试</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRenderer === "unified" && (
              <UnifiedJsonlRenderer
                content={testJsonlContent}
                enableHoverEffects={enableHover}
                styleName="notebook"
                showReferenceIndicators={true}
              />
            )}

            {selectedRenderer === "jsonl" && (
              <JsonlRenderer
                content={testJsonlContent}
                enableHoverEffects={enableHover}
                styleName="notebook"
                showReferenceIndicators={true}
              />
            )}

            {selectedRenderer === "streaming" && (
              <StreamingJsonlRenderer
                content={testJsonlContent}
                enableHoverEffects={enableHover}
                isLoading={false}
              />
            )}
          </CardContent>
        </Card>

        {/* 简化版悬浮块测试 */}
        <Card>
          <CardHeader>
            <CardTitle>简化版悬浮块测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SimpleHoverBlock
              intensity="subtle"
              className="p-4 border rounded-lg"
            >
              简化版悬浮块 - 微妙效果
            </SimpleHoverBlock>

            <SimpleHoverBlock
              intensity="medium"
              className="p-4 border rounded-lg"
            >
              简化版悬浮块 - 中等效果
            </SimpleHoverBlock>

            <SimpleHoverBlock
              intensity="strong"
              className="p-4 border rounded-lg"
            >
              简化版悬浮块 - 强烈效果
            </SimpleHoverBlock>
          </CardContent>
        </Card>

        {/* 测试结果说明 */}
        <Card>
          <CardHeader>
            <CardTitle>测试说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✅ 如果悬浮效果正常工作，您应该能看到：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>鼠标悬停时背景颜色变化</li>
                <li>Notion风格块的左右操作按钮出现</li>
                <li>JSONL渲染器中每个块的悬浮效果</li>
                <li>平滑的动画过渡</li>
              </ul>

              <p className="mt-4">❌ 如果悬浮效果不工作，可能的问题：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>enableHoverEffects 被设置为 false</li>
                <li>CSS 样式没有正确加载</li>
                <li>组件没有正确导入</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
