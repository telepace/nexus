"use client";

import React, { useMemo } from "react";
import { Library } from "lucide-react";
import { useI18nSafe } from "@/lib/i18n-fallback";
import type { ContentItemPublic } from "@/lib/api/content";
import { AIResult } from "@/lib/api/content";
import { OptimizedUniversalContentRenderer } from "@/components/ui/OptimizedUniversalContentRenderer";
import { adaptAnalysisData } from "./AnalysisCards";
import { cn } from "@/lib/utils";

interface LightweightPreviewAnalysisProps {
  /** 内容项 */
  item: ContentItemPublic | null;
  /** AI分析结果 */
  analysisResult?: AIResult | null;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 头部标题 */
  headerTitle?: string;
  /** 空状态提示文本 */
  emptyStateText?: string;
  /** 是否隐藏头部 */
  hideHeader?: boolean;
  /** 是否显示头部边框 */
  showHeaderBorder?: boolean;
  /** 是否显示头部标题 */
  showHeaderTitle?: boolean;
}

/**
 * 轻量级Preview分析组件
 * 专为Preview模式优化，避免加载完整的EnhancedModernAnalysisInterface
 * 不包含交互功能、动画效果和事件监听器
 */
export const LightweightPreviewAnalysis: React.FC<
  LightweightPreviewAnalysisProps
> = ({
  item,
  analysisResult = null,
  isLoading = false,
  className = "",
  headerTitle,
  emptyStateText,
  hideHeader = false,
  showHeaderBorder = true,
  showHeaderTitle = true,
}) => {
  const { t } = useI18nSafe();

  // 使用翻译的默认值
  const defaultHeaderTitle = headerTitle || t("analysis.contentAnalysis");
  const defaultEmptyStateText =
    emptyStateText || t("analysis.selectContentForPreview");

  // 简化的分析数据适配
  const analysisData = useMemo(() => {
    if (!analysisResult || !item) return null;

    const metaInfo = item.meta_info ? JSON.parse(item.meta_info) : null;
    return adaptAnalysisData(analysisResult, metaInfo);
  }, [analysisResult, item]);

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {!hideHeader && (
          <div
            className={`flex items-center h-header px-4 flex-shrink-0 ${showHeaderBorder ? "border-b" : ""}`}
          >
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-muted-foreground" />
              {showHeaderTitle && (
                <span className="text-sm font-medium text-muted-foreground">
                  {defaultHeaderTitle}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 p-6 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // 空状态渲染
  if (!item) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {!hideHeader && (
          <div
            className={`flex items-center h-header px-4 flex-shrink-0 ${showHeaderBorder ? "border-b" : ""}`}
          >
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-muted-foreground" />
              {showHeaderTitle && (
                <span className="text-sm font-medium text-muted-foreground">
                  {defaultHeaderTitle}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Library className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-muted-foreground">
                {defaultEmptyStateText}
              </h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                在左侧列表中选择或悬停内容项目来查看详细信息
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 主内容渲染
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 头部 */}
      {!hideHeader && (
        <div
          className={`flex items-center justify-between h-header px-4 flex-shrink-0 ${showHeaderBorder ? "border-b" : ""}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Library className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {showHeaderTitle && (
              <span className="text-sm font-medium text-muted-foreground truncate">
                预览: {item.title || "未知内容"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* 内容标题 */}
        <div>
          <h1 className="text-xl font-medium text-foreground line-clamp-2 mb-2">
            {item.title || "内容分析"}
          </h1>
          {item.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.summary}
            </p>
          )}
        </div>

        {/* 分析结果 */}
        {analysisData && (
          <div className="space-y-4">
            {/* 内容摘要 */}
            {analysisData.summary && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                  📝 <span>内容摘要</span>
                </h2>
                <div className="bg-muted/20 rounded-lg p-4">
                  <OptimizedUniversalContentRenderer
                    content={
                      typeof analysisData.summary === "string"
                        ? analysisData.summary
                        : JSON.stringify(analysisData.summary)
                    }
                    mode="preview"
                    enableHoverEffects={false}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* 关键要点 */}
            {analysisData.keyPoints && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                  🤔 <span>提问清单</span>
                </h2>
                <div className="bg-muted/20 rounded-lg p-4">
                  <OptimizedUniversalContentRenderer
                    content={
                      typeof analysisData.keyPoints === "string"
                        ? analysisData.keyPoints
                        : JSON.stringify(analysisData.keyPoints)
                    }
                    mode="preview"
                    enableHoverEffects={false}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* 元数据 */}
            {analysisData.metadata && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                  📊 <span>内容信息</span>
                </h2>
                <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                  {analysisData.metadata.readingTime && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">阅读时间:</span>
                      <span className="text-foreground">
                        {analysisData.metadata.readingTime} 分钟
                      </span>
                    </div>
                  )}
                  {analysisData.metadata.difficulty && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">难度等级:</span>
                      <span className="text-foreground">
                        {analysisData.metadata.difficulty}
                      </span>
                    </div>
                  )}
                  {analysisData.metadata.qualityScore && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">质量评分:</span>
                      <span className="text-foreground">
                        {analysisData.metadata.qualityScore}/10
                      </span>
                    </div>
                  )}
                  {analysisData.metadata.labels &&
                    analysisData.metadata.labels.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          标签:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {analysisData.metadata.labels.map((label, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 如果没有分析结果，显示基本信息 */}
        {!analysisData && (
          <div className="text-center py-8">
            <div className="space-y-2">
              <Library className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <h3 className="text-sm font-medium text-muted-foreground">
                暂无分析结果
              </h3>
              <p className="text-xs text-muted-foreground/70">
                内容正在处理中或暂未生成分析数据
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
