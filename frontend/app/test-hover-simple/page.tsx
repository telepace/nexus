"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HoverableBlock,
  NotionStyleBlock,
} from "@/components/ui/HoverableBlock";
import { GripVertical, Copy, Lightbulb } from "lucide-react";

export default function TestHoverSimplePage() {
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
            <CardTitle>简化版悬浮效果测试</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              这个页面测试基础的悬浮效果是否正常工作
            </p>
          </CardContent>
        </Card>

        {/* 直接使用CSS类测试 */}
        <Card>
          <CardHeader>
            <CardTitle>直接CSS类测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg hover-optimized hover-subtle">
              <p>这个块使用 hover-subtle 类</p>
            </div>

            <div className="p-4 border rounded-lg hover-optimized hover-medium">
              <p>这个块使用 hover-medium 类</p>
            </div>

            <div className="p-4 border rounded-lg hover-optimized hover-strong">
              <p>这个块使用 hover-strong 类</p>
            </div>
          </CardContent>
        </Card>

        {/* 传统hover测试 */}
        <Card>
          <CardHeader>
            <CardTitle>传统Hover测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg transition-all duration-200 hover:bg-muted/30 hover:border-muted-foreground/10">
              <p>传统hover - 微妙效果</p>
            </div>

            <div className="p-4 border rounded-lg transition-all duration-200 hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
              <p>传统hover - 中等效果</p>
            </div>

            <div className="p-4 border rounded-lg transition-all duration-300 hover:bg-muted/70 hover:border-muted-foreground/30 hover:shadow-md hover:scale-[1.01]">
              <p>传统hover - 强烈效果</p>
            </div>
          </CardContent>
        </Card>

        {/* HoverableBlock组件测试 */}
        <Card>
          <CardHeader>
            <CardTitle>HoverableBlock组件测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <HoverableBlock
              hoverIntensity="subtle"
              className="p-4 border rounded-lg"
            >
              <p>HoverableBlock - 微妙效果</p>
            </HoverableBlock>

            <HoverableBlock
              hoverIntensity="medium"
              className="p-4 border rounded-lg"
            >
              <p>HoverableBlock - 中等效果</p>
            </HoverableBlock>

            <HoverableBlock
              hoverIntensity="strong"
              className="p-4 border rounded-lg"
            >
              <p>HoverableBlock - 强烈效果</p>
            </HoverableBlock>
          </CardContent>
        </Card>

        {/* NotionStyleBlock测试 */}
        <Card>
          <CardHeader>
            <CardTitle>NotionStyleBlock测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NotionStyleBlock
              leftActions={leftActions}
              rightActions={rightActions}
            >
              <h3 className="text-lg font-semibold mb-2">Notion风格块 1</h3>
              <p className="text-muted-foreground">
                悬停时应该在左侧显示拖拽句柄，右侧显示操作按钮
              </p>
            </NotionStyleBlock>

            <NotionStyleBlock
              leftActions={leftActions}
              rightActions={rightActions}
            >
              <p>Notion风格块 2 - 简单文本内容</p>
            </NotionStyleBlock>
          </CardContent>
        </Card>

        {/* CSS变量检查 */}
        <Card>
          <CardHeader>
            <CardTitle>CSS变量检查</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="p-2 bg-muted rounded">--muted</div>
                <div className="p-2 bg-muted-foreground text-muted rounded mt-2">
                  --muted-foreground
                </div>
              </div>
              <div>
                <div className="p-2 bg-background border rounded">
                  --background
                </div>
                <div className="p-2 bg-foreground text-background rounded mt-2">
                  --foreground
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              如果这些颜色显示正确，说明CSS变量已正确加载
            </p>
          </CardContent>
        </Card>

        {/* 调试信息 */}
        <Card>
          <CardHeader>
            <CardTitle>调试信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>✅ 如果悬浮效果正常工作，您应该看到：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>鼠标悬停时背景颜色变化</li>
                <li>边框颜色变化</li>
                <li>阴影效果（中等和强烈）</li>
                <li>轻微的缩放效果（强烈）</li>
                <li>Notion风格块的操作按钮出现</li>
              </ul>

              <p className="mt-4">❌ 如果没有效果，可能的问题：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>CSS变量未正确定义</li>
                <li>Tailwind配置问题</li>
                <li>CSS未正确编译</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
