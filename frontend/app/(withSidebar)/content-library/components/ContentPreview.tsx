"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import type { ContentItemPublic } from "@/lib/api/content";
import { ContentAnalysisView } from "@/components/ai/ContentAnalysisView";
import {
  contentDataManager,
  ContentData,
} from "@/lib/services/content-data-manager";
import { useAuth } from "@/lib/client-auth";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = memo<Props>(({ item }) => {
  const { user } = useAuth();
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);

  // 🎯 优化的数据获取逻辑 - 防抖和缓存
  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function fetchPreviewData() {
      if (!item?.id || !user?.token) {
        if (!cancelled) {
          setContentData(null);
          setLoading(false);
        }
        return;
      }

      // 防抖处理：延迟200ms执行，避免快速切换时的多次请求
      timeoutId = setTimeout(async () => {
        if (cancelled) return;

        try {
          // 只在需要时显示loading状态
          setLoading(true);
          
          // 🎯 Preview模式：禁用对话历史和实时更新，提升性能
          const data = await contentDataManager.getPreviewData(item.id, { 
            includeConversations: false  // 禁用对话历史减少数据量
          });
          if (!cancelled) {
            setContentData(data);
            setLoading(false);
          }
        } catch (error) {
          if (!cancelled) {
            console.error("Failed to fetch preview data:", error);
            setContentData(null);
            setLoading(false);
          }
        }
      }, 200);
    }

    fetchPreviewData();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [item?.id, user?.token]);

  // 🎯 稳定化props，避免不必要的重渲染
  const aiResult = useMemo(() => {
    return contentData?.analysisResult ||
      (item ? (item as unknown as { ai_result?: unknown }).ai_result : null);
  }, [contentData?.analysisResult, item]);

  const conversations = useMemo(() => {
    return contentData?.conversations || [];
  }, [contentData?.conversations]);

  const contentId = useMemo(() => item?.id, [item?.id]);

  return (
    <div className="relative z-20 h-full preview-container flex flex-col overflow-hidden">
      <ReferenceManagerProvider contentId={contentId}>
        <ContentAnalysisView
          item={item}
          analysisResult={aiResult}
          conversations={conversations}
          isLoading={loading}
          variant="preview"
          scene="preview"
          hideHeader={false}
          headerTitle="Preview"
          emptyStateText="点击内容卡片查看预览"
          className="rounded-md"
        />
      </ReferenceManagerProvider>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数：只有在item的id或核心属性变化时才重新渲染
  return prevProps.item?.id === nextProps.item?.id &&
         prevProps.item?.title === nextProps.item?.title &&
         prevProps.item?.content_text === nextProps.item?.content_text;
});
