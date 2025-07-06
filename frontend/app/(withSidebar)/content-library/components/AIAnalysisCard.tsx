"use client";

import { AIAnalysisDisplay } from "@/components/ai/AIAnalysisDisplay";
import type { ContentItemPublic } from "../types";

interface Props {
  analysis: ContentItemPublic["ai_analysis"];
  className?: string;
}

/**
 * 内容库专用的 AI 分析展示组件
 * 基于新的统一架构，提供简洁的只读展示
 */
export const AIAnalysisCard = ({ analysis, className }: Props) => {
  // 处理分析内容，确保传递正确的格式
  const analysisContent = typeof analysis === 'string' 
    ? analysis 
    : analysis 
      ? JSON.stringify(analysis, null, 2)
      : '';

  return (
    <AIAnalysisDisplay 
      title="AI 分析结果"
      content={analysisContent}
      className={className}
    />
  );
};
