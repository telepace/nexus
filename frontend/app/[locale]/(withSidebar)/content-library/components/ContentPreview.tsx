"use client";

import React, { useState, useEffect } from "react";
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

export const ContentPreview = ({ item }: Props) => {
  const { user } = useAuth();
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔍 ContentPreview 渲染追踪日志
  const previewRenderCount = React.useRef(0);
  const prevPreviewState = React.useRef<Record<string, unknown>>({});

  previewRenderCount.current += 1;

  React.useEffect(() => {
    const currentState = {
      itemId: item?.id,
      hasUser: !!user?.token,
      loading,
      hasContentData: !!contentData,
      contentDataId: contentData?.item?.id,
    };

    const changes = Object.keys(currentState).filter(
      (key) => prevPreviewState.current[key] !== currentState[key],
    );

    console.log(`🖼️ ContentPreview render #${previewRenderCount.current}:`, {
      ...currentState,
      changes: changes.length > 0 ? changes : "no state changes",
      timestamp: new Date().toISOString().split("T")[1],
      // 特别关注loading状态变化
      loadingChange:
        prevPreviewState.current.loading !== loading
          ? `${prevPreviewState.current.loading} → ${loading}`
          : null,
    });

    prevPreviewState.current = currentState;
  });

  // 🎯 优化数据获取 - 稳定的防抖机制，彻底解决loading状态闪烁问题
  useEffect(() => {
    let cancelled = false;
    let fetchTimer: NodeJS.Timeout | null = null;

    async function fetchPreviewData() {
      if (!item?.id || !user?.token) {
        if (!cancelled) {
          setContentData(null);
          setLoading(false);
        }
        return;
      }

      try {
        // 🎯 关键修复：只有在数据获取超过500ms时才显示loading，避免闪烁
        const startTime = Date.now();

        // 使用preview模式，只获取基本数据，不加载对话历史
        const data = await contentDataManager.getPreviewData(item.id);

        if (!cancelled) {
          const elapsed = Date.now() - startTime;

          // 如果数据获取很快（<300ms），不显示loading状态，直接设置数据
          if (elapsed < 300) {
            setContentData(data);
            setLoading(false);
          } else {
            // 长时间请求才设置loading状态
            setLoading(true);
            // 使用requestAnimationFrame确保状态更新的顺序
            requestAnimationFrame(() => {
              if (!cancelled) {
                setContentData(data);
                setLoading(false);
              }
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch preview data:", error);
          setContentData(null);
          setLoading(false);
        }
      }
    }

    // 🎯 增加防抖延迟到300ms，减少快速切换时的重复请求
    fetchTimer = setTimeout(fetchPreviewData, 300);

    return () => {
      cancelled = true;
      if (fetchTimer) {
        clearTimeout(fetchTimer);
      }
    };
  }, [item?.id, user?.token]);

  return (
    <div className="relative z-20 h-full shadow-macos-window linear-bg-1 rounded-sm flex flex-col overflow-hidden">
      <ReferenceManagerProvider contentId={item?.id}>
        <ContentAnalysisView
          key={item?.id} // 🎯 关键修复：强制重新挂载，彻底隔离不同文章的状态
          item={item}
          analysisResult={contentData?.analysisResult}
          conversations={contentData?.conversations || []} // 🎯 修复：包含对话历史以支持引用功能
          isLoading={loading}
          variant="preview"
          scene="preview" // 🎯 明确指定为预览场景，确保状态隔离
          hideHeader={false}
          headerTitle="Preview"
          emptyStateText="点击内容卡片查看预览"
          className="rounded-sm"
        />
      </ReferenceManagerProvider>
    </div>
  );
};
