"use client";

import React, { memo, useMemo } from "react";
import { ContentItemPublic, AIResult } from "@/lib/api/content";
import { AnalysisCardsContainer } from "./AnalysisCardsContainer";
import { adaptAnalysisData } from "./AnalysisCards";

interface StaticPreviewInterfaceProps {
  content: ContentItemPublic | null;
  analysisResult?: AIResult | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * 🎯 静态预览组件 - 专为预览模式设计，无交互，无状态变化
 *
 * 特点：
 * 1. 纯展示，不包含任何交互逻辑
 * 2. 使用 memo 优化，减少不必要的重渲染
 * 3. 不依赖复杂的状态管理
 * 4. 轻量级，性能优先
 */
export const StaticPreviewInterface = memo<StaticPreviewInterfaceProps>(
  ({ content, analysisResult, isLoading = false, className = "" }) => {
    // 构建静态卡片数据
    const cards = useMemo(() => {
      if (!analysisResult || !content) return [];

      const metaInfo = content.meta_info ? JSON.parse(content.meta_info) : null;
      const adaptedData = adaptAnalysisData(analysisResult, metaInfo);

      const cardList = [];

      // 内容摘要卡片
      if (adaptedData.summary) {
        cardList.push({
          id: "summary",
          title: "内容摘要",
          subtitle: "核心内容提炼",
          emoji: "📝",
          content: {
            type: "summary",
            data: adaptedData.summary,
          },
        });
      }

      // 要点列表卡片
      if (adaptedData.keyPoints?.length) {
        cardList.push({
          id: "keyPoints",
          title: "关键要点",
          subtitle: `${adaptedData.keyPoints.length}个要点`,
          emoji: "🎯",
          content: {
            type: "keyPoints",
            data: adaptedData.keyPoints,
          },
        });
      }

      return cardList;
    }, [analysisResult, content]);

    // 如果没有内容，显示空状态
    if (!content) {
      return (
        <div
          className={`flex-1 flex items-center justify-center text-gray-500 ${className}`}
        >
          <div className="text-center">
            <p className="text-sm">选择内容查看预览</p>
          </div>
        </div>
      );
    }

    // 如果正在加载，显示加载状态（但不要闪烁）
    if (isLoading) {
      return (
        <div className={`flex-1 flex items-center justify-center ${className}`}>
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`w-full ${className}`}>
        <div className="px-8 py-6">
          {/* 🎯 静态分析卡片容器 - 只显示，不交互 */}
          <AnalysisCardsContainer
            cards={cards}
            content={content}
            variant="preview"
            onExpandLine={() => {}} // 预览模式禁用展开
            collapsedCards={new Set()} // 预览模式不需要折叠状态
            onToggleCardCollapse={() => {}} // 预览模式禁用折叠
            selectedBlock={null}
            onBlockSelect={() => {}} // 预览模式禁用选择
            hasActiveConversations={false} // 预览模式没有对话
          />
        </div>
      </div>
    );
  },
);

StaticPreviewInterface.displayName = "StaticPreviewInterface";
