"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedReferenceIndicator } from "@/components/ui/OptimizedReferenceIndicator";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function TestOptimizedReferencePage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 页面标题 */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              引用悬浮预览功能测试
            </h1>
            <p className="text-muted-foreground">
              悬浮在引用按钮上查看原始内容预览小窗
            </p>
          </div>

          {/* 功能演示 */}
          <div className="grid gap-6">
            {/* 单个引用示例 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">单个引用示例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  在讨论人工智能发展时，我们需要考虑其对社会的深远影响
                  <OptimizedReferenceIndicator
                    refString="5"
                    contentId="test-content-1"
                    variant="tooltip"
                  />
                  。这种技术变革不仅改变了我们的工作方式，也重新定义了人类与机器的关系。
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 悬浮在 [5] 上查看第5段的原始内容预览
                </p>
              </CardContent>
            </Card>

            {/* 多个引用示例 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">多个引用示例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  研究表明，气候变化对全球生态系统产生了显著影响
                  <OptimizedReferenceIndicator
                    refString="12,15,18"
                    contentId="test-content-2"
                    variant="tooltip"
                  />
                  ，包括海平面上升、极端天气频发等现象。
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 悬浮在 [12,15,18] 上查看多个段落的内容预览
                </p>
              </CardContent>
            </Card>

            {/* 连续引用示例 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">连续引用示例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  现代教育体系面临的挑战是多方面的
                  <OptimizedReferenceIndicator
                    refString="23,24,25,26,27"
                    contentId="test-content-3"
                    variant="tooltip"
                  />
                  ，需要从技术、方法和理念等多个维度进行改革。
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 悬浮在 [23-27] 上查看连续段落的内容预览
                </p>
              </CardContent>
            </Card>

            {/* Popover 版本示例 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Popover 版本示例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  数字化转型的核心在于重新思考业务流程
                  <OptimizedReferenceIndicator
                    refString="8,12,15"
                    contentId="test-content-4"
                    variant="popover"
                  />
                  ，而不仅仅是技术的升级换代。
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 点击 [8,12,15] 打开详细的引用预览窗口
                </p>
              </CardContent>
            </Card>

            {/* 简化版本示例 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">简化版本示例（无内容ID）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  这是一个没有具体内容ID的引用示例
                  <OptimizedReferenceIndicator
                    refString="42"
                    variant="simple"
                  />
                  ，只显示基本的引用信息。
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 这种情况下只显示基本的引用提示
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 功能说明 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                ✨ 功能特性
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">悬浮预览</h4>
                  <p className="text-sm text-muted-foreground">
                    鼠标悬浮在引用按钮上即可查看原始段落内容预览
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">智能高亮</h4>
                  <p className="text-sm text-muted-foreground">
                    悬浮时自动高亮对应的原文段落（如果可见）
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">一键跳转</h4>
                  <p className="text-sm text-muted-foreground">
                    点击引用按钮可直接跳转到对应的原文段落
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">智能标签</h4>
                  <p className="text-sm text-muted-foreground">
                    自动识别连续引用并显示为区间格式（如 [23-27]）
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
} 