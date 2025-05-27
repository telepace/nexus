"use client";

import { FC, useEffect } from "react";
import { Brain, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LLMAnalysisCard } from "@/components/ui/llm-analysis-card";
import { PromptRecommendations } from "@/components/ui/prompt-recommendations";
import { PromptCommandDialog } from "@/components/ui/prompt-command-dialog";
import { useLLMAnalysisStore } from "@/lib/stores/llm-analysis-store";
import { useToast } from "@/hooks/use-toast";
import { Prompt } from "@/lib/api/services/prompts";

interface LLMAnalysisPanelProps {
  contentId: string;
  className?: string;
  contentText?: string; // 添加内容文本参数
}

export const LLMAnalysisPanel: FC<LLMAnalysisPanelProps> = ({
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
  } = useLLMAnalysisStore();

  const { toast } = useToast();

  // 加载prompts
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 过滤当前内容的分析
  const contentAnalyses = analyses.filter(
    (analysis) => analysis.contentId === contentId,
  );

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
    try {
      // 使用传入的内容文本或获取当前页面内容
      const content = contentText || "当前页面的内容...";
      
      await generateAnalysis(
        contentId,
        prompt.content, // system prompt
        content, // user prompt (文章正文)
        prompt.id,
        prompt.name,
      );
    } catch (error) {
      console.error("生成分析失败:", error);
      toast({
        title: "生成失败",
        description: "无法生成分析，请稍后重试",
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
    const analysis = contentAnalyses.find((a) => a.id === analysisId);
    if (!analysis || !analysis.prompt) return;

    // 移除旧的分析
    removeAnalysis(analysisId);

    // 生成新的分析
    try {
      await generateAnalysis(
        contentId,
        analysis.prompt,
        contentText,
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
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI 分析</CardTitle>
            {contentAnalyses.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({contentAnalyses.length})
              </span>
            )}
          </div>

          {contentAnalyses.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空全部
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* 分析结果列表 - 使用 flex-1 和 min-h-0 确保正确的滚动 */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-4">
              {contentAnalyses.map((analysis) => (
                <LLMAnalysisCard
                  key={analysis.id}
                  analysis={analysis}
                  onToggleExpanded={toggleExpanded}
                  onRemove={removeAnalysis}
                  onRegenerate={handleRegenerate}
                  onCopy={handleCopy}
                />
              ))}

              {/* 空状态提示 */}
              {contentAnalyses.length === 0 && !isGenerating && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">还没有 AI 分析</p>
                  <p className="text-xs mt-1">
                    选择下方的分析类型或使用对话框开始
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 底部操作区域 - 固定在底部 */}
        <div className="flex-shrink-0 space-y-4">
          {/* 启用的 Prompt 推荐 */}
          {enabledPrompts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">推荐分析</CardTitle>
              </CardHeader>
              <CardContent>
                <PromptRecommendations
                  recommendations={enabledPrompts.map((prompt) => ({
                    id: prompt.id,
                    name: prompt.name,
                    description: prompt.description,
                    prompt: prompt.content,
                    type: "custom" as const,
                    icon: "🤖",
                  }))}
                  onPromptClick={(rec) => {
                    const prompt = enabledPrompts.find((p) => p.id === rec.id);
                    if (prompt) handleEnabledPromptClick(prompt);
                  }}
                  isGenerating={isGenerating}
                  disabled={isGenerating}
                />
              </CardContent>
            </Card>
          )}

          {/* 对话框 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">AI 对话</CardTitle>
            </CardHeader>
            <CardContent>
              <PromptCommandDialog
                availablePrompts={disabledPrompts}
                contentId={contentId}
                isExecuting={isGenerating}
                onPromptSelect={handlePromptSelect}
                onExecute={handleExecute}
              />
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
