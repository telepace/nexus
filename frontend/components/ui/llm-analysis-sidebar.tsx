"use client";

import { FC, useEffect } from "react";
import {
  Brain,
  Trash2,
  Loader2,
  Sparkles,
  Lightbulb,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LLMAnalysisCard } from "@/components/ui/llm-analysis-card";
import { PromptRecommendations } from "@/components/ui/prompt-recommendations";
import { PromptCommandDialog } from "@/components/ui/prompt-command-dialog";
import { useLLMAnalysisStore } from "@/lib/stores/llm-analysis-store";
import { useToast } from "@/hooks/use-toast";
import { Prompt } from "@/lib/api/services/prompts";

interface LLMAnalysisSidebarProps {
  contentId: string;
  className?: string;
  contentText?: string;
}

export const LLMAnalysisSidebar: FC<LLMAnalysisSidebarProps> = ({
  contentId,
  className = "",
  contentText = "",
}) => {
  const {
    analyses,
    isGenerating,
    error,
    enabledPrompts,
    disabledPrompts,
    isLoadingPrompts,
    toggleExpanded,
    removeAnalysis,
    clearAnalyses,
    generateAnalysis,
    executeAnalysisWithContent,
    loadPrompts,
    setError,
    getAvailablePrompts,
  } = useLLMAnalysisStore();

  const { toast } = useToast();

  // 加载prompts
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 调试信息
  useEffect(() => {
    console.log("[LLMAnalysisSidebar] Prompts 状态更新:", {
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

  // 过滤当前内容的分析
  const contentAnalyses =
    analyses?.filter((analysis) => analysis?.contentId === contentId) || [];

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

  const handleEnabledPromptClick = async (prompt: Prompt) => {
    console.log("[LLM Analysis] 开始生成分析:", {
      contentId,
      promptName: prompt.name,
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
        prompt.content, // system prompt
        content, // user prompt (文章正文)
        prompt.id,
        prompt.name,
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

  const handleClearAll = () => {
    clearAnalyses();
    toast({
      title: "已清空",
      description: "所有分析已清空",
    });
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
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header - 优化的标题区域 */}
      <div className="flex-shrink-0 p-4 border-b bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/5 dark:to-blue-950/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI 智能分析</h2>
              {/* Subtitle removed for a cleaner look */}
            </div>
          </div>

          {contentAnalyses?.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 分析状态指示器 */}
        {isGenerating && (
          <div className="flex items-center gap-1 text-primary mt-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">分析中...</span>
          </div>
        )}
      </div>

      {/* Content - 分析结果区域 */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-4 space-y-4">
          {(contentAnalyses || []).map((analysis) => (
            <LLMAnalysisCard
              key={analysis?.id || `analysis-${Math.random()}`}
              analysis={analysis}
              onToggleExpanded={toggleExpanded}
              onRemove={removeAnalysis}
              onRegenerate={handleRegenerate}
              onCopy={handleCopy}
            />
          ))}

          {/* 空状态 - 优化的引导界面 */}
          {contentAnalyses?.length === 0 && !isGenerating && (
            <div className="text-center py-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-blue-100 dark:to-blue-900/20 rounded-full" />
                </div>
                <div className="relative">
                  <Brain className="h-12 w-12 mx-auto mb-3 text-primary opacity-80" />
                </div>
              </div>
              <h3 className="text-base font-medium mb-2">开始智能分析</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                选择下方的分析类型，让 AI 帮你深度理解文档内容
              </p>

              {/* 快速分析建议 */}
              <div className="grid grid-cols-1 gap-1.5 max-w-sm mx-auto mb-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>智能总结 - 提取核心观点</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <Target className="h-4 w-4 text-green-500" />
                  <span>关键要点 - 梳理重要信息</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  <span>深度洞察 - 发现隐含价值</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - 智能推荐区域 */}
      <div className="shrink-0 p-4 border-t bg-muted/20">
        <div className="space-y-3">
          {/* 快速分析推荐 */}
          {enabledPrompts?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">推荐分析</span>
              </div>
              <div className="max-h-[120px] overflow-y-auto">
                <PromptRecommendations
                  recommendations={(getAvailablePrompts() || [])
                    .filter(
                      (prompt) =>
                        prompt && prompt.id && prompt.name && prompt.content,
                    ) // 过滤掉无效的 prompt
                    .slice(0, 4)
                    .map((prompt) => ({
                      id: prompt.id,
                      name: prompt.name,
                      description: prompt.description || "",
                      prompt: prompt.content,
                      type: "custom" as const,
                      icon: "🤖",
                    }))}
                  onPromptClick={(rec) => {
                    const prompt = enabledPrompts?.find(
                      (p) => p?.id === rec.id,
                    );
                    if (prompt) handleEnabledPromptClick(prompt);
                  }}
                  isGenerating={isGenerating}
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}

          {/* 自定义分析对话框 */}
          <div>
            <PromptCommandDialog
              availablePrompts={disabledPrompts || []}
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
