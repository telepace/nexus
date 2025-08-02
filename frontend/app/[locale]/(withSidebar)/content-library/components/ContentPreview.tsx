"use client";

import React, { useState, useEffect } from "react";
import type { ContentItemPublic } from "@/lib/api/content";
import { ContentAnalysisView } from "@/components/ai/ContentAnalysisView";
import { contentDataManager, ContentData } from "@/lib/services/content-data-manager";
import { useAuth } from "@/lib/client-auth";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  const { user } = useAuth();
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);

  // 优化数据获取 - 使用智能数据管理器的preview模式
  useEffect(() => {
    async function fetchPreviewData() {
      if (!item?.id || !user?.token) {
        setContentData(null);
        return;
      }

      try {
        setLoading(true);
        
        // 使用preview模式，只获取基本数据，不加载对话历史
        const data = await contentDataManager.getPreviewData(item.id);
        setContentData(data);
        
      } catch (error) {
        console.error("Failed to fetch preview data:", error);
        setContentData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPreviewData();
  }, [item?.id, user?.token]);

  return (
    <div className="relative z-20 h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden">
      <ContentAnalysisView
        item={item}
        analysisResult={contentData?.analysisResult}
        conversations={[]} // Preview模式不显示对话历史
        isLoading={loading}
        variant="preview"
        hideHeader={false}
        headerTitle="Preview"
        emptyStateText="点击内容卡片查看预览"
        className="rounded-sm"
      />
    </div>
  );
};
