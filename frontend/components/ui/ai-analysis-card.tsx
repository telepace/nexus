"use client";

import React, { useMemo } from "react";
import { UnifiedAIAnalysisCard } from "@/components/ai/UnifiedAIAnalysisCard";
import { AIAnalysisConfig } from "@/hooks/use-ai-analysis";

export interface AIAnalysisCardProps {
  /** 分析标题 */
  title: string;
  /** 分析指令 */
  userContent: string;
  /** 原文内容（当没有 contentId 时使用） */
  systemPrompt?: string;
  /** 内容 ID */
  contentId?: string;
  /** API 端点 */
  api?: string;
  /** 模型选择 */
  model?: string;
  /** 是否启用 Markdown 渲染 */
  enableMarkdown?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 是否显示控制按钮 */
  showControls?: boolean;
  /** 完成回调 */
  onComplete?: (result: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * @deprecated 推荐使用 UnifiedAIAnalysisCard 组件
 * 保留此组件用于向后兼容，内部基于新的统一架构实现
 */
export function AIAnalysisCard({
  title,
  userContent,
  systemPrompt = "",
  contentId,
  api,
  model = "or-llama-3-1-8b-instruct",
  enableMarkdown = true,
  className,
  showControls = true,
  onComplete,
  onError,
}: AIAnalysisCardProps) {
  
  // 根据参数构建配置
  const config: AIAnalysisConfig = useMemo(() => {
    if (contentId) {
      // 内容分析模式
      return {
        mode: "content",
        contentId,
        model,
        apiEndpoint: api,
        enableRetry: true,
        maxRetries: 3,
      };
    } else {
      // 通用聊天模式
      return {
        mode: "chat",
        systemPrompt,
        model,
        apiEndpoint: api,
        enableRetry: true,
        maxRetries: 3,
      };
    }
  }, [contentId, systemPrompt, model, api]);

  // 确定渲染类型
  const renderType = enableMarkdown ? "auto" : "universal";

  return (
    <UnifiedAIAnalysisCard
      title={title}
      instruction={userContent}
      config={config}
      className={className}
      showControls={showControls}
      renderType={renderType}
      onComplete={onComplete}
      onError={onError}
    />
  );
}
