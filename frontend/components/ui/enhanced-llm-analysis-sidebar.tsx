"use client";

import { FC, useEffect, useState, useCallback } from "react";
import { Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { LLMAnalysisCard } from "@/components/ui/llm-analysis-card";
import { PromptRecommendations } from "@/components/ui/prompt-recommendations";
import { PromptCommandDialog } from "@/components/ui/prompt-command-dialog";
import {
  useLLMAnalysisStore,
  LLMAnalysis,
  PromptRecommendation,
} from "@/lib/stores/llm-analysis-store";
import { useToast } from "@/hooks/use-toast";
import { Prompt } from "@/lib/api/services/prompts";
import { client } from "@/lib/api/client";

interface EnhancedLLMAnalysisSidebarProps {
  contentId: string;
  className?: string;
  contentText?: string;
  onLoaded?: () => void;
}

// 历史分析数据类型
interface HistoricalAnalysis {
  [key: string]: {
    analysis_result?: string;
    raw_text?: string;
    conversation_id?: string;
    created_at?: string;
    ai_model?: string;
    instruction?: string;
    meta_info?: unknown;
    analysis_type?: string;
    sequence?: number;
    summary?: {
      main_thesis?: string;
    };
    key_points?: {
      core_concepts?: Array<{ point: string; explanation?: string }>;
    };
  };
}

export const EnhancedLLMAnalysisSidebar: FC<
  EnhancedLLMAnalysisSidebarProps
> = ({ contentId, className = "", contentText = "", onLoaded }) => {
  // The sidebar will always show the analysis view, so a dedicated tab state is no longer necessary.
  const activeTab = "analysis" as const;
  const [historicalAnalyses, setHistoricalAnalyses] = useState<LLMAnalysis[]>(
    [],
  );
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  const {
    analyses,
    isGenerating,
    error,
    enabledPrompts,
    disabledPrompts,
    isLoadingPrompts,
    toggleExpanded,
    removeAnalysis,
    generateAnalysis,
    executeAnalysisWithContent,
    loadPrompts,
    setError,
    getAvailablePrompts,
    getPromptRecommendations,
  } = useLLMAnalysisStore();

  const { toast } = useToast();

  // 加载历史分析数据
  const loadHistoricalAnalyses = useCallback(async () => {
    try {
      setLoadingHistorical(true);

      // 获取内容详情，包含 ai_analysis 数据
      const contentData = await client.get<{
        ai_analysis?: HistoricalAnalysis;
      }>(`/api/v1/content/${contentId}`);

      if (contentData.ai_analysis) {
        const historicalData: LLMAnalysis[] = [];

        Object.entries(contentData.ai_analysis).forEach(
          ([key, value], index) => {
            if (value && (value.analysis_result || value.raw_text)) {
              const content = value.analysis_result || value.raw_text || "";

              // 确定分析类型
              let type: LLMAnalysis["type"] = "custom";
              if (
                key.includes("summarizer") ||
                value.analysis_type === "summarizer"
              ) {
                type = "summary";
              } else if (
                key.includes("key_points") ||
                value.analysis_type === "key_points_extractor"
              ) {
                type = "key_points";
              } else if (
                key.includes("insights") ||
                value.analysis_type === "insights"
              ) {
                type = "insights";
              } else if (
                key.includes("questions") ||
                value.analysis_type === "questions"
              ) {
                type = "questions";
              }

              // 生成标题
              let title = key.replace(/_\d+$/, "").replace(/_/g, " ");
              if (value.analysis_type) {
                const typeMap: Record<string, string> = {
                  summarizer: "智能摘要",
                  key_points_extractor: "关键要点",
                  insights: "深度洞察",
                  questions: "思考问题",
                  custom: "自定义分析",
                };
                title = typeMap[value.analysis_type] || title;
              }

              // 如果有序号，添加到标题
              if (value.sequence && value.sequence > 1) {
                title += ` (${value.sequence})`;
              }

              historicalData.push({
                id: `historical_${key}_${index}`,
                type,
                title,
                content,
                prompt: value.instruction || "",
                promptId: undefined,
                isExpanded: false,
                isLoading: false,
                created_at: value.created_at || new Date().toISOString(),
                contentId,
              });
            }
          },
        );

        // 按创建时间排序，最新的在前
        historicalData.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        setHistoricalAnalyses(historicalData);
      }
    } catch (error) {
      console.error("加载历史分析失败:", error);
      // 不显示错误 toast，静默失败
    } finally {
      setLoadingHistorical(false);
    }
  }, [contentId]);

  // 加载prompts和历史数据
  useEffect(() => {
    loadPrompts();
    loadHistoricalAnalyses();
  }, [loadPrompts, contentId, loadHistoricalAnalyses]);

  // 通知父布局：右栏已准备就绪
  useEffect(() => {
    if (!isLoadingPrompts && !loadingHistorical) {
      onLoaded?.();
    }
  }, [isLoadingPrompts, loadingHistorical, onLoaded]);

  // 调试信息
  useEffect(() => {
    console.log("[EnhancedLLMAnalysisSidebar] Prompts 状态更新:", {
      isLoadingPrompts,
      enabledPromptsCount: enabledPrompts?.length || 0,
      disabledPromptsCount: disabledPrompts?.length || 0,
      enabledPrompts,
      disabledPrompts,
      availablePrompts: getAvailablePrompts(),
      error,
    });
  }, [
    enabledPrompts,
    disabledPrompts,
    isLoadingPrompts,
    error,
    getAvailablePrompts,
  ]);

  // 过滤当前内容的分析（实时生成的）
  const contentAnalyses =
    analyses?.filter((analysis) => analysis?.contentId === contentId) || [];

  // 合并实时分析和历史分析
  const allAnalyses = [...contentAnalyses, ...historicalAnalyses];

  // 清理错误状态
  useEffect(() => {
    if (error) {
      toast({
        title: "操作失败",
        description: error,
        variant: "destructive",
      });
      setError(null);
    }
  }, [error, toast, setError]);

  // 处理分析卡片的展开/收起（支持历史分析）
  const handleToggleExpanded = (id: string) => {
    if (id.startsWith("historical_")) {
      // 处理历史分析的展开/收起
      setHistoricalAnalyses((prev) =>
        prev.map((analysis) =>
          analysis.id === id
            ? { ...analysis, isExpanded: !analysis.isExpanded }
            : analysis,
        ),
      );
    } else {
      // 处理实时分析的展开/收起
      toggleExpanded(id);
    }
  };

  // 处理分析卡片的删除（只允许删除实时分析）
  const handleRemoveAnalysis = (id: string) => {
    if (id.startsWith("historical_")) {
      // 历史分析不允许删除
      toast({
        title: "无法删除",
        description: "历史分析数据不能删除",
        variant: "destructive",
      });
    } else {
      removeAnalysis(id);
    }
  };

  const handleEnabledPromptClick = async (
    recommendation: PromptRecommendation,
  ) => {
    console.log("[LLM Analysis] 开始生成分析:", {
      contentId,
      promptName: recommendation.name,
      contentTextLength: contentText.length,
      hasContent: !!contentText,
    });

    try {
      // 使用传入的内容文本或获取当前页面内容
      const content = contentText || "当前页面的内容...";

      if (!content || content.trim().length === 0) {
        throw new Error("没有可分析的内容，请确保内容已加载完成");
      }

      await generateAnalysis(
        contentId,
        recommendation.prompt, // system prompt
        content, // user prompt (文章正文)
        recommendation.id,
        recommendation.name,
      );

      console.log("[LLM Analysis] 分析生成请求已发送");
    } catch (error) {
      console.error("[LLM Analysis] 生成分析失败:", error);
      toast({
        title: "生成失败",
        description:
          error instanceof Error ? error.message : "无法生成分析，请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "已复制",
      description: "分析内容已复制到剪贴板",
    });
  };

  const handleRegenerate = async (analysisId: string) => {
    // 只允许重新生成实时分析
    if (analysisId.startsWith("historical_")) {
      toast({
        title: "无法重新生成",
        description: "历史分析数据不能重新生成",
        variant: "destructive",
      });
      return;
    }

    const analysis = contentAnalyses.find((a) => a?.id === analysisId);
    if (!analysis || !analysis.prompt) return;

    // 移除旧的分析
    removeAnalysis(analysisId);

    // 生成新的分析
    try {
      await generateAnalysis(
        contentId,
        analysis.prompt,
        contentText || "",
        analysis.promptId,
        analysis.title,
      );
    } catch (error) {
      console.error("重新生成分析失败:", error);
      toast({
        title: "重新生成失败",
        description: "无法重新生成分析，请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handlePromptSelect = (prompt: Prompt) => {
    // 当用户选择prompt时的回调，由PromptCommandDialog处理
    console.log("Selected prompt:", prompt);
  };

  const handleExecute = async (
    message: string,
    selectedPrompt: Prompt | null,
  ) => {
    try {
      await executeAnalysisWithContent(contentId, message, selectedPrompt);
    } catch (error) {
      console.error("执行分析失败:", error);
      toast({
        title: "执行失败",
        description: "无法执行分析，请稍后重试",
        variant: "destructive",
      });
    }
  };

  if (isLoadingPrompts) {
    return (
      <div
        className={`h-full bg-background border-l flex flex-col ${className}`}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-transparent ${className}`}>
      {/* 1. Header */}
      <div className="flex items-center justify-between h-header px-4 shrink-0 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">AI 智能分析</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={loadHistoricalAnalyses}>
          <History className="h-4 w-4" />
        </Button>
      </div>

      {/* 2. Content Body */}
      <div className="flex-1 overflow-y-auto px-1">
        <Tabs value={activeTab} className="h-full">
          {/* 实时分析标签页 */}
          <TabsContent value="analysis" className="h-full mt-0">
            <div className="p-4 space-y-4">
              {/* 如果没有正在进行的分析，则显示提示 */}
              {allAnalyses.length === 0 &&
                !isGenerating &&
                !loadingHistorical && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    暂无分析结果
                  </div>
                )}

              {/* 显示所有分析（实时 + 历史） */}
              {allAnalyses.map((analysis) => (
                <div key={analysis?.id || `analysis-${Math.random()}`}>
                  {/* 历史分析标识 - 已移除 */}
                  {/* {analysis.id.startsWith("historical_") && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <History className="h-3 w-3" />
                      <span>历史分析</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )} */}

                  <LLMAnalysisCard
                    analysis={analysis}
                    onToggleExpanded={handleToggleExpanded}
                    onRemove={handleRemoveAnalysis}
                    onRegenerate={
                      analysis.id.startsWith("historical_")
                        ? undefined
                        : handleRegenerate
                    }
                    onCopy={handleCopy}
                  />
                </div>
              ))}

              {/* 显示加载状态 */}
              {loadingHistorical && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>加载中...</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 3. Footer */}
      <div className="shrink-0 p-4 bg-muted/20">
        <div className="space-y-3">
          {/* 推荐提示 */}
          {!isLoadingPrompts && getAvailablePrompts().length > 0 && (
            <PromptRecommendations
              recommendations={getPromptRecommendations().slice(0, 4)}
              onPromptClick={handleEnabledPromptClick}
              isGenerating={isGenerating}
              disabled={isGenerating}
            />
          )}
          {/* 自定义分析对话框 */}
          <div>
            <PromptCommandDialog
              availablePrompts={enabledPrompts || []}
              isExecuting={isGenerating}
              onPromptSelect={handlePromptSelect}
              onExecute={handleExecute}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
