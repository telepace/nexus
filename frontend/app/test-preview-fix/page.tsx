"use client";

import React, { useState } from "react";
import { ContentPreview } from "@/app/[locale]/(withSidebar)/content-library/components/ContentPreview";
import type { ContentItemPublic } from "@/lib/api/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// 模拟测试数据
const mockContentItem: ContentItemPublic = {
  id: "test-preview-123",
  title: "测试预览引用功能",
  summary: "这是一个用于测试 Content Library 预览功能的模拟内容项目。",
  content_text: "这是内容的详细文本...",
  source_uri: "https://example.com/test",
  type: "url",
  processing_status: "completed",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  user_id: "user-123",
  meta_info: null,
  error_message: null,
};

export default function TestPreviewFixPage() {
  const [selectedItem, setSelectedItem] = useState<ContentItemPublic | null>(
    null,
  );

  return (
    <div className="container mx-auto p-6 h-screen flex gap-6">
      {/* 左侧控制面板 */}
      <div className="w-1/3">
        <Card>
          <CardHeader>
            <CardTitle>预览功能测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              点击下面的按钮测试 ContentPreview 组件的引用悬浮功能。
            </p>

            <div className="space-y-2">
              <Button
                onClick={() => setSelectedItem(mockContentItem)}
                variant="outline"
                className="w-full"
              >
                加载测试内容
              </Button>

              <Button
                onClick={() => setSelectedItem(null)}
                variant="outline"
                className="w-full"
              >
                清除内容
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>测试要点：</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>ReferenceManagerProvider 是否正确包装</li>
                <li>contentDataManager.getPreviewData 是否获取对话历史</li>
                <li>ContentAnalysisView 在 preview 场景是否正常工作</li>
                <li>引用组件是否自动加载并显示悬浮卡片</li>
              </ul>
            </div>

            {selectedItem && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ 内容已加载：{selectedItem.title}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 右侧预览面板 */}
      <div className="flex-1 bg-muted/20 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">ContentPreview 测试区域</h3>
        <div className="h-full">
          <ContentPreview item={selectedItem} />
        </div>
      </div>
    </div>
  );
}
